<?php

namespace App\Domains\Operation\Data;

use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Shared\Files\Data\TypedFileRules;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Support\Validation\ValidationContext;

/**
 * Entrada do documento de turma: `type` + `file`. Só entrada de request, fora
 * do contrato TS. Tipo inválido recusa antes de o byte chegar ao ClamAV.
 */
class TurmaDocumentUploadData extends Data
{
    public function __construct(
        public TurmaDocumentType $type,
        public UploadedFile $file,
    ) {}

    /** @return array<string, list<mixed>> */
    public static function rules(ValidationContext $context): array
    {
        return TypedFileRules::for($context->payload, TurmaDocumentType::class);
    }
}
