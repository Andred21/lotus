<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TurmaDocumentApiTest extends TestCase
{
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
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
        ]);
    }

    /** Redator autentica (RN-01) e a role dele TEM submit_docs (D9). */
    private function actingAsRedatorRole(): User
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return $user;
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->create('doc.pdf', 20, 'application/pdf');
    }

    public function test_redator_sobe_doc_201_e_lista(): void
    {
        $this->actingAsRedatorRole();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->assertCreated()->assertJsonPath('type', 'MANUAL');

        $this->getJson("/api/turmas/{$this->turma->id}/documents")
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.type', 'MANUAL');
    }

    public function test_admin_comum_sem_submit_docs_403(): void
    {
        // Segregação deliberada do seeder (D9): doc é ação do redator.
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->assertForbidden();
    }

    public function test_superadmin_sobe_doc_201(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS', 'file' => $this->pdf(),
        ])->assertCreated();
    }

    public function test_tipo_invalido_e_nao_pdf_422(): void
    {
        $this->actingAsSuperadmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'CV', 'file' => $this->pdf(),
        ])->assertStatus(422)->assertJsonValidationErrors('type');

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL',
            'file' => UploadedFile::fake()->create('x.docx', 20, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    public function test_delete_204_e_cross_turma_404(): void
    {
        $this->actingAsSuperadmin();
        $fileId = $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->json('id');

        // outra turma (outra quote do mesmo budget) — scoped binding deve dar 404
        $quote2 = Quote::create([
            'budget_id' => $this->turma->quote->budget_id, 'course_id' => $this->turma->course_id,
            'seq_in_budget' => 2, 'student_count' => 5, 'value_uf' => 10, 'status' => 'approved',
        ]);
        $outra = Turma::create([
            'quote_id' => $quote2->id, 'course_id' => $this->turma->course_id,
            'modalidade' => TurmaModalidade::Online, 'local_aplicacao' => null,
            'start_date' => '2026-09-01', 'end_date' => '2026-09-10',
        ]);

        $this->deleteJson("/api/turmas/{$outra->id}/documents/{$fileId}")->assertNotFound();
        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")->assertNoContent();
        $this->assertSoftDeleted('files', ['id' => $fileId]);
    }
}
