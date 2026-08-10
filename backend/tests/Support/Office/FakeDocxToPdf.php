<?php

namespace Tests\Support\Office;

use App\Shared\Office\DocxToPdf;
use LogicException;

/**
 * Dobradura de teste: guarda o `.docx` que o documento mandou converter. Com
 * ela a asserção volta a ser sobre o PACOTE, e não sobre um corpo multipart.
 */
class FakeDocxToPdf implements DocxToPdf
{
    /** @var list<string> */
    private array $calls = [];

    public function __construct(private readonly string $bytes = '%PDF-fake') {}

    public function render(string $docx): string
    {
        $this->calls[] = $docx;

        return $this->bytes;
    }

    public function lastDocx(): string
    {
        if ($this->calls === []) {
            throw new LogicException('Nenhum documento foi convertido em PDF.');
        }

        return $this->calls[array_key_last($this->calls)];
    }

    public function timesCalled(): int
    {
        return count($this->calls);
    }
}
