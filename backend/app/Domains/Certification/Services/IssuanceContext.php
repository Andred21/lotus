<?php

namespace App\Domains\Certification\Services;

use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Operation\Models\Turma;

/**
 * O que a emissão precisa depois que as portas abriram — já resolvido pelo
 * `CertificateEligibility`, para a Action não reconsultar template nem cidade
 * e arriscar responder diferente da porta que acabou de passar.
 */
class IssuanceContext
{
    public function __construct(
        public readonly Turma $turma,
        public readonly CourseCertificateTemplate $template,
        public readonly string $ciudadEmision,
    ) {}
}
