<?php

namespace App\Domains\Dashboard\Data;

use App\Domains\Dashboard\Enums\DashboardModule;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Dashboard\Enums\PendingItemType;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Uma pendência acionável do dashboard do admin (spec §4.2). */
#[TypeScript]
class PendingItemData extends Data
{
    public function __construct(
        public DashboardModule $module,
        public PendingItemType $type,
        public DashboardSeverity $severity,
        public int $entity_id,
        public string $description,
        public ?string $date,
        /** @var array<string,int> */
        public array $navigation,
    ) {}
}
