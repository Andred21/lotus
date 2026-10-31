<?php

namespace App\Domains\Operation\Data;

use App\Shared\Data\Attributes\ReadOnlyCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Prévia da planilha (somente leitura). `can_update_registration` diz se o
 * usuário pode pedir *Actualizar* em linha cadastrada (D20); o servidor recusa
 * mesmo assim na confirmação.
 */
#[TypeScript]
class ImportPreviewData extends Data
{
    public function __construct(
        /**
         * Projeção de SAÍDA: o service a preenche e nenhuma Action a lê da entrada.
         *
         * @var array<ImportPreviewRowData>
         */
        #[DataCollectionOf(ImportPreviewRowData::class)]
        #[ReadOnlyCollection]
        public array $rows,
        public bool $can_update_registration,
    ) {}
}
