<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Exceptions\ImmutableSystemRoleException;
use App\Domains\Identity\Exceptions\RedatorOnlyActionException;
use App\Domains\Identity\Models\Role;
use App\Domains\Identity\Services\SystemRoleGuard;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagemDeIdentidadeLocalizadaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private const CHAVES = [
        'identity.errors.rut_invalid',
        'identity.errors.rut_wrong_type',
        'identity.errors.student_email_required',
        'identity.errors.student_client_required',
        'identity.errors.student_client_not_found',
        'identity.errors.staff_password_required',
        'identity.errors.role_name_taken',
        'identity.errors.last_superadmin',
        'identity.errors.redator_archived',
        'identity.errors.redator_has_active_turmas',
        'identity.errors.documents_shape',
        'identity.errors.document_type_invalid',
        'identity.errors.permission_invalid',
        // Q-2 do review de 2026-08-30: as cinco recusas que nasceram literais
        // no construtor/no `throw`, fora do alcance da catraca de `withMessages`.
        'identity.errors.system_role_immutable',
        'identity.errors.system_role_permissions_immutable',
        'identity.errors.system_role_not_deletable',
        'identity.errors.system_role_not_renamable',
        'identity.errors.redator_only_action',
    ];

    #[Test]
    public function as_dezoito_mensagens_existem_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            foreach (self::CHAVES as $chave) {
                $this->assertNotSame($chave, __($chave), "{$chave} falta em {$locale}.");
            }
        }
    }

    #[Test]
    public function o_tipo_de_documento_invalido_interpola_o_codigo_recebido(): void
    {
        app()->setLocale('es_CL');
        $frase = __('identity.errors.document_type_invalid', ['tipo' => 'XPTO']);

        $this->assertStringContainsString('XPTO', $frase);
    }

    #[Test]
    public function todo_documento_de_relator_tem_rotulo_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            foreach (RedatorDocumentType::cases() as $tipo) {
                $chave = 'identity.document_type.'.$tipo->value;
                $this->assertNotSame($chave, __($chave), "{$chave} falta em {$locale}.");
            }
        }
    }

    /**
     * As quatro recusas de role de sistema saem de `lang/` — inclusive as três
     * que interpolam o nome da role (Q-2 do review de 2026-08-30). Elas eram
     * string crua em português no `throw`, e a catraca da Task 9 não as via
     * porque só varre `withMessages`.
     */
    #[Test]
    public function as_recusas_de_role_de_sistema_saem_de_lang(): void
    {
        $role = Role::findByName('admin');

        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);

            $permissoes = $this->mensagemDe(fn () => app(SystemRoleGuard::class)->assertPermissionsMutable($role));
            $this->assertSame(__('identity.errors.system_role_permissions_immutable', ['role' => 'admin']), $permissoes);
            $this->assertStringContainsString('admin', $permissoes);

            $remocao = $this->mensagemDe(fn () => $role->delete());
            $this->assertSame(__('identity.errors.system_role_not_deletable', ['role' => 'admin']), $remocao);

            $renome = $this->mensagemDe(function () use ($role) {
                $role->name = 'admin-renomeada';
                $role->save();
            });
            $this->assertSame(__('identity.errors.system_role_not_renamable', ['role' => 'admin']), $renome);
            $role->name = 'admin';

            $this->assertSame(
                __('identity.errors.system_role_immutable'),
                (new ImmutableSystemRoleException)->getMessage(),
            );
            $this->assertSame(
                __('identity.errors.redator_only_action'),
                (new RedatorOnlyActionException)->getMessage(),
            );
        }
    }

    /** @param  callable():mixed  $acao */
    private function mensagemDe(callable $acao): string
    {
        try {
            $acao();
        } catch (ImmutableSystemRoleException $e) {
            return $e->getMessage();
        }

        $this->fail('A recusa não aconteceu.');
    }

    #[Test]
    public function o_bloco_de_email_continua_intacto(): void
    {
        app()->setLocale('es_CL');
        $this->assertNotSame('identity.invitation.subject', __('identity.invitation.subject'));
        $this->assertNotSame('identity.reset.subject', __('identity.reset.subject'));
    }
}
