<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RoleData;
use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Services\SystemRoleGuard;
use App\Domains\Identity\Support\PermissionCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

/**
 * Edita role customizada. `SystemRoleGuard` barra (403) qualquer mutação de role
 * de sistema — o pivot de permissões não dispara evento de model, então a regra
 * é imposta aqui. Nome único ignorando o próprio id (molde UserProvisioner).
 */
class UpdateRoleAction
{
    public function __construct(private SystemRoleGuard $guard) {}

    public function execute(Role $role, RoleData $data): Role
    {
        return DB::transaction(function () use ($role, $data) {
            $this->guard->assertPermissionsMutable($role);

            $collision = Role::where('name', $data->name)->where('id', '!=', $role->id)->exists();
            if ($collision) {
                throw ValidationException::withMessages(['name' => 'Já existe uma role com esse nome.']);
            }

            PermissionCatalog::assertAssignable($data->permissions);

            if ($role->name !== $data->name) {
                $role->update(['name' => $data->name]);
            }
            $role->syncPermissions($data->permissions);

            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return $role->load('permissions');
        });
    }
}
