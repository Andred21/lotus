<?php

namespace App\Domains\Catalog\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Template de certificado de um curso. layout_config é config de layout
 * versionada em JSON (não anexo).
 */
#[TypeScript]
class CertificateTemplateData extends Data
{
    public function __construct(
        public int|Optional $id,
        // Derivada no backend (D4): o número que venha no payload é ignorado.
        // Optional na ENTRADA; a saída sempre traz o número, porque vem do model.
        public int|Optional $version,
        /** @var array<string, mixed> */
        public array $layout_config = [],
        public int|Optional|null $validity_months = null,
    ) {}
}
