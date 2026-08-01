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
class ClientContactData extends Data
{
    public function __construct(
        public int|Optional $id,
        public string $name,
        public string|Optional|null $email,
        public string|Optional|null $phone,
        public string|Optional|null $job_title,
        public bool|Optional $is_primary = new Optional,
    ) {}
}
