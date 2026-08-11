<?php

namespace App\Shared\Office;

use Illuminate\Support\Facades\Http;

/**
 * Adapter da rota LibreOffice do Gotenberg (serviço `gotenberg` do compose).
 * Diferente do Chromium, o LibreOffice resolve fonte pelo NOME instalado — o
 * manual declara Arial e o conversor substitui por Liberation Sans, que é
 * exatamente o que o `docs/templates/manual.pdf` embute.
 */
final class GotenbergDocxToPdf implements DocxToPdf
{
    public function render(string $docx): string
    {
        $response = Http::attach('files', $docx, 'document.docx')
            ->post($this->endpoint());

        if ($response->failed()) {
            throw OfficeRenderException::converterFailed($response->status());
        }

        return $response->body();
    }

    private function endpoint(): string
    {
        return rtrim((string) config('services.gotenberg.url'), '/')
            .'/forms/libreoffice/convert';
    }
}
