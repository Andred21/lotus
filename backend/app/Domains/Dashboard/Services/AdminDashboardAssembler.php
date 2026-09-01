<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\AdminDashboardData;
use App\Domains\Dashboard\Data\AdminKpisData;
use App\Domains\Dashboard\Data\AgendaTurmaData;
use App\Domains\Dashboard\Data\AlertData;
use App\Domains\Dashboard\Data\DashboardFilterData;
use App\Domains\Dashboard\Data\QuoteKpisData;
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
 * Uma exceção conhecida: `RankingRowData::$certificados` é `int` não-nulo,
 * então `rankings` exige operação E certificação (fail-closed) em vez de
 * degradar coluna a coluna.
 *
 * Os quatro KPIs de turma eram a segunda exceção — saíam 0 sem
 * `operation.turma.view`, que se lê como "não há turma" e não como "não
 * autorizado". O review de 2026-08-14 (Q-3) tratou isso como o que era: zero
 * que mente. `AdminKpisData` passou a declará-los anuláveis.
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
        private readonly IdentityMetricsQuery $identity,
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

        // Cada agregação é consultada UMA vez e reusada por quem precisar dela.
        // O funil lia os mesmos três serviços por conta própria e refazia tudo
        // (Q-6); agora recebe pronto o que os KPIs e as pendências já apuraram.
        $turmaKpis = $canOperation ? $this->operation->kpis() : null;
        $quoteKpis = $canCommercial ? $this->commercial->quoteKpis() : null;
        $commercialPendencias = $canCommercial ? $this->commercial->pendencias() : [];
        $operationPendencias = $canOperation ? $this->operation->pendencias() : [];
        $certificationPendencias = $canCertification ? $this->certification->pendencias() : [];

        return new AdminDashboardData(
            view: 'admin',
            kpis: $this->kpis($turmaKpis, $quoteKpis, $canCertification),
            pendencias: [
                ...$commercialPendencias,
                ...$operationPendencias,
                ...$certificationPendencias,
            ],
            alertas: $this->alertas($agenda?->overdue ?? [], $canCertification, $canIdentity),
            // O funil atravessa turma e certificado — sem uma das duas leituras
            // a partição de "concluída" mentiria, e etapa de funil errada é pior
            // que funil ausente.
            pipeline: $canOperation && $canCertification
                ? $this->pipeline->stages(
                    turmaKpis: $turmaKpis,
                    certificationPendencias: $certificationPendencias,
                    quoteKpis: $quoteKpis,
                    commercialPendencias: $commercialPendencias,
                )
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

    /**
     * `$turmaKpis` nulo = sem `operation.turma.view`. Os quatro contadores saem
     * `null`, não 0: "não autorizado" e "não há turma" são respostas
     * diferentes, e o tipo agora sabe distingui-las (D7).
     *
     * @param  ?array{em_andamento:int, encerrando:int, atrasadas:int, conclusoes_por_confirmar:int}  $turmaKpis
     */
    private function kpis(?array $turmaKpis, ?QuoteKpisData $quoteKpis, bool $canCertification): AdminKpisData
    {
        return new AdminKpisData(
            turmas_em_andamento: $turmaKpis['em_andamento'] ?? null,
            turmas_encerrando_em_breve: $turmaKpis['encerrando'] ?? null,
            turmas_atrasadas: $turmaKpis['atrasadas'] ?? null,
            conclusoes_por_confirmar: $turmaKpis['conclusoes_por_confirmar'] ?? null,
            cotacoes: $quoteKpis,
            certificados_a_emitir: $canCertification ? $this->certification->certificadosAEmitir() : null,
        );
    }

    /**
     * `AlertData` não tem campo `module` (contrato da Task 1), então o gate age
     * na origem de cada grupo — na FONTE, não na saída: o serviço do módulo
     * bloqueado nem chega a ser consultado. Turma vencida é derivada da janela
     * `overdue` da agenda — a mesma lista, não uma segunda definição de
     * "atrasada" (D8). Documento de relator responde a `identity.user.view`,
     * como a seção `redatores`: é dado de pessoa, não de certificado.
     *
     * @param  AgendaTurmaData[]  $overdue
     * @return AlertData[]
     */
    private function alertas(array $overdue, bool $canCertification, bool $canIdentity): array
    {
        $alertas = array_map(
            fn (AgendaTurmaData $turma): AlertData => new AlertData(
                type: DashboardAlertType::TurmaOverdue,
                severity: DashboardSeverity::High,
                entity_id: $turma->turma_id,
                description: __('dashboard.pending.turma_overdue'),
                date: $turma->end_date,
                navigation: ['turma_id' => $turma->turma_id],
            ),
            $overdue,
        );

        return [
            ...$alertas,
            ...$canCertification ? $this->certification->alertas() : [],
            ...$canIdentity ? $this->identity->alertasDocumentos() : [],
        ];
    }

    /**
     * Única seção com degradação série a série: `SeriesData` declara cada série
     * anulável, então cada uma responde ao gate do seu próprio módulo. O gate
     * decide aqui e viaja como instrução do que calcular — a série negada nem
     * chega a ser lida (Q-9).
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

        return $this->analytics->series(
            $start,
            $end,
            includeOperation: $canOperation,
            includeCertification: $canCertification,
            includeUf: $canCommercial,
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
