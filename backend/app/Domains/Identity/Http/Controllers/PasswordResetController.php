<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Data\ForgotPasswordData;
use App\Domains\Identity\Data\ResetPasswordData;
use App\Domains\Identity\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Resposta genérica SEMPRE, exista o e-mail ou não: distinguir os dois
     * casos transformaria uma rota pública em enumerador de usuários. O
     * status do broker é deliberadamente descartado.
     */
    public function forgot(ForgotPasswordData $data): JsonResponse
    {
        Password::broker('users')->sendResetLink(['email' => $data->email]);

        return response()->json(['message' => __('identity.reset.requested')]);
    }

    public function reset(ResetPasswordData $data): Response
    {
        return $this->consume('users', $data);
    }

    public function accept(ResetPasswordData $data): Response
    {
        return $this->consume('invites', $data);
    }

    /**
     * Um broker por fluxo, e nunca o outro: é o que mantém os TTLs separados
     * (7 dias no convite, 60 minutos na recuperação). Token recusado sobe 422
     * pelo handler global — nunca `abort()`.
     */
    private function consume(string $broker, ResetPasswordData $data): Response
    {
        $status = Password::broker($broker)->reset(
            [
                'email' => $data->email,
                'password' => $data->password,
                'password_confirmation' => $data->password_confirmation,
                'token' => $data->token,
            ],
            function (User $user, string $password): void {
                // O hash sai do cast 'password' => 'hashed' do model, como em
                // ChangeOwnPasswordAction. Nenhum Hash::make aqui.
                $user->update(['password' => $password]);
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['token' => __($status)]);
        }

        return response()->noContent();
    }
}
