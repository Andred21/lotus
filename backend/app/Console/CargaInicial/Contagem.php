<?php

namespace App\Console\CargaInicial;

/**
 * O que a carga fez, entidade a entidade: o que criou, o que já existia e o que
 * está em conflito. É a tabela que o `--simular` e a carga real imprimem, e o
 * `temConflito()` é a pré-condição que recusa a carga real (spec §5, §7).
 */
final class Contagem
{
    /** @var array<string, array{0: int, 1: int}> entidade => [criados, existentes], na ordem da primeira menção */
    private array $porEntidade = [];

    /** @var list<string> */
    private array $conflitos = [];

    /** @var list<string> */
    private array $arquivosGravados = [];

    public function criado(string $entidade): void
    {
        $this->porEntidade[$entidade] ??= [0, 0];
        $this->porEntidade[$entidade][0]++;
    }

    public function existente(string $entidade): void
    {
        $this->porEntidade[$entidade] ??= [0, 0];
        $this->porEntidade[$entidade][1]++;
    }

    public function conflito(string $mensagem): void
    {
        $this->conflitos[] = $mensagem;
    }

    public function temConflito(): bool
    {
        return $this->conflitos !== [];
    }

    /** @return list<string> */
    public function conflitos(): array
    {
        return $this->conflitos;
    }

    /** @return list<array{0: string, 1: int, 2: int}> entidade, criados, existentes */
    public function linhas(): array
    {
        $linhas = [];

        foreach ($this->porEntidade as $entidade => [$criados, $existentes]) {
            $linhas[] = [$entidade, $criados, $existentes];
        }

        return $linhas;
    }

    /** Um objeto que subiu ao disco: se a transação cair, ele fica órfão e a carga o reporta. */
    public function arquivoGravado(string $path): void
    {
        $this->arquivosGravados[] = $path;
    }

    /** @return list<string> */
    public function arquivosGravados(): array
    {
        return $this->arquivosGravados;
    }
}
