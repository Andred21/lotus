<?php

namespace App\Domains\Dashboard\Data;

use App\Domains\Identity\Models\User;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * O que o papel enxerga do dashboard, um booleano por módulo (D8, D-34).
 *
 * Montado UMA vez a partir do `User` e consumido dos dois lados: o assembler
 * decide o que consultar por ele, e o front decide o que mostrar por ele — em
 * vez de inferir a visibilidade do `null` de cada campo. O dado proibido segue
 * `null` no payload (não vaza); este objeto só torna a decisão explícita.
 *
 * Um booleano por módulo basta porque cada série, métrica e pendência pertence
 * a um módulo só. As seções que leem de dois módulos (funil e rankings =
 * operação e certificação; carga de relatores = identidade e operação) combinam
 * as flags num lugar só de cada lado, não em cada painel.
 */
#[TypeScript]
class DashboardVisibilityData extends Data
{
    public function __construct(
        /** `operation.turma.view`. */
        public bool $operation,
        /** `commercial.quote.view` E `commercial.budget.view`. */
        public bool $commercial,
        /** `certification.certificate.view`. */
        public bool $certification,
        /** `identity.user.view`. */
        public bool $identity,
    ) {}

    public static function forUser(User $user): self
    {
        return new self(
            operation: $user->can('operation.turma.view'),
            // Cotação sem orçamento não existe: o KPI de UF pendente soma valor
            // de cotação dentro de orçamento, então as duas permissões andam
            // juntas.
            commercial: $user->can('commercial.quote.view') && $user->can('commercial.budget.view'),
            certification: $user->can('certification.certificate.view'),
            identity: $user->can('identity.user.view'),
        );
    }
}
