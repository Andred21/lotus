<?php

namespace Tests\Feature\Identity;

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
}
