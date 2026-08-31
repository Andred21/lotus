<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Exclui (soft-delete) uma cotação e cascateia para os anexos (hook do model,
 * auditado instância a instância — ADR-08). Cotação aprovada é imutável
 * (excluir desincronizaria a futura turma) → 422; recuse antes.
 *
 * A TRANSAÇÃO chegou com a cascata (spec D9): enquanto isto era escrita única
 * ela não fazia falta, mas enumerar-e-apagar sem transação é check-then-act — a
 * falha no meio deixa anexo arquivado sob cotação ativa. Em sqlite o lock é
 * no-op, então errar aqui só apareceria em MySQL.
 */
class DeleteQuoteAction
{
    public function execute(Quote $quote): void
    {
        if ($quote->status === QuoteStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => __('commercial.quote.approved_cannot_delete'),
            ]);
        }

        DB::transaction(fn () => $quote->delete());
    }
}
