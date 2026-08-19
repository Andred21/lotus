<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Composição, não extensão — gêmeo de `ArchivedBudgetData` (D8 do molde). */
#[TypeScript]
class ArchivedQuoteData extends Data
{
    public function __construct(
        public QuoteData $quote,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
