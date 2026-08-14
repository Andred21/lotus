<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * KPIs do topo do dashboard do admin (spec §4.2). `cotacoes` e
 * `certificados_a_emitir` nulos = seção não autorizada (gate por permissão).
 */
#[TypeScript]
class AdminKpisData extends Data
{
    public function __construct(
        public int $turmas_em_andamento,
        public int $turmas_encerrando_em_breve,
        public int $turmas_atrasadas,
        public int $conclusoes_por_confirmar,
        public ?QuoteKpisData $cotacoes,
        public ?int $certificados_a_emitir,
    ) {}
}
