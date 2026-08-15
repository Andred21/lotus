<?php

namespace App\Domains\Dashboard\Data;

use App\Shared\Data\Attributes\ReadOnlyCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Agenda de turmas do redator, em 4 janelas (spec §4.2). Par dedicado de
 * `AgendaData`/`AgendaTurmaData` — nunca compartilhado com o admin — porque
 * `RedatorAgendaTurmaData` não carrega `client_name`.
 */
#[TypeScript]
class RedatorAgendaData extends Data
{
    public function __construct(
        /** @var RedatorAgendaTurmaData[] */
        #[DataCollectionOf(RedatorAgendaTurmaData::class)]
        #[ReadOnlyCollection]
        public array $starting_soon,
        /** @var RedatorAgendaTurmaData[] */
        #[DataCollectionOf(RedatorAgendaTurmaData::class)]
        #[ReadOnlyCollection]
        public array $ending_soon,
        /** @var RedatorAgendaTurmaData[] */
        #[DataCollectionOf(RedatorAgendaTurmaData::class)]
        #[ReadOnlyCollection]
        public array $in_progress,
        /** @var RedatorAgendaTurmaData[] */
        #[DataCollectionOf(RedatorAgendaTurmaData::class)]
        #[ReadOnlyCollection]
        public array $overdue,
    ) {}
}
