<?php

namespace App\Shared\Office;

/**
 * Converte um `.docx` em PDF. Irmã do `HtmlToPdf` e pelo mesmo motivo: o
 * documento monta o pacote, o transporte é daqui.
 */
interface DocxToPdf
{
    /**
     * @return string bytes do PDF
     *
     * @throws OfficeRenderException quando o conversor recusa ou está fora do ar
     */
    public function render(string $docx): string;
}
