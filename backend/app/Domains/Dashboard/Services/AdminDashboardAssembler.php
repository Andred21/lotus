<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\AdminDashboardData;
use App\Domains\Dashboard\Data\AdminKpisData;
use App\Domains\Dashboard\Data\AgendaTurmaData;
use App\Domains\Dashboard\Data\AlertData;
use App\Domains\Dashboard\Data\DashboardFilterData;
use App\Domains\Dashboard\Data\PendingItemData;
use App\Domains\Dashboard\Data\RankingsData;
use App\Domains\Dashboard\Data\SeriesData;
use App\Domains\Dashboard\Enums\DashboardAlertType;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Identity\Models\User;
use Carbon\CarbonImmutable;

/**
 * Monta o payload do admin aplicando os gates por seção (D7).
 *
 * Nenhuma permissão nova nasce aqui: o dashboard reusa as cinco permissões de
 * leitura que já existem no `PermissionCatalog`. Quem não pode ver cotação na
 * tela de cotações também não a vê agregada aqui.
 *
 * **A regra de gate, uma só:** uma seção exige TODOS os gates dos módulos de
 * que ela lê. A degradação parcial só acontece onde o TIPO admite ausência —
 * campo nulo (`kpis.cotacoes`, `series.*`, `RankingRowData::$uf_aprovada`) ou
 * item removível de lista (etapas de cotação no pipeline, itens de `pendencias`
 * e `alertas`). Onde o tipo não admite, a seção inteira vira `null`: entregar
 * meia seção com zero no lugar do que não pode ser lido seria devolver número
 * errado, não número censurado.
 *
 * Duas exceções conhecidas, ambas impostas pelo contrato TS da Task 1 e
 * registradas para o review do bloco:
 *  - os quatro KPIs de turma são `int` não-nulo; sem `operation.turma.view`
 *    eles saem 0, que se lê como "não há turma" e não como "não autorizado";
 *  - `RankingRowData::$certificados` é `int` não-nulo, então `rankings` exige
 *    operação E certificação (fail-closed) em vez de degradar coluna a coluna.
 */
class AdminDashboardAssembler
{
    public function __construct(
        private readonly OperationMetricsQuery $operation,
        private readonly CommercialMetricsQuery $commercial,
        private readonly CertificationMetricsQuery $certification,
        private readonly AnalyticsQuery $analytics,
        private readonly PipelineQuery $pipeline,
        private readonly RedatorLoadQuery $redatores,
    ) {}

    public function assemble(User $user, DashboardFilterData $filter): AdminDashboardData
    {
        $canOperation = $user->can('operation.turma.view');
        // Cotação sem orçamento não existe: o KPI de UF pendente soma valor de
        // cotação dentro de orçamento, então as duas permissões andam juntas.
        $canCommercial = $user->can('commercial.quote.view')
            && $user->can('commercial.budget.view');
        $canCertification = $user->can('certification.certificate.view');
        $canIdentity = $user->can('identity.user.view');

        $start = $filter->start();
        $end = $filter->end();

        $agenda = $canOperation ? $this->operation->agenda() : null;

        return new AdminDashboardData(
            view: 'admin',
            kpis: $this->kpis($canOperation, $canCommercial, $canCertification),
            pendencias: $this->pendencias($canOperation, $canCommercial, $canCertification),
            alertas: $this->alertas($agenda?->overdue ?? [], $canCertification),
            // O funil atravessa turma e certificado — sem uma das duas leituras
            // a partição de "concluída" mentiria, e etapa de funil errada é pior
            // que funil ausente.
            pipeline: $canOperation && $canCertification
                ? $this->pipeline->stages(includeQuoteStages: $canCommercial)
                : null,
            agenda: $agenda,
            compliance_turmas: $canOperation ? $this->operation->complianceTurmas() : null,
            // Carga por redator: pessoa e documento são Identity, contagem de
            // turma é Operation. Lê dos dois, exige os dois.
            redatores: $canIdentity && $canOperation ? $this->redatores->get() : null,
            series: $this->series($start, $end, $canOperation, $canCommercial, $canCertification),
            rankings: $this->rankings($start, $end, $canOperation, $canCommercial, $canCertification),
            period_start: $start->toDateString(),
            period_end: $end->toDateString(),
        );
    }

