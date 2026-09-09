<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateRoleAction;
use App\Domains\Identity\Actions\UpdateRoleAction;
use App\Domains\Identity\Data\RoleData;
use App\Domains\Identity\Data\RoleOptionData;
use App\Domains\Identity\Models\Role;
use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Roles: `index` devolve nome, permissões e flag de sistema para a tela de
 * Roles y Permisos, e por isso vive sob o gate sensível `access.manage` — o
 * mesmo de `/api/permissions` e da escrita. `assignable` é o lookup do select
 * do form de usuário (gate brando `user.view`) e não enumera permissão
 * nenhuma. System roles são imutáveis (guard).
 */
class RoleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['assignable']),
            new Middleware('permission:identity.access.manage', only: ['index', 'store', 'update']),
        ];
    }

    /** @return array<RoleData> */
    public function index(): array
    {
        return Role::with('permissions')->orderBy('name')->get()
            ->map(fn (Role $r) => RoleData::fromModel($r))
            ->all();
    }

    /** @return array<RoleOptionData> */
    public function assignable(): array
    {
        return Role::query()->orderBy('name')->get(['id', 'name'])
            ->map(fn (Role $r) => RoleOptionData::fromModel($r))
            ->all();
    }

    public function store(RoleData $data, CreateRoleAction $action): RoleData
    {
        return RoleData::fromModel($action->execute($data));
    }

    public function update(RoleData $data, Role $role, UpdateRoleAction $action): RoleData
    {
        return RoleData::fromModel($action->execute($role, $data));
    }
}
