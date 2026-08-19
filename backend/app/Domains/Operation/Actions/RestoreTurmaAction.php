<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Restaura a turma e, pelo hook `restored` do model, as matrículas e documentos
 * que a cascata de arquivamento marcou (spec D2).
 *
 * O GATE é o único do bloco que existe por causa de uma COLUNA DE BANCO.
 * `turmas.active_quote_id` é gerada STORED — `CASE WHEN deleted_at IS NULL THEN
 * quote_id END` — e tem `UNIQUE`. Como `CreateTurmaAction` checa
 * `$quote->turma()->exists()` sobre um `hasOne` SEM `withTrashed`, esta sequência
 * é alcançável hoje:
 *
 *     arquivo A (cotação Q) → crio B da mesma Q (permitido) → restauro A
 *         → active_quote_id = Q nas duas → SQLSTATE[23000] → 500
 *
 * Deixar o banco recusar significa 500 numa operação de usuário sobre dado com
 * peso legal. O gate faz a mesma pergunta ANTES e devolve 422 com o que fazer.
 *
 * `$turma->quote->turma()` é exatamente a checagem certa: `Quote::turma()` é
 * `hasOne` sem `withTrashed`, então só enxerga turma VIVA — que é o que o
 * `UNIQUE` da coluna gerada também enxerga.
 *
 * Contraste que vale registrar: `seq_in_budget` da cotação NÃO tem esse
 * problema, porque `CreateQuoteAction` deriva com
 * `Quote::withTrashed()->max(...) + 1`. A D4 do molde ("conflito de unicidade
 * não é alcançável") continua verdadeira para `Client`, `Course` e `Quote`; é
 * falsa só para `Turma` (spec D1).
 */
class RestoreTurmaAction
{
    public function execute(Turma $turma): Turma
    {
        return DB::transaction(function () use ($turma) {
            $locked = Turma::lockRow($turma->id);

            // No-op idempotente: a rota resolve por `onlyTrashed()`, então chegar
            // aqui com registro ativo significa que alguém restaurou entre o
            // binding e o lock. Restaurar duas vezes não é erro.
            if (! $locked->trashed()) {
                return $locked;
            }

            if ($locked->quote->turma()->exists()) {
                throw ValidationException::withMessages([
                    'turma' => 'Ya existe una clase activa para esta cotización: archívala antes de restaurar esta.',
                ]);
            }

            $locked->restore();

            return $locked;
        });
    }
}
