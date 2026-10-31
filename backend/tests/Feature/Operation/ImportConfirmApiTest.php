<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Services\StudentResolver;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/** A porta HTTP da confirmação: JSON linha a linha, sem multipart (spec D13). */
class ImportConfirmApiTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    private Client $client;

    private Client $otherClient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->client = $this->makeClientWithUser([], ['rut' => '22.333.444-K']);
        $this->otherClient = $this->makeClientWithUser(['legal_name' => 'OTRA']);
        $budget = Budget::create(['client_id' => $this->client->id, 'code' => 'Scap 1']);
        $course = $this->makeCourse();
        $quote = Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    private function confirmar(array $payload)
    {
        return $this->postJson("/api/turmas/{$this->turma->id}/alunos/importar", $payload);
    }

    private function linha(array $campos): array
    {
        return array_merge([
            'row' => 2, 'rut' => '11.111.111-1', 'name' => 'Juan Soto',
            'email' => 'juan@acme.cl', 'phone' => null, 'update_registration' => false,
        ], $campos);
    }

    public function test_confirma_json_e_devolve_o_resumo(): void
    {
        $this->actingAsAdmin();

        $this->confirmar(['rows' => [
            $this->linha([]),
            $this->linha(['row' => 3, 'rut' => 'RUT-INVALIDO', 'email' => null]),
        ]])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors.0.row', 3)
            ->assertJsonPath('contracted_count', 5);
    }

    public function test_classificacao_enviada_pelo_cliente_e_ignorada(): void
    {
        $this->actingAsAdmin();
        $student = app(StudentResolver::class)
            ->resolveByRut('44.444.444-4', 'Ana Mora', 'ana@otra.cl', null, $this->otherClient)->student;

        $this->confirmar(['rows' => [$this->linha([
            'row' => 2, 'rut' => '44.444.444-4', 'name' => 'Ana Mora', 'email' => null,
            // O navegador mente: diz que é novo e que já está na empresa da turma.
            'status' => 'new', 'current_client' => 'ACME', 'divergent' => [], 'archived' => false,
        ])]])
            ->assertOk()
            ->assertJsonPath('created', 0)
            ->assertJsonPath('moved.0.previous_client', 'OTRA')
            ->assertJsonPath('moved.0.client', 'ACME');

        $this->assertSame($this->client->id, $student->fresh()->current_client_id);
    }

    public function test_nome_vazio_via_http_vira_erro_da_linha_e_nao_derruba_o_lote(): void
    {
        $this->actingAsAdmin();

        $this->confirmar(['rows' => [
            $this->linha(['row' => 2, 'name' => '']),
            $this->linha(['row' => 3, 'rut' => '33.333.333-3', 'name' => 'Pedro', 'email' => 'p@acme.cl']),
            $this->linha(['row' => 4, 'rut' => '', 'name' => 'Sin Rut', 'email' => 's@acme.cl']),
        ]])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors.0.row', 2)
            ->assertJsonPath('errors.1.row', 4);
    }

    public function test_telefone_ou_email_longo_recusa_so_a_linha_e_nao_grava(): void
    {
        $this->actingAsAdmin();

        $this->confirmar(['rows' => [
            $this->linha(['row' => 2, 'phone' => str_repeat('9', 31)]),
            $this->linha(['row' => 3, 'rut' => '22.222.222-2', 'email' => str_repeat('a', 250).'@acme.cl']),
            $this->linha(['row' => 4, 'rut' => '33.333.333-3', 'name' => 'Pedro', 'email' => 'p@acme.cl']),
        ]])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors.0.row', 2)
            ->assertJsonPath('errors.1.row', 3);

        $this->assertDatabaseMissing('users', ['rut' => '11.111.111-1']);
        $this->assertDatabaseMissing('users', ['rut' => '22.222.222-2']);
    }

    public function test_actualizar_com_telefone_longo_vira_erro_da_linha_e_nao_grava(): void
    {
        $this->actingAsAdmin();
        app(StudentResolver::class)
            ->resolveByRut('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', null, $this->client);

        $this->confirmar(['rows' => [
            $this->linha([
                'row' => 2, 'rut' => '33.333.333-3', 'name' => 'Pedro Alterado', 'email' => null,
                'phone' => str_repeat('9', 31), 'update_registration' => true,
            ]),
            $this->linha(['row' => 3]),
        ]])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors.0.row', 2);

        $this->assertSame('Pedro Lagos', User::where('rut', '33.333.333-3')->value('name'));
        $this->assertSame(0, $this->turma->enrollments()->where('student_id', User::where('rut', '33.333.333-3')->first()->student->id)->count());
    }

    public function test_rows_vazio_ou_ausente_ou_acima_de_100_recusa_422_sem_escrever(): void
    {
        $this->actingAsAdmin();
        $muitas = array_map(
            fn (int $i) => $this->linha(['row' => $i + 1, 'rut' => '11.111.111-1', 'email' => "a{$i}@acme.cl"]),
            range(1, 101),
        );

        foreach ([['rows' => []], [], ['rows' => $muitas]] as $payload) {
            $this->confirmar($payload)->assertStatus(422)->assertJsonValidationErrors('rows');
        }

        $this->assertSame(0, $this->turma->enrollments()->count());
        $this->assertDatabaseMissing('users', ['rut' => '11.111.111-1']);
    }

    public function test_linha_malformada_recusa_422(): void
    {
        $this->actingAsAdmin();

        $this->confirmar(['rows' => [$this->linha(['row' => 1])]])->assertStatus(422);
        $this->confirmar(['rows' => [['rut' => '11.111.111-1']]])->assertStatus(422);
    }

    public function test_turma_nao_gravavel_recusa_422(): void
    {
        $this->actingAsAdmin();
        $this->turma->update(['status' => TurmaStatus::Concluida, 'concluded_at' => now()]);

        $this->confirmar(['rows' => [$this->linha([])]])
            ->assertStatus(422)
            ->assertJsonPath('errors.turma.0', __('operation.turma.concluded_locked'));
    }

    public function test_sem_permissao_de_update_recusa_so_a_linha_que_pede(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $app = app(StudentResolver::class);
        $app->resolveByRut('33.333.333-3', 'Pedro Lagos', 'pedro@acme.cl', null, $this->client);
        $operador = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $operador->givePermissionTo('operation.enrollment.manage');
        $this->actingAs($operador, 'web');

        $this->confirmar(['rows' => [
            $this->linha(['row' => 2, 'rut' => '33.333.333-3', 'name' => 'Pedro Alterado', 'update_registration' => true]),
            $this->linha(['row' => 3]),
        ]])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors.0.row', 2)
            ->assertJsonPath('errors.0.message', __('operation.enrollment.import.update_forbidden'));

        $this->assertSame('Pedro Lagos', User::where('rut', '33.333.333-3')->value('name'));
    }

    public function test_redator_recebe_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $redator = $user->redator()->create([]);
        $this->turma->redatores()->attach($redator->id);
        $this->actingAs($user, 'web');

        $this->confirmar(['rows' => [$this->linha([])]])->assertForbidden();
    }
}
