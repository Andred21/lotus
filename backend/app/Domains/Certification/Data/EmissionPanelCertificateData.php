<?php

namespace App\Domains\Certification\Data;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O certificado como o painel de emissão precisa dele: o mínimo para dizer
 * "esta matrícula já tem documento" e abrir o PDF ou a revogação. O documento
 * inteiro (snapshot incluso) é o `CertificateData`, não este.
 */
#[TypeScript]
class EmissionPanelCertificateData extends Data
{
    public function __construct(
        public int $id,
        public string $codigo,
        public CertificateStatus $status,
    ) {}

    public static function fromModel(Certificate $certificate): self
    {
        return new self(
            id: $certificate->id,
            codigo: $certificate->codigo,
            status: $certificate->status,
        );
    }
}
