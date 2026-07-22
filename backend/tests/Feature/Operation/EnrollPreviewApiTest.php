<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnrollPreviewApiTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    private Course $course;

    protected function setUp(): void
    {
        parent::setUp();
        $this->course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $this->turma = $this->makeTurmaForClient('ACME', 1);
    }

    /** Cria cliente + budget + quote approved + turma em_andamento. */
    private function makeTurmaForClient(string $clientName, int $seq): Turma
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => $clientName, 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => "Scap {$seq}"]);
        $quote = Quote::create([
            'budget_id' => $budget->id, 'course_id' => $this->course->id, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id, 'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
    }

    public function test_rut_inexistente_devolve_exists_false(): void
    {
        $this->actingAsAdmin();

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=11.111.111-1")
            ->assertOk()
            ->assertJsonPath('exists', false)
            ->assertJsonPath('will_move', false)
            ->assertJsonPath('name', null)
            ->assertJsonPath('current_client', null);
    }

    public function test_aluno_do_mesmo_cliente_nao_move(): void
    {
        $this->actingAsAdmin();
        // matricular cria o aluno vinculado ao cliente ACME desta turma
        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])->assertCreated();

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=11.111.111-1")
            ->assertOk()
            ->assertJsonPath('exists', true)
            ->assertJsonPath('name', 'Juan Soto')
            ->assertJsonPath('current_client', 'ACME')
            ->assertJsonPath('will_move', false)
            ->assertJsonPath('previous_client', null);
    }

    public function test_aluno_de_outro_cliente_marca_will_move(): void
    {
        $this->actingAsAdmin();
        $beta = $this->makeTurmaForClient('BETA', 2);
        // aluno nasce vinculado a BETA
        $this->postJson("/api/turmas/{$beta->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@beta.cl',
        ])->assertCreated();

        // preview contra a turma de ACME → moverá de BETA para ACME
        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=11.111.111-1")
            ->assertOk()
            ->assertJsonPath('exists', true)
            ->assertJsonPath('current_client', 'BETA')
            ->assertJsonPath('will_move', true)
            ->assertJsonPath('previous_client', 'BETA');
    }

    public function test_rut_invalido_422(): void
    {
        $this->actingAsAdmin();

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=nope")
            ->assertStatus(422);
    }

    public function test_rut_de_outro_tipo_de_usuario_422(): void
    {
        $this->actingAsAdmin();
        User::factory()->create(['type' => 'admin', 'rut' => '22.222.222-2', 'is_active' => true]);

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=22.222.222-2")
            ->assertStatus(422);
    }

    public function test_sem_permissao_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson("/api/turmas/{$this->turma->id}/alunos/preview?rut=11.111.111-1")
            ->assertForbidden();
    }
}
