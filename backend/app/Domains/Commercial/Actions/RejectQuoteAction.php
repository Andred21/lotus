<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Commercial\Services\QuoteLifecycle;
use Illuminate\Support\Facades\DB;

/**
 * Recusa a cotação (Fluxo 2 — só superadmin). Zera approved_at. A cotação
 * recusada é reabrível: um update posterior a volta a pending (UpdateQuoteAction).
 * O guardião (`QuoteLifecycle`) recusa quando já há turma ativa ou concluída.
 */
class RejectQuoteAction
{
    public function execute(Quote $quote): Quote
    {
        return DB::transaction(function () use ($quote) {
            $locked = QuoteLifecycle::lockToReject($quote->id);
            $locked->update(['status' => QuoteStatus::Rejected, 'approved_at' => null]);

            return $locked;
        });
    }
}
