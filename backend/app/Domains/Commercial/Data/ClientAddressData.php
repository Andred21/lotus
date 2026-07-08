<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

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
        public bool $is_primary = false,
    ) {}
}
