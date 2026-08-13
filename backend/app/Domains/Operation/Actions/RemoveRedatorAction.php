<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Turma;
use App\Shared\Audit\PivotAudit;

/** Remove a designação de um redator (detach do pivot). */
class RemoveRedatorAction
{
    public function execute(Turma $turma, Redator $redator): Turma
    {
        $turma->assertAcademicallyWritable();
        PivotAudit::detach($turma, 'redatores', $redator->id);

        return $turma;
    }
}
