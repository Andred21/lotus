<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\UserProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;
use Tests\TestCase;

/**
 * `update` é a contraparte de `provision`: a checagem de identidade (RUT e
 * e-mail, ignorando o próprio user) e a escrita traduzida por `writing()`
 * numa chamada só, para que os Update* não possam esquecer metade dela.
 */
class UserProvisionerUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function provisioner(): UserProvisioner
    {
        return app(UserProvisioner::class);
    }

    public function test_update_formata_o_rut_e_grava(): void
    {
        $user = User::factory()->create(['rut' => '22.222.222-2', 'email' => 'a@lotus.cl']);

        $this->provisioner()->update($user, [
            'name' => 'Ana',
            'rut' => '11111111-1',
            'email' => 'a@lotus.cl',
        ]);

        $this->assertSame('11.111.111-1', $user->fresh()->rut);
        $this->assertSame('Ana', $user->fresh()->name);
    }

    public function test_update_recusa_email_de_outro_user_com_422_do_campo(): void
    {
        User::factory()->create(['email' => 'ocupado@lotus.cl']);
        $user = User::factory()->create(['email' => 'meu@lotus.cl']);

        try {
            $this->provisioner()->update($user, ['email' => 'ocupado@lotus.cl']);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame(['email' => [__('identity.errors.email_taken')]], $e->errors());
        }

        $this->assertSame('meu@lotus.cl', $user->fresh()->email);
    }

    public function test_update_ignora_o_proprio_user_na_checagem(): void
    {
        $user = User::factory()->create(['rut' => '11.111.111-1', 'email' => 'meu@lotus.cl']);

        $this->provisioner()->update($user, ['rut' => '11.111.111-1', 'email' => 'meu@lotus.cl']);

        $this->assertSame('11.111.111-1', $user->fresh()->rut);
    }

    /** Review Focus 5: omitir o RUT não apaga; `null` apaga e não consulta RUT. */
    public function test_rut_omitido_nao_apaga_e_null_apaga(): void
    {
        $user = User::factory()->create(['rut' => '11.111.111-1', 'email' => 'meu@lotus.cl']);

        $this->provisioner()->update($user, ['rut' => new Optional, 'email' => 'meu@lotus.cl']);
        $this->assertSame('11.111.111-1', $user->fresh()->rut);

        $this->provisioner()->update($user, ['email' => 'meu@lotus.cl']);
        $this->assertSame('11.111.111-1', $user->fresh()->rut);

        // Outro user ocupa um RUT: com `null` ninguém olha RUT, então nada colide.
        User::factory()->create(['rut' => '22.222.222-2']);

        $this->provisioner()->update($user, ['rut' => null, 'email' => 'meu@lotus.cl']);
        $this->assertNull($user->fresh()->rut);
    }

    public function test_update_traduz_colisao_de_indice_em_422(): void
    {
        $user = User::factory()->create(['email' => 'meu@lotus.cl']);

        // A linha colidente nasce DEPOIS do check, então o UPDATE é que estoura.
        $jaInseriu = false;
        User::updating(function () use (&$jaInseriu) {
            if ($jaInseriu) {
                return;
            }
            $jaInseriu = true;
            User::factory()->create(['email' => 'corrida@lotus.cl']);
        });

        try {
            $this->provisioner()->update($user, ['email' => 'corrida@lotus.cl']);
            $this->fail('esperava ValidationException');
        } catch (ValidationException $e) {
            $this->assertSame(['email' => [__('identity.errors.email_taken')]], $e->errors());
        }
    }
}
