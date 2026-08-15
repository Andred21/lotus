<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Resumo do topo do dashboard do redator (spec §4.2). */
#[TypeScript]
class RedatorResumoData extends Data
{
    public function __construct(
        public int $turmas_em_andamento,
        public int $proximas_turmas,
        public int $pendencias_documentais,
        public int $documentos_vencendo,
    ) {}
}
