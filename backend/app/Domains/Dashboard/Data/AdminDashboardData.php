<?php

namespace App\Domains\Dashboard\Data;

use App\Shared\Data\Attributes\ReadOnlyCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Payload do dashboard para o admin (spec §4.2/D5). `view` discrimina esta
 * classe de `RedatorDashboardData` no union TS — cada seção nula significa
 * "sem permissão para esta seção"; coleção vazia significa "autorizado, sem
 * dados".
 *
 * `view` não leva default em runtime: PHP trata parâmetro promovido opcional
 * seguido de obrigatório como implicitamente obrigatório (deprecation desde
 * 8.0) — o default seria decorativo e só geraria ruído. O literal `'admin'`
 * no TS vem só do `#[LiteralTypeScriptType]`, que independe do default PHP.
 */
#[TypeScript]
class AdminDashboardData extends Data
{
    public function __construct(
        #[LiteralTypeScriptType("'admin'")]
        public string $view,
        public AdminKpisData $kpis,
        /** @var PendingItemData[] */
        #[DataCollectionOf(PendingItemData::class)]
        #[ReadOnlyCollection]
        public array $pendencias,
        /** @var AlertData[] */
        #[DataCollectionOf(AlertData::class)]
        #[ReadOnlyCollection]
        public array $alertas,
        /** @var PipelineStageCountData[]|null */
        #[DataCollectionOf(PipelineStageCountData::class)]
        #[ReadOnlyCollection]
        public ?array $pipeline,
        public ?AgendaData $agenda,
        /** @var TurmaComplianceData[]|null */
        #[DataCollectionOf(TurmaComplianceData::class)]
        #[ReadOnlyCollection]
        public ?array $compliance_turmas,
        /** @var RedatorLoadData[]|null */
        #[DataCollectionOf(RedatorLoadData::class)]
        #[ReadOnlyCollection]
        public ?array $redatores,
        public ?SeriesData $series,
        public ?RankingsData $rankings,
        public string $period_start,
        public string $period_end,
    ) {}
}
