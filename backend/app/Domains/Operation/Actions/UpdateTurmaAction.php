<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Operation\Data\TurmaData;
use App\Domains\Operation\Models\Turma;

/**
 * Edita só os campos configuráveis da turma (modalidade, local, datas). Nunca
 * toca status (6d), quote_id nem course_id (imutáveis pós-criação).
 */
class UpdateTurmaAction
{
    public function execute(Turma $turma, TurmaData $data): Turma
    {
        $turma->update([
            'modalidade' => $data->modalidade,
            'local_aplicacao' => $data->local_aplicacao,
            'start_date' => $data->start_date,
            'end_date' => $data->end_date,
        ]);

        return $turma->load('redatores.user');
    }
}
