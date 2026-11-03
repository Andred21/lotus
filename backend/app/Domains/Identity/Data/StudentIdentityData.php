<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Services\StudentIdentity;
use Spatie\LaravelData\Data;

/**
 * Casca de validação da identidade do aluno: `StudentResolver::identity()` a usa
 * para julgar a forma de uma linha e devolver o `StudentIdentity` já validado.
 * Interna — não é contrato de API, por isso sem `#[TypeScript]`.
 */
class StudentIdentityData extends Data
{
    public function __construct(
        public string $rut,
        public string $name,
        public ?string $email,
        public ?string $phone,
    ) {}

    public static function rules(): array
    {
        return StudentIdentity::rules();
    }

    public function toIdentity(): StudentIdentity
    {
        return new StudentIdentity($this->rut, $this->name, $this->email, $this->phone);
    }
}
