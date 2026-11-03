<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Commercial\Services\QuoteLifecycle;
use App\Shared\Data\WritableAttributes;
use Illuminate\Support\Facades\DB;

/**
 * Edita uma cotação sob o guardião (`QuoteLifecycle::lockToEdit`, spec D2).
 * Editar uma recusada a REABRE para pending (decisão do produto: recusada é
 * reabrível); a pendente continua pendente. A aprovada só é editável por quem
 * tem `commercial.quote.approve` (`$podeGerirAprovada`, passado pelo
 * controller), continua aprovada e mantém o `approved_at`; com turma, só o
 * `value_uf` muda.
 */
class UpdateQuoteAction
{
    public function execute(Quote $quote, QuoteData $data, bool $podeGerirAprovada): Quote
    {
        return DB::transaction(function () use ($quote, $data, $podeGerirAprovada) {
            $locked = QuoteLifecycle::lockToEdit($quote->id, $data, $podeGerirAprovada);

            $attributes = [
                'course_id' => $data->course_id,
                'student_count' => $data->student_count,
                'value_uf' => $data->value_uf,
                'purchase_order' => $data->purchase_order,
                'planned_start_date' => $data->planned_start_date,
                'planned_end_date' => $data->planned_end_date,
            ];

            // Aprovada fica aprovada; recusada reabre; pendente se mantém.
            if ($locked->status !== QuoteStatus::Approved) {
                $attributes['status'] = QuoteStatus::Pending;
            }

            $locked->update(WritableAttributes::from($attributes));

            return $locked;
        });
    }
}
