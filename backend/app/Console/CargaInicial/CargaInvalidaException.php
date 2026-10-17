<?php

namespace App\Console\CargaInicial;

use RuntimeException;

/**
 * O `carga.json` não passou na conferência. Carrega a lista inteira de erros:
 * quem prepara o arquivo corrige tudo de uma vez, não um erro por execução.
 */
final class CargaInvalidaException extends RuntimeException
{
    /** @param list<string> $erros */
    public function __construct(private readonly array $erros)
    {
        parent::__construct(implode("\n", $erros));
    }

    /** @return list<string> */
    public function erros(): array
    {
        return $this->erros;
    }
}
