<?php

namespace App\Domains\Certification\Data;

use App\Domains\Identity\Models\Redator;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class EmissionPanelRedatorData extends Data
{
    public function __construct(
        public int $redator_id,
        public string $name,
    ) {}

    public static function fromModel(Redator $redator): self
    {
        return new self(
            redator_id: $redator->id,
            name: $redator->user->name,
        );
    }
}
