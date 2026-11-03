<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Exclui (soft-delete) um orçamento e cascateia para as cotações (hook do model,
 * auditado instância a instância — ADR-08) na MESMA transação. Bloqueado se
 * houver cotação aprovada → 422.
 *
 * P-49 (spec D4/D5): a transação trava o orçamento (`Budget::lockRow`) e depois
 * as cotações dele, e só então decide "há aprovada?" e arquiva. Decidir fora do
 * lock deixava uma aprovação concorrente passar entre a checagem e o `delete()`.
 * Ordem: orçamento primeiro, cotação depois — a mesma de todo o eixo.
 */
class DeleteBudgetAction
{
    public function execute(Budget $budget): void
    {
        DB::transaction(function () use ($budget) {
            $locked = Budget::lockRow($budget->id);

            // No-op idempotente: alguém arquivou entre o binding e a transação.
            if ($locked->trashed()) {
                return;
            }

            // Trava as cotações vivas do orçamento: quem aprova toma o lock da
            // cotação, então a leitura abaixo é a do estado já commitado.
            $quotes = $locked->quotes()->lockForUpdate()->get();

            if ($quotes->contains(fn ($q) => $q->status === QuoteStatus::Approved)) {
                throw ValidationException::withMessages([
                    'status' => __('commercial.budget.approved_cannot_delete'),
                ]);
            }

            $locked->delete();
        });
    }
}
