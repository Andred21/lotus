<?php

namespace App\Domains\Operation\Data;

use App\Domains\Operation\Services\ImportRowClassifier;
use App\Shared\Data\Attributes\InputOnlyCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Corpo da confirmação da importação (JSON, sem arquivo). `rows` é coleção só de
 * ENTRADA (`#[InputOnlyCollection]`): a ausência é recusa (422 com a chave `rows`),
 * nunca "não mexe" — por isso o campo é obrigatório e a exigência
 * `required|array|min:1|max:MAX_LINHAS` mora aqui, antes de qualquer escrita.
 */
#[TypeScript]
class ImportConfirmData extends Data
{
    public function __construct(
        /** @var array<ImportConfirmRowData> */
        #[DataCollectionOf(ImportConfirmRowData::class)]
        #[InputOnlyCollection]
        public array $rows,
    ) {}

    /** @return array<string, array<int, string>> */
    public static function rules(): array
    {
        return [
            'rows' => ['required', 'array', 'min:1', 'max:'.ImportRowClassifier::MAX_LINHAS],
        ];
    }
}
