<?php

namespace App\Console\CargaInicial;

use App\Shared\Support\FusoDoNegocio;
use Carbon\CarbonImmutable;

/**
 * O instante com que a carga carimba um registro que só tem DATA de calendário
 * (o `Fecha Curso` da planilha). Meio-dia do dia de Santiago, em UTC: nenhum
 * deslocamento de fuso (3h ou 4h, conforme o horário de verão) empurra o
 * registro para o dia vizinho, nem lido em UTC nem em Santiago.
 */
final class Instante
{
    public static function meioDia(string $data): CarbonImmutable
    {
        return FusoDoNegocio::inicioDoDia(CarbonImmutable::parse($data))->addHours(12);
    }
}
