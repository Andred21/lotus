<?php

namespace App\Domains\Commercial\Actions;

use App\Domains\Commercial\Models\Quote;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Restaura a cotação e, pelo hook `restored` do model, os anexos que a cascata
 * marcou.
 *
 * O GATE DO PAI é a mesma pergunta que a spec D10 faz do outro lado da tela: a
 * lista de staff filtra `type === 'admin'` para não deixar restaurar isolado um
 * usuário que só existe como filho de cascata. Aqui a rota do restore é PLANA
 * (`POST /quotes/{quote}/restore`, spec D5) e o binding não passa pelo
 * orçamento, então sem o gate esta sequência é alcançável:
 *
 *     arquivo o orçamento (cotação desce marcada) → restauro só a cotação
 *         → cotação ATIVA sob orçamento arquivado
 *
 * O estado resultante é invisível na interface — o detalhe do pai é resolvido
 * por binding padrão e devolve 404 —, mas a cotação segue aprovável por
 * `POST /quotes/{quote}/approve`, e cotação aprovada origina turma. Filho ativo
 * sob pai arquivado é exatamente o que a cascata existe para impedir; restaurar
 * o pai primeiro devolve a cotação junto, sem passar por aqui.
 *
 * SEM lock sobre o orçamento, e a assimetria é declarada: `DeleteBudgetAction`
 * também não toma nenhum (P8 do plano), então travar só deste lado criaria a
 * ilusão de mutex sobre uma janela que continua aberta do outro. A janela
 * residual — arquivar o orçamento entre a checagem e o `restore()` — é a mesma
 * classe da P-47 e está registrada lá.
 *
 * `Quote` é o primeiro model deste código que é AO MESMO TEMPO filho de
 * cascata (do orçamento) e raiz com endpoint próprio de restore. Por isso,
 * depois de `restore()`, a marca `archived_with_parent` é apagada aqui do
 * mesmo jeito que `ArchivesChildren::restoreAndUnmark` apaga na cascata: com o
 * gate acima ela deveria estar sempre em `false` neste ponto — cotação marcada
 * implica orçamento arquivado, que o gate recusa —, e a limpeza fica como
 * garantia de que nenhuma marca sobrevive a um restore individual (spec D2). O
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

            // `Quote::budget()` é `withTrashed()`, então a leitura enxerga o
            // orçamento arquivado — que é justamente o caso a recusar.
            if ($quote->budget->trashed()) {
                throw ValidationException::withMessages([
                    'quote' => __('commercial.quote.budget_archived'),
                ]);
            }

            $quote->restore();
            $quote->archived_with_parent = false;
            $quote->saveQuietly();

            return $quote->loadListingData();
        });
    }
}
