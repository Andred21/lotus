<?php

namespace App\Domains\Identity\Models;

use App\Domains\Identity\Exceptions\ImmutableSystemRoleException;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Role do domínio Identity. Estende a do spatie para tornar as roles de sistema
 * imutáveis (ADR-07). O guard de model cobre delete e rename em qualquer caminho
 * (UI, API, tinker). Alteração de permissões vai pelo pivot role_has_permissions
 * e NÃO dispara eventos de model — essa regra é imposta pelo SystemRoleGuard,
 * chamado pelas Actions de gestão de RBAC.
 */
class Role extends SpatieRole
{
    /** Roles de sistema — fonte da verdade é o RolePermissionSeeder. */
    public const SYSTEM_ROLES = ['superadmin', 'admin', 'redator'];

    public function isSystem(): bool
    {
        return in_array($this->name, self::SYSTEM_ROLES, true);
    }

    protected static function booted(): void
    {
        parent::booted();

        static::deleting(function (Role $role) {
            if ($role->isSystem()) {
                throw new ImmutableSystemRoleException(
                    "A role de sistema '{$role->name}' não pode ser removida.",
                );
            }
        });

        static::updating(function (Role $role) {
            $wasSystem = in_array($role->getOriginal('name'), self::SYSTEM_ROLES, true);

            if ($wasSystem && ($role->isDirty('name') || $role->isDirty('guard_name'))) {
                throw new ImmutableSystemRoleException(
                    "A role de sistema '{$role->getOriginal('name')}' não pode ser renomeada.",
                );
            }
        });
    }
}
