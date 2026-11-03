<?php

namespace App\Domains\Commercial\Data;

use App\Domains\Commercial\Enums\BudgetDocumentType;
use App\Shared\Files\Data\TypedFileRules;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Support\Validation\ValidationContext;

/**
 * Entrada do anexo budget: `type` + `file`. Só entrada de request, fora do
 * contrato TS. O tipo inválido recusa antes de qualquer byte chegar ao ClamAV
 * (`TypedFileRules`).
 */
class BudgetFileUploadData extends Data
{
    public function __construct(
        public BudgetDocumentType $type,
        public UploadedFile $file,
    ) {}

    /** @return array<string, list<mixed>> */
    public static function rules(ValidationContext $context): array
    {
        return TypedFileRules::for($context->payload, BudgetDocumentType::class);
    }
}
