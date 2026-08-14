<?php

namespace App\Domains\Dashboard\Enums;

/**
 * Severidade de pendências e alertas do dashboard.
 *
 * Derivação fixa (aplicada pelas tasks que montam `PendingItemData`/`AlertData`,
 * não por este enum): `Expired`/`Overdue` => `High`; `ExpiringSoon` => `Medium`;
 * resto => `Normal`.
 */
enum DashboardSeverity: string
{
    case High = 'high';
    case Medium = 'medium';
    case Normal = 'normal';
}
