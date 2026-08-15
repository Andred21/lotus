<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\PendingItemData;
use App\Domains\Dashboard\Data\PipelineStageCountData;
use App\Domains\Dashboard\Data\QuoteKpisData;
use App\Domains\Dashboard\Enums\PendingItemType;
use App\Domains\Dashboard\Enums\PipelineStage;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;

/**
 * O funil comercial→operação→certificação, em baldes EXCLUSIVOS (spec §4.3).
 *
 * Nenhuma regra nasce aqui. Cada contagem vem do serviço que já é dono da
 * pergunta — habilitação do `OperationMetricsQuery` (que por sua vez lê o
 * `TurmaHabilitacaoService`, D8), cotação do `CommercialMetricsQuery`, emissão
 * pendente do `CertificationMetricsQuery`. Esta classe só particiona o que
 * eles respondem, e a partição é onde mora o valor dela: o Drive §3.4 escreve
 * sete rótulos, mas "turma concluída" e "certificados a emitir" se sobrepõem,
 * e classificação ambígua num funil não é funil.
 *
 * As contagens CHEGAM por parâmetro, não por injeção dos três serviços. Injetá-
 * los dava a esta classe instâncias próprias — sem binding compartilhado, a
 * memoização do assembler não atravessava e a agregação inteira rodava duas
 * vezes por request (56 queries medidas com 2 turmas; review de 2026-08-14,
 * Q-6). Receber o resultado pronto também deixa honesto o que o docblock já
 * dizia: aqui só se particiona.
 *
 * As duas partições:
 *   em_andamento = não habilitada (`TurmaInProgress`) + habilitada (`TurmaReadyForConclusion`)
 *   concluída    = com emissão pendente (`ConcludedPendingIssuance`) + resto (`FullyIssued`)
 *
 * Cotação aprovada que virou turma NÃO entra em balde de cotação: a turma dela
 * é que responde por ela, senão o mesmo negócio seria contado duas vezes.
 */
class PipelineQuery
{
    /**
     * @param  array{em_andamento:int, encerrando:int, atrasadas:int, conclusoes_por_confirmar:int}  $turmaKpis  `OperationMetricsQuery::kpis()`
     * @param  PendingItemData[]  $certificationPendencias  `CertificationMetricsQuery::pendencias()`
     * @param  ?QuoteKpisData  $quoteKpis  `CommercialMetricsQuery::quoteKpis()`; `null` = sem gate comercial
     * @param  PendingItemData[]  $commercialPendencias  `CommercialMetricsQuery::pendencias()`
     * @return PipelineStageCountData[]
     */
    public function stages(
        array $turmaKpis,
        array $certificationPendencias,
        ?QuoteKpisData $quoteKpis,
        array $commercialPendencias,
    ): array {
        $stages = [];

        if ($quoteKpis !== null) {
            $stages[] = new PipelineStageCountData(
                stage: PipelineStage::QuotePending,
                count: $quoteKpis->pending_count,
            );
            $stages[] = new PipelineStageCountData(
                stage: PipelineStage::QuoteApprovedWithoutTurma,
                count: count(array_filter(
                    $commercialPendencias,
                    fn (PendingItemData $item): bool => $item->type === PendingItemType::QuoteApprovedWithoutTurma,
                )),
            );
        }

        $habilitadas = $turmaKpis['conclusoes_por_confirmar'];
        $concluidas = Turma::query()->where('status', TurmaStatus::Concluida)->count();
        // Uma linha por turma concluída com matrícula aprovada sem certificado
        // — o `CertificationMetricsQuery` já agrega por turma, que é a unidade
        // do funil.
        $emissaoPendente = count($certificationPendencias);

        $stages[] = new PipelineStageCountData(
            stage: PipelineStage::TurmaInProgress,
            count: $turmaKpis['em_andamento'] - $habilitadas,
        );
        $stages[] = new PipelineStageCountData(
            stage: PipelineStage::TurmaReadyForConclusion,
            count: $habilitadas,
        );
        $stages[] = new PipelineStageCountData(
            stage: PipelineStage::ConcludedPendingIssuance,
            count: $emissaoPendente,
        );
        $stages[] = new PipelineStageCountData(
            stage: PipelineStage::FullyIssued,
            count: $concluidas - $emissaoPendente,
        );

        return $stages;
    }
}
