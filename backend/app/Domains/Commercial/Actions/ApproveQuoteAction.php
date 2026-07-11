<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;

/**
 * Aprova a cotação (Fluxo 2 — só superadmin, com aceite do cliente asserido).
 * Procedural: status + carimbo. O ator vem da auditoria (ADR-08).
 */
class ApproveQuoteAction
{
    public function execute(Quote $quote): Quote
    {
        $quote->update(['status' => QuoteStatus::Approved, 'approved_at' => now()]);

        return $quote;
    }
}
