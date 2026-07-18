<?php

namespace App\Domains\Identity\Services;

use App\Domains\Identity\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Guarda de aplicação contra lock-out: impede que uma operação (remover a role
 * superadmin, desativar ou deletar) deixe o sistema sem nenhum superadmin ativo.
 *
 * Guarda de aplicação (não trigger, não evento de model): a mudança de role
 * passa pelo pivot model_has_roles e não dispara eventos de Eloquent — mesma
 * razão do SystemRoleGuard. As Actions/Controller chamam este método ANTES de
 * persistir a operação que retiraria o superadmin-ness do alvo.
 */
class SuperadminGuard
{
    public function assertNotLastActiveSuperadmin(User $target): void
    {
        if (! ($target->hasRole('superadmin') && $target->is_active)) {
            return;
        }

        $othersExist = User::role('superadmin')
            ->where('is_active', true)
            ->where('id', '!=', $target->id)
            ->exists();

        if (! $othersExist) {
            throw ValidationException::withMessages([
                'role' => 'Não é possível deixar o sistema sem superadmin ativo.',
            ]);
        }
    }
}
