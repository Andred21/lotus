<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
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
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\TestCase;

class EnrollmentApiTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $course = Course::create(['name' => 'AT', 'workload_hours' => 8]);
        $quote = Quote::create([
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

    public function test_import_endpoint_retorna_resumo(): void
    {
        $this->actingAsAdmin();
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        $writer = new XlsxWriter();
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues(['RUT', 'Nombre', 'Email', 'Teléfono']));
        $writer->addRow(Row::fromValues(['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '']));
        $writer->addRow(Row::fromValues(['RUT-INVALIDO', 'Mal', '', '']));
        $writer->close();

        $this->postJson(
            "/api/turmas/{$this->turma->id}/alunos/importar",
            ['file' => new UploadedFile($path, 'alunos.xlsx', null, null, true)],
        )
            ->assertOk()
            ->assertJsonPath('created', 1)
            ->assertJsonPath('errors.0.row', 3)
            ->assertJsonPath('contracted_count', 5);
    }

    public function test_import_arquivo_invalido_422(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/alunos/importar", [
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
        $otherQuote = Quote::create([
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

    private function actingAsRedator(): void
    {
        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');
    }
}
