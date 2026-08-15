<?php

namespace App\Domains\Dashboard\Enums;

/** Domínio de origem de uma pendência do dashboard (spec §4.2). */
enum DashboardModule: string
{
    case Commercial = 'commercial';
    case Operation = 'operation';
    case Certification = 'certification';
}
