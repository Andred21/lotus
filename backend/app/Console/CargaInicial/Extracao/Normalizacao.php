<?php

namespace App\Console\CargaInicial\Extracao;

/**
 * O resultado de `Normalizador::normalizar()`: a carga no formato de
 * `ArquivoDeCarga` e o que ficou de fora, com o motivo.
 *
 * Erro e carga não convivem: havendo erro, `carga` vem vazia, porque o comando
 * não grava nada que a Lotus ainda tem de corrigir ou decidir.
 */
final readonly class Normalizacao
{
    /**
     * @param  array<string, mixed>  $carga  o `carga.json` (vazio quando há erro)
     * @param  list<array{codigo: string, motivo: string}>  $recusas  linhas do recorte que ficam de fora, uma por código
     * @param  list<string>  $erros  o que impede de gravar a carga
     * @param  int  $linhasNoRecorte  linhas de código `recorte_prefixo*`, antes das recusas
     */
    public function __construct(
        public array $carga,
        public array $recusas,
        public array $erros,
        public int $linhasNoRecorte,
    ) {}
}
