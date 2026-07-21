<?php

namespace Tests\Feature\Operation;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TurmaCrudTest extends TestCase
{
    use RefreshDatabase;

    private int $courseId;

    private function makeQuote(string $status = 'approved'): Quote
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $this->courseId = Course::create(['name' => 'AT', 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budget->id, 'course_id' => $this->courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => $status,
        ]);
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'modalidade' => 'presencial', 'local_aplicacao' => 'Santiago',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ], $override);
    }

    public function test_cria_turma_de_cotacao_aprovada(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())
            ->assertCreated()
            ->assertJsonPath('status', 'em_andamento')
            ->assertJsonPath('course_id', $this->courseId)
            ->assertJsonPath('modalidade', 'presencial');

        $this->assertDatabaseHas('turmas', ['quote_id' => $quote->id, 'status' => 'em_andamento']);
    }

    public function test_course_id_vem_da_quote_ignora_payload(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $outroCurso = Course::create(['name' => 'Outro', 'workload_hours' => 4])->id;

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload(['course_id' => $outroCurso]))
            ->assertCreated()
            ->assertJsonPath('course_id', $this->courseId);   // o da quote, não o injetado
    }

    public function test_cotacao_nao_aprovada_recusa_422(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('pending');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())
            ->assertStatus(422);
        $this->assertDatabaseMissing('turmas', ['quote_id' => $quote->id]);
    }

    public function test_quote_que_ja_tem_turma_recusa_422(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->assertCreated();
        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->assertStatus(422);

        $this->assertSame(1, Turma::where('quote_id', $quote->id)->count());
    }

    public function test_presencial_exige_local_aplicacao(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload(['local_aplicacao' => null]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('local_aplicacao');
    }

    public function test_online_dispensa_local_aplicacao(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload([
            'modalidade' => 'online', 'local_aplicacao' => null,
        ]))->assertCreated()->assertJsonPath('modalidade', 'online');
    }

    public function test_lista_turmas(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->assertCreated();

        $this->getJson('/api/turmas')->assertOk()->assertJsonCount(1);
    }

    public function test_mostra_turma(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $id = $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->json('id');

        $this->getJson("/api/turmas/{$id}")->assertOk()->assertJsonPath('id', $id);
    }

    public function test_edita_campos_basicos_da_turma(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $id = $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->json('id');

        $this->putJson("/api/turmas/{$id}", $this->payload([
            'modalidade' => 'online', 'local_aplicacao' => null, 'end_date' => '2026-08-15',
        ]))->assertOk()
            ->assertJsonPath('modalidade', 'online')
            ->assertJsonPath('end_date', '2026-08-15')
            ->assertJsonPath('status', 'em_andamento');   // update não mexe no status
    }

    public function test_remove_turma_soft_delete(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');
        $id = $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())->json('id');

        $this->deleteJson("/api/turmas/{$id}")->assertNoContent();
        $this->assertSoftDeleted('turmas', ['id' => $id]);
    }
}
