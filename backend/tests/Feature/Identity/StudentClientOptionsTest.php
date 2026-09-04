<?php

namespace Tests\Feature\Identity;

use App\Domains\Commercial\Models\Client;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * O dropdown de empresa do create de aluno chamava `GET /api/clients`
 * (`commercial.client.view`) dentro de um módulo gated por `identity.user.*`
 * (D-11): quem tinha permissão de criar aluno mas não de ver cliente criava
 * pela API e não pela tela. O lookup carrega o gate de quem o usa.
 */
class StudentClientOptionsTest extends TestCase
{
    use RefreshDatabase;

    /** Role customizada com o mínimo do cadastro de aluno e NADA de comercial. */
    private function actingAsCadastradorDeAluno(): User
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::create(['name' => 'cadastrador', 'guard_name' => 'web']);
        $role->syncPermissions(['identity.user.view', 'identity.user.create']);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole($role);
        $this->actingAs($user, 'web');

        return $user;
    }

    /** Não há `ClientFactory` no repositório: cliente nasce de User + Client,
     * como no `PipelineQueryTest`. `is_active: false` porque cliente não
     * autentica (RN-01). */
    private function criarCliente(string $legalName, string $rut): Client
    {
        $user = User::create([
            'name' => $legalName,
            'rut' => $rut,
            'email' => Str::slug($legalName).'@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);

        return Client::create([
            'user_id' => $user->id,
            'legal_name' => $legalName,
            'type' => 'client',
        ]);
    }

    public function test_quem_cria_aluno_lista_empresas_sem_permissao_comercial(): void
    {
        $this->actingAsCadastradorDeAluno();
        $client = $this->criarCliente('Transmisora Andina SpA', '76.543.210-3');

        $this->getJson('/api/clients')->assertForbidden();

        $this->getJson('/api/students/client-options')
            ->assertOk()
            ->assertJsonFragment(['id' => $client->id, 'legal_name' => 'Transmisora Andina SpA'])
            ->assertJsonCount(1);
    }

    public function test_sem_permissao_de_criar_aluno_o_lookup_e_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::create(['name' => 'so-leitura', 'guard_name' => 'web']);
        $role->syncPermissions(['identity.user.view']);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole($role);
        $this->actingAs($user, 'web');

        $this->getJson('/api/students/client-options')->assertForbidden();
    }

    public function test_o_lookup_nao_lista_empresa_arquivada(): void
    {
        $this->actingAsCadastradorDeAluno();
        $this->criarCliente('Viva SpA', '77.111.222-3');
        $this->criarCliente('Arquivada SpA', '78.222.333-4')->delete();

        $this->getJson('/api/students/client-options')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['legal_name' => 'Viva SpA']);
    }
}
