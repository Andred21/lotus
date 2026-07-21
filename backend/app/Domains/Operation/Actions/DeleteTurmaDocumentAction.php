<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;

/**
 * Remove (soft) um documento da turma. O binário fica no bucket — o metadado
 * soft-deletado é o rastro (peso legal). O pertencimento file↔turma é
 * garantido pelo scoped binding da rota.
 */
class DeleteTurmaDocumentAction
{
    public function execute(Turma $turma, File $file): void
    {
        $turma->assertAcademicallyWritable();   // RN-15

        $file->delete();   // por instância — audita (lição #5)
    }
}
