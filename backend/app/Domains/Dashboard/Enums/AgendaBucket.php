<?php

namespace App\Domains\Dashboard\Enums;

enum AgendaBucket: string
{
    case Overdue = 'overdue';
    case Upcoming = 'upcoming';
    case EndingSoon = 'ending_soon';
    case InProgress = 'in_progress';
}
