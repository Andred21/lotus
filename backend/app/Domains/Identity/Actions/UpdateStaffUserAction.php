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

            // Unicidade DENTRO da transação: fora dela, check e write são duas
            // operações independentes. Molde dos irmãos que já faziam certo
            // (CreateStaffUserAction, Create/UpdateStudentAction).
            $rut = ($data->rut instanceof Optional || $data->rut === null)
                ? null
                : $this->users->ensureRutAvailable($data->rut, $user->id);

            $this->users->ensureEmailAvailable($data->email, $user->id);

            $attrs = [
                'name' => $data->name,
                'email' => $data->email,
                'rut' => $rut,
                'phone' => $data->phone instanceof Optional ? null : $data->phone,
                'is_active' => $data->is_active,
            ];

            if (! ($data->password instanceof Optional) && $data->password !== '') {
                $attrs['password'] = $data->password;
            }

            $user->update($attrs);
            $user->syncRoles([$data->role]);

            return $user->fresh()->load('roles');
        });
    }
}
