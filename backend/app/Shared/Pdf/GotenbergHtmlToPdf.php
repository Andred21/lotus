<?php

namespace App\Shared\Pdf;

use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Adapter HTTP do Gotenberg (ADR-12): serviço `gotenberg` do compose, rota
 * `/forms/chromium/convert/html`, HTML embutido como `index.html` — referência
 * a arquivo ou URL não resolve do outro lado.
 */
class GotenbergHtmlToPdf implements HtmlToPdf
{
    public function render(string $html, PageOptions $options): string
    {
        $response = Http::asMultipart()
            ->post($this->endpoint(), $this->parts($html, $options));

        if ($response->failed()) {
            throw PdfRenderException::converterFailed($response->status());
        }

        return $response->body();
    }

    public function renderMany(array $htmls, PageOptions $options): array
    {
        if ($htmls === []) {
            return [];
        }

        $endpoint = $this->endpoint();

        // O limite é do client (`EachPromise`): a requisição só é construída e
        // enviada quando uma vaga abre, então o timeout de 30 s do Http conta
        // da hora em que o Gotenberg a recebe, não do tempo de espera na fila
        // daqui. Sem este teto o pool mandaria o lote inteiro de uma vez.
        $responses = Http::pool(function (Pool $pool) use ($htmls, $endpoint, $options): void {
            foreach ($htmls as $key => $html) {
                $pool->as((string) $key)
                    ->asMultipart()
                    ->post($endpoint, $this->parts($html, $options));
            }
        }, $this->concurrency());

        $out = [];
        foreach ($htmls as $key => $_) {
            $response = $responses[(string) $key] ?? null;

            $out[$key] = match (true) {
                $response instanceof Response => $response->failed()
                    ? PdfRenderException::converterFailed($response->status())
                    : $response->body(),
                $response instanceof Throwable => PdfRenderException::converterUnreachable($response),
                default => PdfRenderException::converterUnreachable(),
            };
        }

        return $out;
    }

    private function concurrency(): int
    {
        return max(1, (int) config('services.gotenberg.concurrency'));
    }

    /**
     * O multipart do Gotenberg, num lugar só para o unitário e o lote: o HTML
     * como `index.html` e as opções do formulário. Booleano vai como string,
     * porque o Gotenberg lê texto.
     *
     * @return list<array{name: string, contents: string, filename?: string}>
     */
    private function parts(string $html, PageOptions $options): array
    {
        $parts = [['name' => 'files', 'contents' => $html, 'filename' => 'index.html']];

        if ($options->preferCssPageSize) {
            $parts[] = ['name' => 'preferCssPageSize', 'contents' => 'true'];
        }

        return $parts;
    }

    private function endpoint(): string
    {
        return rtrim((string) config('services.gotenberg.url'), '/')
            .'/forms/chromium/convert/html';
    }
}
