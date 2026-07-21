<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Turma;

/**
 * Soft delete da turma. Home para futuras guardas do 6d (blindagem pós-conclusão
 * RN-15) — hoje sem gate: financeiro nunca bloqueia (lei §7).
 */
class DeleteTurmaAction
{
    public function execute(Turma $turma): void
    {
        $turma->delete();
    }
}
