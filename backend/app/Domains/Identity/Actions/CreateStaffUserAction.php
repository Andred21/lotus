<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\UserData;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;

/**
 * Cria o usuário staff (type=admin) numa transação: normaliza/checa RUT e e-mail,
 * cria o User ativo com senha real (cast 'hashed' hasheia no set) e sincroniza a
 * role. Diferente do UserProvisioner::provision (ator inativo com placeholder):
 * staff loga, então nasce ativo com a senha do formulário. Senha é obrigatória
 * aqui (regra do create), o resto da forma vem validado pelo UserData::rules().
 */
class CreateStaffUserAction
{
    public function __construct(private UserProvisioner $users) {}

    public function execute(UserData $data): User
    {
        if ($data->password instanceof Optional || $data->password === '') {
            throw ValidationException::withMessages(['password' => 'A senha é obrigatória.']);
        }

        return DB::transaction(function () use ($data) {
            $rut = ($data->rut instanceof Optional || $data->rut === null)
                ? null
                : $this->users->ensureRutAvailable($data->rut);

            $this->users->ensureEmailAvailable($data->email);

            $user = User::create([
                'name' => $data->name,
                'email' => $data->email,
                'rut' => $rut,
                'phone' => $data->phone instanceof Optional ? null : $data->phone,
                'password' => $data->password,
                'type' => 'admin',
                'is_active' => $data->is_active,
            ]);

            $user->syncRoles([$data->role]);

            return $user->load('roles');
        });
    }
}
