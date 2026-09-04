<?php

namespace App\Shared\Exceptions;

use RuntimeException;

/**
 * Recusa emitida por uma regra de domínio.
 *
 * **Não estende `HttpException` de propósito:** o domínio declara O QUE
 * recusou (`tipo()`), e quem conhece HTTP é o `TipoDeRecusa` — consultado pelo
 * `ProblemDetails` (envelope) e pelo `RegistraEventoDeErro` (evento de
 * segurança). Exceção de domínio que volte a citar status reprova no
 * `RecusaDeDominioTest`.
 *
 * **É `PublicDetail` por construção**, não por escolha caso a caso: a
 * mensagem de uma recusa é escrita para quem lê a resposta, e sem a marca o
 * `detailFor()` a trocaria pelo genérico de `lang/`. A obrigação que a
 * interface impõe vale inteira — a frase sai de `lang/`, no idioma do
 * usuário, e não vaza caminho, SQL nem dado de terceiro.
 *
 * **O que se perde:** `ProblemDetails::fromException()` só monta headers a
 * partir de `HttpExceptionInterface`. Recusa que precise de header próprio
 * (`Retry-After`, por exemplo) não cabe aqui sem desenho novo.
 */
abstract class RecusaDeDominio extends RuntimeException implements PublicDetail
{
    abstract public function tipo(): TipoDeRecusa;
}
