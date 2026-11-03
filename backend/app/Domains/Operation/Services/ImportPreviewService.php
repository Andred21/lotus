<?php

namespace App\Domains\Operation\Services;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Data\ImportConfirmRowData;
use App\Domains\Operation\Data\ImportPreviewData;
use App\Domains\Operation\Data\ImportPreviewRowData;
use App\Domains\Operation\Enums\ImportRowStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Http\UploadedFile;

/**
 * Prévia da importação (spec D9-D10): lê a planilha e projeta o veredito do
 * `ImportRowClassifier` — o MESMO que a confirmação executa —, SEM escrever.
 * Nenhuma regra mora aqui; a catraca de somente leitura é o teste.
 */
class ImportPreviewService
{
    public function __construct(
        private readonly SpreadsheetRowReader $reader,
        private readonly ImportRowClassifier $classifier,
    ) {}

    public function preview(Turma $turma, UploadedFile $file, User $actor): ImportPreviewData
    {
        $turma->assertAcademicallyWritable();

        // Materializa antes de classificar: o teto e o arquivo inválido recusam a
        // requisição inteira, como na confirmação.
        $linhas = [];
        foreach ($this->reader->rows($file, ImportRowClassifier::MAX_LINHAS) as $line) {
            // A prévia mostra o que o Mantener faria: a flag nasce desligada.
            $linhas[] = new ImportConfirmRowData(
                $line['row'], $line['rut'], $line['name'], $line['email'], $line['phone'], false,
            );
        }

        $podeAtualizar = $actor->can('identity.user.update');
        $rows = [];

        foreach ($this->classifier->classify($turma, $linhas, $podeAtualizar) as $decision) {
            $rows[] = $this->project($decision);
        }

        return new ImportPreviewData($rows, $podeAtualizar);
    }

    private function project(ImportRowDecision $decision): ImportPreviewRowData
    {
        $line = $decision->line;
        $cadastrado = in_array($decision->status, [ImportRowStatus::Registered, ImportRowStatus::Moves], true);
        $student = $cadastrado ? $decision->lookup?->student : null;
        $user = $student?->user;

        return new ImportPreviewRowData(
            row: $line->row,
            rut: $line->rut,
            name: $line->name,
            email: $line->email,
            phone: $line->phone,
            status: $decision->status,
            message: $decision->refusal,
            update_refusal: $cadastrado && $decision->divergent !== [] ? $decision->updateRefusal : null,
            current_client: $student?->currentClient?->legal_name,
            archived: $user !== null && ($user->trashed() || $student->trashed()),
            divergent: $decision->divergent,
            registered_name: $user?->name,
            registered_email: $user?->email,
            registered_phone: $user?->phone,
        );
    }
}
