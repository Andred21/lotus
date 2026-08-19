<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\Redator;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o redator e, pelo hook `restored` do model, os documentos e o User
 * que a cascata de arquivamento marcou.
 *
 * Simétrica da `ArchiveRedatorAction`, e pelo mesmo motivo: o enumera-e-restaura
 * tem a mesma janela de check-then-act do enumera-e-apaga.
 *
 * NÃO tem gate. O gate do arquivar pergunta por turma em andamento, que é razão
 * para não SAIR da operação; voltar para ela nunca é o problema. Molde:
 * `RestoreClientAction`.
 */
class RestoreRedatorAction
{
    public function execute(Redator $redator): Redator
    {
        return DB::transaction(function () use ($redator) {
            $locked = Redator::lockRow($redator->id);

            // No-op idempotente: a rota resolve por `onlyTrashed()`, então chegar
            // aqui com registro ativo significa que alguém restaurou entre o
            // binding e o lock. Restaurar duas vezes não é erro.
            if (! $locked->trashed()) {
                return $locked->loadListingData();
            }

            $locked->restore();

            return $locked->loadListingData();
        });
    }
}
