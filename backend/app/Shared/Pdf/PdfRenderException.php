<?php

namespace App\Shared\Pdf;

use RuntimeException;

/**
 * Falha do conversor. Sobe ao handler global RFC 7807 como 500 — o documento
 * não é gerado, e nenhum caller inventa um PDF vazio no lugar (§5.4). Qual
 * documento falhou sai do stack trace; a mensagem não repete o caller.
 */
class PdfRenderException extends RuntimeException
{
    public static function converterFailed(int $status): self
    {
        return new self("O conversor de PDF falhou ao converter o documento (HTTP {$status}).");
    }
}
