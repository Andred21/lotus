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
 */
class UserPhotoController extends Controller
{
    public function store(Request $request, User $user, UserPhotoService $service): Response
    {
        $request->validate(UserPhotoService::RULES);
        $service->store($user, $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(User $user, UserPhotoService $service): Response
    {
        $service->remove($user);

        return response()->noContent();
    }
}
