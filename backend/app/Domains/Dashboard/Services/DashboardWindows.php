<?php

namespace App\Domains\Dashboard\Services;

use App\Shared\Support\JanelaDeAviso;
use Carbon\CarbonImmutable;

/**
 * Janelas de tempo fixas do dashboard (spec §4.2). `turmaHorizon()` delimita
 * "encerrando em breve"/"vencendo em breve" de turma; `expiryHorizon()` faz o
 * mesmo para validade de certificado e documento de redator, e os 30 dias dele
 * são os de `JanelaDeAviso::DIAS` (D-15) — o mesmo número que a listagem de
 * certificados e o status do documento de redator usam.
 */
final class DashboardWindows
{
    public const TURMA_WINDOW_DAYS = 7;

    public static function turmaHorizon(): CarbonImmutable
    {
        return CarbonImmutable::now()->addDays(self::TURMA_WINDOW_DAYS)->endOfDay();
    }

    public static function expiryHorizon(): CarbonImmutable
    {
        return CarbonImmutable::now()->addDays(JanelaDeAviso::DIAS)->endOfDay();
    }
}
