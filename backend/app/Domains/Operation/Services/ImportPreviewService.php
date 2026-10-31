<?php

namespace App\Domains\Operation\Services;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Actions\ImportStudentsAction;
use App\Domains\Operation\Data\ImportPreviewData;
use App\Domains\Operation\Data\ImportPreviewRowData;
use App\Domains\Operation\Enums\ImportRowStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Support\Rut;
use App\Shared\Validation\ValidationMessages;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Prévia da importação (spec D9-D10): classifica cada linha como a confirmação
 * a trataria, SEM escrever. Toda regra de validação mora no `StudentResolver`
 * (fonte única, D10); aqui só se classifica e se compara. Nenhuma transação,
 * nenhum `save`/`create` — a catraca de somente leitura é o teste.
 */
class ImportPreviewService
{
    public function __construct(
        private readonly SpreadsheetRowReader $reader,
        private readonly StudentResolver $resolver,
    ) {}

    public function preview(Turma $turma, UploadedFile $file, User $actor): ImportPreviewData
    {
        $turma->assertAcademicallyWritable();

        // Materializa antes de classificar: o teto e o arquivo inválido recusam a
        // requisição inteira, como na confirmação.
        $linhas = iterator_to_array($this->reader->rows($file, ImportStudentsAction::MAX_LINHAS), false);

        $contratanteId = $turma->contratanteClient()->id;
        $ruts = [];
        $emails = [];
        $rows = [];

        foreach ($linhas as $line) {
            $rows[] = $this->classify($turma, $contratanteId, $line, $ruts, $emails);
        }

        return new ImportPreviewData($rows, $actor->can('identity.user.update'));
    }

    /**
     * @param  array{row:int,rut:string,name:string,email:?string,phone:?string}  $line
     * @param  array<string,true>  $ruts  RUTs já vistos no lote (por referência)
     * @param  array<string,true>  $emails  e-mails de aluno novo já vistos (por referência)
     */
    private function classify(Turma $turma, int $contratanteId, array $line, array &$ruts, array &$emails): ImportPreviewRowData
    {
        // 1. RUT repetido no lote (D11). Só RUT válido tem forma canônica; o
        // inválido cai no erro do resolver logo abaixo.
        $parsed = Rut::parse($line['rut']);
        if ($parsed->isValid()) {
            $chave = $parsed->format();
            if (isset($ruts[$chave])) {
                return $this->row($line, ImportRowStatus::Error, __('operation.enrollment.import.duplicate_rut'));
            }
            $ruts[$chave] = true;
        }

        try {
            // 2. RUT válido e tipo aluno (lança por linha).
            $lookup = $this->resolver->previewByRut($line['rut']);

            // 3. Aluno novo: as regras do ramo de criação, sem escrita.
            if (! $lookup->exists) {
                $this->resolver->assertCanCreate($line['rut'], $line['name'], $line['email']);

                $email = mb_strtolower($line['email']);
                if (isset($emails[$email])) {
                    return $this->row($line, ImportRowStatus::Error, __('operation.enrollment.import.duplicate_email'));
                }
                $emails[$email] = true;

                return $this->row($line, ImportRowStatus::New);
            }
        } catch (ValidationException $e) {
            return $this->row($line, ImportRowStatus::Error, ValidationMessages::squash($e));
        }

        $student = $lookup->student;

        // 4. Matrícula ativa nesta turma (a soft-deletada se restaura na confirmação).
        if ($turma->enrollments()->where('student_id', $student->id)->exists()) {
            return $this->row($line, ImportRowStatus::AlreadyEnrolled);
        }

        // 5. Sem vínculo atual não há o que mover: o primeiro vínculo é `registered`.
        $current = $student->currentClient;
        $status = $current === null || $current->id === $contratanteId
            ? ImportRowStatus::Registered
            : ImportRowStatus::Moves;
        $user = $student->user;

        return $this->row(
            $line,
            $status,
            currentClient: $current?->legal_name,
            archived: $user->trashed() || $student->trashed(),
            divergent: $this->divergent($line, $user),
            registered: $user,
        );
    }

    /**
     * Valor vazio na planilha não diverge (D17): célula em branco nunca apaga o
     * cadastro. E-mail compara sem diferenciar caixa.
     *
     * @param  array{name:string,email:?string,phone:?string}  $line
     * @return array<string>
     */
    private function divergent(array $line, User $user): array
    {
        $divergent = [];

        if ($line['name'] !== '' && $line['name'] !== $user->name) {
            $divergent[] = 'name';
        }
        if ($line['email'] !== null && mb_strtolower($line['email']) !== mb_strtolower((string) $user->email)) {
            $divergent[] = 'email';
        }
        if ($line['phone'] !== null && $line['phone'] !== (string) $user->phone) {
            $divergent[] = 'phone';
        }

        return $divergent;
    }

    /**
     * @param  array{row:int,rut:string,name:string,email:?string,phone:?string}  $line
     * @param  array<string>  $divergent
     */
    private function row(
        array $line,
        ImportRowStatus $status,
        ?string $message = null,
        ?string $currentClient = null,
        bool $archived = false,
        array $divergent = [],
        ?User $registered = null,
    ): ImportPreviewRowData {
        return new ImportPreviewRowData(
            row: $line['row'],
            rut: $line['rut'],
            name: $line['name'],
            email: $line['email'],
            phone: $line['phone'],
            status: $status,
            message: $message,
            current_client: $currentClient,
            archived: $archived,
            divergent: $divergent,
            registered_name: $registered?->name,
            registered_email: $registered?->email,
            registered_phone: $registered?->phone,
        );
    }
}
