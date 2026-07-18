<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Data\SessionUserData;
use App\Http\Controllers\Controller;
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
    public function login(Request $request): SessionUserData
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
        if (! Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
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
            throw ValidationException::withMessages([
                'email' => __('auth.inactive'),
            ]);
        }

        return SessionUserData::fromUser($user);
    }

    public function logout(Request $request): JsonResponse
    {
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
