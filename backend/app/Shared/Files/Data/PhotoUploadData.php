<?php

namespace App\Shared\Files\Data;

use App\Shared\Files\ContentClass;
use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Support\Validation\ValidationContext;

/**
 * Entrada da foto de perfil (staff, redator, aluno, cliente e o próprio
 * usuário): só a imagem. Só entrada de request, fora do contrato TS.
 */
class PhotoUploadData extends Data
{
    public function __construct(
        public UploadedFile $photo,
    ) {}

    /** @return array<string, list<mixed>> */
    public static function rules(ValidationContext $context): array
    {
        return ['photo' => ContentClass::Imagem->regras()];
    }
}
