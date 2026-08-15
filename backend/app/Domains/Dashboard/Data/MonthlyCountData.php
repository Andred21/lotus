<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Contagem mensal de uma série do dashboard (spec §4.2). */
#[TypeScript]
class MonthlyCountData extends Data
{
    public function __construct(
        /** Formato `YYYY-MM`. */
        public string $month,
        public int $count,
    ) {}
}
