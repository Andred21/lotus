<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Actions\ApproveQuoteAction;
use App\Domains\Commercial\Actions\DeleteQuoteAction;
use App\Domains\Commercial\Actions\RejectQuoteAction;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Matriz de transições da cotação (spec D2) sobre o guardião `QuoteLifecycle`.
 * Cada teste prova uma célula da matriz pela API, como superadmin.
 */
class QuoteTransitionMatrixTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    /** @param 'em_andamento'|'concluida'|'arquivada'|null $turma */
    private function cenario(string $status, ?string $turma = null): Quote
    {
        $clientId = $this->makeClientWithUser()->id;
        $budgetId = Budget::create(['client_id' => $clientId, 'code' => 'Scap 1'])->id;
        $courseId = $this->makeCourse()->id;

        $quote = Quote::forceCreate([
            'budget_id' => $budgetId, 'course_id' => $courseId, 'seq_in_budget' => 1,
            'student_count' => 5, 'value_uf' => 10, 'status' => $status,
            'approved_at' => $status === 'approved' ? now()->subDay() : null,
        ]);

        if ($turma !== null) {
            $t = Turma::create([
                'quote_id' => $quote->id,
                'course_id' => $courseId,
                'modalidade' => 'presencial',
                'local_aplicacao' => null,
                'start_date' => '2026-09-01',
                'end_date' => '2026-09-05',
                'status' => $turma === 'concluida' ? 'concluida' : 'em_andamento',
            ]);
            if ($turma === 'arquivada') {
                $t->delete();
            }
        }

        return $quote;
    }

    public function test_recusar_com_turma_em_andamento_da_422(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved', 'em_andamento');

        $this->postJson("/api/quotes/{$quote->id}/reject")
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $fresh = $quote->fresh();
        $this->assertSame('approved', $fresh->status->value);
        $this->assertNotNull($fresh->approved_at);
    }

    public function test_recusar_com_turma_concluida_da_422(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved', 'concluida');

        $this->postJson("/api/quotes/{$quote->id}/reject")
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $fresh = $quote->fresh();
        $this->assertSame('approved', $fresh->status->value);
        $this->assertNotNull($fresh->approved_at);
    }

    public function test_recusar_com_turma_arquivada_passa(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved', 'arquivada');

        $this->postJson("/api/quotes/{$quote->id}/reject")
            ->assertOk()->assertJsonPath('status', 'rejected');

        $this->assertNull($quote->fresh()->approved_at);
    }

    public function test_recusar_aprovada_sem_turma_passa(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved');

        $this->postJson("/api/quotes/{$quote->id}/reject")
            ->assertOk()->assertJsonPath('status', 'rejected');
    }

    public function test_recusar_recusada_da_422(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('rejected');

        $this->postJson("/api/quotes/{$quote->id}/reject")
            ->assertStatus(422)->assertJsonValidationErrors('status');
    }

    /** @return array<string, array{string}> */
    public static function statusAprovaveis(): array
    {
        return ['pendente' => ['pending'], 'recusada' => ['rejected']];
    }

    #[DataProvider('statusAprovaveis')]
    public function test_aprovar_pendente_e_recusada_passa(string $status): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario($status);

        $this->postJson("/api/quotes/{$quote->id}/approve")
            ->assertOk()->assertJsonPath('status', 'approved');

        $this->assertNotNull($quote->fresh()->approved_at);
    }

    public function test_aprovar_aprovada_da_422(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved');
        $antes = $quote->fresh()->approved_at;

        $this->postJson("/api/quotes/{$quote->id}/approve")
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $this->assertEquals($antes, $quote->fresh()->approved_at);
    }

    public function test_arquivar_aprovada_da_422_e_pendente_passa(): void
    {
        $this->actingAsSuperadmin();
        $aprovada = $this->cenario('approved');

        $this->deleteJson("/api/quotes/{$aprovada->id}")
            ->assertStatus(422)->assertJsonValidationErrors('status');
        $this->assertNotSoftDeleted('quotes', ['id' => $aprovada->id]);

        $pendente = Quote::forceCreate([
            'budget_id' => $aprovada->budget_id, 'course_id' => $aprovada->course_id, 'seq_in_budget' => 2,
            'student_count' => 5, 'value_uf' => 10, 'status' => 'pending',
        ]);

        $this->deleteJson("/api/quotes/{$pendente->id}")->assertNoContent();
        $this->assertSoftDeleted('quotes', ['id' => $pendente->id]);
    }

    /** @return array<string, array{class-string}> */
    public static function actionsDeTransicao(): array
    {
        return [
            'aprovar' => [ApproveQuoteAction::class],
            'recusar' => [RejectQuoteAction::class],
            'arquivar' => [DeleteQuoteAction::class],
        ];
    }

    /** Review Focus 1: o binding entregou a cotação viva, outra requisição a arquivou antes do lock. */
    #[DataProvider('actionsDeTransicao')]
    public function test_transicao_sobre_cotacao_arquivada_depois_do_binding_da_422(string $action): void
    {
        $quote = $this->cenario('pending');
        $emMemoria = Quote::findOrFail($quote->id);

        Quote::whereKey($quote->id)->first()->delete();

        try {
            app($action)->execute($emMemoria);
            $this->fail('A transição sobre cotação arquivada deveria dar 422.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('quote', $e->errors());
        }
    }
}
