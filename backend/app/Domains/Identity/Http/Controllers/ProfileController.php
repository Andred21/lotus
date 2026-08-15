<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\UpdateProfileAction;
use App\Domains\Identity\Data\ProfileData;
use App\Domains\Identity\Data\ProfileUpdateData;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Perfil do PRÓPRIO usuário. A posse é estrutural: nenhuma rota daqui carrega
 * `{id}`, toda ação opera sobre `$request->user()`, e por isso não existe
 * request capaz de endereçar outro usuário. A garantia é a forma da rota, não
 * uma checagem que alguém pode esquecer de escrever.
 *
 * Estas rotas ficam sob `auth:sanctum` e NUNCA sob
 * `permission:identity.user.update`, que é o gate do cadastro administrativo:
 * um redator não tem essa permissão e precisa editar o próprio perfil.
 */
class ProfileController extends Controller
{
    public function show(Request $request): ProfileData
    {
        return ProfileData::fromUser($request->user());
    }

    public function update(ProfileUpdateData $data, Request $request, UpdateProfileAction $action): ProfileData
    {
        return ProfileData::fromUser($action->execute($request->user(), $data));
    }
}
