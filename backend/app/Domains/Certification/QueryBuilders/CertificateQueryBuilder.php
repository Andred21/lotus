<?php

namespace App\Domains\Certification\QueryBuilders;

use App\Domains\Certification\Data\CertificateSummaryData;
use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Shared\Pagination\Paginates;
use App\Shared\Support\DataSql;
use App\Shared\Support\JanelaDeAviso;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
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

    /**
     * `hoje` é OPCIONAL aqui só para quem chama fora de `index` (ex.: um
     * console command). Dentro do request, `CertificateController::index`
     * calcula uma vez e passa para este método E para `summaryByDisplayStatus`
     * — nunca deixe os dois recalcularem por conta própria (achado de review
     * da Task 6: um request que atravessasse a meia-noite de Santiago entre as
     * duas chamadas produzia página e resumo que não fechavam entre si).
     */
    public function whereDisplayStatus(?CertificateDisplayStatus $status, ?CarbonInterface $hoje = null): static
    {
        if ($status === null) {
            return $this;
        }

        [$case, $bindings] = $this->displayStatusCase(($hoje ?? CertificateDisplayStatus::hoje())->toImmutable());

        return $this->whereRaw("({$case}) = ?", [...$bindings, $status->value]);
    }

    /**
     * Um `GROUP BY` sobre o escopo atual (sem o filtro de status — o resumo é
     * o que o usuário escolhe A PARTIR dele, spec §4.2). Clone: não mexe na
     * query que vai paginar.
     */
    public function summaryByDisplayStatus(?CarbonInterface $hoje = null): CertificateSummaryData
    {
        [$case, $bindings] = $this->displayStatusCase(($hoje ?? CertificateDisplayStatus::hoje())->toImmutable());

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
     * O `CASE` e as bindings dele. `hoje` chega PRONTO — quem decide o
     * instante é o chamador (`whereDisplayStatus`/`summaryByDisplayStatus`),
     * nunca este método, para que o filtro e o resumo do mesmo request
     * compartilhem o mesmo `hoje`.
     *
     * `CarbonImmutable`, e não `CarbonInterface`: o `addDays()` da janela MUTA
     * um Carbon comum, e os dois chamadores passam o MESMO `$hoje` do request
     * — a segunda chamada calcularia `hoje + 2 × DIAS` e faria filtro, resumo e
     * `display_status` da linha deixarem de fechar entre si. É o achado da
     * Task 6 reaberto pela porta do tipo (Q-5 do review de 2026-08-29); hoje
     * `CertificateDisplayStatus::hoje()` devolve imutável, mas a segurança é do
     * tipo, não do acidente do chamador.
     *
     * @return array{0: string, 1: list<string>}
     */
    private function displayStatusCase(CarbonImmutable $hoje): array
    {
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