    private function kpis(bool $canOperation, bool $canCommercial, bool $canCertification): AdminKpisData
    {
        $turmas = $canOperation
            ? $this->operation->kpis()
            : ['em_andamento' => 0, 'encerrando' => 0, 'atrasadas' => 0, 'conclusoes_por_confirmar' => 0];

        return new AdminKpisData(
            turmas_em_andamento: $turmas['em_andamento'],
            turmas_encerrando_em_breve: $turmas['encerrando'],
            turmas_atrasadas: $turmas['atrasadas'],
            conclusoes_por_confirmar: $turmas['conclusoes_por_confirmar'],
            cotacoes: $canCommercial ? $this->commercial->quoteKpis() : null,
            certificados_a_emitir: $canCertification ? $this->certification->certificadosAEmitir() : null,
        );
    }

    /**
     * Filtro na FONTE, não na saída: o serviço do módulo bloqueado nem chega a
     * ser consultado. `PendingItemData::$module` existe para o front agrupar —
     * confiar nele para censurar seria filtrar depois de já ter lido.
     *
     * @return PendingItemData[]
     */
    private function pendencias(bool $canOperation, bool $canCommercial, bool $canCertification): array
    {
        return [
            ...$canCommercial ? $this->commercial->pendencias() : [],
            ...$canOperation ? $this->operation->pendencias() : [],
            ...$canCertification ? $this->certification->pendencias() : [],
        ];
    }

    /**
     * `AlertData` não tem campo `module` (contrato da Task 1), então o gate age
     * na origem de cada grupo. Turma vencida é derivada da janela `overdue` da
     * agenda — a mesma lista, não uma segunda definição de "atrasada" (D8).
     *
     * @param  AgendaTurmaData[]  $overdue
     * @return AlertData[]
     */
    private function alertas(array $overdue, bool $canCertification): array
    {
        $alertas = array_map(
            fn (AgendaTurmaData $turma): AlertData => new AlertData(
                type: DashboardAlertType::TurmaOverdue,
                severity: DashboardSeverity::High,
                entity_id: $turma->turma_id,
                description: 'Clase con fecha de término vencida y aún en curso.',
                date: $turma->end_date,
                navigation: ['turma_id' => $turma->turma_id],
            ),
            $overdue,
        );

        return [
            ...$alertas,
            ...$canCertification ? $this->certification->alertas() : [],
        ];
    }

    /**
     * Única seção com degradação série a série: `SeriesData` declara cada série
     * anulável, então cada uma responde ao gate do seu próprio módulo.
     */
    private function series(
        CarbonImmutable $start,
        CarbonImmutable $end,
        bool $canOperation,
        bool $canCommercial,
        bool $canCertification,
    ): ?SeriesData {
        if (! $canOperation && ! $canCommercial && ! $canCertification) {
            return null;
        }

        $series = $this->analytics->series($start, $end);

        return new SeriesData(
            turmas_iniciadas: $canOperation ? $series->turmas_iniciadas : null,
            turmas_concluidas: $canOperation ? $series->turmas_concluidas : null,
            certificados_emitidos: $canCertification ? $series->certificados_emitidos : null,
            matriculas: $canOperation ? $series->matriculas : null,
            uf_aprovada: $canCommercial ? $series->uf_aprovada : null,
        );
    }

    /**
     * `turmas`, `matriculas` e `certificados` são `int` não-nulo em
     * `RankingRowData`: não há como omitir uma coluna. Sem os dois gates a
     * seção inteira cai — fail-closed. Só a UF degrada, porque é o único campo
     * anulável da linha.
     */
    private function rankings(
        CarbonImmutable $start,
        CarbonImmutable $end,
        bool $canOperation,
        bool $canCommercial,
        bool $canCertification,
    ): ?RankingsData {
        if (! $canOperation || ! $canCertification) {
            return null;
        }

        return $this->analytics->rankings($start, $end, includeUf: $canCommercial);
    }
}
