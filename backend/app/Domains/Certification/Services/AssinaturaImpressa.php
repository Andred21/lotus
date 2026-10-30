<?php

namespace App\Domains\Certification\Services;

/** Uma assinatura como o certificado a imprime: nome, cargo e a imagem em base64 (`null` = sem imagem). */
final readonly class AssinaturaImpressa
{
    public function __construct(
        public string $nome,
        public string $cargo,
        public ?string $pngBase64,
    ) {}
}
