<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\PurgeOtherSessionsAction;
use App\Domains\Identity\Data\ProfilePasswordData;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ProfilePasswordController extends Controller
{
    /**
     * O hash sai do cast `'password' => 'hashed'` do model — nenhum
     * `Hash::make` aqui. `password` está fora de `$auditInclude`, então a
     * troca não deixa hash em `audits`.
     */
    public function update(ProfilePasswordData $data, Request $request, PurgeOtherSessionsAction $purge): Response
    {
        $user = $request->user();

        $user->update(['password' => $data->password]);
        $purge->execute($user, $request->session()->getId());

        return response()->noContent();
    }
}
