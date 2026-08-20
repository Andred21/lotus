<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RedatorAndStudentPutOmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_put_de_redator_sem_phone_mantem_o_telefone(): void
    {
        $this->actingAsSuperadmin();

        $user = User::factory()->redator()->create([
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
            'phone' => '+56 9 3333 3333',
        ]);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator Editado',
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
        ])->assertOk();

        $this->assertSame('+56 9 3333 3333', $user->refresh()->phone);
    }

    public function test_put_de_redator_com_phone_null_apaga(): void
    {
        $this->actingAsSuperadmin();

        $user = User::factory()->redator()->create([
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
            'phone' => '+56 9 3333 3333',
        ]);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator Editado',
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
            'phone' => null,
        ])->assertOk();

        $this->assertNull($user->refresh()->phone);
    }

    /**
     * `is_active` do redator já preservava por spread condicional. O teste
     * existe para a convergência ao helper não regredir a revogação.
     */
    public function test_put_de_redator_sem_is_active_nao_revoga_acesso(): void
    {
        $this->actingAsSuperadmin();

        $user = User::factory()->redator()->create([
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
            'is_active' => true,
        ]);
        $redator = $user->redator()->create([]);

        $this->putJson("/api/redatores/{$redator->id}", [
            'name' => 'Redator Editado',
            'rut' => '12.345.678-5',
            'email' => 'red@lotus.cl',
        ])->assertOk();

        $this->assertTrue($user->refresh()->is_active);
    }

    public function test_put_de_aluno_sem_phone_mantem_o_telefone(): void
    {
        $this->actingAsAdmin();

        $user = User::factory()->create([
            'type' => 'aluno',
            'is_active' => false,
            'rut' => '13.456.789-9',
            'email' => 'aluno@lotus.cl',
            'phone' => '+56 9 4444 4444',
        ]);
        /** @var Student $student */
        $student = $user->student()->create([]);

        $this->putJson("/api/students/{$student->id}", [
            'name' => 'Aluno Editado',
            'rut' => '13.456.789-9',
            'email' => 'aluno@lotus.cl',
        ])->assertOk();

        $this->assertSame('+56 9 4444 4444', $user->refresh()->phone);
    }
}
