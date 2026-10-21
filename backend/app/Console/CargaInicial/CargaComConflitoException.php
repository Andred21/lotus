<?php

namespace App\Console\CargaInicial;

use RuntimeException;

/**
 * A carga real achou, dentro da transação, um registro que já existe com
 * conteúdo diferente do arquivo (spec §5). Lançá-la desfaz tudo o que a
 * transação gravou; a mensagem é a lista dos conflitos, uma por linha, que o
 * comando imprime.
 */
final class CargaComConflitoException extends RuntimeException
{
    /** @param list<string> $conflitos */
    public function __construct(array $conflitos)
    {
        parent::__construct(implode("\n", $conflitos));
    }
}
