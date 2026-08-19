<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `BudgetData` NÃO muda, então o contrato da listagem
 * ativa fica intacto e nenhum campo anulável de arquivamento o polui (D8 do
 * molde). Gêmeo de `ArchivedClientData`.
 */
#[TypeScript]
class ArchivedBudgetData extends Data
{
    public function __construct(
        public BudgetData $budget,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
