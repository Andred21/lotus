<?php

namespace App\Domains\Dashboard\Data;

use App\Shared\Data\Attributes\ReadOnlyCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Rankings de curso e cliente, seção do admin (spec §4.2). */
#[TypeScript]
class RankingsData extends Data
{
    public function __construct(
        /** @var RankingRowData[] */
        #[DataCollectionOf(RankingRowData::class)]
        #[ReadOnlyCollection]
        public array $courses,
        /** @var RankingRowData[] */
        #[DataCollectionOf(RankingRowData::class)]
        #[ReadOnlyCollection]
        public array $clients,
    ) {}
}
