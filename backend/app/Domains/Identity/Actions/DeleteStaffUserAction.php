<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\SuperadminGuard;
use Illuminate\Support\Facades\DB;

/**
 * Arquiva (soft-delete) o usuário staff, barrando o lock-out pelo mesmo
 * SuperadminGuard da UpdateStaffUserAction.
 *
 * Existe para o guard rodar DENTRO da transação que escreve. No controller, sem
 * transação, a leitura travada do guard era solta no autocommit antes do
 * `delete()`: duas exclusões concorrentes dos dois últimos superadmins passavam
 * as duas e o sistema ficava sem nenhum (review de 2026-08-11, Q-1).
 */
class DeleteStaffUserAction
{
    public function __construct(private SuperadminGuard $guard) {}

    public function execute(User $user): void
    {
        DB::transaction(function () use ($user) {
            $this->guard->assertNotLastActiveSuperadmin($user);

            $user->delete();
        });
    }
}
