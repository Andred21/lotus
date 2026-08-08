<?php

namespace App\Domains\Certification\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Um item do relatório de emissão em lote — saída, sem `rules()`. */
#[TypeScript]
class BatchIssueItemResultData extends Data
{
    public function __construct(
        public int $enrollment_id,
        public bool $ok,
        public ?string $codigo,
        public ?int $certificate_id,
        public ?string $error,
    ) {}
}
