<?php

namespace App\Domains\Certification\Services;

use App\Domains\Certification\Data\CertificateExportQueryData;
use App\Domains\Certification\Data\CertificateExportSummaryData;
use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\QueryBuilders\CertificateQueryBuilder;
use App\Domains\Operation\Models\Turma;
use Illuminate\Support\Str;

/**
 * O conjunto que a exportação leva (spec §5.3): o da listagem com os mesmos
 * `q`, `display_status` e `quote_id`, todas as páginas, MENOS os revogados —
 * o link público de um revogado dá 410 e o documento não vale. Vencido e por
 * vencer entram.
 *
 * A query é uma só: o N do aviso (`summary`), as linhas da planilha e os PDFs
 * do ZIP saem do mesmo filtro — o cliente não re-deriva nada.
 */
class CertificateExportScope
{
    /** Os certificados exportados, em ordem de `codigo` (como no modelo da planilha). */
    public function query(CertificateExportQueryData $filtros): CertificateQueryBuilder
    {
        return $this->filtrado($filtros)
            ->where('certificates.status', CertificateStatus::Emitido)
            ->orderBy('certificates.codigo');
    }

    /** `total` = o que a exportação leva; `revocados` = os do mesmo filtro que ficam de fora. */
    public function summary(CertificateExportQueryData $filtros): CertificateExportSummaryData
    {
        $porStatus = $this->filtrado($filtros)
            ->toBase()
            ->selectRaw('certificates.status as status, count(*) as total')
            ->groupBy('certificates.status')
            ->pluck('total', 'status');

        return new CertificateExportSummaryData(
            total: (int) ($porStatus[CertificateStatus::Emitido->value] ?? 0),
            revocados: (int) ($porStatus[CertificateStatus::Revocado->value] ?? 0),
        );
    }

    /**
     * O nome do arquivo sem extensão: com a cotação do filtro,
     * `certificados-<código da cotação, em slug>` (`Quote::code`, ex.: `certificados-scap-190-r1`); sem ela, `certificados-<Y-m-d>`
     * (dia de Santiago). O código da cotação vem pela TURMA, que é aresta
     * declarada de Certification — `Commercial\Quote` não é.
     */
    public function nomeDoArquivo(CertificateExportQueryData $filtros): string
    {
        if ($filtros->quote_id !== null) {
            $quote = Turma::withTrashed()
                ->where('quote_id', $filtros->quote_id)
                ->with('quote')
                ->first()
                ?->quote;

            if ($quote !== null) {
                return 'certificados-'.Str::slug($quote->code);
            }
        }

        return 'certificados-'.CertificateDisplayStatus::hoje()->format('Y-m-d');
    }

    /** Os filtros da listagem, ainda sem o recorte de status de emissão. */
    private function filtrado(CertificateExportQueryData $filtros): CertificateQueryBuilder
    {
        $q = Certificate::query()->whereQuote($filtros->quote_id);

        $busca = trim((string) $filtros->q);
        if ($busca !== '') {
            $q->searchable($busca);
        }

        return $q->whereDisplayStatus($filtros->display_status);
    }
}
