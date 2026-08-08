<?php

namespace App\Shared\Data;

/**
 * Identidade do contratante como o documento legal a imprime: razão social
 * (`clients.legal_name`, D12) + RUT do cadastro. Nasce em Shared porque
 * Operation, Commercial e Certification a projetam e `Data` de domínio é
 * camada interna (Regra A do DomainDependencyTest).
 */
final readonly class ContratanteData
{
    public function __construct(
        public string $name,
        public string $rut,
    ) {}
}
