<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Enums\StudentResolutionOutcome;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Data\ImportConfirmData;
use App\Domains\Operation\Data\ImportConfirmRowData;
use App\Domains\Operation\Data\ImportResultData;
use App\Domains\Operation\Data\ImportRowErrorData;
use App\Domains\Operation\Data\MovedStudentData;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\EnrollOutcome;
use App\Domains\Operation\Services\ImportBatchLedger;
use App\Shared\Validation\ValidationMessages;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Confirmação da importação (spec D13): recebe as linhas que o admin triou e
 * REVALIDA cada uma no servidor, sem confiar em nada que o navegador classificou.
 * Transação POR LINHA, nunca global — linha com erro é reportada no resumo e o
 * lote segue (tela-turmas). Com `update_registration` em aluno existente, o
 * cadastro é atualizado e o aluno matriculado na MESMA transação: se uma das
 * duas falha, nada daquela linha fica.
 */
class ImportStudentsAction
{
    /**
     * Teto de linhas por planilha. Revisado de 500 para 100 no DoD da Task 12
     * (2026-08-25), medido contra a API real, não suposto: cada aluno NOVO
     * cria um `User`, e `password` é um cast `hashed` — todo import de linha
     * nova paga um `Hash::make()` de bcrypt, ~185ms cada neste container. Um
     * lote de 500 linhas todas novas estourou o `max_execution_time` de 30s do
     * PHP em produção de teste (fatal 500 aos ~30s, só 179 de 500 linhas
     * processadas); 120 linhas mediu 29.86s, ainda perto demais da margem. 100
     * linhas mediu 18.54s e 18.58s em duas corridas — folga real sob os 30s
     * (metade do `fastcgi_read_timeout` de dev) e larga sob os 60s/120s do
     * timeout de verdade. Turma real tem 8 a 15 alunos (`OperationDemoSeeder`),
     * então 100 ainda é ~7× a maior.
     *
     * Na prévia o teto é aplicado pelo LEITOR, contando linha iterada (achado
     * Q-4 do review de 2026-08-25). Na confirmação não há arquivo: o teto é a
     * exigência `max` de `rows`, checada antes de qualquer escrita.
     */
    public const MAX_LINHAS = 100;

    public function __construct(
        private readonly EnrollStudentAction $enroll,
        private readonly StudentResolver $resolver,
    ) {}

    public function execute(Turma $turma, ImportConfirmData $data, User $actor): ImportResultData
    {
        // O gate fica no topo mesmo com o EnrollStudentAction gateando por
        // linha: recusar o lote inteiro de uma vez é a resposta certa, e não é o
        // mesmo que recusar 40 linhas uma a uma.
        $turma->assertAcademicallyWritable();

        // ANTES de escrever: a recusa por teto depois de matricular parte do
        // lote não seria recusa, seria meia importação.
        Validator::make(
            ['rows' => $data->rows instanceof Optional ? null : $data->rows],
            ['rows' => ['required', 'array', 'min:1', 'max:'.self::MAX_LINHAS]],
        )->validate();

        $ledger = new ImportBatchLedger;
        $podeAtualizar = $actor->can('identity.user.update');
        $created = $relinked = $already = 0;
        $moved = [];
        $errors = [];

        foreach ($data->rows as $line) {
            try {
                $outcome = $this->processRow($turma, $line, $ledger, $podeAtualizar);

                if ($outcome->alreadyEnrolled) {
                    $already++;

                    continue;
                }

                match ($outcome->resolution->outcome) {
                    StudentResolutionOutcome::Created => $created++,
                    StudentResolutionOutcome::AlreadyLinked => $relinked++,
                    StudentResolutionOutcome::Moved => $moved[] = new MovedStudentData(
                        rut: $outcome->resolution->student->user->rut,
                        name: $outcome->resolution->student->user->name,
                        previous_client: $outcome->resolution->previousClient?->legal_name,
                        client: $turma->contratante()->name,
                    ),
                };
            } catch (ValidationException $e) {
                $errors[] = new ImportRowErrorData(
                    row: $line->row,
                    message: ValidationMessages::squash($e),
                );
            }
        }

        return new ImportResultData(
            created: $created,
            relinked: $relinked,
            already_enrolled: $already,
            moved: $moved,
            errors: $errors,
            enrolled_total: $turma->enrollments()->count(),
            contracted_count: $turma->quote->student_count,
        );
    }

    /**
     * Uma linha: valida tudo o que a prévia valida (mesmas fontes: o
     * `StudentResolver` e o `ImportBatchLedger`) e depois grava.
     *
     * @throws ValidationException
     */
    private function processRow(Turma $turma, ImportConfirmRowData $line, ImportBatchLedger $ledger, bool $podeAtualizar): EnrollOutcome
    {
        if (($duplicado = $ledger->claimRut($line->rut)) !== null) {
            throw ValidationException::withMessages(['rut' => $duplicado]);
        }

        // Nome obrigatório em toda linha, nova ou cadastrada (D17).
        $this->resolver->assertNameProvided($line->name);

        $lookup = $this->resolver->previewByRut($line->rut);
        $email = $line->email === '' ? null : $line->email;
        $phone = $line->phone === '' ? null : $line->phone;

        if (! $lookup->exists) {
            // `update_registration` em aluno inexistente é ignorada (D13): o
            // aluno nasce com os dados da linha.
            $this->resolver->assertCanCreate($line->rut, $line->name, $email, $phone);
            $this->claimEmail($ledger, $email);

            return $this->enroll->execute($turma, $line->rut, $line->name, $email, $phone);
        }

        if (! $line->update_registration) {
            return $this->enroll->execute($turma, $line->rut, $line->name, $email, $phone);
        }

        // Atualizar o cadastro exige a permissão de editar aluno, mesmo que a
        // tela não ofereça o botão (D13/D20): recusa só esta linha.
        if (! $podeAtualizar) {
            throw ValidationException::withMessages([
                'update_registration' => __('operation.enrollment.import.update_forbidden'),
            ]);
        }

        $student = $lookup->student;

        // O e-mail repetido recusa ANTES de qualquer escrita (D18).
        $this->claimEmail($ledger, $email);

        // Update e matrícula na mesma transação: se uma falha, nada da linha
        // fica. A validação e a escrita do cadastro moram no `StudentResolver`
        // (fonte única, D10).
        return DB::transaction(function () use ($turma, $student, $line, $email, $phone) {
            $this->resolver->updateRegistration($student, $line->name, $email, $phone);

            return $this->enroll->execute($turma, $line->rut, $line->name, $email, $phone);
        });
    }

    /**
     * E-mail repetido na planilha (D18): vale para quem GRAVA e-mail — aluno novo
     * e linha de Actualizar com e-mail. E-mail vazio não grava nada.
     *
     * @throws ValidationException
     */
    private function claimEmail(ImportBatchLedger $ledger, ?string $email): void
    {
        if ($email !== null && ($duplicado = $ledger->claimEmail($email)) !== null) {
            throw ValidationException::withMessages(['email' => $duplicado]);
        }
    }
}
