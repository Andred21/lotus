<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Histórico consolidado do redator (spec §4.2). */
#[TypeScript]
class RedatorHistoricoData extends Data
{
    public function __construct(
        public int $turmas_concluidas,
        public int $certificados_emitidos,
    ) {}
}
