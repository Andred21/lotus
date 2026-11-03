<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\UserData;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\SuperadminGuard;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

/**
 * Atualiza o usuário staff: dados + role (sync) + senha opcional (só re-hash se
 * presente). Antes de qualquer escrita — e dentro da MESMA transação que
 * escreve —, se esta operação retira o superadmin-ness do alvo (troca de role ou
 * desativação), o SuperadminGuard barra caso seja o último superadmin ativo:
 * fonte única da regra de não-lock-out.
 */
class UpdateStaffUserAction
{
    public function __construct(
        private UserProvisioner $users,
        private SuperadminGuard $guard,
        private PurgeOtherSessionsAction $sessions,
    ) {}

    public function execute(User $user, UserData $data): User
    {
        $losesSuperadmin = $user->hasRole('superadmin')
            && ($data->role !== 'superadmin' || $data->is_active === false);

        return DB::transaction(function () use ($user, $data, $losesSuperadmin) {
            // Guard DENTRO da transação que escreve, e como PRIMEIRA operação:
            // ele faz uma leitura travada do conjunto de superadmins ativos, e
            // fora da transação esse lock seria solto no autocommit — check e
            // write voltariam a ser dois passos independentes.
            if ($losesSuperadmin) {
                $this->guard->assertNotLastActiveSuperadmin($user);
            }

            // Revogação é transição, não estado: só purga quem estava ativo e
            // passou a inativo. Reenviar `false` para conta já desligada não
            // derruba sessão nenhuma. Forma copiada do `UpdateRedatorAction`,
            // que já acertava — o staff é que não tinha a metade dele.
            $revogando = ! $data->is_active instanceof Optional
                && $data->is_active === false
                && $user->is_active === true;

            $attrs = [
                'name' => $data->name,
                'email' => $data->email,
                // `rut` omitido segue como `Optional` e o provisioner não mexe na
                // coluna; só o `null` explícito apaga (D1) e pula só a checagem
                // de RUT, nunca a de e-mail.
                'rut' => $data->rut,
                'phone' => $data->phone,
                'is_active' => $data->is_active,
            ];

            // `password` só entra quando não vazia: aqui `''` também significa
            // "mantém a atual", e isso é regra de senha, não de omissão.
            if (! ($data->password instanceof Optional) && $data->password !== '') {
                $attrs['password'] = $data->password;
            }

            // Unicidade DENTRO da transação: fora dela, check e write são duas
            // operações independentes. `update()` é a porta única.
            $this->users->update($user, $attrs);

            if ($revogando) {
                $this->sessions->all($user);
            }

            $user->syncRoles([$data->role]);

            return $user->fresh()->load('roles');
        });
    }
}
