<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Turma;

/** Remove a designação de um redator (detach do pivot). */
class RemoveRedatorAction
{
    public function execute(Turma $turma, Redator $redator): Turma
    {
        $turma->redatores()->detach($redator->id);

        return $turma->load('redatores.user');
    }
}
