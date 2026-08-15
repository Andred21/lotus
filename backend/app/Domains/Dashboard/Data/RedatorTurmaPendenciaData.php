<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Pendência documental de uma turma do redator (spec §4.2). */
#[TypeScript]
class RedatorTurmaPendenciaData extends Data
{
    public function __construct(
        public int $turma_id,
        public string $course_name,
        public string $end_date,
        /** @var string[] */
        public array $missing_types,
    ) {}
}
