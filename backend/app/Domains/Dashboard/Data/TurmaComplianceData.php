<?php

namespace App\Domains\Dashboard\Data;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaRequirement;
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
        /** @var TurmaDocumentType[] */
        public array $present_types,
        /** @var TurmaDocumentType[] só os bloqueantes. */
        public array $missing_types,
        /** @var TurmaDocumentType[] evaluaciones opcionais que faltam: aviso, não pendência. */
        public array $missing_optional_types,
        /** @var TurmaRequirement[] */
        public array $missing_requirements,
        public bool $habilitada,
        /** A turma já foi concluída: só entra na seção pelo aviso, depois do corte. */
        public bool $concluded,
    ) {}
}
