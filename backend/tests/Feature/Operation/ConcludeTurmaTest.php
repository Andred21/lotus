<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ConcludeTurmaTest extends TestCase
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

    private function completarDocs(): void
    {
        $action = app(StoreTurmaDocumentAction::class);
        foreach (TurmaDocumentType::cases() as $type) {
            $action->execute($this->turma, $type,
                UploadedFile::fake()->create('d.pdf', 10, 'application/pdf'));
        }
    }

    public function test_turma_data_expoe_habilitada_e_faltantes(): void
    {
        $this->actingAsAdmin();

        $this->getJson("/api/turmas/{$this->turma->id}")
            ->assertOk()
            ->assertJsonPath('habilitada', false)
            ->assertJsonPath('missing_document_types', ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR'])
            ->assertJsonPath('concluded_at', null);

        $this->completarDocs();

        $this->getJson("/api/turmas/{$this->turma->id}")
            ->assertOk()
            ->assertJsonPath('habilitada', true)
            ->assertJsonPath('missing_document_types', []);
    }

    public function test_concluir_sem_doc_completa_422_com_faltantes(): void
    {
        $this->actingAsAdmin();

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")
            ->assertStatus(422)
            ->assertJsonValidationErrors('documents');

        $this->assertSame('em_andamento', $this->turma->fresh()->status->value);
    }

    public function test_concluir_habilitada_200_e_terminal(): void
    {
        $this->actingAsAdmin();
        $this->completarDocs();

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")
            ->assertOk()
            ->assertJsonPath('status', 'concluida')
            ->assertJsonPath('habilitada', false);   // concluída não é "habilitada"

        $fresh = $this->turma->fresh();
        $this->assertSame('concluida', $fresh->status->value);
        $this->assertNotNull($fresh->concluded_at);

        // terminal (D5): segunda chamada recusa
        $this->postJson("/api/turmas/{$this->turma->id}/conclude")->assertStatus(422);
    }

    public function test_rn15_upload_e_delete_apos_conclusao_422(): void
    {
        $this->actingAsSuperadmin();
        $this->completarDocs();
        $docId = $this->turma->files()->first()->id;

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")->assertOk();

        $this->postJson("/api/turmas/{$this->turma->id}/documents", [
            'type' => 'PRUEBAS',
            'file' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
        ])->assertStatus(422);

        $this->deleteJson("/api/turmas/{$this->turma->id}/documents/{$docId}")
            ->assertStatus(422);
    }

    public function test_sem_permissao_complete_403(): void
    {
        // usuário autenticado sem role (nenhuma permissão)
        $this->seed(RolePermissionSeeder::class);
        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');   // redator NÃO tem operation.turma.complete
        $this->actingAs($user, 'web');

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")->assertForbidden();
    }
}
