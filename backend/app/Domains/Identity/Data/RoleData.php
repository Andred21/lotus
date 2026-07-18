<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\Role;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Projeção de role para o select do form de usuário e a listagem read-only.
 * `is_system` (superadmin/admin/redator) marca as imutáveis (ADR-07). O payload
 * de permissões por role fica para o Bloco 5.2b (gate identity.access.manage).
 */
#[TypeScript]
class RoleData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public bool $is_system,
    ) {}

    public static function fromModel(Role $role): self
    {
        return new self(
            id: $role->id,
            name: $role->name,
            is_system: $role->isSystem(),
        );
    }
}
