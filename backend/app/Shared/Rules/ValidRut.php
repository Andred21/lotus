<?php

namespace App\Shared\Rules;

use App\Shared\Support\Rut;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Valida a ESTRUTURA/dígito verificador do RUT. Unicidade é checagem
 * separada (regra unique / verificação na Action) — não é responsabilidade
 * desta regra.
 */
final class ValidRut implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! Rut::parse($value)->isValid()) {
            $fail('O RUT informado é inválido.');
        }
    }
}
