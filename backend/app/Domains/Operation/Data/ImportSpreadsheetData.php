<?php

namespace App\Domains\Operation\Data;

use App\Shared\Files\ContentClass;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Support\Validation\ValidationContext;

/**
 * Entrada da prévia de importação: só a planilha. Só entrada de request, fora
 * do contrato TS.
 */
class ImportSpreadsheetData extends Data
{
    public function __construct(
        public UploadedFile $file,
    ) {}

    /** @return array<string, list<mixed>> */
    public static function rules(ValidationContext $context): array
    {
        return ['file' => ContentClass::Planilha->regras()];
    }
}
