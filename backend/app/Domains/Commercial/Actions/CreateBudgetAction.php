<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Models\Budget;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cria o orçamento e gera o código de rastreio "Scap {id}" (ADR-17) na MESMA
 * transação — o id só existe após o insert. Código é imutável daqui em diante.
 */
class CreateBudgetAction
{
    public function execute(BudgetData $data): Budget
    {
        return DB::transaction(function () use ($data) {
            $budget = Budget::create([
                'client_id' => $data->client_id,
                'payment_terms' => $data->payment_terms instanceof Optional ? null : $data->payment_terms,
            ]);

            $budget->update(['code' => "Scap {$budget->id}"]);

            return $budget->load('quotes');
        });
    }
}
