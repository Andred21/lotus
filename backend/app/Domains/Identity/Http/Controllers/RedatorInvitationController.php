<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\SendRedatorAccessInvitationAction;
use App\Domains\Identity\Models\Redator;
use App\Http\Controllers\Controller;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Reenvio do convite de primeiro acesso. Existe porque os redatores
 * cadastrados antes deste bloco nasceram sem credencial utilizável: sem esta
 * rota não há caminho para dar acesso a eles.
 */
class RedatorInvitationController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:identity.user.update')];
    }

    public function store(Redator $redator, SendRedatorAccessInvitationAction $action): Response
    {
        $action->execute($redator->user);

        return response()->noContent();
    }
}
