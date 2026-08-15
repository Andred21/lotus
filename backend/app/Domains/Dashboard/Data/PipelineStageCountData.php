<?php

namespace App\Domains\Dashboard\Data;

use App\Domains\Dashboard\Enums\PipelineStage;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Contagem de um estágio do funil (spec §4.2). */
#[TypeScript]
class PipelineStageCountData extends Data
{
    public function __construct(
        public PipelineStage $stage,
        public int $count,
    ) {}
}
