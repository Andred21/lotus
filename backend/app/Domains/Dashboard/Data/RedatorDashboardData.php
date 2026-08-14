<?php

namespace App\Domains\Dashboard\Data;

use App\Shared\Data\Attributes\ReadOnlyCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\LiteralTypeScriptType;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Payload do dashboard para o redator (spec §4.2/D5). `view` discrimina esta
 * classe de `AdminDashboardData` no union TS. Por construção do tipo, este
 * DTO não pode carregar nome de cliente, UF de cotação, nem dado de outro
 * redator — `agenda` usa `RedatorAgendaData`/`RedatorAgendaTurmaData`, o par
 * dedicado sem `client_name`.
 *
 * `view` não leva default em runtime pelo mesmo motivo de `AdminDashboardData`
 * — ver o comentário lá.
 */
#[TypeScript]
class RedatorDashboardData extends Data
{
    public function __construct(
        #[LiteralTypeScriptType("'redator'")]
        public string $view,
        public RedatorResumoData $resumo,
        public RedatorAgendaData $agenda,
        /** @var RedatorTurmaPendenciaData[] */
        #[DataCollectionOf(RedatorTurmaPendenciaData::class)]
        #[ReadOnlyCollection]
        public array $pendencias_documentais,
        /** @var AlertData[] */
        #[DataCollectionOf(AlertData::class)]
        #[ReadOnlyCollection]
        public array $alertas_documentos,
        public RedatorHistoricoData $historico,
    ) {}
}
