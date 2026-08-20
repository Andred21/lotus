<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Restaura o usuário staff arquivado.
 *
 * SEM cascata e SEM lock de linha: `User` é folha do arquivamento — quem
 * cascateia PARA ele é `Client` e `Redator`, nunca o contrário. Não há
 * enumera-e-restaura, logo não há a janela de check-then-act que obriga o mutex
 * em `RestoreClientAction`/`RestoreRedatorAction`.
 *
 * A transação fica pelo outro motivo: o `restore()` escreve a linha E a audit
 * `restored` (ADR-08), e as duas ou entram juntas ou não entram.
 *
 * SEM guard, também: o `SuperadminGuard` da `DeleteStaffUserAction` existe para
 * impedir que o último superadmin ativo SAIA. Voltar nunca é esse problema.
 */
class RestoreStaffUserAction
{
    public function execute(User $user): User
    {
        return DB::transaction(function () use ($user) {
            // No-op idempotente: a rota resolve por `onlyTrashed()`, então chegar
            // aqui com registro ativo significa que alguém restaurou entre o
            // binding e esta linha. Restaurar duas vezes não é erro.
            if ($user->trashed()) {
                $user->restore();
            }

            return $user->load(['roles', 'latestLogin']);
        });
    }
}
