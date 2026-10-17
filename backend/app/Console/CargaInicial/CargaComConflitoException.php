<?php

namespace App\Console\CargaInicial;

use RuntimeException;

/**
 * A carga real achou, dentro da transação, um registro que já existe com
 * conteúdo diferente do arquivo (spec §5). Lançá-la desfaz tudo o que a
 * transação gravou; carrega a lista dos conflitos para o comando imprimir.
 */
final class CargaComConflitoException extends RuntimeException
{
    /** @param list<string> $conflitos */
    public function __construct(private readonly array $conflitos)
    {
        parent::__construct(implode("\n", $conflitos));
    }

    /** @return list<string> */
    public function conflitos(): array
    {
        return $this->conflitos;
    }
}
