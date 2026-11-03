<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Shared\Files\Data\TypedFileRules;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Attributes\WithCast;
use Spatie\LaravelData\Casts\DateTimeInterfaceCast;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Support\Validation\ValidationContext;

/**
 * Entrada do documento do redator pela rota admin: `type` + `file` +
 * `valid_until`. Só entrada de request, fora do contrato TS. O tipo escolhe a
 * regra do arquivo e a do `valid_until` (a assinatura não vence), e tipo
 * inválido recusa antes de qualquer byte chegar ao ClamAV (`TypedFileRules`).
 */
class RedatorDocumentUploadData extends Data
{
    public function __construct(
        public RedatorDocumentType $type,
        public UploadedFile $file,
        #[WithCast(DateTimeInterfaceCast::class, format: ['!Y-m-d', DATE_ATOM])]
        public ?CarbonImmutable $valid_until = null,
    ) {}

    /** @return array<string, list<mixed>> */
    public static function rules(ValidationContext $context): array
    {
        return TypedFileRules::for($context->payload, RedatorDocumentType::class, comValidade: true);
    }
}
