<?php

namespace App\Domains\Identity\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * Tentativa de mutar uma role de sistema (superadmin/admin/redator).
 * Recusa de ação proibida: o `ProblemDetails` a traduz em 403.
 *
 * O default é `null` e não a frase (Q-2 do review de 2026-08-30): parâmetro
 * default de construtor é expressão constante e não aceita `__()`, então a
 * frase nascia literal em português. Resolver o texto no corpo é o que põe
 * esta recusa dentro de `lang/` como as outras. Os chamadores que passam
 * mensagem própria (`SystemRoleGuard`, `Role`) já a trazem de `lang/`.
 */
class ImmutableSystemRoleException extends RecusaDeDominio
{
    public function __construct(?string $message = null)
    {
        parent::__construct($message ?? __('identity.errors.system_role_immutable'));
    }

    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::AcaoProibida;
    }
}
