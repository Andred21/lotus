<?php

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Support\PermissionCatalog;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato de role. Saída: projeta nome, permissões e a flag de sistema para a
 * tela de Roles y Permisos e o select do form de usuário. Entrada (create/update
 * de role customizada): `name` + subconjunto de `permissions`. `id`/`is_system`
 * são só de saída. Unicidade do nome fica na Action (molde UserProvisioner), não
 * em `rules()`, senão o update dá 422 contra o próprio nome.
 */
#[TypeScript]
class RoleData extends Data
{
    /**
     * @param  string[]  $permissions
     */
    public function __construct(
        public string $name,
        public array $permissions = [],
        public int|Optional $id = new Optional,
        public bool|Optional $is_system = new Optional,
    ) {}

    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::notIn(Role::SYSTEM_ROLES)],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name', Rule::notIn(PermissionCatalog::SEGREGATED)],
        ];
    }

    public static function fromModel(Role $role): self
    {
        return new self(
            name: $role->name,
            permissions: $role->permissions->pluck('name')->all(),
            id: $role->id,
            is_system: $role->isSystem(),
        );
    }
}
