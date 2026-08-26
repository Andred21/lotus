<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\RecordLoginAction;
use App\Domains\Identity\Data\SessionUserData;
use App\Http\Controllers\Controller;
use App\Shared\Logging\EventoDeSeguranca;
use App\Shared\RateLimiting\RateLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Autentica via sessão (Sanctum SPA). O CSRF já foi validado
     * pelo middleware antes de chegar aqui.
     */
    public function login(Request $request, RecordLoginAction $recordLogin): SessionUserData
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        // Guard explícito 'web': o guard default pode ter sido trocado para
        // 'sanctum' pelo middleware `auth:sanctum` de uma request anterior
        // nesse mesmo processo (Authenticate::authenticate() chama
        // `Auth::shouldUse()`) — RequestGuard (sanctum) não implementa
        // `attempt()`. Login é sempre sessão (ADR-06), então nunca deve
        // depender do guard ambiente.
        // SEM `remember`: o cookie recaller é a única porta que reautentica
        // fora deste controller (`SessionGuard::user()` chama
        // `userFromRecaller()` e `updateSession()` sozinho), e por ela nenhuma
        // linha de `login_logs` nasce — a coluna "último acesso" envelheceria
        // numa conta em uso diário. O frontend nunca enviou o campo; o que
        // existia era a API aceitá-lo de qualquer cliente. Se remember-me
        // entrar um dia, entra como feature com gate de `is_active` próprio,
        // porque o recaller também não passa pelo gate da linha 44.
        if (! Auth::guard('web')->attempt($credentials)) {
            // A chave vai em HASH: é `email|ip` (a mesma do limitador), e
            // e-mail em claro é justamente o que não pode estar num log.
            EventoDeSeguranca::loginRecusado(
                hash('sha256', RateLimits::chaveDeLogin($request)),
                $request->ip(),
            );

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        // Regenera a sessão para prevenir session fixation
        $request->session()->regenerate();

        $user = Auth::guard('web')->user();

        // Bloqueia login de usuário inativo (RN de acesso)
        if (! $user->is_active) {
            Auth::guard('web')->logout();

            EventoDeSeguranca::loginRecusado(
                hash('sha256', RateLimits::chaveDeLogin($request)),
                $request->ip(),
            );

            throw ValidationException::withMessages([
                'email' => __('auth.inactive'),
            ]);
        }

        // DEPOIS do gate de `is_active`, nunca antes: o `attempt()` já
        // sucedeu neste ponto, mas o acesso só está concedido depois do gate.
        // Capturar antes gravaria acesso de quem a API recusa com 422.
        $recordLogin->execute($user, $request->ip(), $request->userAgent());

        EventoDeSeguranca::loginConcedido($user->id, $user->type, $request->ip());

        return SessionUserData::fromUser($user);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user !== null) {
            EventoDeSeguranca::logout($user->id, $user->type, $request->ip());
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Sessão encerrada.']);
    }

    public function me(Request $request): SessionUserData
    {
        return SessionUserData::fromUser($request->user());
    }
}
