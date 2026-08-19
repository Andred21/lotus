<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Quote;
use Illuminate\Support\Facades\DB;

/**
 * Restaura a cotação e, pelo hook `restored` do model, os anexos que a cascata
 * marcou.
 *
 * `Quote` é o primeiro model deste código que é AO MESMO TEMPO filho de
 * cascata (do orçamento) e raiz com endpoint próprio de restore. Por isso,
 * depois de `restore()`, a marca `archived_with_parent` é apagada aqui do
 * mesmo jeito que `ArchivesChildren::restoreAndUnmark` apaga na cascata: sem
 * isso, restaurar a cotação sozinha deixaria a marca `true` presa nela, e uma
 * cascata futura do orçamento (arquivar → restaurar) a devolveria por engano,
 * mesmo que ela tivesse sido arquivada de novo por vontade própria depois —
 * exatamente o modo de falha que a marca existe para impedir (spec D2). O
 * `saveQuietly()` não emite evento; o evento que importa é o `restored` que
 * `restore()` já audita (ADR-08).
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
            $quote->archived_with_parent = false;
            $quote->saveQuietly();

            return $quote->loadListingData();
        });
    }
}
