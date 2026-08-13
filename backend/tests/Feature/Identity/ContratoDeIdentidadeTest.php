<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * O invariante de identidade visto pela porta HTTP, nos quatro caminhos que o
 * esqueciam. Antes deste bloco, e-mail duplicado nestes quatro subia
 * QueryException do índice único e caía no `default` do match do
 * `ProblemDetails` — 500 genérico, sem campo, onde o operador precisava de 422
 * dizendo QUAL campo.
 */
class ContratoDeIdentidadeTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function clientPayload(array $override = []): array
    {
        return array_merge([
            'name' => 'ACME',
            'legal_name' => 'ACME',
            'rut' => '13.456.789-9',
            'email' => 'acme@lotus.cl',
            'type' => 'client',
            'contacts' => [['name' => 'Ana', 'is_primary' => true]],
        ], $override);
    }

    /** @return array<string, mixed> */
    private function redatorPayload(array $override = []): array
    {
        return array_merge([
            'name' => 'Bruno',
            'rut' => '13.456.789-9',
            'email' => 'bruno@lotus.cl',
        ], $override);
    }

    public function test_post_de_cliente_com_email_duplicado_da_422_e_nao_500(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['email' => 'ocupado@lotus.cl']);

        $this->postJson('/api/clients', $this->clientPayload(['email' => 'ocupado@lotus.cl']))
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');

        $this->assertDatabaseMissing('clients', ['legal_name' => 'ACME']);
    }

    public function test_post_de_redator_com_email_duplicado_da_422_e_nao_500(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['email' => 'ocupado@lotus.cl']);

        $this->postJson('/api/redatores', $this->redatorPayload(['email' => 'ocupado@lotus.cl']))
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');

        $this->assertSame(0, User::where('type', 'redator')->count());
    }

    public function test_put_de_cliente_com_email_duplicado_da_422_e_nao_500(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['email' => 'ocupado@lotus.cl']);
        $client = $this->makeClientWithUser([], ['rut' => '13.456.789-9']);
        $client->contacts()->create(['name' => 'Ana', 'is_primary' => true]);

        $this->putJson("/api/clients/{$client->id}", $this->clientPayload([
            'email' => 'ocupado@lotus.cl',
        ]))
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');

        $this->assertSame($client->user->email, $client->user->fresh()->email);
    }

    public function test_put_de_redator_com_email_duplicado_da_422_e_nao_500(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['email' => 'ocupado@lotus.cl']);
        // `CreatesDomainRecords` não tem helper de redator; esta é a forma usada
        // em `UniquenessInsideTransactionTest:85-87`.
        $redator = Redator::create([
            'user_id' => User::factory()->redator()->create(['rut' => '13.456.789-9'])->id,
        ]);

        $this->putJson("/api/redatores/{$redator->id}", $this->redatorPayload([
            'email' => 'ocupado@lotus.cl',
        ]))
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');
    }

    /**
     * Os dois campos colidindo sobem juntos, pela porta HTTP e não só na
     * unidade: é o que o operador lê quando duplicou o cadastro inteiro.
     */
    public function test_rut_e_email_duplicados_sobem_no_mesmo_422(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['rut' => '13.456.789-9', 'email' => 'ocupado@lotus.cl']);

        $this->postJson('/api/clients', $this->clientPayload(['email' => 'ocupado@lotus.cl']))
            ->assertStatus(422)
            ->assertJsonPath('errors.rut.0', 'Este RUT já está cadastrado.')
            ->assertJsonPath('errors.email.0', 'Este e-mail já está cadastrado.');
    }

    /**
     * Staff é o caminho que a porta única mudou SEM ter defeito: `users.rut` é
     * nullable e as duas Actions decidiam entre null e a checagem por ternário.
     * O comportamento tem de sair idêntico.
     */
    public function test_staff_sem_rut_continua_sendo_aceito(): void
    {
        // POST /api/users é guardado por identity.access.manage, exclusivo do
        // superadmin (RolePermissionSeeder::adminPermissions) — actingAsAdmin
        // aqui daria 403 por RBAC, não pelo invariante de identidade sob teste.
        $this->actingAsSuperadmin();

        $this->postJson('/api/users', [
            'name' => 'Carla',
            'email' => 'carla@lotus.cl',
            'rut' => null,
            'role' => 'admin',
            'is_active' => true,
            'password' => 'senha123',
        ])->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'carla@lotus.cl', 'rut' => null]);
    }
}
