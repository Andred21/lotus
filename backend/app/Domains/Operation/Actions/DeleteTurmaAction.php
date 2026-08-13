<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Turma;

/**
 * Soft delete da turma. Guarda do 6d aplicada (RN-15): turma concluída não se
 * arquiva — o certificado emitido aponta para o registro, e esconder o registro
 * cria contradição entre documento e banco. Financeiro segue sem bloquear (lei §7).
 */
class DeleteTurmaAction
{
    public function execute(Turma $turma): void
    {
        $turma->assertAcademicallyWritable();

        $turma->delete();
    }
}
