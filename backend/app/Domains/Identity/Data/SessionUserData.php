<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\User;
use Illuminate\Http\Request;
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
