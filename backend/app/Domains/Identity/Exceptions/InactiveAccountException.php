<?php

namespace App\Domains\Identity\Exceptions;

use App\Shared\Exceptions\PublicDetail;
use Illuminate\Auth\AuthenticationException;

/**
 * A sessão caiu porque a CONTA foi desligada, não porque o cookie venceu.
 * `HttpException(401)` pelo `AuthenticationException` que estende → o handler
 * global (ProblemDetails) formata em RFC 7807 com status 401 como antes.
 *
 * `PublicDetail` (Q-1 do review de 2026-08-30): sem a marca, o braço
 * `AuthenticationException => __('problem.detail.unauthenticated')` do
 * `ProblemDetails::detailFor()` troca a frase pelo genérico, e quem foi
 * desligado no meio da sessão lê "inicie sessão para continuar" — indistinguível
 * de cookie vencido, que é a única coisa que ele NÃO deve tentar. A D5 da spec
 * do bloco `hardening-i18n-e-erros-api` nomeia `PublicDetail` como a porta para
 * o caso legítimo; este é o caso legítimo, e a medição da D5 não o alcançou
 * porque procurou por `abort()`, não por `throw new AuthenticationException`.
 */
class InactiveAccountException extends AuthenticationException implements PublicDetail {}
