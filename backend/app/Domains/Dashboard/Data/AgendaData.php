<?php

namespace App\Domains\Dashboard\Data;

use App\Shared\Data\Attributes\ReadOnlyCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Agenda de turmas do admin, em 4 janelas (spec §4.2). Uso exclusivo do admin. */
#[TypeScript]
class AgendaData extends Data
{
    public function __construct(
        /** @var AgendaTurmaData[] */
        #[DataCollectionOf(AgendaTurmaData::class)]
        #[ReadOnlyCollection]
        public array $starting_soon,
        /** @var AgendaTurmaData[] */
        #[DataCollectionOf(AgendaTurmaData::class)]
        #[ReadOnlyCollection]
        public array $ending_soon,
        /** @var AgendaTurmaData[] */
        #[DataCollectionOf(AgendaTurmaData::class)]
        #[ReadOnlyCollection]
        public array $in_progress,
        /** @var AgendaTurmaData[] */
        #[DataCollectionOf(AgendaTurmaData::class)]
        #[ReadOnlyCollection]
        public array $overdue,
    ) {}
}
