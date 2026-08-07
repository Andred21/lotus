<?php

namespace App\Shared\Pdf;

use Illuminate\Support\Facades\Http;

/**
 * Adapter HTTP do Gotenberg (ADR-12): serviço `gotenberg` do compose, rota
 * `/forms/chromium/convert/html`, HTML embutido como `index.html` — referência
 * a arquivo ou URL não resolve do outro lado.
 */
class GotenbergHtmlToPdf implements HtmlToPdf
{
    public function render(string $html, PageOptions $options): string
    {
        $response = Http::attach('files', $html, 'index.html')
            ->post($this->endpoint(), $this->form($options));

        if ($response->failed()) {
            throw PdfRenderException::converterFailed($response->status());
        }

        return $response->body();
    }

    /** @return array<string, string> */
    private function form(PageOptions $options): array
    {
        // O Gotenberg lê o multipart, então booleano vai como string.
        return $options->preferCssPageSize
            ? ['preferCssPageSize' => 'true']
            : [];
    }

    private function endpoint(): string
    {
        return rtrim((string) config('services.gotenberg.url'), '/')
            .'/forms/chromium/convert/html';
    }
}
