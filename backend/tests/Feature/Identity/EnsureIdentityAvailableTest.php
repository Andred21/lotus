<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Porta única da checagem de identidade. O invariante é RUT **e** e-mail: até
 * este bloco, `provision()` fechava só o RUT e quatro dos nove caminhos de
 * escrita esqueciam a outra metade — a colisão de e-mail subia QueryException e
 * virava 500 genérico no `ProblemDetails`.
 *
 * O `withTrashed` é a razão de a checagem existir: os índices únicos de
 * `users.rut` e `users.email` não distinguem `deleted_at`, então sem ela o
 * conflito com um cadastro ARQUIVADO também viraria 500.
 */
class EnsureIdentityAvailableTest extends TestCase
{
    use RefreshDatabase;

    private function provisioner(): UserProvisioner
    {
        return app(UserProvisioner::class);
    }

    /** @return array<string, array<int, string>> */
    private function erros(callable $operacao): array
    {
        try {
            $operacao();
        } catch (ValidationException $e) {
            return $e->errors();
        }

        $this->fail('esperava ValidationException');
    }

    public function test_devolve_o_rut_formatado_quando_nao_ha_colisao(): void
    {
        $rut = $this->provisioner()->ensureIdentityAvailable('13.456.789-9', 'novo@lotus.cl');

        $this->assertSame('13.456.789-9', $rut);
    }

    public function test_rut_vivo_e_email_vivo_sobem_juntos_no_mesmo_422(): void
    {
        User::factory()->create(['rut' => '13.456.789-9', 'email' => 'ana@lotus.cl']);

        $erros = $this->erros(fn () => $this->provisioner()
            ->ensureIdentityAvailable('13.456.789-9', 'ana@lotus.cl'));

        $this->assertSame(['rut', 'email'], array_keys($erros));
        $this->assertSame('Este RUT já está cadastrado.', $erros['rut'][0]);
        $this->assertSame('Este e-mail já está cadastrado.', $erros['email'][0]);
    }

    public function test_duplicado_arquivado_tem_mensagem_propria_nos_dois_campos(): void
    {
        $user = User::factory()->create(['rut' => '13.456.789-9', 'email' => 'ana@lotus.cl']);
        $user->delete();

        $erros = $this->erros(fn () => $this->provisioner()
            ->ensureIdentityAvailable('13.456.789-9', 'ana@lotus.cl'));

        $this->assertSame(
            'Este RUT pertence a um cadastro arquivado. Restaure-o em vez de criar outro.',
            $erros['rut'][0],
        );
        $this->assertSame(
            'Este e-mail pertence a um cadastro arquivado. Restaure-o em vez de criar outro.',
            $erros['email'][0],
        );
    }

    public function test_rut_nulo_pula_a_checagem_de_rut_e_nao_pula_a_de_email(): void
    {
        User::factory()->create(['rut' => null, 'email' => 'ana@lotus.cl']);

        $this->assertNull($this->provisioner()->ensureIdentityAvailable(null, 'livre@lotus.cl'));

        $erros = $this->erros(fn () => $this->provisioner()
            ->ensureIdentityAvailable(null, 'ana@lotus.cl'));

        $this->assertSame(['email'], array_keys($erros));
    }

    public function test_except_user_id_ignora_o_proprio_registro(): void
    {
        $user = User::factory()->create(['rut' => '13.456.789-9', 'email' => 'ana@lotus.cl']);

        $rut = $this->provisioner()
            ->ensureIdentityAvailable('13.456.789-9', 'ana@lotus.cl', $user->id);

        $this->assertSame('13.456.789-9', $rut);
    }

    public function test_colisao_so_de_email_nao_reclama_do_rut(): void
    {
        User::factory()->create(['rut' => '12.345.678-5', 'email' => 'ana@lotus.cl']);

        $erros = $this->erros(fn () => $this->provisioner()
            ->ensureIdentityAvailable('13.456.789-9', 'ana@lotus.cl'));

        $this->assertSame(['email'], array_keys($erros));
    }
}
