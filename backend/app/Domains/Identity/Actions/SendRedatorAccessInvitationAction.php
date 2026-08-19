<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Notifications\RedatorAccessInvitation;
use Illuminate\Support\Facades\Password;

/**
 * Fonte única do convite de primeiro acesso: cria o token no broker `invites`
 * (7 dias, tabela própria) e notifica. Usada pelo cadastro e pelo reenvio —
 * duplicar o par token+notificação faria os dois caminhos divergirem.
 */
class SendRedatorAccessInvitationAction
{
    public function execute(User $user): void
    {
        $token = Password::broker('invites')->createToken($user);

        $user->notify((new RedatorAccessInvitation($token))->locale('es_CL'));
    }
}
