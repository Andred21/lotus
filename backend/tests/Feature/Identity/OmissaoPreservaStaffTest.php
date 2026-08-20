<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * D-13: a omissão preserva; só `null` explícito apaga. O par é o teste — só o
 * ramo do `null` deixaria a regressão passar verde.
 */
class OmissaoPreservaStaffTest extends TestCase
{
    use RefreshDatabase;

    private function alvo(): User
    {
        $alvo = User::factory()->create([
            'type' => 'admin',
            'rut' => '13.456.789-9',
            'phone' => '+56 9 1111 1111',
            'email' => 'alvo@lotus.cl',
        ]);
        $alvo->assignRole('admin');

        return $alvo;
    }

    public function test_put_sem_rut_mantem_o_rut_guardado(): void
    {
        $this->actingAsSuperadmin();
        $alvo = $this->alvo();

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo Editado',
            'email' => 'alvo@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
        ])->assertOk();

        $this->assertSame('13.456.789-9', $alvo->refresh()->rut);
    }

    public function test_put_sem_phone_mantem_o_telefone_guardado(): void
    {
        $this->actingAsSuperadmin();
        $alvo = $this->alvo();

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo Editado',
            'email' => 'alvo@lotus.cl',
            'role' => 'admin',
            'is_active' => true,
        ])->assertOk();

        $this->assertSame('+56 9 1111 1111', $alvo->refresh()->phone);
    }

    public function test_null_explicito_continua_apagando(): void
    {
        $this->actingAsSuperadmin();
        $alvo = $this->alvo();

        $this->putJson("/api/users/{$alvo->id}", [
            'name' => 'Alvo Editado',
            'email' => 'alvo@lotus.cl',
            'rut' => null,
            'phone' => null,
            'role' => 'admin',
            'is_active' => true,
        ])->assertOk();

        $alvo->refresh();
        $this->assertNull($alvo->rut);
        $this->assertNull($alvo->phone);
    }
}
