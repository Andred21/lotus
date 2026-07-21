<?php

namespace App\Domains\Operation\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class MovedStudentData extends Data
{
    public function __construct(
        public string $rut,
        public string $name,
        public ?string $previous_client,
        public string $client,
    ) {}
}
