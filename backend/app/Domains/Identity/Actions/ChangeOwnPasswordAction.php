<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Troca a própria senha e encerra as outras sessões num passo atômico (spec
 * D3): se o purge falhar, a senha não fica trocada com as sessões antigas
 * vivas — a transação desfaz as duas escritas juntas.
 *
 * O hash sai do cast `'password' => 'hashed'` do model — nenhum `Hash::make`
 * aqui. `password` está fora de `$auditInclude`, então a troca não deixa hash
 * em `audits`.
 */
class ChangeOwnPasswordAction
{
    public function __construct(private PurgeOtherSessionsAction $purge) {}

    public function execute(User $user, string $password, string $keepSessionId): void
    {
        DB::transaction(function () use ($user, $password, $keepSessionId): void {
            $user->update(['password' => $password]);
            $this->purge->execute($user, $keepSessionId);
        });
    }
}
