<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Linha de compliance documental de uma turma, seção do admin (spec §4.2). */
#[TypeScript]
class TurmaComplianceData extends Data
{
    public function __construct(
        public int $turma_id,
        public string $course_name,
        /** @var string[] */
        public array $redatores,
        public string $start_date,
        public string $end_date,
        /** @var string[] */
        public array $present_types,
        /** @var string[] */
        public array $missing_types,
        public bool $habilitada,
    ) {}
}
