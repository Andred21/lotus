<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Data\RoleData;
use App\Domains\Identity\Models\Role;
use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Listagem de roles para o select do form de usuário e a exibição read-only.
 * A criação de role customizada e o payload de permissões entram no Bloco 5.2b.
 */
class RoleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['index']),
        ];
    }

    /** @return array<RoleData> */
    public function index(): array
    {
        return Role::orderBy('name')->get()
            ->map(fn (Role $r) => RoleData::fromModel($r))
            ->all();
    }
}
