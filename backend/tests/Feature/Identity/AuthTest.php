<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_ok_retorna_session_user(): void
    {
        $user = User::factory()->create([
            'email'     => 'admin@lotus.cl',
            'password'  => Hash::make('senha123'),
            'type'      => 'admin',
            'is_active' => true,
        ]);

        $this->postJson('/api/login', [
            'email'    => 'admin@lotus.cl',
            'password' => 'senha123',
        ])
            ->assertOk()
            ->assertJsonStructure(['id', 'uuid', 'name', 'email', 'type', 'is_active'])
            ->assertJson([
                'id'        => $user->id,
                'email'     => 'admin@lotus.cl',
                'type'      => 'admin',
                'is_active' => true,
            ]);
    }

    public function test_credencial_errada_retorna_422(): void
    {
        User::factory()->create([
            'email'    => 'admin@lotus.cl',
            'password' => Hash::make('senha123'),
        ]);

        $this->postJson('/api/login', [
            'email'    => 'admin@lotus.cl',
            'password' => 'errada',
        ])->assertStatus(422);
    }

    public function test_usuario_inativo_bloqueado(): void
    {
        User::factory()->inactive()->create([
            'email'    => 'inativo@lotus.cl',
            'password' => Hash::make('senha123'),
        ]);

        $this->postJson('/api/login', [
            'email'    => 'inativo@lotus.cl',
            'password' => 'senha123',
        ])->assertStatus(422);
    }
}
