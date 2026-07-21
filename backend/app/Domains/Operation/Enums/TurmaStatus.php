<?php

namespace App\Domains\Operation\Enums;

/**
 * Estados PERSISTIDOS da turma. 'habilitada' não é estado de coluna: é
 * derivação em runtime (TurmaHabilitacaoService — doc RN-16 completa) sobre
 * uma turma em andamento. Conclusão é terminal (spec 6d, D5).
 */
enum TurmaStatus: string
{
    case EmAndamento = 'em_andamento';
    case Concluida = 'concluida';
}
