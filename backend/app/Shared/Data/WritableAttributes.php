<?php

namespace App\Shared\Data;

use Spatie\LaravelData\Optional;

/**
 * Tradução única de `Optional` para atributo gravável (BD-14, D1/D2).
 *
 * A lei: **ausente não é nulo.** `Optional` significa "o corpo não falou deste
 * campo", e um PUT que não fala de um campo não pode apagá-lo. `null` explícito
 * continua sendo a única forma de limpar o valor guardado.
 *
 * Existe como função separada, e não como método de um `Data` base, porque
 * vários DTOs têm propriedades que NÃO são coluna (`role`, `course_ids`,
 * `templates`, `files`): quem decide o que vai para o `update()` é a Action,
 * não o DTO.
 */
class WritableAttributes
{
    /**
     * @param  array<string,mixed>  $attributes
     * @return array<string,mixed>
     */
    public static function from(array $attributes): array
    {
        return array_filter(
            $attributes,
            fn ($value) => ! $value instanceof Optional,
        );
    }
}
