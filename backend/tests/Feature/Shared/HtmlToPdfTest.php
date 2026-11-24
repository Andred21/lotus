<?php

namespace Tests\Feature\Shared;

use App\Shared\Pdf\GotenbergHtmlToPdf;
use App\Shared\Pdf\PageOptions;
use App\Shared\Pdf\PdfRenderException;
use GuzzleHttp\Promise\Utils;
use Illuminate\Http\Client\ConnectionException;
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

    public function test_render_many_preserva_as_chaves(): void
    {
        Http::preventStrayRequests();
        Http::fake(function (Request $request) {
            // O corpo do PDF devolvido carrega o HTML que o originou, para
            // provar que cada chave voltou com o resultado do SEU item.
            preg_match('/<p>(\w+)<\/p>/', (string) $request->body(), $m);

            return Http::response('%PDF-'.$m[1]);
        });

        $out = app(GotenbergHtmlToPdf::class)->renderMany([
            'LOT-A' => '<html><body><p>alfa</p></body></html>',
            'LOT-B' => '<html><body><p>beta</p></body></html>',
            'LOT-C' => '<html><body><p>gama</p></body></html>',
        ], PageOptions::fromCss());

        $this->assertSame(
            ['LOT-A' => '%PDF-alfa', 'LOT-B' => '%PDF-beta', 'LOT-C' => '%PDF-gama'],
            $out,
        );
        Http::assertSentCount(3);
        Http::assertSent(fn (Request $request): bool => str_contains($request->url(), '/forms/chromium/convert/html')
            && str_contains((string) $request->body(), 'name="files"; filename="index.html"')
            && preg_match('/name="preferCssPageSize"\r?\n(?:[^\r\n]+\r?\n)*\r?\ntrue\r?\n/', (string) $request->body()) === 1);
    }

    public function test_render_many_devolve_a_falha_no_item(): void
    {
        Http::preventStrayRequests();
        Http::fake(fn (Request $request) => str_contains((string) $request->body(), 'quebra')
            ? Http::response('boom', 500)
            : Http::response('%PDF-ok'));

        $out = app(GotenbergHtmlToPdf::class)->renderMany([
            'A' => '<html>a</html>',
            'B' => '<html>quebra</html>',
            'C' => '<html>c</html>',
        ], PageOptions::fromCss());

        $this->assertSame(['A', 'B', 'C'], array_keys($out));
        $this->assertSame('%PDF-ok', $out['A']);
        $this->assertSame('%PDF-ok', $out['C']);
        $this->assertInstanceOf(PdfRenderException::class, $out['B']);
        $this->assertStringContainsString('(HTTP 500)', $out['B']->getMessage());
    }

    public function test_render_many_devolve_a_queda_de_conexao_no_item(): void
    {
        Http::preventStrayRequests();
        Http::fake(fn (Request $request) => str_contains((string) $request->body(), 'cai')
            ? throw new ConnectionException('cURL error 7')
            : Http::response('%PDF-ok'));

        $out = app(GotenbergHtmlToPdf::class)->renderMany([
            'A' => '<html>a</html>',
            'B' => '<html>cai</html>',
        ], PageOptions::fromCss());

        $this->assertSame('%PDF-ok', $out['A']);
        $this->assertInstanceOf(PdfRenderException::class, $out['B']);
    }

    /**
     * O conversor é um Chromium único de 768 MB: o teto do lote é o que o
     * protege, então "nunca mais de N em voo" é o que se prova.
     *
     * O `Http::fake` responde na hora, e uma resposta instantânea nunca teria
     * duas requisições em voo. Por isso "em voo" aqui é o que o client mede de
     * verdade: requisições ENVIADAS antes de o client processar a conclusão de
     * alguma. A conclusão é um passo da fila de tarefas do Guzzle, que roda
     * quando o `EachPromise` espera — então um pool sem teto envia as 5 antes
     * de qualquer conclusão, e um pool de 2 envia 2, conclui, envia mais 2.
     */
    public function test_render_many_respeita_a_concorrencia(): void
    {
        config(['services.gotenberg.concurrency' => 2]);
        $emVoo = 0;
        $pico = 0;
        $enviadas = 0;
        Http::preventStrayRequests();
        Http::fake(function () use (&$emVoo, &$pico, &$enviadas) {
            $enviadas++;
            $pico = max($pico, ++$emVoo);
            Utils::queue()->add(function () use (&$emVoo): void {
                $emVoo--;
            });

            return Http::response('%PDF-ok');
        });

        $out = app(GotenbergHtmlToPdf::class)->renderMany(
            array_combine(['a', 'b', 'c', 'd', 'e'], array_fill(0, 5, '<html></html>')),
            PageOptions::fromCss(),
        );

        $this->assertSame(5, $enviadas);
        $this->assertCount(5, array_filter($out, 'is_string'));
        $this->assertSame(2, $pico);
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
