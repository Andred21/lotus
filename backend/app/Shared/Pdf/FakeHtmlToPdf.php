<?php

namespace App\Shared\Pdf;

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

    public function __construct(private readonly string $bytes = '%PDF-fake') {}

    public function render(string $html, PageOptions $options): string
    {
        $this->calls[] = ['html' => $html, 'options' => $options];

        return $this->bytes;
    }

    public function lastHtml(): string
    {
        return $this->lastCall()['html'];
    }

    public function lastOptions(): PageOptions
    {
        return $this->lastCall()['options'];
    }

    public function renderCount(): int
    {
        return count($this->calls);
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
