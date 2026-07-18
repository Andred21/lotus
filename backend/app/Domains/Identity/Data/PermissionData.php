<?php

namespace App\Domains\Identity\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Uma permissão do catálogo fixo, projetada para a tela de Roles y Permisos.
 * `group` = domínio (prefixo antes do 1º ponto); `segregated` = exclusiva do
 * superadmin, não oferecida ao compor role customizada (5.2b).
 */
#[TypeScript]
class PermissionData extends Data
{
    public function __construct(
        public string $name,
        public string $description,
        public string $group,
        public bool $segregated,
    ) {}
}
