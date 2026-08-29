<?php

namespace App\Domains\Identity\Exceptions;

use App\Shared\Exceptions\PublicDetail;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Ação self-service de redator alcançada por um usuário sem perfil de
 * redator (ex.: admin em `POST /api/profile/documents`).
 * HttpException(403) → o handler global (ProblemDetails) formata em RFC 7807.
 *
 * `PublicDetail` (bloco `hardening-i18n-e-erros-api`, 2026-08-29): a mensagem
 * é escrita para quem lê a resposta — sem a marca, `ProblemDetails::isForbidden()`
 * a troca pelo `detail` genérico de `lang/`.
 */
class RedatorOnlyActionException extends HttpException implements PublicDetail
{
    public function __construct(string $message = 'Apenas redatores enviam documentação profissional.')
    {
        parent::__construct(403, $message);
    }
}
