<?php

namespace Tests;

use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sanctum só considera a request "stateful" (sessão via cookie) se
        // Origin/Referer bater com sanctum.stateful. Sem isso, StartSession
        // nunca roda e $request->session() explode em qualquer rota autenticada.
        //
        // A PRIMEIRA da lista: `config/cors.php` passou a aceitar `FRONTEND_URL`
        // com várias origens separadas por vírgula (dois dev servers na mesma
        // máquina), e mandar a lista inteira como Referer produz um host
        // inválido — a request deixa de ser stateful e 12 testes de sessão caem
        // com "Session store not set on request", sem que nada de errado tenha
        // acontecido no código.
        $origens = explode(',', (string) env('FRONTEND_URL', 'http://localhost:5173'));

        $this->withHeader('Referer', trim($origens[0]));
    }

    /**
     * Autentica como admin com o RBAC semeado (role 'admin' = todas as
     * permissões de cadastro). Uso nos testes de CRUD atrás de permission:.
     */
    protected function actingAsAdmin(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('admin');
        $this->actingAs($user, 'web');

        return $user;
    }

    /**
     * Autentica como superadmin (role com TODAS as permissões, inclui
     * commercial.quote.approve). Uso nos testes de aprovação (Fluxo 2).
     */
    protected function actingAsSuperadmin(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole('superadmin');
        $this->actingAs($user, 'web');

        return $user;
    }
}
