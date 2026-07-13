<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Cria a cotação sob um orçamento. `seq_in_budget` é atômico: lockForUpdate no
 * MAX(seq) do orçamento dentro da transação (ADR-17). O UNIQUE(budget_id,seq) é
 * a defesa extra. Cliente vem do orçamento (não é input).
 */
class CreateQuoteAction
{
    public function execute(Budget $budget, QuoteData $data): Quote
    {
        return DB::transaction(function () use ($budget, $data) {
            $seq = (int) Quote::withTrashed()
                ->where('budget_id', $budget->id)
                ->lockForUpdate()
                ->max('seq_in_budget') + 1;

            return Quote::create([
                'budget_id' => $budget->id,
                'course_id' => $data->course_id,
                'seq_in_budget' => $seq,
                'student_count' => $data->student_count,
                'value_uf' => $data->value_uf,
                'purchase_order' => $data->purchase_order instanceof Optional ? null : $data->purchase_order,
                'planned_start_date' => $data->planned_start_date instanceof Optional ? null : $data->planned_start_date,
                'planned_end_date' => $data->planned_end_date instanceof Optional ? null : $data->planned_end_date,
                'status' => QuoteStatus::Pending,
            ]);
        });
    }
}
