<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Notifications\RedatorAccessInvitation;
use Illuminate\Support\Facades\Password;

/**
 * Fonte única do convite de primeiro acesso: garante a role, cria o token no
 * broker `invites` (7 dias, tabela própria) e notifica. Usada pelo cadastro e
 * pelo reenvio — duplicar o trio faria os dois caminhos divergirem.
 */
class SendRedatorAccessInvitationAction
{
    public function execute(User $user): void
    {
        // RF-ROL-05: o redator cadastrado ANTES deste bloco não tem a role —
        // ela só era atribuída em CreateRedatorAction. Sem isto o reenvio dá
        // senha e não dá acesso: o legado autentica com `roles: []` e
        // `permissions: []`, e o gate de toda seção é permissão, não `type`
        // (Sidebar/usePermissions no front, `$user->can()` no dashboard).
        // `syncRoles` é idempotente — no cadastro novo a role já está lá.
        $user->syncRoles(['redator']);

        $token = Password::broker('invites')->createToken($user);

        $user->notify((new RedatorAccessInvitation($token))->locale('es_CL'));
    }
}
