<?php

namespace App\Domains\Certification\QueryBuilders;

use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do certificado: `CertificateData::fromModel` lê a foto VIVA do
 * aluno (`aluno_photo_url`, D4 revertida em 2026-08-14) atravessando
 * matrícula→aluno→user, e a lista do que carregar mora AQUI, não em cada
 * caller (B5). O `index` já tinha escrito a travessia inline; `show`, `store`
 * e `revoke` projetam o MESMO DTO e lazy-loadavam as três relações em
 * silêncio.
 */
class CertificateQueryBuilder extends Builder
{
    public const LISTING = ['enrollment.student.user'];

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }
}
