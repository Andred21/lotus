<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Exclui (soft-delete) um orçamento e cascateia para as cotações (hook do model,
 * auditado instância a instância — ADR-08) na MESMA transação. Bloqueado se
 * houver cotação aprovada → 422; recuse antes.
 */
class DeleteBudgetAction
{
    public function execute(Budget $budget): void
    {
        if ($budget->quotes()->where('status', QuoteStatus::Approved)->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Orçamento com cotação aprovada não pode ser excluído. Recuse-a antes.',
            ]);
        }

        DB::transaction(fn () => $budget->delete());
    }
}
