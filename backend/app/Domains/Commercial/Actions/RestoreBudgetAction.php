<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Budget;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o orçamento e, pelo hook `restored` do model, as cotações que a
 * cascata marcou — e, por dentro do `restore()` de cada cotação, os anexos dela.
 *
 * SEM lock, e é deliberado. O arquivamento TEM mutex (P-49, spec D4/D5):
 * `DeleteBudgetAction` toma `Budget::lockRow()` e trava as cotações do
 * orçamento antes de decidir e arquivar, e `CreateQuoteAction` e
 * `RestoreQuoteAction` tomam o lock do orçamento do lado delas. O restore do
 * orçamento fica de fora porque a única corrida que sobra é com
 * `RestoreQuoteAction`: se ela lê o orçamento ainda arquivado, recusa com 422
 * (`budget_archived`) e o usuário repete a ação, já com o orçamento de volta —
 * erro inofensivo, nada pousa em estado inválido. O restore só desfaz o arquivamento
 * e não cria filho ativo sob pai arquivado, que é o que o lock
 * existe para impedir. Mesma leitura da `RestoreCourseAction`.
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
