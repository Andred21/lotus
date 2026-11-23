<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaDocumentGate;
use App\Shared\Files\Models\File;

/**
 * Remove (soft) um documento da turma. O binário fica no bucket — o metadado
 * soft-deletado é o rastro (peso legal). O pertencimento file↔turma é
 * garantido pelo scoped binding da rota.
 */
class DeleteTurmaDocumentAction
{
    public function __construct(private TurmaDocumentGate $gate) {}

    public function execute(Turma $turma, File $file, User $actor): void
    {
        // Papel por tipo do arquivo e RN-15 (turma concluída só com
        // `manage_concluded_docs`) na matriz do gate (spec §4.6).
        $this->gate->assertPodeRemover($turma, $file, $actor);

        $file->delete();   // por instância — audita (lição #5)
    }
}
