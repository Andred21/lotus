<?php

namespace App\Domains\Identity\Exceptions;

use App\Shared\Exceptions\RecusaDeDominio;
use App\Shared\Exceptions\TipoDeRecusa;

/**
 * Ação self-service de redator alcançada por um usuário sem perfil de redator
 * (ex.: admin em `POST /api/profile/documents`). Recusa de ação proibida: o
 * `ProblemDetails` a traduz em 403.
 *
 * Default `null` em vez da frase pelo mesmo motivo da irmã
 * `ImmutableSystemRoleException` (Q-2 do review de 2026-08-30).
 */
class RedatorOnlyActionException extends RecusaDeDominio
{
    public function __construct(?string $message = null)
    {
        parent::__construct($message ?? __('identity.errors.redator_only_action'));
    }

    public function tipo(): TipoDeRecusa
    {
        return TipoDeRecusa::AcaoProibida;
    }
}
