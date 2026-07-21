<?php

namespace App\Domains\Operation\Enums;

/**
 * Estados da turma (máquina de 3 estados). 6b só nasce em EmAndamento;
 * Habilitada/Concluida são transições do 6d (conclusão).
 */
enum TurmaStatus: string
{
    case EmAndamento = 'em_andamento';
    case Habilitada = 'habilitada';
    case Concluida = 'concluida';
}
