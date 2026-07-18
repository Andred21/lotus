<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateRoleAction;
use App\Domains\Identity\Actions\UpdateRoleAction;
use App\Domains\Identity\Data\RoleData;
use App\Domains\Identity\Models\Role;
use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Roles: index alimenta o select do form de usuário (gate brando user.view) e a
 * tabela read-only; store/update são a criação/edição de role customizada (gate
 * sensível access.manage — só superadmin). System roles são imutáveis (guard).
 */
class RoleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['index']),
            new Middleware('permission:identity.access.manage', only: ['store', 'update']),
        ];
    }

    /** @return array<RoleData> */
    public function index(): array
    {
        return Role::with('permissions')->orderBy('name')->get()
            ->map(fn (Role $r) => RoleData::fromModel($r))
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
