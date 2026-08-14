<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Carga de trabalho de um redator, seção do admin (spec §4.2). */
#[TypeScript]
class RedatorLoadData extends Data
{
    public function __construct(
        public int $redator_id,
        public string $name,
        public int $current_turmas,
        public int $upcoming_turmas,
        public int $expired_documents,
        public int $expiring_documents,
    ) {}
}
