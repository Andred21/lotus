<?php

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\PurgeOtherSessionsAction;
use App\Domains\Identity\Data\ForgotPasswordData;
use App\Domains\Identity\Data\ResetPasswordData;
use App\Domains\Identity\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Throwable;

class PasswordResetController extends Controller
{
    public function __construct(private PurgeOtherSessionsAction $sessions) {}

    /**
     * Resposta genérica SEMPRE, exista o e-mail ou não: distinguir os dois
     * casos transformaria uma rota pública em enumerador de usuários. O
     * status do broker é deliberadamente descartado.
     */
    public function forgot(ForgotPasswordData $data): JsonResponse
    {
        try {
            Password::broker('users')->sendResetLink([
                'email' => $data->email,
                // RN-01: cliente e aluno NÃO autenticam e nascem
                // `is_active=false`. Sem este filtro a rota anônima dispara
                // "defina sua senha" para o contato comercial de um cliente,
                // que definiria a senha e seria recusado no login. A chave
                // extra vira `where` no EloquentUserProvider. É o mesmo gate
                // do AuthController: quem não passa nele não tem o que
                // recuperar.
                'is_active' => true,
            ]);
        } catch (Throwable $e) {
            // A notificação é síncrona (nenhuma das duas é ShouldQueue): com
            // SMTP fora do ar, e-mail existente estouraria 500 e inexistente
            // devolveria 200 — o mesmo oráculo de cima, pela via da falha.
            report($e);
        }

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
                DB::transaction(function () use ($user, $password): void {
                    // O hash sai do cast 'password' => 'hashed' do model, como
                    // em ChangeOwnPasswordAction. Nenhum Hash::make aqui.
                    $user->update(['password' => $password]);

                    // Trocar a senha e deixar a sessão antiga viva anula o
                    // motivo de recuperar: `auth:sanctum` não reconsulta senha
                    // nem `is_active` a cada request, então só o purge derruba
                    // quem já está dentro. Mesma regra do
                    // ChangeOwnPasswordAction — lá `execute()` preserva a
                    // sessão corrente porque o usuário está logado; aqui ele
                    // não está, e não há sessão a preservar.
                    $this->sessions->all($user);
                });
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            // `INVALID_USER` e `INVALID_TOKEN` sobem com a MESMA mensagem:
            // PasswordBroker::validateReset resolve o usuário ANTES de checar
            // o token, então mensagens distintas fariam de qualquer token
            // inventado um oráculo de "este e-mail tem conta" (spec §5).
            $chave = $status === Password::INVALID_USER ? Password::INVALID_TOKEN : $status;

            throw ValidationException::withMessages(['token' => __($chave)]);
        }

        return response()->noContent();
    }
}
