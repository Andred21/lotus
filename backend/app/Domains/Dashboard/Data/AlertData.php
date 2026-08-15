<?php

namespace App\Domains\Dashboard\Data;

use App\Domains\Dashboard\Enums\DashboardAlertType;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Um alerta do dashboard (spec §4.2). */
#[TypeScript]
class AlertData extends Data
{
    public function __construct(
        public DashboardAlertType $type,
        public DashboardSeverity $severity,
        public int $entity_id,
        public string $description,
        public ?string $date,
        /** @var array<string,int> */
        public array $navigation,
    ) {}
}
