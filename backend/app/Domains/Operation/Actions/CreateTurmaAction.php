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
 */
class CreateTurmaAction
{
    public function execute(Quote $quote, TurmaData $data): Turma
    {
        if ($quote->status !== QuoteStatus::Approved) {
            throw TurmaConfiguracaoException::cotacaoNaoAprovada();
        }
        if ($quote->turma()->exists()) {
            throw TurmaConfiguracaoException::turmaJaExiste();
        }

        return DB::transaction(fn () => Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $quote->course_id,          // derivado da cotação
            'modalidade' => $data->modalidade,
            'local_aplicacao' => $data->local_aplicacao,
            'start_date' => $data->start_date,
            'end_date' => $data->end_date,
            'status' => TurmaStatus::EmAndamento,
        ]));
    }
}
