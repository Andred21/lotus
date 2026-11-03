<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\AdminDashboardData;
use App\Domains\Dashboard\Data\AdminKpisData;
use App\Domains\Dashboard\Data\AgendaTurmaData;
use App\Domains\Dashboard\Data\AlertData;
use App\Domains\Dashboard\Data\DashboardFilterData;
use App\Domains\Dashboard\Data\DashboardVisibilityData;
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
 * Os quatro gates saem de `DashboardVisibilityData::forUser()`, montado uma vez
 * e devolvido no payload (`visibility`, D8): a mesma decisão que o assembler
 * usa para consultar é a que o front usa para mostrar.
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
        $v = DashboardVisibilityData::forUser($user);

        $start = $filter->start();
        $end = $filter->end();

        $agenda = $v->operation ? $this->operation->agenda() : null;

        // Cada agregação é consultada UMA vez e reusada por quem precisar dela.
        // O funil lia os mesmos três serviços por conta própria e refazia tudo
        // (Q-6); agora recebe pronto o que os KPIs e as pendências já apuraram.
        $turmaKpis = $v->operation ? $this->operation->kpis() : null;
        $quoteKpis = $v->commercial ? $this->commercial->quoteKpis() : null;
        $commercialPendencias = $v->commercial ? $this->commercial->pendencias() : [];
        $operationPendencias = $v->operation ? $this->operation->pendencias() : [];
        $certificationPendencias = $v->certification ? $this->certification->pendencias() : [];

        return new AdminDashboardData(
            view: 'admin',
            visibility: $v,
            kpis: $this->kpis($turmaKpis, $quoteKpis, $v),
            pendencias: [
                ...$commercialPendencias,
                ...$operationPendencias,
                ...$certificationPendencias,
            ],
            alertas: $this->alertas($agenda?->overdue ?? [], $v),
            // O funil atravessa turma e certificado — sem uma das duas leituras
            // a partição de "concluída" mentiria, e etapa de funil errada é pior
            // que funil ausente.
            pipeline: $v->operation && $v->certification
                ? $this->pipeline->stages(
                    turmaKpis: $turmaKpis,
                    certificationPendencias: $certificationPendencias,
                    quoteKpis: $quoteKpis,
                    commercialPendencias: $commercialPendencias,
                )
                : null,
            agenda: $agenda,
            compliance_turmas: $v->operation ? $this->operation->complianceTurmas() : null,
            // Carga por redator: pessoa e documento são Identity, contagem de
            // turma é Operation. Lê dos dois, exige os dois.
            redatores: $v->identity && $v->operation ? $this->redatores->get() : null,
            series: $this->series($start, $end, $v),
            rankings: $this->rankings($start, $end, $v),
            period_start: $start->toDateString(),
            period_end: $end->toDateString(),
        );
    }

    /**
     * `$turmaKpis` nulo = sem `operation.turma.view`. Os quatro contadores saem
     * `null`, não 0: "não autorizado" e "não há turma" são respostas
     * diferentes, e o tipo agora sabe distingui-las (D7).
     *
     * @param  ?array{em_andamento:int, iniciadas:int, encerrando:int, atrasadas:int, conclusoes_por_confirmar:int}  $turmaKpis
     */
    private function kpis(?array $turmaKpis, ?QuoteKpisData $quoteKpis, DashboardVisibilityData $v): AdminKpisData
    {
        return new AdminKpisData(
            // O card conta as que já começaram; o total (`em_andamento`) é do funil.
            turmas_em_andamento: $turmaKpis['iniciadas'] ?? null,
            turmas_encerrando_em_breve: $turmaKpis['encerrando'] ?? null,
            turmas_atrasadas: $turmaKpis['atrasadas'] ?? null,
            conclusoes_por_confirmar: $turmaKpis['conclusoes_por_confirmar'] ?? null,
            cotacoes: $quoteKpis,
            certificados_a_emitir: $v->certification ? $this->certification->certificadosAEmitir() : null,
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
    private function alertas(array $overdue, DashboardVisibilityData $v): array
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
            ...$v->certification ? $this->certification->alertas() : [],
            ...$v->identity ? $this->identity->alertasDocumentos() : [],
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
        DashboardVisibilityData $v,
    ): ?SeriesData {
        if (! $v->operation && ! $v->commercial && ! $v->certification) {
            return null;
        }

        return $this->analytics->series(
            $start,
            $end,
            includeOperation: $v->operation,
            includeCertification: $v->certification,
            includeUf: $v->commercial,
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
        DashboardVisibilityData $v,
    ): ?RankingsData {
        if (! $v->operation || ! $v->certification) {
            return null;
        }

        return $this->analytics->rankings($start, $end, includeUf: $v->commercial);
    }
}
