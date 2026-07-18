<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Actions\CreateStaffUserAction;
use App\Domains\Identity\Actions\UpdateStaffUserAction;
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

    public function test_update_sem_senha_mantem_a_atual(): void
    {
        $user = User::factory()->create(['password' => Hash::make('original1')]);
        $user->assignRole('admin');

        $data = UserData::from([
            'name' => 'Novo Nome', 'email' => $user->email, 'role' => 'admin', 'is_active' => true,
        ]);
        app(UpdateStaffUserAction::class)->execute($user, $data);

        $this->assertTrue(Hash::check('original1', $user->fresh()->password));
        $this->assertSame('Novo Nome', $user->fresh()->name);
    }

    public function test_update_com_senha_troca(): void
    {
        $user = User::factory()->create(['password' => Hash::make('original1')]);
        $user->assignRole('admin');

        $data = UserData::from([
            'name' => $user->name, 'email' => $user->email,
            'password' => 'trocada9', 'role' => 'admin', 'is_active' => true,
        ]);
        app(UpdateStaffUserAction::class)->execute($user, $data);

        $this->assertTrue(Hash::check('trocada9', $user->fresh()->password));
    }

    public function test_rebaixar_ultimo_superadmin_e_bloqueado(): void
    {
        $sa = User::factory()->create();
        $sa->assignRole('superadmin');

        $data = UserData::from([
            'name' => $sa->name, 'email' => $sa->email, 'role' => 'admin', 'is_active' => true,
        ]);

        $this->expectException(ValidationException::class);
        app(UpdateStaffUserAction::class)->execute($sa, $data);
    }

    public function test_rebaixar_superadmin_com_outro_existente_passa(): void
    {
        $sa1 = User::factory()->create();
        $sa1->assignRole('superadmin');
        $sa2 = User::factory()->create();
        $sa2->assignRole('superadmin');

        $data = UserData::from([
            'name' => $sa1->name, 'email' => $sa1->email, 'role' => 'admin', 'is_active' => true,
        ]);
        app(UpdateStaffUserAction::class)->execute($sa1, $data);

        $this->assertTrue($sa1->fresh()->hasRole('admin'));
        $this->assertFalse($sa1->fresh()->hasRole('superadmin'));
    }
}
