<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Exceptions\TurmaConfiguracaoException;
use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Facades\DB;

/**
 * Configura a turma a partir de uma cotação aprovada (passo manual, não no
 * approve). `course_id` deriva da cotação — nunca do payload. Nasce em_andamento.
 *
 * As DUAS checagens moram DENTRO da transação, depois de `Quote::lockRow()`, e
 * isso é o outro lado do gate da `RestoreTurmaAction` (spec D1). A linha
 * disputada é a COTAÇÃO: `turmas.active_quote_id` é gerada STORED sobre
 * `quote_id` e tem `UNIQUE`, então "já existe turma viva desta cotação" é uma
 * pergunta que dois caminhos fazem — criar e restaurar. Enquanto a checagem
 * vivia fora da transação, criar e restaurar concorrentes passavam os dois e o
 * banco recusava o segundo com `SQLSTATE[23000]` → 500. Lock dos dois lados
 * sobre a MESMA linha é o que fecha a janela; um lado só é meio mutex (P-47).
 */
class CreateTurmaAction
{
    public function execute(Quote $quote, TurmaData $data): Turma
    {
        return DB::transaction(function () use ($quote, $data) {
            $locked = Quote::lockRow($quote->id);

            if ($locked->status !== QuoteStatus::Approved) {
                throw TurmaConfiguracaoException::cotacaoNaoAprovada();
            }
            if ($locked->turma()->exists()) {
                throw TurmaConfiguracaoException::turmaJaExiste();
            }

            return Turma::create([
                'quote_id' => $locked->id,
                'course_id' => $locked->course_id,          // derivado da cotação
                'modalidade' => $data->modalidade,
                'local_aplicacao' => $data->local_aplicacao,
                'start_date' => $data->start_date,
                'end_date' => $data->end_date,
                'status' => TurmaStatus::EmAndamento,
            ]);
        });
    }
}
