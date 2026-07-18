<?php

namespace App\Domains\Identity\Support;

use App\Domains\Identity\Data\PermissionData;
use Illuminate\Validation\ValidationException;

/**
 * Fonte única do catálogo de permissões (ADR-07). O RolePermissionSeeder e a
 * API do catálogo consomem daqui — a descrição não se duplica (lição 13).
 * Métodos estáticos: catálogo puro, sem estado.
 */
class PermissionCatalog
{
    /** Exclusivas do superadmin — não compõem role customizada (5.2b). */
    public const SEGREGATED = [
        'commercial.quote.approve',
        'identity.access.manage',
        'certification.certificate.revoke',
    ];

    /** Catálogo canônico: nome da permissão => descrição. */
    public static function descriptions(): array
    {
        return [
            // ---- Identity ----
            'identity.user.view' => 'Ver usuários e redatores',
            'identity.user.create' => 'Criar usuários e redatores',
            'identity.user.update' => 'Editar usuários e redatores',
            'identity.user.delete' => 'Remover (soft delete) usuários',
            'identity.access.manage' => 'Gerir roles e permissões de outros usuários (sensível)',

            // ---- Commercial ----
            'commercial.client.view' => 'Ver clientes (empresas contratantes)',
            'commercial.client.create' => 'Criar clientes',
            'commercial.client.update' => 'Editar clientes, endereços e contatos',
            'commercial.client.delete' => 'Remover clientes',
            'commercial.budget.view' => 'Ver orçamentos',
            'commercial.budget.create' => 'Criar orçamentos',
            'commercial.budget.update' => 'Editar orçamentos',
            'commercial.budget.delete' => 'Remover orçamentos',
            'commercial.quote.view' => 'Ver cotações',
            'commercial.quote.create' => 'Criar cotações',
            'commercial.quote.update' => 'Editar cotações',
            'commercial.quote.delete' => 'Remover cotações',
            'commercial.quote.approve' => 'Aprovar cotação com aceite do cliente (Fluxo 2 — só superadmin)',

            // ---- Catalog ----
            'catalog.course.view' => 'Ver cursos e templates de certificado',
            'catalog.course.create' => 'Criar cursos',
            'catalog.course.update' => 'Editar cursos, templates e habilitação de redatores',
            'catalog.course.delete' => 'Remover cursos',

            // ---- Operation ----
            'operation.turma.view' => 'Ver turmas',
            'operation.turma.create' => 'Criar turmas',
            'operation.turma.update' => 'Editar turmas',
            'operation.turma.delete' => 'Remover turmas',
            'operation.enrollment.manage' => 'Matricular alunos / importar planilha (Fluxo 3)',
            'operation.turma.assign_redator' => 'Designar redator idôneo à turma (Fluxo 3)',
            'operation.turma.complete' => 'Confirmar conclusão da turma (Fluxo 4 — admin confirma)',
            'operation.turma.submit_docs' => 'Subir documentação da turma (Fluxo 1/4 — ação do redator)',

            // ---- Certification ----
            'certification.certificate.view' => 'Ver certificados',
            'certification.certificate.issue' => 'Emitir certificado (Fluxo 5)',
            'certification.certificate.revoke' => 'Revogar certificado (Fluxo 6 — sensível, peso legal)',

            // ---- Feedback ----
            'feedback.feedback.view' => 'Ver feedbacks de turma',
            'feedback.feedback.manage' => 'Gerir feedbacks de turma',
        ];
    }

    /** @return array<PermissionData> lista plana; o front agrupa por `group`. */
    public static function toData(): array
    {
        return array_map(
            fn (string $name, string $description) => new PermissionData(
                name: $name,
                description: $description,
                group: explode('.', $name)[0],
                segregated: in_array($name, self::SEGREGATED, true),
            ),
            array_keys(self::descriptions()),
            array_values(self::descriptions()),
        );
    }

    /**
     * Barra permissão desconhecida ou segregada ao compor role customizada.
     *
     * @param  string[]  $names
     */
    public static function assertAssignable(array $names): void
    {
        $unknown = array_diff($names, array_keys(self::descriptions()));
        $segregated = array_intersect($names, self::SEGREGATED);

        if ($unknown !== [] || $segregated !== []) {
            throw ValidationException::withMessages([
                'permissions' => 'Permissão inválida ou não atribuível a uma role customizada.',
            ]);
        }
    }
}
