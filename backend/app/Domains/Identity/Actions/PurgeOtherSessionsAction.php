<?php

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Encerra todas as sessões do usuário MENOS a informada (spec D3). A corrente
 * sobrevive: quem acabou de trocar a própria senha continua navegando.
 *
 * Lê `sessions` pelo query builder porque sessão é infra do framework, não
 * entidade de domínio — não há model e não há o que auditar nela.
 *
 * Depende de `SESSION_DRIVER=database`, que é o driver do `.env`. Com `array`
 * ou `file` a tabela está vazia e isto é no-op — é exatamente por isso que o
 * teste da tabela escreve as linhas à mão em vez de confiar na suíte.
 *
 * Não se usa `Auth::logoutOtherDevices()`: ele depende do middleware
 * `AuthenticateSession`, que NÃO está registrado em `bootstrap/app.php`.
 * Registrá-lo mexeria na autenticação da aplicação inteira, o que é decisão
 * própria e não efeito colateral de Meu Perfil.
 */
class PurgeOtherSessionsAction
{
    /** @return int quantas sessões foram encerradas */
    public function execute(User $user, string $keepSessionId): int
    {
        return DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $keepSessionId)
            ->delete();
    }
}
