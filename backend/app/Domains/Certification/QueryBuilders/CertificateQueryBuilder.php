<?php

namespace App\Domains\Certification\QueryBuilders;

use App\Domains\Certification\Data\CertificateSummaryData;
use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Shared\Pagination\Paginates;
use App\Shared\Support\DataSql;
use App\Shared\Support\JanelaDeAviso;
use Illuminate\Database\Eloquent\Builder;

/**
 * Projeção do certificado: `CertificateData::fromModel` lê a foto VIVA do
 * aluno (`aluno_photo_url`, D4 revertida em 2026-08-14) atravessando
 * matrícula→aluno→user, e a lista do que carregar mora AQUI, não em cada
 * caller (B5).
 *
 * Desde o bloco `hardening-performance-e-dados` também pagina (spec D1): o
 * histórico é arquivo legal que só cresce. `display_status` vira SQL num
 * `CASE` único — o mesmo para o filtro e para o resumo — cuja paridade com
 * `CertificateDisplayStatus::for()` é catraca (`CertificateDisplayStatusParityTest`).
 * A ordem dos `WHEN` É a regra do enum: revogado antes de qualquer data; nulo
 * é vigente; anterior a hoje é vencido; HOJE ainda é vigente; até `DIAS` avisa.
 */
class CertificateQueryBuilder extends Builder
{
    use Paginates;

    public const LISTING = ['enrollment.student.user'];

    public const SORTABLE = [
        'created_at' => 'certificates.created_at',
        'codigo' => 'certificates.codigo',
        'valido_ate' => 'certificates.valido_ate',
    ];

    public const DEFAULT_SORT = '-created_at';

    public function withListingData(): static
    {
        return $this->with(self::LISTING);
    }

    /**
     * `codigo` e o aluno CONGELADO no snapshot (nome e RUT), por JSON path —
     * a listagem mostra o snapshot, então a busca varre o que a tela mostra.
     * Medido com `EXPLAIN` a 6k linhas na Task 12; se degradar, o plano B é
     * coluna gerada indexada (spec §4.2).
     */
    public function searchable(string $q): static
    {
        $like = '%'.addcslashes($q, '%_\\').'%';

        return $this->where(fn (Builder $w) => $w
            ->where('certificates.codigo', 'like', $like)
            ->orWhere('snapshot->aluno->name', 'like', $like)
            ->orWhere('snapshot->aluno->rut', 'like', $like));
    }

    public function whereDisplayStatus(?CertificateDisplayStatus $status): static
    {
        if ($status === null) {
            return $this;
        }

        [$case, $bindings] = $this->displayStatusCase();

        return $this->whereRaw("({$case}) = ?", [...$bindings, $status->value]);
    }

    /**
     * Um `GROUP BY` sobre o escopo atual (sem o filtro de status — o resumo é
     * o que o usuário escolhe A PARTIR dele, spec §4.2). Clone: não mexe na
     * query que vai paginar.
     */
    public function summaryByDisplayStatus(): CertificateSummaryData
    {
        [$case, $bindings] = $this->displayStatusCase();

        $contagens = (clone $this)
            ->reorder()
            ->selectRaw("({$case}) as display_status, count(*) as total", $bindings)
            ->groupBy('display_status')
            ->toBase()
            ->pluck('total', 'display_status');

        return new CertificateSummaryData(
            vigente: (int) ($contagens['vigente'] ?? 0),
            por_vencer: (int) ($contagens['por_vencer'] ?? 0),
            vencido: (int) ($contagens['vencido'] ?? 0),
            revocado: (int) ($contagens['revocado'] ?? 0),
        );
    }

    /**
     * O `CASE` e as bindings dele. `hoje` é calculado UMA vez por chamada, em
     * `America/Santiago`, como o `fromModel` faz.
     *
     * @return array{0: string, 1: list<string>}
     */
    private function displayStatusCase(): array
    {
        $hoje = CertificateDisplayStatus::hoje();
        $conexao = $this->getModel()->getConnection();
        $hojeSql = DataSql::literal($conexao, $hoje);
        $limiteSql = DataSql::literal($conexao, $hoje->addDays(JanelaDeAviso::DIAS));

        $case = 'CASE'
            .' WHEN certificates.status = ? THEN ?'
            .' WHEN certificates.valido_ate IS NULL THEN ?'
            .' WHEN certificates.valido_ate < ? THEN ?'
            .' WHEN certificates.valido_ate = ? THEN ?'
            .' WHEN certificates.valido_ate <= ? THEN ?'
            .' ELSE ? END';

        return [$case, [
            CertificateStatus::Revocado->value, CertificateDisplayStatus::Revocado->value,
            CertificateDisplayStatus::Vigente->value,
            $hojeSql, CertificateDisplayStatus::Vencido->value,
            $hojeSql, CertificateDisplayStatus::Vigente->value,
            $limiteSql, CertificateDisplayStatus::PorVencer->value,
            CertificateDisplayStatus::Vigente->value,
        ]];
    }
}
