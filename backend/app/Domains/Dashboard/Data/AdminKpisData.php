<?php

namespace App\Domains\Dashboard\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * KPIs do topo do dashboard do admin (spec §4.2). **Todo campo nulo = não
 * autorizado**, nunca "não há" — os quatro de turma respondem a
 * `operation.turma.view`, `cotacoes` ao gate comercial e
 * `certificados_a_emitir` a `certification.certificate.view` (D7).
 */
#[TypeScript]
class AdminKpisData extends Data
{
    public function __construct(
        public ?int $turmas_em_andamento,
        public ?int $turmas_encerrando_em_breve,
        public ?int $turmas_atrasadas,
        public ?int $conclusoes_por_confirmar,
        public ?QuoteKpisData $cotacoes,
        public ?int $certificados_a_emitir,
    ) {}
}
