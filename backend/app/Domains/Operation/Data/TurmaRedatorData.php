<?php

namespace App\Domains\Operation\Data;

use App\Domains\Identity\Models\Redator;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/** Projeção mínima do redator designado (id + nome), read-only na TurmaData. */
#[TypeScript]
class TurmaRedatorData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
    ) {}

    public static function fromModel(Redator $redator): self
    {
        return new self(id: $redator->id, name: $redator->user?->name ?? '');
    }
}
