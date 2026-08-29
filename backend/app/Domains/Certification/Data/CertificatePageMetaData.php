<?php

namespace App\Domains\Certification\Data;

use App\Shared\Pagination\PageMetaData;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O `meta` de `/api/certificates`: o contrato de página mais o resumo por
 * estado (spec D6). Extensão tipada, não campo solto — o front casa
 * `Page<CertificateData, CertificatePageMetaData>`.
 */
#[TypeScript]
class CertificatePageMetaData extends PageMetaData
{
    public function __construct(
        int $page,
        int $per_page,
        int $total,
        int $last_page,
        int $total_unfiltered,
        public CertificateSummaryData $summary,
    ) {
        parent::__construct($page, $per_page, $total, $last_page, $total_unfiltered);
    }

    public static function withSummary(PageMetaData $meta, CertificateSummaryData $summary): self
    {
        return new self($meta->page, $meta->per_page, $meta->total, $meta->last_page, $meta->total_unfiltered, $summary);
    }
}
