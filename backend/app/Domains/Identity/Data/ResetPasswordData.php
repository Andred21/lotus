<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Entrada de `POST /api/password/reset` e de `POST /api/invitation/accept` —
 * a mesma tela pública serve os dois fluxos, e o que muda é o broker que
 * valida o token, não o formato do payload.
 *
 * `password_confirmation` é propriedade de verdade, e não só chave lida pela
 * regra `confirmed`, pelo mesmo motivo de `ProfilePasswordData`: o tipo
 * gerado não pode mentir sobre o que a rota espera.
 */
#[TypeScript]
class ResetPasswordData extends Data
{
    public function __construct(
        public string $token,
        public string $email,
        public string $password,
        public string $password_confirmation,
    ) {}

    /**
     * `min:8` é a régua já vigente em `ProfilePasswordData.php:35` e
     * `UserData.php:58`. Política de senha nova não se inventa neste bloco.
     *
     * @return array<string,array<int,string>>
     */
    public static function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ];
    }
}
