<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\User;
use App\Shared\Support\Rut;
use Illuminate\Validation\ValidationException;

/**
 * Domain Service compartilhado: provisiona o User de login de um "ator"
 * (cliente, redator, aluno) — toda entidade que é extensão 1:1 de User.
 *
 * Normaliza o RUT, garante unicidade (incluindo soft-deletados, pois o índice
 * único de users.rut não distingue deleted_at) e cria o User inativo com senha
 * placeholder: atores não logam até o fluxo de ativação (RN-01).
 *
 * É a fonte única desta regra — as Actions de cada domínio
 * (CreateClientAction, CreateRedatorAction, ...) chamam este service em vez de
 * duplicar o provisionamento.
 */
class UserProvisioner
{
    public function provision(
        string $type,
        string $name,
        string $rut,
        string $email,
        ?string $phone = null,
    ): User {
        $rut = Rut::parse($rut)->format();

        if (User::withTrashed()->where('rut', $rut)->exists()) {
            throw ValidationException::withMessages(['rut' => 'Este RUT já está cadastrado.']);
        }

        return User::create([
            'name' => $name,
            'rut' => $rut,
            'email' => $email,
            'phone' => $phone,
            'password' => bin2hex(random_bytes(16)),
            'type' => $type,
            'is_active' => false,
        ]);
    }
}
