<?php

namespace App\Domains\Certification\Data\Snapshot;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Quem aparece nomeado no documento: aluno, empresa contratante, OTEC emissora
 * e relator. Os quatro congelam a mesma dupla — como o nome era no dia da
 * emissão, e o RUT que o acompanhava.
 */
#[TypeScript]
class SnapshotPartyData extends Data
{
    public function __construct(
        public string $name,
        public ?string $rut,
    ) {}

    /** @param array<string, mixed>|null $raw */
    public static function fromArray(?array $raw): self
    {
        return new self(
            name: (string) data_get($raw, 'name', ''),
            rut: self::nullableString(data_get($raw, 'rut')),
        );
    }

    private static function nullableString(mixed $value): ?string
    {
        return $value === null ? null : (string) $value;
    }
}
