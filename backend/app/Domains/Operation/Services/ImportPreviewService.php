<?php

namespace App\Domains\Operation\Services;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Actions\ImportStudentsAction;
use App\Domains\Operation\Data\ImportPreviewData;
use App\Domains\Operation\Data\ImportPreviewRowData;
use App\Domains\Operation\Enums\ImportField;
use App\Domains\Operation\Enums\ImportRowStatus;
use App\Domains\Operation\Models\Turma;
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
        $ledger = new ImportBatchLedger;
        $rows = [];

        foreach ($linhas as $line) {
            $rows[] = $this->classify($turma, $contratanteId, $line, $ledger);
        }

        return new ImportPreviewData($rows, $actor->can('identity.user.update'));
    }

    /**
     * @param  array{row:int,rut:string,name:string,email:?string,phone:?string}  $line
     */
    private function classify(Turma $turma, int $contratanteId, array $line, ImportBatchLedger $ledger): ImportPreviewRowData
    {
        // 1. RUT repetido no lote (D11). Só RUT válido tem forma canônica; o
        // inválido cai no erro do resolver logo abaixo.
        if (($duplicado = $ledger->claimRut($line['rut'])) !== null) {
            return $this->row($line, ImportRowStatus::Error, $duplicado);
        }

        try {
            // 2. Nome obrigatório em toda linha, nova ou cadastrada (D17).
            $this->resolver->assertNameProvided($line['name']);

            // 3. RUT válido e tipo aluno (lança por linha).
            $lookup = $this->resolver->previewByRut($line['rut']);

            // 4. Aluno novo: as regras do ramo de criação, sem escrita.
            if (! $lookup->exists) {
                $this->resolver->assertCanCreate(
                    $this->resolver->identity($line['rut'], $line['name'], $line['email'], $line['phone']),
                );

                if (($duplicado = $ledger->claimEmail($line['email'])) !== null) {
                    return $this->row($line, ImportRowStatus::Error, $duplicado);
                }

                return $this->row($line, ImportRowStatus::New);
            }
        } catch (ValidationException $e) {
            return $this->row($line, ImportRowStatus::Error, ValidationMessages::squash($e));
        }

        $student = $lookup->student;

        // 5. Matrícula ativa nesta turma (a soft-deletada se restaura na confirmação).
        if ($turma->enrollments()->where('student_id', $student->id)->exists()) {
            return $this->row($line, ImportRowStatus::AlreadyEnrolled);
        }

        // 6. Sem vínculo atual não há o que mover: o primeiro vínculo é `registered`.
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
     * @return array<ImportField>
     */
    private function divergent(array $line, User $user): array
    {
        $divergent = [];

        if ($line['name'] !== '' && $line['name'] !== $user->name) {
            $divergent[] = ImportField::Name;
        }
        if ($line['email'] !== null && mb_strtolower($line['email']) !== mb_strtolower((string) $user->email)) {
            $divergent[] = ImportField::Email;
        }
        if ($line['phone'] !== null && $line['phone'] !== (string) $user->phone) {
            $divergent[] = ImportField::Phone;
        }

        return $divergent;
    }

    /**
     * @param  array{row:int,rut:string,name:string,email:?string,phone:?string}  $line
     * @param  array<ImportField>  $divergent
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
