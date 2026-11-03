<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class EnrollmentApiTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = $this->makeClientWithUser()->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
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

    public function test_matricula_individual_201_e_lista(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])
            ->assertCreated()
            ->assertJsonPath('rut', '11.111.111-1')
            ->assertJsonPath('approval_status', 'pendiente');

        $this->getJson("/api/turmas/{$this->turma->id}/alunos")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Juan Soto');
    }

    public function test_individual_sem_rut_valido_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => 'nope', 'name' => 'X',
        ])->assertStatus(422);
    }

    public function test_store_com_email_malformado_devolve_422_do_campo(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'sem-arroba',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_import_endpoint_retorna_resumo(): void
    {
        $this->actingAsAdmin();

        $boa = ['row' => 2, 'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl', 'phone' => null, 'update_registration' => false];
        $ruim = ['row' => 3, 'rut' => 'RUT-INVALIDO', 'name' => 'Mal', 'email' => null, 'phone' => null, 'update_registration' => false];

        // Tudo ou nada (spec D2): a linha recusável recusa o lote com 422 por linha.
        $this->postJson("/api/turmas/{$this->turma->id}/alunos/importar", ['rows' => [$boa, $ruim]])
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['import.3']]);
        $this->assertDatabaseMissing('users', ['rut' => '11.111.111-1']);

        $this->postJson("/api/turmas/{$this->turma->id}/alunos/importar", ['rows' => [$boa]])
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors', [])
            ->assertJsonPath('contracted_count', 5);
    }

    public function test_previa_arquivo_invalido_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/alunos/importar/previa", [
            'file' => UploadedFile::fake()->create('malware.pdf', 10, 'application/pdf'),
        ])->assertStatus(422);
    }

    public function test_destroy_soft_deleta_e_e_scoped(): void
    {
        $this->actingAsAdmin();
        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])->assertCreated();
        $enrollment = Enrollment::sole();

        $this->deleteJson("/api/turmas/{$this->turma->id}/alunos/{$enrollment->id}")
            ->assertNoContent();
        $this->assertSoftDeleted('enrollments', ['id' => $enrollment->id]);

        // outra turma não alcança a matrícula (scoped binding → 404)
        $otherQuote = Quote::forceCreate([
            'budget_id' => $this->turma->quote->budget_id, 'course_id' => $this->turma->course_id,
            'seq_in_budget' => 2, 'student_count' => 1, 'value_uf' => 5, 'status' => 'approved',
        ]);
        $other = Turma::create([
            'quote_id' => $otherQuote->id, 'course_id' => $this->turma->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-09-01', 'end_date' => '2026-09-10',
            'status' => TurmaStatus::EmAndamento,
        ]);
        $this->deleteJson("/api/turmas/{$other->id}/alunos/{$enrollment->id}")
            ->assertNotFound();
    }

    public function test_sem_permissao_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $this->actingAsRedator();

        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])->assertForbidden();
    }

    public function test_turma_concluida_recusa_remocao_de_matricula(): void
    {
        $this->actingAsAdmin();
        $this->postJson("/api/turmas/{$this->turma->id}/alunos", [
            'rut' => '11.111.111-1', 'name' => 'Juan Soto', 'email' => 'juan@acme.cl',
        ])->assertCreated();
        $enrollment = Enrollment::sole();

        $this->turma->update([
            'status' => TurmaStatus::Concluida,
            'concluded_at' => now(),
        ]);

        $this->deleteJson("/api/turmas/{$this->turma->id}/alunos/{$enrollment->id}")
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.turma.0',
                __('operation.turma.concluded_locked'),
            );

        $this->assertDatabaseHas('enrollments', ['id' => $enrollment->id, 'deleted_at' => null]);
    }

    private function actingAsRedator(): void
    {
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $redator = $user->redator()->create([]);
        $this->turma->redatores()->attach($redator->id);
        $this->actingAs($user, 'web');
    }
}
