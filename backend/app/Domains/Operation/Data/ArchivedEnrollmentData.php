<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `EnrollmentData` NÃO muda, então o contrato da
 * listagem ativa fica intacto e nenhum campo anulável de arquivamento o polui
 * (molde D8).
 */
#[TypeScript]
class ArchivedEnrollmentData extends Data
{
    public function __construct(
        public EnrollmentData $enrollment,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
