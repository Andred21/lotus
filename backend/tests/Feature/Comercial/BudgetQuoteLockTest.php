<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Actions\CreateQuoteAction;
use App\Domains\Commercial\Actions\DeleteBudgetAction;
use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\LaravelData\Optional;
use Tests\Support\CreatesDomainRecords;
use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * P-49, eixo cotação × orçamento (spec D4/D5). Os dois lados do mutex tomam o
 * lock do orçamento: quem arquiva/restaura toma `Budget::lockRow()`, quem
 * escreve filho (criar cotação) toma `Budget::lockForWrite()`, que RECUSA
 * orçamento arquivado. Ordem obrigatória: orçamento primeiro, cotação depois.
 *
 * A suíte roda em sqlite, onde `lockForUpdate` é no-op: aqui se provam as
 * regras decididas sob o lock e, por leitura de código, que o lock é tomado.
 */
class BudgetQuoteLockTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;
    use ScansPhpSource;

    private function makeBudget(): Budget
    {
        $client = $this->makeClientWithUser([], ['rut' => '21.222.333-4']);

        return Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
    }

    private function makeQuote(Budget $budget, string $status = 'pending'): Quote
    {
        return Quote::forceCreate([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse(['name' => 'C'.$budget->quotes()->withTrashed()->count()])->id,
            'seq_in_budget' => (int) $budget->quotes()->withTrashed()->max('seq_in_budget') + 1,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => $status,
        ]);
    }

    public function test_criar_cotacao_em_orcamento_arquivado_depois_do_binding_da_422(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget();
        $course = $this->makeCourse(['name' => 'Curso']);

        // O binding já resolveu `$budget` vivo; o arquivamento ocorre na janela.
        Budget::whereKey($budget->id)->first()->delete();

        $data = new QuoteData(
            id: new Optional,
            budget_id: new Optional,
            seq_in_budget: new Optional,
            course_id: $course->id,
            student_count: 5,
            value_uf: '10.0000',
            status: new Optional,
            approved_at: new Optional,
            code: new Optional,
        );

        try {
            app(CreateQuoteAction::class)->execute($budget, $data);
            $this->fail('Esperava ValidationException.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('budget', $e->errors());
        }

        $this->assertSame(0, Quote::withTrashed()->where('budget_id', $budget->id)->count());
    }

    public function test_restaurar_cotacao_sob_orcamento_arquivado_segue_422(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);

        app(DeleteBudgetAction::class)->execute($budget);

        $this->postJson("/api/quotes/{$quote->id}/restore")
            ->assertStatus(422)
            ->assertJsonPath('errors.quote.0', __('commercial.quote.budget_archived'));

        $this->assertNotNull($quote->fresh()->deleted_at);
    }

    public function test_arquivar_orcamento_com_aprovada_segue_422_e_sem_aprovada_passa(): void
    {
        $this->actingAsAdmin();
        $comAprovada = $this->makeBudget();
        $this->makeQuote($comAprovada, 'approved');

        try {
            app(DeleteBudgetAction::class)->execute($comAprovada);
            $this->fail('Esperava ValidationException.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('status', $e->errors());
        }
        $this->assertNull($comAprovada->fresh()->deleted_at);

        $semAprovada = Budget::create(['client_id' => $comAprovada->client_id, 'code' => 'Scap 2']);
        $quote = $this->makeQuote($semAprovada);

        app(DeleteBudgetAction::class)->execute($semAprovada);

        $this->assertNotNull(Budget::withTrashed()->find($semAprovada->id)->deleted_at);
        $this->assertNotNull($quote->fresh()->deleted_at);
    }

    public function test_actions_do_eixo_tomam_o_lock_do_orcamento_dentro_da_transacao(): void
    {
        $esperado = [
            'Commercial/Actions/CreateQuoteAction.php' => 'Budget::lockForWrite(',
            'Commercial/Actions/DeleteBudgetAction.php' => 'Budget::lockRow(',
            'Commercial/Actions/RestoreQuoteAction.php' => 'Budget::lockRow(',
        ];
        $faltando = [];

        foreach ($esperado as $arquivo => $chamada) {
            $codigo = $this->codigoSemComentarios(app_path("Domains/{$arquivo}"));

            if (! str_contains($codigo, $chamada)) {
                $faltando[] = "{$arquivo}: não chama `{$chamada}`";
            }

            if (! str_contains($codigo, 'DB::transaction')) {
                $faltando[] = "{$arquivo}: não abre `DB::transaction` — lock fora de transação é solto no autocommit";
            }
        }

        $this->assertSame([], $faltando, implode("\n", array_merge(
            ['P-49: escritor do eixo cotação × orçamento sem o lock do orçamento, ou fora de transação.'],
            $faltando,
        )));
    }
}
