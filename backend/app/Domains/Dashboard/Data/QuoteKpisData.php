<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** KPIs de cotação, seção do admin (spec §4.2). */
#[TypeScript]
class QuoteKpisData extends Data
{
    public function __construct(
        public int $pending_count,
        public string $pending_value_uf,
    ) {}
}
