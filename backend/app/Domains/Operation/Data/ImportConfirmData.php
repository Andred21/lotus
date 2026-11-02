<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Corpo da confirmação da importação (JSON, sem arquivo). A coleção nasce
 * `Optional` (lei de persistência: coleção de entrada); a exigência
 * `required|array|min:1|max:100` mora na `ImportStudentsAction`, que recusa
 * antes de qualquer escrita, com a chave `rows`.
 */
#[TypeScript]
class ImportConfirmData extends Data
{
    public function __construct(
        /** @var array<ImportConfirmRowData>|Optional */
        #[DataCollectionOf(ImportConfirmRowData::class)]
        public array|Optional $rows = new Optional,
    ) {}
}
