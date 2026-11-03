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
        $budgetId = Budget::create(['client_id' => $clientId, 'code' => 'Scap '.(Budget::count() + 1)])->id;
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

    /** @return array<string, mixed> Formulário inteiro, igual ao gravado, com o UF novo. */
    private function payloadIgualAoGravado(Quote $quote, array $override = []): array
    {
        $fresh = $quote->fresh();

        return array_merge([
            'course_id' => $fresh->course_id,
            'student_count' => $fresh->student_count,
            'value_uf' => '25.5000',
            'purchase_order' => $fresh->purchase_order,
            'planned_start_date' => $fresh->planned_start_date?->toDateString(),
            'planned_end_date' => $fresh->planned_end_date?->toDateString(),
        ], $override);
    }

    public function test_superadmin_edita_aprovada_sem_turma_inclusive_curso_e_ela_continua_aprovada(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved');
        $antes = $quote->fresh()->approved_at;
        $outroCurso = $this->makeCourse()->id;

        $this->putJson("/api/quotes/{$quote->id}", $this->payloadIgualAoGravado($quote, [
            'course_id' => $outroCurso, 'student_count' => 20, 'value_uf' => '33.0000',
        ]))->assertOk()->assertJsonPath('status', 'approved');

        $fresh = $quote->fresh();
        $this->assertSame($outroCurso, $fresh->course_id);
        $this->assertSame(20, $fresh->student_count);
        $this->assertSame('33.0000', (string) $fresh->value_uf);
        $this->assertSame('approved', $fresh->status->value);
        $this->assertEquals($antes, $fresh->approved_at);
    }

    public function test_superadmin_edita_aprovada_com_turma_arquivada_inclusive_curso(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved', 'arquivada');
        $outroCurso = $this->makeCourse()->id;

        $this->putJson("/api/quotes/{$quote->id}", $this->payloadIgualAoGravado($quote, [
            'course_id' => $outroCurso,
        ]))->assertOk()->assertJsonPath('status', 'approved');

        $this->assertSame($outroCurso, $quote->fresh()->course_id);
    }

    public function test_superadmin_muda_so_o_uf_de_aprovada_com_turma(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved', 'em_andamento');
        $quote->forceFill([
            'planned_start_date' => '2026-09-01', 'planned_end_date' => '2026-09-05',
        ])->save();

        $this->putJson("/api/quotes/{$quote->id}", $this->payloadIgualAoGravado($quote))
            ->assertOk()->assertJsonPath('value_uf', '25.5000')->assertJsonPath('status', 'approved');

        $this->assertSame('25.5000', (string) $quote->fresh()->value_uf);
    }

    /** @return array<string, array{string, mixed}> */
    public static function camposTravadosPelaTurma(): array
    {
        return [
            'course_id' => ['course_id', null],
            'student_count' => ['student_count', 99],
            'purchase_order' => ['purchase_order', 'OC-9'],
            'planned_start_date' => ['planned_start_date', '2027-01-01'],
        ];
    }

    #[DataProvider('camposTravadosPelaTurma')]
    public function test_superadmin_muda_outro_campo_de_aprovada_com_turma_da_422(string $campo, mixed $valor): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved', 'em_andamento');
        $antes = $quote->fresh()->getAttributes();
        $valor = $campo === 'course_id' ? $this->makeCourse()->id : $valor;

        $this->putJson("/api/quotes/{$quote->id}", $this->payloadIgualAoGravado($quote, [$campo => $valor]))
            ->assertStatus(422)->assertJsonValidationErrors($campo);

        $this->assertSame($antes, $quote->fresh()->getAttributes());
    }

    public function test_null_sobre_valor_gravado_conta_como_mudanca(): void
    {
        $this->actingAsSuperadmin();
        $quote = $this->cenario('approved', 'em_andamento');
        $quote->forceFill(['purchase_order' => 'OC-1'])->save();

        $this->putJson("/api/quotes/{$quote->id}", $this->payloadIgualAoGravado($quote, ['purchase_order' => null]))
            ->assertStatus(422)->assertJsonValidationErrors('purchase_order');

        $this->assertSame('OC-1', $quote->fresh()->purchase_order);
    }

    public function test_admin_editando_aprovada_da_422_status(): void
    {
        $this->actingAsAdmin();

        foreach ([null, 'em_andamento'] as $turma) {
            $quote = $this->cenario('approved', $turma);

            $this->putJson("/api/quotes/{$quote->id}", $this->payloadIgualAoGravado($quote))
                ->assertStatus(422)
                ->assertJsonValidationErrors('status')
                ->assertJsonPath('errors.status.0', __('commercial.quote.approved_cannot_edit'));

            $this->assertSame('10.0000', (string) $quote->fresh()->value_uf);
        }
    }

    public function test_edicao_de_pendente_e_recusada_segue_como_hoje(): void
    {
        $this->actingAsAdmin();

        $pendente = $this->cenario('pending');
        $this->putJson("/api/quotes/{$pendente->id}", $this->payloadIgualAoGravado($pendente))
            ->assertOk()->assertJsonPath('status', 'pending');
        $this->assertSame('pending', $pendente->fresh()->status->value);

        $recusada = $this->cenario('rejected');
        $this->putJson("/api/quotes/{$recusada->id}", $this->payloadIgualAoGravado($recusada))
            ->assertOk()->assertJsonPath('status', 'pending');
        $this->assertSame('pending', $recusada->fresh()->status->value);
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
