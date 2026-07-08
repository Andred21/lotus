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
        $rut = $this->ensureRutAvailable($rut);

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

    /**
     * Normaliza o RUT e garante unicidade — inclusive contra soft-deletados,
     * pois o índice único de users.rut não distingue deleted_at (senão o
     * conflito viraria 500 em vez de 422). Fonte única desta regra: create
     * (provision) e updates dos atores chamam este método.
     *
     * @param  int|null  $exceptUserId  id do próprio user, ignorado na checagem (update)
     * @return string  o RUT já formatado, pronto para persistir
     */
    public function ensureRutAvailable(string $rut, ?int $exceptUserId = null): string
    {
        $rut = Rut::parse($rut)->format();

        $duplicate = User::withTrashed()
            ->where('rut', $rut)
            ->when($exceptUserId !== null, fn ($q) => $q->where('id', '!=', $exceptUserId))
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages(['rut' => 'Este RUT já está cadastrado.']);
        }

        return $rut;
    }
}
