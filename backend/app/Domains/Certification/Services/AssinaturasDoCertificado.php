<?php

namespace App\Domains\Certification\Services;

/** As duas assinaturas do certificado: a gerente da OTEC e o instrutor da turma. */
final readonly class AssinaturasDoCertificado
{
    public function __construct(
        public AssinaturaImpressa $gerente,
        public AssinaturaImpressa $instrutor,
    ) {}
}
