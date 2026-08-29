<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * DoD 1 da spec sobre `GET /api/students`: página, `meta`, busca, ordenação
 * pela allowlist e as três recusas (teto, `page` 0, `sort` fora da lista).
 * A ordenação deixa de ser `sortBy` em PHP sobre a coleção inteira
 * (`StudentController.php:40`) e vira `ORDER BY users.name` por join.
 */
class StudentPaginationTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private const RUTS = ['12.345.678-5', '9.876.543-3', '11.111.111-1'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsAdmin();

        $client = $this->makeClientWithUser([], ['rut' => '76.123.456-0']);

        // Fora de ordem alfabética de propósito: a ordem da resposta tem de
        // vir do ORDER BY, não da ordem de inserção.
        foreach (['Carla Rojas', 'Ana Soto', 'Bruno Díaz'] as $i => $name) {
            Student::create([
                'user_id' => User::factory()->aluno()->create(['name' => $name, 'rut' => self::RUTS[$i]])->id,
                'current_client_id' => $client->id,
            ]);
        }
    }

    public function test_default_e_pagina_um_de_vinte_e_cinco_ordenada_por_nome(): void
    {
        $response = $this->getJson('/api/students')->assertOk();

        $this->assertSame(['Ana Soto', 'Bruno Díaz', 'Carla Rojas'], array_column($response->json('data'), 'name'));
        $this->assertSame(
            ['page' => 1, 'per_page' => 25, 'total' => 3, 'last_page' => 1, 'total_unfiltered' => 3],
            $response->json('meta'),
        );
        // A projeção continua a de sempre: nada de `enrollments_count` nulo.
        $response->assertJsonPath('data.0.enrollments_count', 0);
        $response->assertJsonPath('data.0.current_client_name', 'ACME');
    }

    public function test_per_page_e_page_fatiam_e_last_page_acompanha(): void
    {
        $response = $this->getJson('/api/students?per_page=2&page=2')->assertOk();

        $this->assertSame(['Carla Rojas'], array_column($response->json('data'), 'name'));
        $response->assertJsonPath('meta.page', 2)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_q_varre_nome_e_rut_e_total_unfiltered_fica_no_escopo_inteiro(): void
    {
        $porNome = $this->getJson('/api/students?q=an')->assertOk();
        $this->assertSame(['Ana Soto'], array_column($porNome->json('data'), 'name'));
        $porNome->assertJsonPath('meta.total', 1)->assertJsonPath('meta.total_unfiltered', 3);

        $porRut = $this->getJson('/api/students?q=11.111')->assertOk();
        $this->assertSame(['Bruno Díaz'], array_column($porRut->json('data'), 'name'));
    }

    public function test_sort_com_sinal_inverte_e_rut_esta_na_allowlist(): void
    {
        $desc = $this->getJson('/api/students?sort=-name')->assertOk();
        $this->assertSame(['Carla Rojas', 'Bruno Díaz', 'Ana Soto'], array_column($desc->json('data'), 'name'));

        $porRut = $this->getJson('/api/students?sort=rut')->assertOk();
        $this->assertSame(['11.111.111-1', '12.345.678-5', '9.876.543-3'], array_column($porRut->json('data'), 'rut'));
    }

    /** @return array<string, array{0: string}> */
    public static function queriesRecusadas(): array
    {
        return [
            'sort fora da allowlist' => ['sort=email'],
            'per_page acima do teto' => ['per_page=101'],
            'page zero' => ['page=0'],
        ];
    }

    #[DataProvider('queriesRecusadas')]
    public function test_query_fora_do_contrato_e_422_problem_json(string $query): void
    {
        $this->getJson("/api/students?{$query}")
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json');
    }

    public function test_store_e_update_seguem_devolvendo_a_projecao_com_enrollments_count(): void
    {
        $client = $this->makeClientWithUser(['legal_name' => 'Outra'], ['rut' => '77.555.333-2']);

        $criado = $this->postJson('/api/students', [
            'name' => 'Diego Paz', 'rut' => '22.222.222-2', 'email' => 'diego@x.cl', 'phone' => null, 'client_id' => $client->id,
        ])->assertCreated();
        $criado->assertJsonPath('enrollments_count', 0);

        $this->putJson("/api/students/{$criado->json('id')}", [
            'name' => 'Diego Paz Soto', 'rut' => '22.222.222-2', 'email' => 'diego@x.cl', 'phone' => null,
        ])->assertOk()->assertJsonPath('enrollments_count', 0)->assertJsonPath('name', 'Diego Paz Soto');
    }
}
