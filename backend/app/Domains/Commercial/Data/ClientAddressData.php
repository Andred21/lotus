<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * `is_primary` é `Optional` de propósito: sem isso, um PUT que não manda o
 * campo rebaixa o principal em silêncio, porque o DTO preenche `false` por
 * uma chave que o cliente nunca enviou. Com `Optional`, o `toArray()` omite a
 * chave e o valor atual da coluna permanece.
 */
#[TypeScript]
class ClientAddressData extends Data
{
    public function __construct(
        public int|Optional $id,
        public string|Optional|null $line1,
        public string|Optional|null $line2,
        public string|Optional|null $number,
        public string|Optional|null $commune,
        public string|Optional|null $city,
        public string|Optional|null $region,
        public string|Optional|null $zip_code,
        public bool|Optional $is_primary = new Optional,
    ) {}
}
