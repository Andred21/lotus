<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class ImportRowErrorData extends Data
{
    public function __construct(
        public int $row,
        public string $message,
    ) {}
}
