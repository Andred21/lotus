<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Services\UserPhotoService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Foto do PRÓPRIO usuário. Controller fino: valida pelas `RULES` do serviço
 * (fonte única, spec D9) e delega.
 *
 * Nenhum `abort_unless` de tipo aqui, ao contrário dos quatro controllers
 * administrativos de foto: eles precisam recusar o que não é seu porque vivem
 * sob `identity.user.update` e alcançariam entidade de outro módulo. Esta rota
 * não tem parâmetro nenhum — o alvo é sempre `$request->user()`, e só admin e
 * redator autenticam (RN-01).
 */
class ProfilePhotoController extends Controller
{
    public function store(Request $request, UserPhotoService $service): Response
    {
        $request->validate(UserPhotoService::rules());
        $service->store($request->user(), $request->file('photo'));

        return response()->noContent();
    }

    public function destroy(Request $request, UserPhotoService $service): Response
    {
        $service->remove($request->user());

        return response()->noContent();
    }
}
