<?php

namespace App\Shared\Files;

use App\Shared\Exceptions\PublicDetail;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

/**
 * O antivírus não respondeu, então o upload é RECUSADO (spec D8, fail closed):
 * deixar passar sem olhar seria afirmar um cumprimento que não aconteceu.
 *
 * 503 e não 422 porque o arquivo não está errado — o serviço é que caiu; um
 * 422 mandaria a pessoa procurar defeito num arquivo que está bom. O
 * `Retry-After` chega ao cliente pelo repasse de `getHeaders()` do
 * `ProblemDetails`.
 *
 * `PublicDetail` não é necessário para o 503 — o mascaramento do
 * `ProblemDetails` só age em 500. Está aqui como CONTRATO: declara que esta
 * mensagem foi escrita para quem lê a resposta, em es-CL, e não vaza nada que a
 * resposta já não pudesse dizer. Se o status mudar um dia, a garantia já está
 * declarada em vez de precisar ser redescoberta.
 */
class ScannerUnavailableException extends ServiceUnavailableHttpException implements PublicDetail
{
    public function __construct(?\Throwable $previous = null)
    {
        parent::__construct(
            30,
            'El servicio de antivirus no está disponible. El archivo no fue guardado; intente nuevamente en unos minutos.',
            $previous,
        );
    }
}
