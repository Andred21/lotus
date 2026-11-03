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
 * Entrada do documento pelo próprio redator (perfil): a mesma forma da rota
 * admin, mas só os tipos self-service — o tipo que habilita o redator a atuar
 * (ex.: assinatura da gerente) não entra por payload dele. Só entrada de
 * request, fora do contrato TS.
 */
class ProfileDocumentUploadData extends Data
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
        return TypedFileRules::for(
            $context->payload,
            RedatorDocumentType::class,
            RedatorDocumentType::selfServiceValues(),
            comValidade: true,
        );
    }
}
