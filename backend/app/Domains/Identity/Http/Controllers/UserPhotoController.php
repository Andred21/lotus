<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use App\Shared\Files\Data\PhotoUploadData;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Foto do usuário staff. Controller fino: recebe o `PhotoUploadData`
 * (a política é do `ContentClass`) e delega. A permissão (`identity.user.update`)
 * é declarada aqui, no `HasMiddleware`, e não no `routes.php` (spec D1 do bloco 55).
 *
 * O binding de `{user}` (`User::resolveRouteBinding`) só resolve staff
 * (`User::staff()`), o mesmo escopo do `UserController`, e pelo mesmo motivo:
 * esta rota exige `identity.user.update`, então sem o binding quem administra
 * staff alcançaria a foto de cliente/aluno/redator por aqui, driblando a
 * permissão do módulo dono (`commercial.client.update` etc.). Ter 4 controllers
 * de foto só evita o acoplamento RBAC cross-módulo (spec D1) se cada um recusar
 * o que não é seu — e aqui quem recusa é o binding, não uma guarda no método.
 */
class UserPhotoController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:identity.user.update')];
    }

    public function store(PhotoUploadData $data, User $user, UserPhotoService $service): Response
    {
        $service->store($user, $data->photo);

        return response()->noContent();
    }

    public function destroy(User $user, UserPhotoService $service): Response
    {
        $service->remove($user);

        return response()->noContent();
    }
}
