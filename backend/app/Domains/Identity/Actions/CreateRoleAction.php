<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\RoleData;
use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Support\PermissionCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

/**
 * Cria role customizada numa transação: nome disponível, permissões atribuíveis
 * (catálogo fixo, sem as segregadas), grava e sincroniza. Invalida o cache do
 * Spatie no fim (ADR-07) — a role nova passa a valer na hora.
 */
class CreateRoleAction
{
    public function execute(RoleData $data): Role
    {
        return DB::transaction(function () use ($data) {
            if (Role::where('name', $data->name)->exists()) {
                throw ValidationException::withMessages(['name' => 'Já existe uma role com esse nome.']);
            }

            PermissionCatalog::assertAssignable($data->permissions);

            $role = Role::create(['name' => $data->name, 'guard_name' => 'web']);
            $role->syncPermissions($data->permissions);

            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return $role->load('permissions');
        });
    }
}
