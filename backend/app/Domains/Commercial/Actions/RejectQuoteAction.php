<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;

/**
 * Recusa a cotação (Fluxo 2 — só superadmin). Zera approved_at. A cotação
 * recusada é reabrível: um update posterior a volta a pending (UpdateQuoteAction).
 */
class RejectQuoteAction
{
    public function execute(Quote $quote): Quote
    {
        $quote->update(['status' => QuoteStatus::Rejected, 'approved_at' => null]);

        return $quote;
    }
}
