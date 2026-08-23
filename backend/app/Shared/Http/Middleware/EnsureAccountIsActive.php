<?php

namespace App\Shared\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * A RN-01 aplicada por REQUEST, não só na porta. `AuthController:52` confere
 * `is_active` no login e mais nada: uma sessão viva sobrevivia à desativação
 * até o cookie expirar.
 *
 * É a ponta B da spec D5. A ponta A (purge de sessão na Action) fecha o caminho
 * que passa pela Action; esta fecha o resto — conta desligada por seed, por SQL
 * direto ou por uma Action que ainda não existe.
 *
 * Não custa consulta: o Sanctum já carregou o `User` para popular
 * `$request->user()`, e este middleware lê o objeto em mão.
 *
 * `AuthenticationException` e não `abort(401)`: o erro sobe ao handler global e
 * sai como RFC 7807 `application/problem+json` (lei §5.4, ADR-03). A sessão é
 * invalidada ANTES de lançar — deixar a linha viva devolveria 401 a cada
 * request até o cookie expirar, com a sessão ainda no banco.
 */
class EnsureAccountIsActive
{
    /** Os únicos tipos que autenticam (RN-01). Cliente e aluno não logam. */
    private const TIPOS_ELEGIVEIS = ['admin', 'redator'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);   // rota pública: a autenticação decide, não este middleware
        }

        if (! $user->is_active || ! in_array($user->type, self::TIPOS_ELEGIVEIS, true)) {
            if ($request->hasSession()) {
                $request->session()->invalidate();
            }

            Auth::guard('web')->logout();

            throw new AuthenticationException(__('auth.inactive'));
        }

        return $next($request);
    }
}
