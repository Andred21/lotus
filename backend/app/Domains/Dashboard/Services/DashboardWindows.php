<?php

namespace App\Domains\Dashboard\Services;

use Carbon\CarbonImmutable;

/**
 * Janelas de tempo fixas do dashboard (spec §4.2). `turmaHorizon()` delimita
 * "encerrando em breve"/"vencendo em breve" de turma; `expiryHorizon()` faz o
 * mesmo para validade de certificado e documento de redator.
 */
final class DashboardWindows
{
    public const TURMA_WINDOW_DAYS = 7;

    public const EXPIRY_WINDOW_DAYS = 30;

    public static function turmaHorizon(): CarbonImmutable
    {
        return CarbonImmutable::now()->addDays(self::TURMA_WINDOW_DAYS)->endOfDay();
    }

    public static function expiryHorizon(): CarbonImmutable
    {
        return CarbonImmutable::now()->addDays(self::EXPIRY_WINDOW_DAYS)->endOfDay();
    }
}
