<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Total mensal em UF de uma série do dashboard (spec §4.2). */
#[TypeScript]
class MonthlyAmountData extends Data
{
    public function __construct(
        /** Formato `YYYY-MM`. */
        public string $month,
        public string $total_uf,
    ) {}
}
