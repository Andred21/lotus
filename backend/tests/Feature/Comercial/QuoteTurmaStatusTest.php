<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * `QuoteData::$turma_status` (spec D6): o estado da turma viva da cotação, para
 * o front decidir o que oferecer sem adivinhar. Só saída; sem turma viva, null.
 */
class QuoteTurmaStatusTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeBudget(string $code = 'Scap 1', string $rut = '41.222.333-4'): Budget
    {
        $client = $this->makeClientWithUser([], ['rut' => $rut]);

        return Budget::create(['client_id' => $client->id, 'code' => $code]);
    }

    private function makeQuote(Budget $budget, string $status, int $seq = 1): Quote
    {
        return Quote::forceCreate([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse(['name' => "C{$budget->id}-{$seq}"])->id,
            'seq_in_budget' => $seq,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => $status,
            'approved_at' => $status === 'approved' ? now()->subDay() : null,
        ]);
    }

    /** @param 'em_andamento'|'concluida'|'arquivada' $turma */
    private function makeTurma(Quote $quote, string $turma): Turma
    {
        $t = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $quote->course_id,
            'modalidade' => 'presencial',
            'local_aplicacao' => null,
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-05',
            'status' => $turma === 'concluida' ? 'concluida' : 'em_andamento',
        ]);
        if ($turma === 'arquivada') {
            $t->delete();
        }

        return $t;
    }

    /** @return array<string, array{?string, ?string}> */
    public static function cenarios(): array
    {
        return [
            'sem turma' => [null, null],
            'turma em andamento' => ['em_andamento', 'em_andamento'],
            'turma concluida' => ['concluida', 'concluida'],
            'turma arquivada nao conta' => ['arquivada', null],
        ];
    }

    #[DataProvider('cenarios')]
    public function test_get_da_cotacao_traz_turma_status(?string $turma, ?string $esperado): void
    {
        $this->actingAsAdmin();
        $quote = $this->makeQuote($this->makeBudget(), 'approved');
        if ($turma !== null) {
            $this->makeTurma($quote, $turma);
        }

        $resposta = $this->getJson("/api/quotes/{$quote->id}")->assertOk();

        // A chave tem de EXISTIR com null: ausente (Optional) e null não são o
        // mesmo contrato para o front.
        $this->assertArrayHasKey('turma_status', $resposta->json());
        $resposta->assertJsonPath('turma_status', $esperado);
    }

    public function test_get_do_orcamento_traz_turma_status_em_cada_cotacao(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget();
        $comTurma = $this->makeQuote($budget, 'approved', 1);
        $semTurma = $this->makeQuote($budget, 'approved', 2);
        $this->makeTurma($comTurma, 'em_andamento');

        $porId = fn (array $quotes) => collect($quotes)->keyBy('id');

        $detalhe = $porId($this->getJson("/api/budgets/{$budget->id}")->assertOk()->json('quotes'));
        $this->assertSame('em_andamento', $detalhe[$comTurma->id]['turma_status']);
        $this->assertArrayHasKey('turma_status', $detalhe[$semTurma->id]);
        $this->assertNull($detalhe[$semTurma->id]['turma_status']);

        $lista = collect($this->getJson('/api/budgets')->assertOk()->json())->firstWhere('id', $budget->id);
        $quotes = $porId($lista['quotes']);
        $this->assertSame('em_andamento', $quotes[$comTurma->id]['turma_status']);
        $this->assertNull($quotes[$semTurma->id]['turma_status']);
    }

    public function test_listagem_de_cotacoes_do_orcamento_traz_turma_status(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget, 'approved');
        $this->makeTurma($quote, 'concluida');

        $this->getJson("/api/budgets/{$budget->id}/quotes")
            ->assertOk()
            ->assertJsonPath('0.turma_status', 'concluida');
    }

    public function test_respostas_de_approve_e_reject_trazem_turma_status(): void
    {
        $this->actingAsSuperadmin();
        $budget = $this->makeBudget();
        $aprovar = $this->makeQuote($budget, 'pending', 1);
        $recusar = $this->makeQuote($budget, 'pending', 2);

        $this->postJson("/api/quotes/{$aprovar->id}/approve")
            ->assertOk()->assertJsonPath('turma_status', null)->assertJsonStructure(['turma_status']);
        $this->postJson("/api/quotes/{$recusar->id}/reject")
            ->assertOk()->assertJsonPath('turma_status', null)->assertJsonStructure(['turma_status']);
    }

    /**
     * A guarda de lazy loading só marca a instância vinda de um `hydrate()` com
     * MAIS de uma linha (ver `AppServiceProvider`): com uma cotação só, a
     * relação esquecida passaria em silêncio. Por isso cada lista tem duas.
     */
    public function test_listagens_de_arquivados_com_turma_nao_estouram_lazy_loading(): void
    {
        $this->actingAsAdmin();

        // GET /budgets/{id}/quotes/archived: duas cotações arquivadas direto.
        $a = $this->makeBudget('Scap 1', '41.222.333-4');
        $pendente = $this->makeQuote($a, 'pending', 1);
        $outra = $this->makeQuote($a, 'pending', 2);
        $this->makeTurma($pendente, 'em_andamento');
        $pendente->delete();
        $outra->delete();

        $arquivadas = collect($this->getJson("/api/budgets/{$a->id}/quotes/archived")->assertOk()->json())
            ->keyBy('quote.id');
        $this->assertCount(2, $arquivadas);
        $this->assertSame('em_andamento', $arquivadas[$pendente->id]['quote']['turma_status']);
        $this->assertArrayHasKey('turma_status', $arquivadas[$outra->id]['quote']);
        $this->assertNull($arquivadas[$outra->id]['quote']['turma_status']);

        // GET /budgets/archived: a recusada com turma arquivada vem ANTES —
        // orçamento com aprovada não arquiva — e a pendente leva turma viva.
        $b = $this->makeBudget('Scap 2', '42.222.333-4');
        $recusada = $this->makeQuote($b, 'rejected', 1);
        $viva = $this->makeQuote($b, 'pending', 2);
        $this->makeTurma($recusada, 'arquivada');
        $this->makeTurma($viva, 'concluida');
        $b->delete();

        $orcamento = collect($this->getJson('/api/budgets/archived')->assertOk()->json())
            ->firstWhere('budget.id', $b->id);
        $quotes = collect($orcamento['budget']['quotes'])->keyBy('id');
        $this->assertCount(2, $quotes);
        $this->assertArrayHasKey('turma_status', $quotes[$recusada->id]);
        $this->assertNull($quotes[$recusada->id]['turma_status']);
        $this->assertSame('concluida', $quotes[$viva->id]['turma_status']);
    }

    public function test_turma_status_no_payload_e_ignorado_na_entrada(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget, 'pending');

        $this->putJson("/api/quotes/{$quote->id}", [
            'course_id' => $quote->course_id,
            'student_count' => 7,
            'value_uf' => 10,
            'turma_status' => 'concluida',
        ])->assertOk()->assertJsonPath('turma_status', null);

        $this->assertSame(7, $quote->fresh()->student_count);
        $this->assertSame(0, Turma::withTrashed()->count());

        $outra = $this->makeBudget('Scap 2', '42.222.333-4');
        $this->postJson("/api/budgets/{$outra->id}/quotes", [
            'course_id' => $this->makeCourse(['name' => 'Novo'])->id,
            'student_count' => 3,
            'value_uf' => 5,
            'turma_status' => 'em_andamento',
        ])->assertSuccessful()->assertJsonPath('turma_status', null);
    }
}
