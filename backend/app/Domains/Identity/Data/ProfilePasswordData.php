<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Entrada do `PUT /api/profile/password`. `password_confirmation` é
 * propriedade de verdade, e não só chave de payload lida pela regra
 * `confirmed`, para o tipo gerado não mentir sobre o que a rota espera.
 */
#[TypeScript]
class ProfilePasswordData extends Data
{
    public function __construct(
        public string $current_password,
        public string $password,
        public string $password_confirmation,
    ) {}

    /**
     * `current_password:web` com guard EXPLÍCITO, nunca o ambiente: o guard
     * default pode ter sido trocado para 'sanctum' por um `auth:sanctum`
     * anterior no mesmo processo — é a mesma armadilha documentada em
     * `AuthController::login`.
     *
     * `min:8` é a força já vigente em `UserData.php:58`. Política de senha
     * nova não se inventa dentro deste bloco.
     */
    public static function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:web'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ];
    }
}
