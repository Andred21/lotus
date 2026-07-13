<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Edita uma cotação. Cotação aprovada é imutável (editar desincronizaria a
 * futura turma) → 422. Editar uma recusada a REABRE para pending (decisão do
 * produto: recusada é reabrível).
 */
class UpdateQuoteAction
{
    public function execute(Quote $quote, QuoteData $data): Quote
    {
        if ($quote->status === QuoteStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => 'Cotação aprovada não pode ser editada.',
            ]);
        }

        $quote->update([
            'course_id' => $data->course_id,
            'student_count' => $data->student_count,
            'value_uf' => $data->value_uf,
            'purchase_order' => $data->purchase_order instanceof Optional ? null : $data->purchase_order,
            'planned_start_date' => $data->planned_start_date instanceof Optional ? null : $data->planned_start_date,
            'planned_end_date' => $data->planned_end_date instanceof Optional ? null : $data->planned_end_date,
            'status' => QuoteStatus::Pending,   // reabre recusada; mantém pendente
        ]);

        return $quote;
    }
}
