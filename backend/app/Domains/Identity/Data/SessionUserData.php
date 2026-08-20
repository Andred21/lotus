<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\User;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Illuminate\Http\Request;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\WithTransformer;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class SessionUserData extends Data
{
    /**
     * @param  string[]  $roles
     * @param  string[]  $permissions
     */
    public function __construct(
        public int $id,
        public string $uuid,
        public string $name,
        public string $email,
        public string $type,
        public bool $is_active,
        public array $roles = [],
        public array $permissions = [],
        /**
         * Só SAÍDA: `SessionUserData` nasce sempre de `fromUser()` (login/me),
         * nunca de request body. `#[Computed]` aqui não muda comportamento de
         * runtime — fecha o arch test de D-12, que exige o atributo em todo
         * campo de foto para não deixar essa garantia depender de quem lembrou.
         */
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $photo_url = null,
    ) {}

    /**
     * Monta o payload da sessão incluindo o RBAC efetivo (roles + todas as
     * permissões via roles). Usado por /login e /me.
     */
    public static function fromUser(User $user): self
    {
        return new self(
            id: $user->id,
            uuid: $user->uuid,
            name: $user->name,
            email: $user->email,
            type: $user->type,
            is_active: $user->is_active,
            roles: $user->getRoleNames()->all(),
            permissions: $user->getAllPermissions()->pluck('name')->all(),
            photo_url: $user->photo_path,
        );
    }

    /**
     * O default de spatie/laravel-data responde 201 a POST (semântica de
     * "recurso criado"). Login/me não criam recurso, então força 200.
     */
    protected function calculateResponseStatus(Request $request): int
    {
        return 200;
    }
}
