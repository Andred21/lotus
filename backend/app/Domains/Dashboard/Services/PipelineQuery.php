<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Dashboard\Data\PendingItemData;
use App\Domains\Dashboard\Data\PipelineStageCountData;
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
 * As duas partições:
 *   em_andamento = não habilitada (`TurmaInProgress`) + habilitada (`TurmaReadyForConclusion`)
 *   concluída    = com emissão pendente (`ConcludedPendingIssuance`) + resto (`FullyIssued`)
 *
 * Cotação aprovada que virou turma NÃO entra em balde de cotação: a turma dela
 * é que responde por ela, senão o mesmo negócio seria contado duas vezes.
 */
class PipelineQuery
{
    public function __construct(
        private readonly OperationMetricsQuery $operation,
        private readonly CommercialMetricsQuery $commercial,
        private readonly CertificationMetricsQuery $certification,
    ) {}

    /** @return PipelineStageCountData[] */
    public function stages(bool $includeQuoteStages): array
    {
        $stages = [];

        if ($includeQuoteStages) {
            $stages[] = new PipelineStageCountData(
                stage: PipelineStage::QuotePending,
                count: $this->commercial->quoteKpis()->pending_count,
            );
            $stages[] = new PipelineStageCountData(
                stage: PipelineStage::QuoteApprovedWithoutTurma,
                count: count(array_filter(
                    $this->commercial->pendencias(),
                    fn (PendingItemData $item): bool => $item->type === PendingItemType::QuoteApprovedWithoutTurma,
                )),
            );
        }

        $kpis = $this->operation->kpis();
        $habilitadas = $kpis['conclusoes_por_confirmar'];
        $concluidas = Turma::query()->where('status', TurmaStatus::Concluida)->count();
        // Uma linha por turma concluída com matrícula aprovada sem certificado
        // — o `CertificationMetricsQuery` já agrega por turma, que é a unidade
        // do funil.
        $emissaoPendente = count($this->certification->pendencias());

        $stages[] = new PipelineStageCountData(
            stage: PipelineStage::TurmaInProgress,
            count: $kpis['em_andamento'] - $habilitadas,
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
