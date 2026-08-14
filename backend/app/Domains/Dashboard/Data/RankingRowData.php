<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Linha de ranking (curso ou cliente), seção do admin (spec §4.2). */
#[TypeScript]
class RankingRowData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public int $turmas,
        public int $matriculas,
        public int $certificados,
        public ?string $uf_aprovada,
    ) {}
}
