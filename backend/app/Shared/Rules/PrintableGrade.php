<?php

namespace App\Shared\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A nota que o certificado imprime (D-P7 do bloco 7): numérica ou string
 * não-vazia — `"6,4"` com vírgula é como se escreve nota no Chile. O que não
 * dá para imprimir (array, objeto, booleano, string vazia) é recusado NA
 * ESCRITA; a defesa de leitura dos snapshots já congelados permanece em
 * SnapshotResultData::finalGrade.
 */
final class PrintableGrade implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_int($value) || is_float($value)) {
            return;
        }

        if (is_string($value) && trim($value) !== '') {
            return;
        }

        $fail('La nota final debe ser un número o un texto no vacío.');
    }
}
