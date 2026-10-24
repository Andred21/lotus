<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Actions\ConcludeTurmaAction;
use App\Domains\Operation\Actions\EnrollStudentAction;
use App\Domains\Operation\Actions\StoreTurmaDocumentAction;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class ConcludeTurmaTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake();
        $clientId = $this->makeClientWithUser([], ['rut' => '11.222.333-9'])->id;
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
        $this->designarRedator();
    }

    private function designarRedator(): void
    {
        $redator = User::factory()->redator()->create()->redator()->create([]);
        $this->turma->redatores()->attach($redator->id);
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

    public function test_concluir_sem_redator_422_com_requirements(): void
    {
        $this->actingAsAdmin();
        $this->completarDocs();
        $this->turma->redatores()->detach();

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")
            ->assertStatus(422)
            ->assertJsonPath('errors.requirements.0', __('operation.turma.requirements_incomplete', [
                'itens' => __('operation.requirement.redator'),
            ]))
            ->assertJsonMissingValidationErrors('documents');

        $this->assertSame('em_andamento', $this->turma->fresh()->status->value);
    }

    public function test_concluir_presencial_sem_local_422(): void
    {
        $this->actingAsAdmin();
        $this->completarDocs();
        $this->turma->update(['modalidade' => TurmaModalidade::Presencial, 'local_aplicacao' => null]);

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")
            ->assertStatus(422)
            ->assertJsonPath('errors.requirements.0', __('operation.turma.requirements_incomplete', [
                'itens' => __('operation.requirement.local_aplicacao'),
            ]));

        $this->assertSame('em_andamento', $this->turma->fresh()->status->value);
    }

    public function test_faltando_docs_e_redator_devolve_as_duas_chaves(): void
    {
        $this->actingAsAdmin();
        $this->turma->redatores()->detach();

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['documents', 'requirements']);
    }

    public function test_turma_data_expoe_missing_requirements(): void
    {
        $this->actingAsAdmin();
        $this->turma->redatores()->detach();

        $this->getJson("/api/turmas/{$this->turma->id}")
            ->assertOk()
            ->assertJsonPath('missing_requirements', ['redator']);

        $this->designarRedator();

        $this->getJson("/api/turmas/{$this->turma->id}")
            ->assertOk()
            ->assertJsonPath('missing_requirements', []);
    }

    public function test_conclui_com_aluno_sem_nota_e_presenca(): void
    {
        $this->actingAsAdmin();
        $this->completarDocs();
        $enrollment = app(EnrollStudentAction::class)
            ->execute($this->turma, '11.111.111-1', 'Juan Soto', 'juan@acme.cl', null)
            ->enrollment;

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")
            ->assertOk()
            ->assertJsonPath('status', 'concluida');

        // Sem nota nem presença a conclusão passa: o resultado acadêmico não é gate.
        $this->assertNull($enrollment->fresh()->attendance_pct);
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

    /**
     * O gate da RN-16 decide sobre o banco, não sobre a relação que o model já
     * trazia carregada. `loadListingData()` carrega `documentacaoObrigatoria`,
     * e sem a leitura fresca dentro da transação um documento arquivado depois
     * dessa carga deixaria o cache dizer "completa" — concluindo, em escrita
     * TERMINAL, uma turma sem documentação obrigatória.
     */
    public function test_gate_rn16_le_documentacao_fresca_e_nao_a_relacao_em_cache(): void
    {
        $this->completarDocs();

        $turma = Turma::findOrFail($this->turma->id)->loadListingData();
        $turma->documentacaoObrigatoria
            ->firstWhere('type', TurmaDocumentType::MANUAL->value)
            ->delete();

        try {
            app(ConcludeTurmaAction::class)->execute($turma);
            $this->fail('A conclusão deveria recusar: o MANUAL foi arquivado depois da carga.');
        } catch (ValidationException $e) {
            $this->assertSame(
                __('operation.turma.documents_incomplete', [
                    'tipos' => __('operation.document_type.MANUAL'),
                ]),
                $e->errors()['documents'][0],
            );
        }

        $this->assertSame('em_andamento', $turma->fresh()->status->value);
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
        $redator = $user->redator()->create([]);
        $this->turma->redatores()->attach($redator->id);
        $this->actingAs($user, 'web');

        $this->postJson("/api/turmas/{$this->turma->id}/conclude")->assertForbidden();
    }
}
