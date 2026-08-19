<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Budget;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o orçamento e, pelo hook `restored` do model, as cotações que a
 * cascata marcou — e, por dentro do `restore()` de cada cotação, os anexos dela.
 *
 * SEM lock, e isto é simétrico e deliberado: `Budget` não tem mutex no lado do
 * delete tampouco (`DeleteBudgetAction` abre transação, não toma lock). Dar um
 * só ao restore criaria a ilusão de proteção sobre uma janela que continua
 * aberta no arquivamento. Mesma leitura da `RestoreCourseAction`.
 */
class RestoreBudgetAction
{
    public function execute(Budget $budget): Budget
    {
        return DB::transaction(function () use ($budget) {
            // No-op idempotente: a rota resolve por `onlyTrashed()`, então
            // chegar aqui com registro ativo significa que alguém restaurou
            // entre o binding e a transação. Restaurar duas vezes não é erro.
            if (! $budget->trashed()) {
                return $budget->loadListingData();
            }

            $budget->restore();

            return $budget->loadListingData();
        });
    }
}
