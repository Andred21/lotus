<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Turma na agenda do redator — SEM `client_name`, por construção do tipo
 * (spec §4.2/D5): o payload do redator não pode carregar nome de cliente.
 */
#[TypeScript]
class RedatorAgendaTurmaData extends Data
{
    public function __construct(
        public int $turma_id,
        public string $course_name,
        public string $start_date,
        public string $end_date,
    ) {}
}
