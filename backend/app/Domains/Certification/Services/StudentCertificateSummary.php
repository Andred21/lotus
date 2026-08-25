<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Enums\CertificateDisplayStatus;

/**
 * O certificado de UMA matrícula, como o resto do sistema tem permissão de
 * vê-lo. É a única superfície que `Identity` enxerga do documento (spec D3):
 * `Certificate`, `CertificateStatus` e o snapshot não cruzam a fronteira.
 *
 * Vive em `Services` porque é a camada pública da Regra A do
 * `DomainDependencyTest` — mesmo motivo, e mesmo lugar, de
 * `Operation\Services\AcademicResult`, que `Certification` consome por
 * type-hint. A camada `Data` é interna: o arch test a reprova ANTES de olhar a
 * matriz de arestas, e o repositório tem zero travessias de `Data`.
 *
 * `snapshotOk` viaja porque a tela precisa dele: documento corrompido não tem
 * estado a afirmar, e a célula troca a tag de estado pela de defeito.
 */
final readonly class StudentCertificateSummary
{
    public function __construct(
        public int $id,
        public string $codigo,
        public CertificateDisplayStatus $displayStatus,
        /** Data ISO (`Y-m-d`), ou `null` quando a vigência é indeterminada — o caso comum. */
        public ?string $validoAte,
        public bool $snapshotOk,
        /** Quantos certificados a matrícula já teve ANTES deste. */
        public int $supersededCount,
    ) {}
}
