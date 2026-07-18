<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateStaffUserAction;
use App\Domains\Identity\Actions\UpdateStaffUserAction;
use App\Domains\Identity\Data\UserData;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\SuperadminGuard;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * CRUD de usuário staff (type=admin). Leitura para quem tem identity.user.view
 * (admin comum inclusive); escrita só para superadmin (identity.access.manage),
 * porque atribuir role é ação sensível. show/update/destroy restritos a type=admin
 * (redator tem controller próprio).
 */
class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:identity.user.view', only: ['index', 'show']),
            new Middleware('permission:identity.access.manage', only: ['store', 'update', 'destroy']),
        ];
    }

    /** @return array<UserData> */
    public function index(): array
    {
        return User::where('type', 'admin')->with('roles')->orderBy('name')->get()
            ->map(fn (User $u) => UserData::fromModel($u))
            ->all();
    }

    public function store(UserData $data, CreateStaffUserAction $action): UserData
    {
        return UserData::fromModel($action->execute($data));
    }

    public function show(User $user): UserData
    {
        abort_unless($user->type === 'admin', 404);

        return UserData::fromModel($user->load('roles'));
    }

    public function update(UserData $data, User $user, UpdateStaffUserAction $action): UserData
    {
        abort_unless($user->type === 'admin', 404);

        return UserData::fromModel($action->execute($user, $data));
    }

    public function destroy(User $user, SuperadminGuard $guard): Response
    {
        abort_unless($user->type === 'admin', 404);

        $guard->assertNotLastActiveSuperadmin($user);
        $user->delete();

        return response()->noContent();
    }
}
