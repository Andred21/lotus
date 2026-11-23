<?php

namespace App\Shared\Rules;

use App\Shared\Support\Phone;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Valida que o telefone é um número real (`libphonenumber`, Chile como região
 * padrão). Vazio e `null` passam: telefone é opcional em toda parte, e a
 * obrigatoriedade, onde existir, é de outra regra. A normalização para E.164
 * é do mutator do model, não desta regra.
 */
final class ValidPhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value) || ! Phone::isValid($value)) {
            $fail(__('shared.rule.phone_invalid'));
        }
    }
}
