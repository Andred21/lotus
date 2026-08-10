<?php

namespace App\Shared\Office;

use RuntimeException;

/**
 * Falha do conversor de escritório. Sobe ao handler global RFC 7807 como 500 —
 * nenhum caller inventa um documento vazio no lugar. Molde do
 * `PdfRenderException`.
 */
class OfficeRenderException extends RuntimeException
{
    public static function converterFailed(int $status): self
    {
        return new self("O conversor de documentos falhou ao converter o manual (HTTP {$status}).");
    }
}
