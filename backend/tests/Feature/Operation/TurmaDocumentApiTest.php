<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Support\PermissionCatalog;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class TurmaDocumentApiTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('s3');
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
        ]);
    }

    /** Redator autentica (RN-01) e a role dele TEM submit_docs (D9). */
    private function actingAsRedatorRole(): User
    {
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $redator = $user->redator()->create([]);
        $this->turma->redatores()->attach($redator->id);
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

    public function test_listagem_expoe_mime_e_download_url(): void
    {
        $this->actingAsRedatorRole();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'MANUAL', 'file' => $this->pdf(),
        ])->assertCreated();

        $response = $this->getJson("/api/turmas/{$this->turma->id}/documents")->assertOk();

        $response->assertJsonPath('0.mime', 'application/pdf');
        $this->assertNotEmpty($response->json('0.download_url'));
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
        $quote2 = Quote::forceCreate([
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

    // ---- Turma concluída: só quem tem `manage_concluded_docs` (superadmin) ----

    private function concluirTurma(): void
    {
        $this->turma->update(['status' => TurmaStatus::Concluida, 'concluded_at' => now()]);
    }

    /** Doc já anexado, sem passar pela API: o ator da requisição fica só o do teste. */
    private function docAnexado(): int
    {
        return app(StoreTurmaDocumentAction::class)
            ->execute($this->turma, TurmaDocumentType::MANUAL, $this->pdf(), User::factory()->create())
            ->id;
    }

    public function test_concluida_superadmin_sobe_201_e_remove_204(): void
    {
        $fileId = $this->docAnexado();
        $this->concluirTurma();
        $this->actingAsSuperadmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS', 'file' => $this->pdf(),
        ])->assertCreated();

        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")->assertNoContent();
        $this->assertSoftDeleted('files', ['id' => $fileId]);
    }

    public function test_concluida_redator_recebe_422_no_post_e_no_delete(): void
    {
        $fileId = $this->docAnexado();
        $this->concluirTurma();
        $this->actingAsRedatorRole();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS', 'file' => $this->pdf(),
        ])->assertStatus(422)->assertJsonValidationErrors('turma');

        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")
            ->assertStatus(422)->assertJsonValidationErrors('turma');
        $this->assertNotSoftDeleted('files', ['id' => $fileId]);
    }

    public function test_concluida_sem_permissao_recusa_antes_de_subir(): void
    {
        $this->concluirTurma();
        $this->actingAsRedatorRole();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS', 'file' => $this->pdf(),
        ])->assertStatus(422)->assertJsonValidationErrors('turma');

        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_concluida_admin_comum_recebe_403_no_post_e_no_delete(): void
    {
        $fileId = $this->docAnexado();
        $this->concluirTurma();
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS', 'file' => $this->pdf(),
        ])->assertForbidden();

        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")->assertForbidden();
        $this->assertNotSoftDeleted('files', ['id' => $fileId]);
    }

    public function test_manage_concluded_docs_e_so_do_superadmin(): void
    {
        // D8: fora de SEGREGATED, a permissão entraria em role customizada.
        $this->seed(RolePermissionSeeder::class);
        $permissao = 'operation.turma.manage_concluded_docs';

        $this->assertTrue(Role::findByName('superadmin', 'web')->hasPermissionTo($permissao));
        $this->assertFalse(Role::findByName('admin', 'web')->hasPermissionTo($permissao));
        $this->assertFalse(Role::findByName('redator', 'web')->hasPermissionTo($permissao));
        $this->assertContains($permissao, PermissionCatalog::SEGREGATED);
    }

    public function test_em_andamento_redator_sobe_201_e_remove_204(): void
    {
        $fileId = $this->docAnexado();
        $this->actingAsRedatorRole();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS', 'file' => $this->pdf(),
        ])->assertCreated();
        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")->assertNoContent();
    }

    public function test_em_andamento_superadmin_sobe_201_e_remove_204(): void
    {
        $fileId = $this->docAnexado();
        $this->actingAsSuperadmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS', 'file' => $this->pdf(),
        ])->assertCreated();
        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")->assertNoContent();
    }

    public function test_em_andamento_admin_comum_recebe_403_no_post_e_no_delete(): void
    {
        $fileId = $this->docAnexado();
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS', 'file' => $this->pdf(),
        ])->assertForbidden();
        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$fileId}")->assertForbidden();
    }
}
