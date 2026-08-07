<?php

namespace Tests\Feature\Shared;

use App\Shared\Pdf\GotenbergHtmlToPdf;
use App\Shared\Pdf\PageOptions;
use App\Shared\Pdf\PdfRenderException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * O transporte do PDF vive num lugar só (ADR-12). Este teste é o único que
 * conhece o formato do multipart — os documentos asseram sobre o próprio HTML.
 */
class HtmlToPdfTest extends TestCase
{
    public function test_manda_o_html_como_index_html_e_devolve_os_bytes(): void
    {
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF-1.4 real')]);

        $bytes = app(GotenbergHtmlToPdf::class)
            ->render('<html><body>hola</body></html>', PageOptions::converterDefault());

        $this->assertSame('%PDF-1.4 real', $bytes);
        Http::assertSent(function (Request $request): bool {
            $body = (string) $request->body();

            return str_contains($request->url(), '/forms/chromium/convert/html')
                && str_contains($body, 'name="files"; filename="index.html"')
                && str_contains($body, '<html><body>hola</body></html>');
        });
    }

    /**
     * O Chromium ignora o `@page` do CSS sem esta chave, e foi assim que o
     * certificado saiu em Letter enquanto o Blade declarava A4.
     */
    public function test_prefer_css_page_size_entra_no_multipart_somente_quando_pedido(): void
    {
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF')]);
        $adapter = app(GotenbergHtmlToPdf::class);

        $adapter->render('<html></html>', PageOptions::fromCss());

        Http::assertSent(fn (Request $request): bool => preg_match(
            '/name="preferCssPageSize"\r?\n(?:[^\r\n]+\r?\n)*\r?\ntrue\r?\n/',
            (string) $request->body(),
        ) === 1);

        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF')]);

        $adapter->render('<html></html>', PageOptions::converterDefault());

        Http::assertSent(fn (Request $request): bool => ! str_contains(
            (string) $request->body(),
            'preferCssPageSize',
        ));
    }

    public function test_conversor_fora_do_ar_estoura_pdf_render_exception(): void
    {
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('boom', 503)]);

        $this->expectException(PdfRenderException::class);
        $this->expectExceptionMessage('(HTTP 503)');

        app(GotenbergHtmlToPdf::class)->render('<html></html>', PageOptions::fromCss());
    }
}
