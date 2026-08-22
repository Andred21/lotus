<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\RedatorIdoneidadeService;
use App\Shared\Audit\PivotAudit;
use Illuminate\Support\Facades\DB;

/**
 * Designa 1 redator à turma após o gate RN-09. Idempotente
 * (syncWithoutDetaching + unique do pivot). Multi-redator = múltiplas chamadas.
 *
 * Abre transação por causa da P-49: sem ela o `lockForWrite` seria solto no
 * autocommit da própria consulta. O lock é do REDATOR — a janela que a ficha
 * nomeia é "uma designação concorrente pousa um redator arquivado numa turma
 * viva". É aresta de lock cruzando domínio (Operation trava um agregado de
 * Identity), e é deliberada: a aresta de CÓDIGO já existe (`TurmaController`
 * importa `Identity\Models\Redator`), então o `DomainDependencyTest` não muda
 * de conjunto.
 */
class DesignateRedatorAction
{
    public function __construct(private RedatorIdoneidadeService $idoneidade) {}

    public function execute(Turma $turma, Redator $redator): Turma
    {
        $turma->assertAcademicallyWritable();

        return DB::transaction(function () use ($turma, $redator) {
            Redator::lockForWrite($redator->id);

            $this->idoneidade->assertEligible($redator, $turma->course);
            PivotAudit::syncWithoutDetaching($turma, 'redatores', [$redator->id]);

            return $turma;
        });
    }
}
