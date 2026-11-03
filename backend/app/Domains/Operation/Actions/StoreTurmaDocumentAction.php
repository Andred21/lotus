<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use App\Shared\Files\Services\FileUploader;
use App\Shared\Files\Services\StoredFiles;
use Illuminate\Http\UploadedFile;

/**
 * Anexa um documento à turma (RN-16). Append puro — N docs por tipo (D8),
 * sem replace: as provas dos alunos são plural real. Doc de turma não vence
 * (sem valid_until).
 *
 * O binário sobe fora da transação e o INSERT em `files` entra nela, com o
 * `Turma::lockForWrite()` (P-49): tudo isso é o `FileUploader`, que descarta o
 * objeto se a transação cair — sem documento sem rastro (peso legal).
 */
class StoreTurmaDocumentAction
{
    public function __construct(private FileUploader $uploader) {}

    public function execute(Turma $turma, TurmaDocumentType $type, UploadedFile $file, User $actor): File
    {
        // RN-15: turma concluída só aceita documento de quem tem a permissão
        // exclusiva (superadmin); os demais caem na recusa de sempre.
        if (! ($turma->status === TurmaStatus::Concluida && $actor->can('operation.turma.manage_concluded_docs'))) {
            $turma->assertAcademicallyWritable();
        }

        return $this->uploader->store(
            ['file' => $file],
            $turma,
            function (StoredFiles $stored) use ($turma, $type) {
                Turma::lockForWrite($turma->id);

                return $stored->register($turma, 'file', $type->value);
            },
        );
    }
}
