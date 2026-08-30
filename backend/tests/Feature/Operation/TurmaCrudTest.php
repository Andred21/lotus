<?php

namespace Tests\Feature\Operation;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class TurmaCrudTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private int $courseId;

    private function makeQuote(string $status = 'approved'): Quote
    {
        $clientId = $this->makeClientWithUser([], ['rut' => '44.555.666-1'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1']);
        $this->courseId = $this->makeCourse()->id;

        return Quote::forceCreate([
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
        $outroCurso = $this->makeCourse(['name' => 'Outro', 'workload_hours' => 4])->id;

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

        $this->getJson('/api/turmas')->assertOk()->assertJsonCount(1, 'data');
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

    public function test_recria_turma_apos_soft_delete(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $id = $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())
            ->assertCreated()->json('id');
        $this->deleteJson("/api/turmas/{$id}")->assertNoContent();

        // recriar p/ a mesma cotação: a turma deletada não pode bloquear (nem 500).
        $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())
            ->assertCreated()
            ->assertJsonPath('status', 'em_andamento');

        $this->assertSame(1, Turma::where('quote_id', $quote->id)->count());
        $this->assertSame(2, Turma::withTrashed()->where('quote_id', $quote->id)->count());
    }

    public function test_turma_concluida_recusa_put_e_delete(): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote('approved');

        $id = $this->postJson("/api/quotes/{$quote->id}/turma", $this->payload())
            ->assertCreated()->json('id');

        Turma::findOrFail($id)->update([
            'status' => TurmaStatus::Concluida,
            'concluded_at' => now(),
        ]);

        $this->putJson("/api/turmas/{$id}", $this->payload(['local_aplicacao' => 'Arica']))
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.turma.0',
                __('operation.turma.concluded_locked'),
            );

        $this->deleteJson("/api/turmas/{$id}")
            ->assertStatus(422)
            ->assertJsonPath(
                'errors.turma.0',
                __('operation.turma.concluded_locked'),
            );

        $this->assertDatabaseHas('turmas', [
            'id' => $id, 'deleted_at' => null, 'local_aplicacao' => 'Santiago',
        ]);
    }

    /**
     * O default da coluna vale também em memória. Sem isto, a turma recém-criada
     * chega ao gate com `status` nulo — sete casos da suíte reprovaram assim
     * quando o gate virou fail-closed, e nenhum deles falava de conclusão.
     */
    public function test_turma_nova_ja_nasce_em_andamento_na_memoria(): void
    {
        $this->assertSame(TurmaStatus::EmAndamento, (new Turma)->status);

        $quote = $this->makeQuote('approved');
        $turma = Turma::create([
            'quote_id' => $quote->id, 'course_id' => $this->courseId,
            'modalidade' => 'online', 'start_date' => '2026-08-01', 'end_date' => '2026-08-10',
        ]);

        $this->assertSame(TurmaStatus::EmAndamento, $turma->status);
        $turma->assertAcademicallyWritable();
    }

    /**
     * O gate da RN-15 é fail-CLOSED: libera o único estado que a regra libera e
     * recusa todo o resto. A varredura de `TurmaStatus::cases()` é de propósito
     * — hoje o enum tem dois casos e isto equivale ao teste acima, mas um
     * status novo ('cancelada', 'suspensa') cai aqui sozinho no dia em que
     * alguém o acrescentar, em vez de abrir os onze caminhos de escrita em
     * silêncio. Foi a forma `=== Concluida` que este caso passou a impedir
     * (review de 2026-08-12, Q-6).
     */
    public function test_gate_recusa_todo_status_fora_de_em_andamento(): void
    {
        $turma = new Turma;

        foreach (TurmaStatus::cases() as $status) {
            $turma->status = $status;

            if ($status === TurmaStatus::EmAndamento) {
                $turma->assertAcademicallyWritable();

                continue;
            }

            try {
                $turma->assertAcademicallyWritable();
                $this->fail("status '{$status->value}' devia recusar escrita academica");
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('turma', $e->errors());
            }
        }
    }
}
