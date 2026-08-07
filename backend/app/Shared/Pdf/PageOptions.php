<?php

namespace App\Shared\Pdf;

/**
 * As opções de página que o documento manda para o conversor.
 *
 * Hoje há uma só, e ela existe porque custou um defeito: o Chromium **ignora**
 * o `@page` do CSS a menos que receba `preferCssPageSize`, e sem isso o
 * certificado — documento de peso legal chileno — saía em Letter enquanto o
 * Blade declarava A4. Toda opção nova (margem, timeout, retry) entra aqui, não
 * no caller: é o ponto onde o conhecimento sobre o conversor mora.
 */
class PageOptions
{
    private function __construct(
        public readonly bool $preferCssPageSize,
    ) {}

    /** O documento declara o próprio tamanho no `@page` do CSS. */
    public static function fromCss(): self
    {
        return new self(preferCssPageSize: true);
    }

    /** O documento aceita o papel default do conversor. */
    public static function converterDefault(): self
    {
        return new self(preferCssPageSize: false);
    }
}
