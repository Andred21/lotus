<?php

namespace Database\Seeders;

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
            $permissions = $this->permissions();

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

    /**
     * Catálogo canônico de permissões, agrupado por domínio.
     * A chave é o nome da permission; o valor é a descrição (documentação inline).
     */
    private function permissions(): array
    {
        return [
            // ---- Identity ----
            'identity.user.view'    => 'Ver usuários e redatores',
            'identity.user.create'  => 'Criar usuários e redatores',
            'identity.user.update'  => 'Editar usuários e redatores',
            'identity.user.delete'  => 'Remover (soft delete) usuários',
            'identity.access.manage'=> 'Gerir roles e permissões de outros usuários (sensível)',

            // ---- Commercial ----
            'commercial.client.view'   => 'Ver clientes (empresas contratantes)',
            'commercial.client.create' => 'Criar clientes',
            'commercial.client.update' => 'Editar clientes, endereços e contatos',
            'commercial.client.delete' => 'Remover clientes',
            'commercial.budget.view'   => 'Ver orçamentos',
            'commercial.budget.create' => 'Criar orçamentos',
            'commercial.budget.update' => 'Editar orçamentos',
            'commercial.budget.delete' => 'Remover orçamentos',
            'commercial.quote.view'    => 'Ver cotações',
            'commercial.quote.create'  => 'Criar cotações',
            'commercial.quote.update'  => 'Editar cotações',
            'commercial.quote.delete'  => 'Remover cotações',
            'commercial.quote.approve' => 'Aprovar cotação com aceite do cliente (Fluxo 2 — só superadmin)',

            // ---- Catalog ----
            'catalog.course.view'   => 'Ver cursos e templates de certificado',
            'catalog.course.create' => 'Criar cursos',
            'catalog.course.update' => 'Editar cursos, templates e habilitação de redatores',
            'catalog.course.delete' => 'Remover cursos',

            // ---- Operation ----
            'operation.turma.view'          => 'Ver turmas',
            'operation.turma.create'        => 'Criar turmas',
            'operation.turma.update'        => 'Editar turmas',
            'operation.turma.delete'        => 'Remover turmas',
            'operation.enrollment.manage'   => 'Matricular alunos / importar planilha (Fluxo 3)',
            'operation.turma.assign_redator'=> 'Designar redator idôneo à turma (Fluxo 3)',
            'operation.turma.complete'      => 'Confirmar conclusão da turma (Fluxo 4 — admin confirma)',
            'operation.turma.submit_docs'   => 'Subir documentação da turma (Fluxo 1/4 — ação do redator)',

            // ---- Certification ----
            'certification.certificate.view'   => 'Ver certificados',
            'certification.certificate.issue'  => 'Emitir certificado (Fluxo 5)',
            'certification.certificate.revoke' => 'Revogar certificado (Fluxo 6 — sensível, peso legal)',

            // ---- Feedback ----
            'feedback.feedback.view'   => 'Ver feedbacks de turma',
            'feedback.feedback.manage' => 'Gerir feedbacks de turma',
        ];
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
            'operation.turma.submit_docs',// ação do redator, não do admin
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
