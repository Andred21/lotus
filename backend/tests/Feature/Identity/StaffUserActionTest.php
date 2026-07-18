<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\CreateStaffUserAction;
use App\Domains\Identity\Data\UserData;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StaffUserActionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_from_model_projeta_roles_e_type(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('admin');

        $data = UserData::fromModel($user->load('roles'));

        $this->assertSame('admin', $data->type);
        $this->assertSame('admin', $data->role);
        $this->assertContains('admin', $data->roles);
    }

    public function test_cria_staff_ativo_com_role_e_senha(): void
    {
        $data = UserData::from([
            'name' => 'Ana Admin',
            'email' => 'ana@lotus.cl',
            'rut' => '12.345.678-5',
            'password' => 'secret123',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $user = app(CreateStaffUserAction::class)->execute($data);

        $this->assertSame('admin', $user->type);
        $this->assertTrue($user->is_active);
        $this->assertTrue($user->hasRole('admin'));
        $this->assertTrue(Hash::check('secret123', $user->password));
    }

    public function test_senha_ausente_no_create_e_422(): void
    {
        $data = UserData::from([
            'name' => 'Sem Senha',
            'email' => 'ss@lotus.cl',
            'role' => 'admin',
        ]);

        $this->expectException(ValidationException::class);
        app(CreateStaffUserAction::class)->execute($data);
    }

    public function test_rut_duplicado_e_422(): void
    {
        User::factory()->create(['rut' => '12.345.678-5']);

        $data = UserData::from([
            'name' => 'Colisão', 'email' => 'col@lotus.cl',
            'rut' => '12.345.678-5', 'password' => 'secret123', 'role' => 'admin',
        ]);

        $this->expectException(ValidationException::class);
        app(CreateStaffUserAction::class)->execute($data);
    }

    public function test_email_duplicado_incluindo_soft_deletado_e_422(): void
    {
        $victim = User::factory()->create(['email' => 'dup@lotus.cl']);
        $victim->delete(); // soft-delete: índice ainda ocupado

        $data = UserData::from([
            'name' => 'Colisão Email', 'email' => 'dup@lotus.cl',
            'password' => 'secret123', 'role' => 'admin',
        ]);

        $this->expectException(ValidationException::class);
        app(CreateStaffUserAction::class)->execute($data);
    }

    public function test_role_redator_rejeitada_na_validacao(): void
    {
        // validateAndCreate (não from): config('data.validation_strategy') é
        // 'only_requests' (default do pacote) — from() com array puro não roda
        // rules(), só um Request de verdade dispara (fluxo real do controller).
        // validateAndCreate força a validação aqui para provar UserData::rules().
        $this->expectException(ValidationException::class);
        UserData::validateAndCreate([
            'name' => 'X', 'email' => 'x@lotus.cl',
            'password' => 'secret123', 'role' => 'redator',
        ]);
    }
}
