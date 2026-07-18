<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Data\PermissionData;
use App\Domains\Identity\Support\PermissionCatalog;
use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/** Catálogo fixo de permissões para compor role customizada. Gate access.manage
 * (só superadmin), igual à escrita de role. */
class PermissionController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:identity.access.manage', only: ['index'])];
    }

    /** @return array<PermissionData> */
    public function index(): array
    {
        return PermissionCatalog::toData();
    }
}
