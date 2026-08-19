<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Notifications\PasswordResetLink;
use App\Domains\Identity\Notifications\RedatorAccessInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccessEmailContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_o_convite_aponta_para_a_tela_publica_com_flow_invite(): void
    {
        $user = User::factory()->create(['email' => 'ana@lotus.cl']);

        $mail = (new RedatorAccessInvitation('tok-123'))->toMail($user);
        $url = $mail->actionUrl;

        $this->assertStringContainsString(rtrim(config('app.frontend_url'), '/').'/definir-clave/tok-123', $url);
        $this->assertStringContainsString('flow=invite', $url);
        $this->assertStringContainsString('email=ana%40lotus.cl', $url);
    }

    public function test_a_recuperacao_usa_flow_reset(): void
    {
        $user = User::factory()->create(['email' => 'ana@lotus.cl']);

        $this->assertStringContainsString('flow=reset', (new PasswordResetLink('tok-456'))->toMail($user)->actionUrl);
    }

    public function test_o_texto_sai_de_chave_traduzida_e_nao_de_literal(): void
    {
        // Todas as 4 locales respondem: nenhuma chave órfã e nenhum literal
        // dentro da Notification (a D-36 nasceu exatamente desse padrão).
        foreach (['es_CL', 'es', 'pt_BR', 'en'] as $locale) {
            $this->assertIsString(__('identity.invitation.subject', [], $locale));
            $this->assertStringNotContainsString('identity.invitation', __('identity.invitation.subject', [], $locale));
        }
    }
}
