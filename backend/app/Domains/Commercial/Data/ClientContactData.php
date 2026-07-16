<?php

namespace App\Domains\Commercial\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class ClientContactData extends Data
{
    public function __construct(
        public int|Optional $id,
        public string $name,
        public string|Optional|null $email,
        public string|Optional|null $phone,
        public string|Optional|null $job_title,
        public bool $is_primary = false,
    ) {}
}
