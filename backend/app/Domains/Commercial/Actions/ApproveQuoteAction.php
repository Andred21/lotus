<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Commercial\Services\QuoteLifecycle;
use Illuminate\Support\Facades\DB;

/**
 * Aprova a cotação (Fluxo 2 — só superadmin, com aceite do cliente asserido).
 * Procedural: status + carimbo, sobre a linha travada pelo guardião
 * (`QuoteLifecycle`). O ator vem da auditoria (ADR-08).
 */
class ApproveQuoteAction
{
    public function execute(Quote $quote): Quote
    {
        return DB::transaction(function () use ($quote) {
            $locked = QuoteLifecycle::lockToApprove($quote->id);
            $locked->update(['status' => QuoteStatus::Approved, 'approved_at' => now()]);

            return $locked;
        });
    }
}
