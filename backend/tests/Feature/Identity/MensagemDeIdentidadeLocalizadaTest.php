<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Enums\RedatorDocumentType;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagemDeIdentidadeLocalizadaTest extends TestCase
{
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
    ];

    #[Test]
    public function as_treze_mensagens_existem_nos_tres_locales(): void
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

    #[Test]
    public function o_bloco_de_email_continua_intacto(): void
    {
        app()->setLocale('es_CL');
        $this->assertNotSame('identity.invitation.subject', __('identity.invitation.subject'));
        $this->assertNotSame('identity.reset.subject', __('identity.reset.subject'));
    }
}
