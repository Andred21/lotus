<?php

namespace App\Domains\Operation\Services;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentIdentity;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Data\ImportConfirmRowData;
use App\Domains\Operation\Enums\ImportField;
use App\Domains\Operation\Enums\ImportRowStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Validation\ValidationMessages;
use Illuminate\Validation\ValidationException;

/**
 * A regra única de uma linha da planilha (spec D2-D4, D17): a prévia e a
 * confirmação decidem pelo mesmo código, sem escrever nada. Toda regra de
 * identidade mora no `StudentResolver`; aqui só se ORDENA a decisão e se
 * reserva duplicidade (RUT e e-mail) no `ImportBatchLedger`.
 *
 * Reserva-se o e-mail que a planilha propõe gravar: o de aluno novo e o divergente
 * de linha cadastrada, independentemente de *Actualizar*. Linha recusada antes
 * da reserva não reserva.
 */
class ImportRowClassifier
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

    public function __construct(private readonly StudentResolver $resolver) {}

    /**
     * @param  list<ImportConfirmRowData>  $lines
     * @return list<ImportRowDecision> na mesma ordem das linhas
     */
    public function classify(Turma $turma, array $lines, bool $canUpdate): array
    {
        $contratanteId = $turma->contratanteClient()->id;
        $ledger = new ImportBatchLedger;
        $decisions = [];

        foreach ($lines as $line) {
            $decisions[] = $this->classifyLine($turma, $contratanteId, $line, $canUpdate, $ledger);
        }

        return $decisions;
    }

    private function classifyLine(
        Turma $turma,
        int $contratanteId,
        ImportConfirmRowData $line,
        bool $canUpdate,
        ImportBatchLedger $ledger,
    ): ImportRowDecision {
        // 1. RUT repetido no lote (D11). Só RUT válido tem forma canônica; o
        // inválido cai no erro do resolver logo abaixo.
        if (($duplicado = $ledger->claimRut($line->rut, $line->row)) !== null) {
            return new ImportRowDecision($line, ImportRowStatus::Error, refusal: $duplicado);
        }

        $email = $this->blankToNull($line->email);
        $phone = $this->blankToNull($line->phone);

        try {
            // 2. Nome obrigatório em toda linha, nova ou cadastrada (D17), e RUT
            // válido de aluno (lança por linha).
            $this->resolver->assertNameProvided($line->name);
            $lookup = $this->resolver->previewByRut($line->rut);

            // 3. Aluno novo: as regras do ramo de criação, sem escrita. O
            // `update_registration` não tem o que atualizar e é ignorado (D13).
            if (! $lookup->exists) {
                $identity = $this->resolver->identity($line->rut, $line->name, $email, $phone);
                $this->resolver->assertCanCreate($identity);

                if (($duplicado = $ledger->claimEmail((string) $identity->email, $line->row)) !== null) {
                    return new ImportRowDecision($line, ImportRowStatus::Error, refusal: $duplicado, lookup: $lookup);
                }

                return new ImportRowDecision($line, ImportRowStatus::New, lookup: $lookup, identity: $identity);
            }
        } catch (ValidationException $e) {
            return new ImportRowDecision($line, ImportRowStatus::Error, refusal: ValidationMessages::squash($e));
        }

        $student = $lookup->student;
        $user = $student->user;

        $identity = new StudentIdentity($user->rut, $user->name, $user->email, $user->phone);

        // 4. Matrícula ativa nesta turma (a soft-deletada se restaura na
        // confirmação). A flag é ignorada e nada é reservado (D4); a identidade
        // é a do cadastro.
        if ($turma->enrollments()->where('student_id', $student->id)->exists()) {
            return new ImportRowDecision($line, ImportRowStatus::AlreadyEnrolled, lookup: $lookup, identity: $identity);
        }

        // 5. Sem vínculo atual não há o que mover: o primeiro vínculo é `registered`.
        $current = $student->currentClient;
        $status = $current === null || $current->id === $contratanteId
            ? ImportRowStatus::Registered
            : ImportRowStatus::Moves;
        $divergent = $this->divergent($line, $user);

        // 6. O e-mail que o Actualizar gravaria é reservado; repetido recusa só
        // o Actualizar, nunca a linha (a matrícula segue com o cadastro).
        $updateRefusal = null;
        if (in_array(ImportField::Email, $divergent, true)) {
            $updateRefusal = $ledger->claimEmail((string) $email, $line->row);
        }

        // 7. Há o que atualizar (divergência ou flag) e a reserva não recusou:
        // permissão e forma do que seria gravado, sem escrever.
        $updatedIdentity = null;
        if ($updateRefusal === null && ($divergent !== [] || $line->update_registration)) {
            if (! $canUpdate) {
                $updateRefusal = __('operation.enrollment.import.update_forbidden');
            } else {
                try {
                    $updatedIdentity = $this->resolver->updatedIdentity($student, $line->name, $email, $phone);
                    $this->resolver->assertCanUpdate($student, $updatedIdentity);
                } catch (ValidationException $e) {
                    $updatedIdentity = null;
                    $updateRefusal = ValidationMessages::squash($e);
                }
            }
        }

        return new ImportRowDecision(
            $line,
            $status,
            updateRefusal: $updateRefusal,
            lookup: $lookup,
            identity: $identity,
            updatedIdentity: $updatedIdentity,
            divergent: $divergent,
        );
    }

    /**
     * Valor vazio na planilha não diverge (D17): célula em branco nunca apaga o
     * cadastro. E-mail compara sem diferenciar caixa.
     *
     * @return list<ImportField>
     */
    private function divergent(ImportConfirmRowData $line, User $user): array
    {
        $email = $this->blankToNull($line->email);
        $phone = $this->blankToNull($line->phone);
        $divergent = [];

        if ($line->name !== '' && $line->name !== $user->name) {
            $divergent[] = ImportField::Name;
        }
        if ($email !== null && mb_strtolower($email) !== mb_strtolower((string) $user->email)) {
            $divergent[] = ImportField::Email;
        }
        if ($phone !== null && $phone !== (string) $user->phone) {
            $divergent[] = ImportField::Phone;
        }

        return $divergent;
    }

    private function blankToNull(?string $value): ?string
    {
        return $value === '' ? null : $value;
    }
}
