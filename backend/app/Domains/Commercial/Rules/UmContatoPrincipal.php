<?php

namespace App\Domains\Commercial\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * "A coleção enviada tem EXATAMENTE um `is_primary` verdadeiro" (D-09).
 *
 * Mora na validação, e não no `PrimaryCollectionService`, porque é sobre a
 * ENTRADA: o serviço garante a invariante do estado persistido e promove
 * quando a coleção fica sem principal por efeito colateral; aqui recusa-se o
 * payload que pede zero (ou dois) de propósito. Item sem a chave `is_primary`
 * conta como não-principal — o DTO a declara `Optional`, e ausente significa
 * "não marquei".
 */
class UmContatoPrincipal implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value)) {
            return;   // `array` e `min:1` já reprovam o resto.
        }

        $principais = count(array_filter(
            $value,
            fn (mixed $item): bool => is_array($item) && ($item['is_primary'] ?? false) === true,
        ));

        if ($principais !== 1) {
            $fail(__('commercial.client.primary_contact_required'));
        }
    }
}
