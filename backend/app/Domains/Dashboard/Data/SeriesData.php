<?php

namespace App\Domains\Dashboard\Data;

use App\Shared\Data\Attributes\ReadOnlyCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Séries mensais do dashboard do admin (spec §4.2). Cada série é nula quando
 * o chamador não está autorizado para o módulo dela (operação/certificação/
 * comercial) — o gate granulariza por série, não pela seção inteira.
 */
#[TypeScript]
class SeriesData extends Data
{
    public function __construct(
        /** @var MonthlyCountData[]|null */
        #[DataCollectionOf(MonthlyCountData::class)]
        #[ReadOnlyCollection]
        public ?array $turmas_iniciadas,
        /** @var MonthlyCountData[]|null */
        #[DataCollectionOf(MonthlyCountData::class)]
        #[ReadOnlyCollection]
        public ?array $turmas_concluidas,
        /** @var MonthlyCountData[]|null */
        #[DataCollectionOf(MonthlyCountData::class)]
        #[ReadOnlyCollection]
        public ?array $certificados_emitidos,
        /** @var MonthlyCountData[]|null */
        #[DataCollectionOf(MonthlyCountData::class)]
        #[ReadOnlyCollection]
        public ?array $matriculas,
        /** @var MonthlyAmountData[]|null */
        #[DataCollectionOf(MonthlyAmountData::class)]
        #[ReadOnlyCollection]
        public ?array $uf_aprovada,
    ) {}
}
