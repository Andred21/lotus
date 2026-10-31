<?php

namespace App\Domains\Operation\Services;

use App\Shared\Support\Rut;

/**
 * Memória de duplicidade DENTRO de uma planilha (D11, D18): a prévia e a
 * confirmação aplicam a mesma regra por aqui, uma instância por requisição.
 *
 * RUT compara na forma canônica, e só RUT válido entra (o inválido cai no erro
 * do resolver). E-mail compara sem diferenciar caixa. Quem chama decide QUAIS
 * e-mails reivindicar: só os que a linha de fato grava.
 */
final class ImportBatchLedger
{
    /** @var array<string,true> */
    private array $ruts = [];

    /** @var array<string,true> */
    private array $emails = [];

    /** Reivindica o RUT; devolve a mensagem de recusa se já apareceu antes. */
    public function claimRut(string $rut): ?string
    {
        $parsed = Rut::parse($rut);
        if (! $parsed->isValid()) {
            return null;
        }

        $chave = $parsed->format();
        if (isset($this->ruts[$chave])) {
            return __('operation.enrollment.import.duplicate_rut');
        }
        $this->ruts[$chave] = true;

        return null;
    }

    /** Reivindica o e-mail; devolve a mensagem de recusa se já apareceu antes. */
    public function claimEmail(string $email): ?string
    {
        $chave = mb_strtolower($email);
        if (isset($this->emails[$chave])) {
            return __('operation.enrollment.import.duplicate_email');
        }
        $this->emails[$chave] = true;

        return null;
    }
}
