<?php

namespace App\Domains\Identity\Exceptions;

use App\Shared\Exceptions\PublicDetail;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Tentativa de mutar uma role de sistema (superadmin/admin/redator).
 * HttpException(403) → o handler global (ProblemDetails) formata em RFC 7807.
 *
 * `PublicDetail` (bloco `hardening-i18n-e-erros-api`, 2026-08-29): a mensagem
 * nomeia a role e o motivo, escrita para quem lê a resposta — sem a marca,
 * `ProblemDetails::isForbidden()` a troca pelo `detail` genérico de `lang/`.
 */
class ImmutableSystemRoleException extends HttpException implements PublicDetail
{
    public function __construct(string $message = 'Role de sistema é imutável.')
    {
        parent::__construct(403, $message);
    }
}
