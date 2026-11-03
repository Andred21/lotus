<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Models\Budget;
use App\Shared\Data\WritableAttributes;
use Illuminate\Support\Facades\DB;

/**
 * Atualiza o orçamento. `code` e `client_id` são imutáveis: só `payment_terms`
 * muda por aqui. Ausente no corpo não mexe; `null` explícito apaga.
 */
class UpdateBudgetAction
{
    public function execute(Budget $budget, BudgetData $data): Budget
    {
        return DB::transaction(function () use ($budget, $data) {
            $budget->update(WritableAttributes::from([
                'payment_terms' => $data->payment_terms,
            ]));

            return $budget;
        });
    }
}
