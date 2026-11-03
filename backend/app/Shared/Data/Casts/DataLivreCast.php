<?php

namespace App\Shared\Data\Casts;

use Carbon\CarbonImmutable;
use Spatie\LaravelData\Casts\Cast;
use Spatie\LaravelData\Casts\Uncastable;
use Spatie\LaravelData\Support\Creation\CreationContext;
use Spatie\LaravelData\Support\DataProperty;

/**
 * Data de entrada que vai até onde a regra `date` do Laravel vai (`strtotime`):
 * `Y-m-d`, com hora, por extenso, ISO com milissegundos. O cast padrão do
 * pacote só entende os formatos de `config('data.date_format')` e lançaria
 * `CannotCastDate` (500) em valor que a validação já liberou. Para campo cuja
 * regra é `date`; devolve o início do dia (campo só-data).
 */
class DataLivreCast implements Cast
{
    public function cast(DataProperty $property, mixed $value, array $properties, CreationContext $context): CarbonImmutable|Uncastable
    {
        if (! is_string($value)) {
            return Uncastable::create();
        }

        return CarbonImmutable::parse($value)->startOfDay();
    }
}
