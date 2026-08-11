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
 * razão do SystemRoleGuard.
 *
 * CHAMAR DE DENTRO da transação que persiste a operação. Fora dela, checagem e
 * escrita são duas operações independentes e duas demoções concorrentes passam
 * as duas — cada uma enxergando a outra como "o outro superadmin ativo" — e o
 * sistema fica com zero (review de 2026-08-11, Q-1).
 */
class SuperadminGuard
{
    public function assertNotLastActiveSuperadmin(User $target): void
    {
        // Leitura TRAVADA do conjunto INTEIRO, o alvo incluído — é o que torna
        // esta a região crítica compartilhada de todas as demoções.
        //
        // Excluir o alvo do `FOR UPDATE` (o `where('id','!=')` que estava aqui)
        // quebraria o mutex: demovendo A e B ao mesmo tempo, T1 travaria {B} e
        // T2 travaria {A}, sem conflito nenhum — as duas veriam "existe outro"
        // e commitariam. E ler sem lock não basta: em REPEATABLE READ o SELECT
        // comum volta do snapshot e não enxerga a demoção que a concorrente já
        // commitou.
        //
        // Custo proporcional: são ~10 usuários internos e a operação é rara.
        // No-op SILENCIOSO em sqlite (`SQLiteGrammar::compileLock()` devolve
        // `''`), como todo lock desta base.
        $ativos = User::role('superadmin')
            ->where('is_active', true)
            ->lockForUpdate()
            ->pluck('id');

        // Estado lido sob o lock, não o do model em memória: se o alvo já não é
        // superadmin ativo, esta operação não tira o último de ninguém.
        if (! $ativos->contains($target->id)) {
            return;
        }

        if ($ativos->count() === 1) {
            throw ValidationException::withMessages([
                'role' => 'Não é possível deixar o sistema sem superadmin ativo.',
            ]);
        }
    }
}
