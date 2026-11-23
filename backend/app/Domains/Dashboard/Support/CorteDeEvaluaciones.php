<?php

namespace App\Domains\Dashboard\Support;

use App\Shared\Support\FusoDoNegocio;
use Carbon\CarbonImmutable;

/**
 * O dia a partir do qual a falta de uma evaluación opcional (cliente, alunos)
 * vira AVISO numa turma já concluída (bloco 60). A turma concluída antes dele
 * nasceu sem a regra e não é cobrada.
 *
 * Data de calendário do negócio, não instante: `inicio()` a converte pelo
 * `FusoDoNegocio`, o mesmo limite que o resto do dashboard usa para filtrar
 * coluna `datetime` por dia.
 */
final class CorteDeEvaluaciones
{
    /** `Y-m-d`, dia do negócio. Data prevista do merge do bloco 60, conferida no `/finalizar-bloco`. */
    public const DESDE = '2026-11-24';

    /** O primeiro instante do dia `DESDE`, no fuso do negócio. */
    public static function inicio(): CarbonImmutable
    {
        return FusoDoNegocio::inicioDoDia(CarbonImmutable::parse(self::DESDE));
    }
}
