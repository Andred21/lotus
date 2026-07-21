<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\RedatorIdoneidadeService;

/**
 * Designa 1 redator à turma após o gate RN-09. Idempotente
 * (syncWithoutDetaching + unique do pivot). Multi-redator = múltiplas chamadas.
 */
class DesignateRedatorAction
{
    public function __construct(private RedatorIdoneidadeService $idoneidade) {}

    public function execute(Turma $turma, Redator $redator): Turma
    {
        $this->idoneidade->assertEligible($redator, $turma->course);
        $turma->redatores()->syncWithoutDetaching([$redator->id]);

        return $turma->load('redatores.user');
    }
}
