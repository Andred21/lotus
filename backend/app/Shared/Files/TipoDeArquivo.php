<?php

namespace App\Shared\Files;

/**
 * O contrato de um enum de tipo de anexo: ele diz qual classe de conteúdo o
 * upload daquele tipo pede e se o tipo carrega `valid_until`. É o que deixa
 * `TypedFileRules` montar as regras sem conhecer o domínio de cada enum.
 */
interface TipoDeArquivo
{
    public function conteudo(): ContentClass;

    public function aceitaValidade(): bool;
}
