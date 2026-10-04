<?php

namespace App\Shared\Logging;

use Aws\Exception\AwsException;
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
 * **O código da AWS fica (item 33, D15).** Sem a mensagem, uma falha do SES
 * vira só `TransportException` — e era a mensagem que separava destinatário
 * não verificado de policy errada e de rajada acima do sandbox. O
 * `SesTransport` guarda a `AwsException` como `previous`, e
 * `getAwsErrorCode()` devolve um identificador fixo do protocolo
 * (`MessageRejected`, `AccessDenied`, `Throttling`), sem dado de ninguém: ele
 * entra como `aws_erro`. Fica ausente quando a cadeia não tem `AwsException`
 * ou ela não traz código (falha de conexão). Desde a D15 esta classe registra
 * também toda falha de envio que chega ao handler, pelo `report` de
 * `TransportExceptionInterface` do `bootstrap/app.php`.
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
        $contexto = $dados + [
            'excecao' => $falha::class,
            'codigo' => $falha->getCode(),
            'origem' => $falha->getFile().':'.$falha->getLine(),
        ];

        $erroDaAws = self::erroDaAws($falha);

        if ($erroDaAws !== null) {
            $contexto['aws_erro'] = $erroDaAws;
        }

        Log::error($mensagem, $contexto);
    }

    /**
     * O código de erro da primeira `AwsException` da cadeia de `previous`.
     */
    private static function erroDaAws(Throwable $falha): ?string
    {
        for ($e = $falha; $e !== null; $e = $e->getPrevious()) {
            if ($e instanceof AwsException) {
                return $e->getAwsErrorCode();
            }
        }

        return null;
    }
}
