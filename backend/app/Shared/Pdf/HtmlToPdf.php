<?php

namespace App\Shared\Pdf;

/**
 * Converte HTML em PDF. O documento monta o HTML; o transporte é daqui.
 *
 * A separação existe porque a cópia dupla do transporte já divergiu: o
 * certificado aprendeu `preferCssPageSize` e o manual não, e a lição ficou em
 * comentário no caller em vez de num lugar só (ADR-12).
 */
interface HtmlToPdf
{
    /**
     * @return string bytes do PDF
     *
     * @throws PdfRenderException quando o conversor recusa ou está fora do ar
     */
    public function render(string $html, PageOptions $options): string;
}
