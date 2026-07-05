<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Exceptions\ImmutableSystemRoleException;
use App\Domains\Identity\Models\Role;

/**
 * Guarda de aplicação para a imutabilidade das permissões das roles de sistema
 * (ADR-07). As Actions de gestão de RBAC devem chamar `assertPermissionsMutable`
 * antes de sincronizar/conceder/revogar permissões de uma role.
 *
 * Por que aqui e não no model: o spatie altera permissões escrevendo direto no
 * pivot role_has_permissions, sem disparar eventos de model — então essa regra
 * não pode ser imposta por evento de Eloquent (diferente de delete/rename, que
 * ficam no Role). A seeder é a única fonte autorizada a definir essas permissões.
 */
class SystemRoleGuard
{
    public function assertPermissionsMutable(Role $role): void
    {
        if ($role->isSystem()) {
            throw new ImmutableSystemRoleException(
                "As permissões da role de sistema '{$role->name}' são imutáveis.",
            );
        }
    }
}
