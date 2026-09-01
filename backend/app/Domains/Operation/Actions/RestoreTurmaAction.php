<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Restaura a turma e, pelo hook `restored` do model, as matrículas e documentos
 * que a cascata de arquivamento marcou (spec D2).
 *
 * O PRIMEIRO GATE é o único do bloco que existe por causa de uma COLUNA DE
 * BANCO. `turmas.active_quote_id` é gerada STORED — `CASE WHEN deleted_at IS
 * NULL THEN quote_id END` — e tem `UNIQUE`. Como `CreateTurmaAction` checa
 * `$quote->turma()->exists()` sobre um `hasOne` SEM `withTrashed`, esta
 * sequência é alcançável hoje:
 *
 *     arquivo A (cotação Q) → crio B da mesma Q (permitido) → restauro A
 *         → active_quote_id = Q nas duas → SQLSTATE[23000] → 500
 *
 * Deixar o banco recusar significa 500 numa operação de usuário sobre dado com
 * peso legal. O gate faz a mesma pergunta ANTES e devolve 422 com o que fazer.
 *
 * O LOCK É DA COTAÇÃO, não da turma, e isso é o achado do review de 2026-08-19
 * (Q-5): a linha disputada é a que o `UNIQUE` protege. Travar a turma que volta
 * enquanto se pergunta sobre a IRMÃ é check-then-act — `CreateTurmaAction`
 * criando turma da mesma cotação entre a checagem e o `restore()` reabria o
 * 23000 que o gate existe para converter em 422. Os dois caminhos agora travam
 * `Quote::lockRow()`; um lado só é meio mutex (P-47). A turma continua travada
 * também: ela é o registro escrito, e a ordem turma → cotação é a mesma nos dois
 * sítios que tomam os dois locks, então não há ciclo.
 *
 * `$locked->quote->turma()` é exatamente a checagem certa: `Quote::turma()` é
 * `hasOne` sem `withTrashed`, então só enxerga turma VIVA — que é o que o
 * `UNIQUE` da coluna gerada também enxerga.
 *
 * O SEGUNDO GATE fecha o gate da spec D3 na direção inversa (Q-6 do mesmo
 * review). `ArchiveRedatorAction` recusa arquivar redator com turma EM
 * ANDAMENTO, mas `Redator::turmas()` não enxerga turma arquivada — de propósito,
 * porque turma arquivada não é trabalho pendente. Sem este gate, três passos
 * legítimos furavam o primeiro:
 *
 *     arquivo a turma em andamento → arquivo o redator (o gate passa: a turma
 *         dele está arquivada) → restauro a turma
 *             → turma EM ANDAMENTO com redator arquivado, que é `User` sem login
 *
 * Turma CONCLUÍDA não entra no gate, e a assimetria é a mesma do arquivar: é
 * nela que o certificado é emitido, e a emissão já lê redator arquivado pelo
 * `Turma::redatores()->withTrashed()` da spec D3. Recusar ali quebraria o
 * caminho legal que o bloco existe para proteger. Hoje a RN-15 só deixa
 * arquivar turma EM ANDAMENTO, então a condição é sempre verdadeira no caminho
 * existente — ela está escrita para que, no dia em que turma concluída puder ser
 * arquivada, o gate não leve a emissão junto.
 *
 * Contraste que vale registrar: `seq_in_budget` da cotação NÃO tem o problema do
 * primeiro gate, porque `CreateQuoteAction` deriva com
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

            $cotacao = Quote::lockRow($locked->quote_id);

            if ($cotacao->turma()->exists()) {
                throw ValidationException::withMessages([
                    'turma' => __('operation.turma.restore_conflict'),
                ]);
            }

            if ($locked->status === TurmaStatus::EmAndamento
                && $locked->redatores()->whereNotNull('redatores.deleted_at')->exists()) {
                throw ValidationException::withMessages([
                    'turma' => __('operation.turma.restore_redator_archived'),
                ]);
            }

            $locked->restore();

            return $locked;
        });
    }
}
