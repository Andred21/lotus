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

    /**
     * Falha ao FECHAR o pacote — antes do conversor, portanto. Um `.docx`
     * incompleto é indistinguível de um completo para quem só olha o status da
     * resposta; a falha tem de ter nome próprio em vez de virar documento.
     */
    public static function packagingFailed(string $porque): self
    {
        return new self("Não foi possível montar o pacote do documento: {$porque}.");
    }
}
