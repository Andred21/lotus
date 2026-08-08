<?php

namespace App\Shared\Data;

/**
 * Identidade do contratante como o documento legal a imprime: razão social
 * (`clients.legal_name`, D12) + RUT do cadastro. Nasce em Shared porque
 * Operation, Commercial e Certification a projetam e `Data` de domínio é
 * camada interna (Regra A do DomainDependencyTest).
 *
 * `$rut` é nullable porque `users.rut` é nullable no schema, e cinco projeções
 * (TurmaData, PendingQuoteData, EmissionPanelTurmaData, ImportStudentsAction e o
 * Blade do manual) leem só o `$name`. Com `string` estrito, um RUT ausente
 * derrubava as cinco com TypeError — inclusive listagens que antes do seam
 * nunca tocavam o `User`. Quem PRECISA do RUT é a emissão: o
 * `SnapshotPartyData` também o aceita nullable e o certificado é quem decide
 * o que fazer com a falta.
 */
final readonly class ContratanteData
{
    public function __construct(
        public string $name,
        public ?string $rut,
    ) {}
}
