<?php

namespace App\Domains\Operation\Data;

use App\Domains\Identity\Services\StudentIdentity;
use App\Shared\Data\ComputedFields;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Entrada da matrícula individual: rut e nome obrigatórios, e-mail e telefone
 * opcionais (a Action só exige e-mail do aluno NOVO — D9). As regras são as de
 * `StudentIdentity`, as mesmas do cadastro e da planilha, mais a recusa de
 * `photo_url` no corpo.
 */
#[TypeScript]
class EnrollStudentData extends Data
{
    public function __construct(
        public string $rut,
        public string $name,
        public ?string $email = null,
        public ?string $phone = null,
    ) {}

    public static function rules(): array
    {
        return [
            // A saída da matrícula (`EnrollmentData`) leva `photo_url`; no corpo da
            // entrada ela é recusada, como em todo DTO de escrita (BD-14).
            ...ComputedFields::rejected('photo_url'),
            ...StudentIdentity::rules(),
        ];
    }

    public function identity(): StudentIdentity
    {
        return new StudentIdentity($this->rut, $this->name, $this->email, $this->phone);
    }
}
