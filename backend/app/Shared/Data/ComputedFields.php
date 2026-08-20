<?php

namespace App\Shared\Data;

/**
 * Chaves de SAÍDA computada que um corpo de escrita não pode carregar (BD-14,
 * D3). Fonte única da lista, para o `rules()` de cada DTO não divergir por
 * cópia.
 *
 * `missing`, e não `prohibited`: `validateProhibited` é `! validateRequired`
 * no vendor (`ValidatesAttributes.php`), então o campo presente mas vazio
 * (`null`, `''`, `[]`) passa com 200 silencioso. `missing` reprova a mera
 * presença da chave. O precedente é `ProfileUpdateData::rules()`.
 */
class ComputedFields
{
    /**
     * @return array<string,array<string>>
     */
    public static function rejected(string ...$fields): array
    {
        return array_map(fn () => ['missing'], array_flip($fields));
    }
}
