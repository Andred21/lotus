<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Turma na agenda do admin — inclui `client_name` (uso exclusivo do admin, spec §4.2/D5). */
#[TypeScript]
class AgendaTurmaData extends Data
{
    public function __construct(
        public int $turma_id,
        public string $course_name,
        public ?string $client_name,
        public string $start_date,
        public string $end_date,
    ) {}
}
