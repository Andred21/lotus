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
 *
 * O default é `null` e não a frase (Q-2 do review de 2026-08-30): parâmetro
 * default de construtor é expressão constante e não aceita `__()`, então a
 * frase nascia literal em português — e a catraca da Task 9, que varre
 * `withMessages`, não a via. Resolver o texto no corpo é o que põe esta recusa
 * dentro de `lang/` como as outras 41.
 */
class ImmutableSystemRoleException extends HttpException implements PublicDetail
{
    public function __construct(?string $message = null)
    {
        parent::__construct(403, $message ?? __('identity.errors.system_role_immutable'));
    }
}
