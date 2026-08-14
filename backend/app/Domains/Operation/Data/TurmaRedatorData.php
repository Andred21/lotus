<?php

namespace App\Domains\Operation\Data;

use App\Domains\Identity\Models\Redator;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Projeção do redator designado, read-only na TurmaData. Deixou de ser
 * `id + nome` em 2026-08-14: o card da designação e a coluna Redator do
 * TurmasTable renderizam célula de identidade, que pede descrição e foto
 * (spec D3/D9). O `user` já é navegado aqui e já vem eager loaded por
 * `TurmaQueryBuilder::LISTING` — os dois campos custam zero query.
 */
#[TypeScript]
class TurmaRedatorData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public ?string $email = null,
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url = null,
    ) {}

    public static function fromModel(Redator $redator): self
    {
        return new self(
            id: $redator->id,
            name: $redator->user?->name ?? '',
            email: $redator->user?->email,
            photo_url: $redator->user?->photo_path,
        );
    }
}
