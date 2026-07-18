<?php

namespace Database\Seeders;

use App\Domains\Identity\Support\PermissionCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * Fonte da verdade do RBAC (ADR-07). Roles de sistema imutáveis.
     * Idempotente: firstOrCreate + syncPermissions permitem re-rodar sem duplicar.
     *
     * NOTA: cliente e aluno NÃO são roles aqui (RN-01 / Fluxo 7 — não autenticam).
     * Existem apenas como `type` no enum de users.
     */
    public function run(): void
    {
        // Limpa o cache de permissões do Spatie antes de semear (evita estado obsoleto).
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        DB::transaction(function () {
            $permissions = PermissionCatalog::descriptions();

            foreach (array_keys($permissions) as $name) {
                Permission::firstOrCreate([
                    'name' => $name,
                    'guard_name' => 'web',
                ]);
            }

            $this->syncRole('superadmin', $this->superadminPermissions($permissions));
            $this->syncRole('admin', $this->adminPermissions($permissions));
            $this->syncRole('redator', $this->redatorPermissions($permissions));
        });

        // Recarrega o cache já com o estado novo.
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** superadmin = todas as permissões (inclusive as segregadas por função). */
    private function superadminPermissions(array $permissions): array
    {
        return array_keys($permissions);
    }

    /** admin = operação diária, SEM as ações segregadas (approve, access.manage, revoke). */
    private function adminPermissions(array $permissions): array
    {
        return array_values(array_diff(array_keys($permissions), [
            'commercial.quote.approve',   // Fluxo 2: exclusivo do superadmin
            'identity.access.manage',     // controle do RBAC: exclusivo do superadmin
            'certification.certificate.revoke', // revogação de peso legal: exclusivo do superadmin
            'operation.turma.submit_docs', // ação do redator, não do admin
        ]));
    }

    /**
     * redator = mínimo do Fluxo 7 (interface própria).
     * NOTA DE ESCOPO: turma.view concede o DIREITO de ver turmas. A restrição
     * "só as turmas que ele ministra" é escopo de dados (where redator_id = user),
     * implementada na TurmaPolicy/Query — NÃO aqui no seeder. (Task de Policies.)
     */
    private function redatorPermissions(array $permissions): array
    {
        return [
            'operation.turma.view',
            'operation.turma.submit_docs',
            'feedback.feedback.view',
            'feedback.feedback.manage',
        ];
    }

    private function syncRole(string $name, array $permissionNames): void
    {
        $role = Role::firstOrCreate([
            'name' => $name,
            'guard_name' => 'web',
        ]);

        $role->syncPermissions($permissionNames);
    }
}
