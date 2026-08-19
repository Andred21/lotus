<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Quote;
use Illuminate\Support\Facades\DB;

/**
 * Restaura a cotação e, pelo hook `restored` do model, os anexos que a cascata
 * marcou.
 *
 * SEM gate de unicidade, e o contraste é medido (spec D1): `seq_in_budget` é
 * derivado com `Quote::withTrashed()->max(...)` em `CreateQuoteAction:22`, então
 * a cotação arquivada continua ocupando o número e nenhuma nova o reaproveita.
 * `Turma` é o único root onde o conflito é alcançável.
 *
 * SEM gate de status tampouco: cotação aprovada nem chega a ser arquivada
 * (`DeleteQuoteAction` recusa antes), então não existe arquivada aprovada para
 * restaurar.
 */
class RestoreQuoteAction
{
    public function execute(Quote $quote): Quote
    {
        return DB::transaction(function () use ($quote) {
            // No-op idempotente: alguém restaurou entre o binding e a transação.
            if (! $quote->trashed()) {
                return $quote->loadListingData();
            }

            $quote->restore();

            return $quote->loadListingData();
        });
    }
}
