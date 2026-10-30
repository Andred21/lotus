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
        /**
         * Aviso de assinatura (D6/D19), não bloqueio: `false` quando o relator
         * não tem `FIRMA` vigente (a do arquivado vale se a cascata a arquivou).
         */
        public bool $has_firma,
    ) {}

    public static function fromModel(Redator $redator): self
    {
        return new self(
            redator_id: $redator->id,
            name: $redator->user->name,
            // `firma` vem do eager-load do painel (`redatores.firma`).
            has_firma: $redator->firma !== null,
        );
    }
}
