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

    /**
     * Converte vários HTMLs, com no máximo `services.gotenberg.concurrency`
     * conversões em voo: o conversor é um Chromium único num container de
     * 768 MB, e o teto é o que o protege.
     *
     * A falha é do item, não do lote: o item que o conversor recusou volta como
     * `PdfRenderException` na própria chave, e os demais voltam como bytes. Quem
     * chama decide o que fazer com a falha (nova tentativa, recusa do lote).
     *
     * @param  array<string, string>  $htmls  chave → HTML
     * @return array<string, string|PdfRenderException> mesmas chaves, na mesma ordem
     */
    public function renderMany(array $htmls, PageOptions $options): array;
}
