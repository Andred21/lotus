<?php

namespace App\Shared\Pdf;

use App\Shared\Exceptions\PublicDetail;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Throwable;

/**
 * O conversor de PDF falhou, mesmo depois da nova tentativa, e a operação não
 * pode entregar o que prometeu (ex.: o ZIP da turma, tudo ou nada).
 *
 * 503 e não 422 pelo mesmo motivo do `ScannerUnavailableException`: os
 * documentos não estão errados, o serviço é que caiu — um 422 mandaria a
 * pessoa procurar defeito no que está bom, e não pede nova tentativa. O
 * `Retry-After` chega ao cliente pelo repasse de headers do `ProblemDetails`.
 *
 * Mora em `Shared/` e não no domínio porque `HttpException` é do transporte, e
 * a régua `RecusaDeDominioTest` proíbe exceção de domínio acoplada a HTTP. Quem
 * a lança passa o texto já localizado (de `lang/`, nomeando o que falhou) e a
 * `PdfRenderException` como `previous`: a causa técnica não vai à resposta, e
 * quem lança a reporta — o Laravel não reporta `HttpException` sozinho.
 *
 * `PublicDetail` é contrato, como no scanner: a frase foi escrita para quem lê
 * a resposta.
 */
class PdfUnavailableException extends ServiceUnavailableHttpException implements PublicDetail
{
    /** Segundos até o cliente tentar de novo (o mesmo do scanner). */
    private const RETRY_AFTER = 30;

    public function __construct(string $detail, ?Throwable $previous = null)
    {
        parent::__construct(self::RETRY_AFTER, $detail, $previous);
    }
}
