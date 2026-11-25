<?php

namespace App\Domains\Certification\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O número do aviso de exportação ("Se exportarán N certificados…"), vindo do
 * servidor, da mesma query que exporta: o cliente não re-deriva (spec §5.3).
 * `revocados` são os do mesmo filtro que ficam de fora.
 */
#[TypeScript]
class CertificateExportSummaryData extends Data
{
    public function __construct(
        public int $total,
        public int $revocados,
    ) {}
}
