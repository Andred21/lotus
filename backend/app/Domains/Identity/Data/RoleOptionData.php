<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\Role;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Role reduzida ao que o SELECT do form de usuário precisa: id e nome.
 *
 * Existe para o índice rico não ser a única porta: `RoleData` carrega o
 * conjunto de permissões de TODA role, inclusive a do superadmin, e o gate
 * dele era o brando `identity.user.view` (D-10). Quem só monta um dropdown não
 * precisa saber o que cada role pode fazer.
 */
#[TypeScript]
class RoleOptionData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
    ) {}

    public static function fromModel(Role $role): self
    {
        return new self(id: $role->id, name: $role->name);
    }
}
