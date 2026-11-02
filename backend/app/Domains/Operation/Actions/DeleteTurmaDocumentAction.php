<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;

/**
 * Remove (soft) um documento da turma. O binário fica no bucket — o metadado
 * soft-deletado é o rastro (peso legal). O pertencimento file↔turma é
 * garantido pelo scoped binding da rota.
 */
class DeleteTurmaDocumentAction
{
    public function execute(Turma $turma, File $file, User $actor): void
    {
        // RN-15: turma concluída só libera a remoção para quem tem a permissão
        // exclusiva (superadmin); os demais caem na recusa de sempre.
        if (! ($turma->status === TurmaStatus::Concluida && $actor->can('operation.turma.manage_concluded_docs'))) {
            $turma->assertAcademicallyWritable();
        }

        $file->delete();   // por instância — audita (lição #5)
    }
}
