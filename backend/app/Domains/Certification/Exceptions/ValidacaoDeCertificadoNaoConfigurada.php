<?php

namespace App\Domains\Certification\Exceptions;

use App\Shared\Exceptions\PublicDetail;
use RuntimeException;

/**
 * Produção sem a base https do QR do certificado (P-79, spec D3 do item 29).
 *
 * Mesmo molde da `CorruptedSnapshotException`, e pelo mesmo motivo: documento
 * de peso legal não sai com o que não se sabe — aqui, o endereço que a cópia
 * impressa vai carregar para sempre. Sai 500 pelo `ProblemDetails`.
 *
 * **Não é `RecusaDeDominio`.** Não há regra de negócio recusando o operador:
 * há configuração quebrada, e ela precisa virar chamado. `RecusaDeDominio` está
 * no `dontReport` e sairia 422 sem deixar rastro no log.
 *
 * `PublicDetail`: sem a interface, o `ProblemDetails` trocaria a frase por
 * "erro inesperado" com `APP_DEBUG=false`, e o operador não saberia por que
 * nenhum certificado sai. A frase não nomeia a variável de ambiente — o log
 * tem a classe e o stack trace.
 */
class ValidacaoDeCertificadoNaoConfigurada extends RuntimeException implements PublicDetail
{
    public static function emProducao(): self
    {
        return new self(__('certification.validation_url.not_configured'));
    }
}
