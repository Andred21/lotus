<?php

namespace App\Domains\Identity\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Tentativa de mutar uma role de sistema (superadmin/admin/redator).
 * HttpException(403) → o handler global (ProblemDetails) formata em RFC 7807.
 */
class ImmutableSystemRoleException extends HttpException
{
    public function __construct(string $message = 'Role de sistema é imutável.')
    {
        parent::__construct(403, $message);
    }
}
