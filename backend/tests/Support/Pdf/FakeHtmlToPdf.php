<?php

namespace Tests\Support\Pdf;

use App\Shared\Pdf\HtmlToPdf;
use App\Shared\Pdf\PageOptions;
use App\Shared\Pdf\PdfRenderException;
use LogicException;

/**
 * Dobradura de teste do conversor: guarda o HTML e as opções que o documento
 * mandou. Com ela a asserção sobre o documento volta a ser sobre uma string
 * HTML, em vez de regex dentro de um corpo multipart.
 */
class FakeHtmlToPdf implements HtmlToPdf
{
    /** @var list<array{html: string, options: PageOptions}> */
    private array $calls = [];

    /** @var list<array{needle: string, remaining: int}> */
    private array $failures = [];

    public function __construct(private readonly string $bytes = '%PDF-fake') {}

    /**
     * Faz as próximas `$times` conversões de um HTML que contém `$needle`
     * falharem — o conversor que cai no meio de um lote e volta na nova
     * tentativa, ou que não volta.
     */
    public function failTimes(string $needle, int $times): void
    {
        $this->failures[] = ['needle' => $needle, 'remaining' => $times];
    }

    public function render(string $html, PageOptions $options): string
    {
        $this->calls[] = ['html' => $html, 'options' => $options];

        foreach ($this->failures as &$failure) {
            if ($failure['remaining'] > 0 && str_contains($html, $failure['needle'])) {
                $failure['remaining']--;

                throw PdfRenderException::converterFailed(500);
            }
        }

        return $this->bytes;
    }

    /**
     * Como o adapter real: a falha é do item, não do lote. Delega a `render`
     * por item e registra cada chamada, na ordem de entrada.
     */
    public function renderMany(array $htmls, PageOptions $options): array
    {
        $out = [];
        foreach ($htmls as $key => $html) {
            try {
                $out[$key] = $this->render($html, $options);
            } catch (PdfRenderException $e) {
                $out[$key] = $e;
            }
        }

        return $out;
    }

    public function callCount(): int
    {
        return count($this->calls);
    }

    public function lastHtml(): string
    {
        return $this->lastCall()['html'];
    }

    public function lastOptions(): PageOptions
    {
        return $this->lastCall()['options'];
    }

    /** @return array{html: string, options: PageOptions} */
    private function lastCall(): array
    {
        if ($this->calls === []) {
            throw new LogicException('Nenhum documento foi convertido em PDF.');
        }

        return $this->calls[array_key_last($this->calls)];
    }
}
