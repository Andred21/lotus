<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Validation\ValidationException;

/**
 * Exclui (soft-delete) uma cotação. Cotação aprovada é imutável (excluir
 * desincronizaria a futura turma) → 422; recuse antes. Escrita única, sem
 * transação (mesmo padrão de UpdateQuoteAction).
 */
class DeleteQuoteAction
{
    public function execute(Quote $quote): void
    {
        if ($quote->status === QuoteStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => 'Cotação aprovada não pode ser excluída. Recuse-a antes.',
            ]);
        }

        $quote->delete();
    }
}
