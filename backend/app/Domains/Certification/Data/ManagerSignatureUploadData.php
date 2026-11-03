<?php

namespace App\Domains\Certification\Data;

use App\Shared\Files\ContentClass;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Support\Validation\ValidationContext;

/**
 * Entrada da firma da gerente: só a imagem. Só entrada de request, fora do
 * contrato TS.
 */
class ManagerSignatureUploadData extends Data
{
    public function __construct(
        public UploadedFile $file,
    ) {}

    /** @return array<string, list<mixed>> */
    public static function rules(ValidationContext $context): array
    {
        return ['file' => ContentClass::Assinatura->regras()];
    }
}
