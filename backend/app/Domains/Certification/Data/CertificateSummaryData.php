<?php

namespace App\Domains\Certification\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Contagem por `display_status` sobre o escopo de `q` (spec D6) — o rodapé
 * do Historial, que antes somava a lista inteira no cliente. */
#[TypeScript]
class CertificateSummaryData extends Data
{
    public function __construct(
        public int $vigente,
        public int $por_vencer,
        public int $vencido,
        public int $revocado,
    ) {}
}
