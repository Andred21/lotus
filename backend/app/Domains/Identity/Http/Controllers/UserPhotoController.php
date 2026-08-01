<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Foto do usuário staff. Controller fino: valida pelas RULES do serviço
 * (fonte única) e delega. A permissão está na rota, junto das demais rotas
 * nested do domínio.
 *
 * `abort_unless($user->type === 'admin', 404)` é a MESMA guarda de
 * `UserController::show/update/destroy`, e pelo mesmo motivo: esta rota vive
 * sob `identity.user.update`, então sem ela quem administra staff alcançaria a
 * foto de cliente/aluno/redator por aqui, driblando a permissão do módulo dono
 * (`commercial.client.update` etc.). Ter 4 controllers de foto só evita o
 * acoplamento RBAC cross-módulo (spec D1) se cada um recusar o que não é seu.
 */
class UserPhotoController extends Controller
{
    public function store(Request $request, User $user, UserPhotoService $service): Response
    {
        abort_unless($user->type === 'admin', 404);

        $request->validate(UserPhotoService::RULES);
        $service->store($user, $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(User $user, UserPhotoService $service): Response
    {
        abort_unless($user->type === 'admin', 404);

        $service->remove($user);

        return response()->noContent();
    }
}
