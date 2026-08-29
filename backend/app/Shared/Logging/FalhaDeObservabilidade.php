<?php

namespace App\Shared\Logging;

use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * O registro da falha DO registro. Existe por dois motivos que andam juntos.
 *
 * **Contenção (catraca 5 da spec).** Observabilidade não pode derrubar a ação
 * que ela observa: um canal de log fora do ar não pode transformar o 422 de
 * senha errada num 500, nem impedir que a sessão de uma conta desativada seja
 * invalidada. Quem contém precisa de um lugar para dizer que conteve — senão a
 * contenção vira silêncio, que é o defeito oposto.
 *
 * **Não vazar PII pela porta dos fundos (catraca 4).** O `EventoDeSeguranca`
 * fecha o canal `seguranca` com métodos nomeados e parâmetros tipados, mas o
 * `catch` que o protege escreve no canal DEFAULT — e `Throwable::getMessage()`
 * cru é exatamente por onde o dado volta a entrar. Uma `TransportException` do
 * Symfony Mailer carrega a resposta do servidor SMTP, que rotineiramente traz o
 * destinatário (`550 5.1.1 <alguem@lotus.cl>: Recipient address rejected`) e às
 * vezes o `MAIL_USERNAME`. Por isso esta classe registra **classe, código e
 * origem** da exceção — o que basta para investigar — e **nunca a mensagem**.
 *
 * Sem `try/catch` interno de propósito: se o canal default também estiver fora
 * do ar, a aplicação já está em estado catastrófico e blindar o `catch` do
 * `catch` só esconderia isso.
 */
final class FalhaDeObservabilidade
{
    /** @param array<string,scalar|null> $dados */
    public static function registrar(string $mensagem, Throwable $falha, array $dados = []): void
    {
        Log::error($mensagem, $dados + [
            'excecao' => $falha::class,
            'codigo' => $falha->getCode(),
            'origem' => $falha->getFile().':'.$falha->getLine(),
        ]);
    }
}
