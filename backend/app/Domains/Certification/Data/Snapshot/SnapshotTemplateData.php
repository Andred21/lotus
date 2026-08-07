<?php

namespace App\Domains\Certification\Data\Snapshot;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O template do curso como ele era na emissão. Do `layout_config` só a `city`
 * tem consumidor — `orientation` morreu com o D-P9, que fixou o certificado em
 * retrato —, então é ela que congela nomeada. Snapshot da versão 1 guardava o
 * JSON inteiro em `layout_config`, e a leitura abaixo aceita as duas formas.
 */
#[TypeScript]
class SnapshotTemplateData extends Data
{
    public function __construct(
        public ?int $version,
        public ?string $city,
    ) {}

    /** @param array<string, mixed>|null $raw */
    public static function fromArray(?array $raw): self
    {
        $version = data_get($raw, 'version');
        $city = data_get($raw, 'city') ?? data_get($raw, 'layout_config.city');

        return new self(
            version: $version === null ? null : (int) $version,
            city: $city === null ? null : (string) $city,
        );
    }
}
