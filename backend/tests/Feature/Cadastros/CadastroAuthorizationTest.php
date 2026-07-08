<?php

namespace Tests\Feature\Cadastros;

use App\Domains\Catalog\Models\Course;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Backend é a fronteira autoritativa: um redator autenticado NÃO pode operar
 * cadastros (clients/courses/redatores). Só admin/superadmin, via as
 * permissões do RolePermissionSeeder.
 */
class CadastroAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function actingAsRedator(): void
    {
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');
    }

    public function test_redator_nao_acessa_cadastros(): void
    {
        $this->actingAsRedator();

        // redator não tem commercial.client.* / catalog.course.* / identity.user.*
        $this->getJson('/api/clients')->assertForbidden();
        $this->postJson('/api/clients', [])->assertForbidden();
        $this->getJson('/api/courses')->assertForbidden();
        $this->postJson('/api/courses', [])->assertForbidden();
        $this->getJson('/api/redatores')->assertForbidden();
        $this->postJson('/api/redatores', [])->assertForbidden();
    }

    public function test_redator_nao_gerencia_nested_nem_habilitacao(): void
    {
        // Entidades reais para o route-model-binding resolver (senão 404 antes
        // do permission middleware). A autorização é que precisa negar (403).
        $client = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client']);
        $course = Course::create(['name' => 'Curso X', 'workload_hours' => 8]);

        $this->actingAsRedator();

        $this->postJson("/api/clients/{$client->id}/addresses", [])->assertForbidden();
        $this->postJson("/api/courses/{$course->id}/templates", [])->assertForbidden();
        $this->putJson("/api/courses/{$course->id}/redatores", ['redator_ids' => []])->assertForbidden();
    }

    public function test_admin_acessa_cadastros(): void
    {
        $admin = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $admin->assignRole('admin');
        $this->actingAs($admin, 'web');

        // GET (view) passa a autorização (200), provando que a permissão libera.
        $this->getJson('/api/clients')->assertOk();
        $this->getJson('/api/courses')->assertOk();
        $this->getJson('/api/redatores')->assertOk();
    }

    public function test_nao_autenticado_bloqueado(): void
    {
        $this->getJson('/api/courses')->assertUnauthorized();
    }
}
