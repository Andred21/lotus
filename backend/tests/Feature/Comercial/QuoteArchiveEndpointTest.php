<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * Cotação não tem lista de topo: vive no detalhe do orçamento. A lista de
 * arquivados é ESCOPADA PELO PAI (spec D5) — sem ela, a cotação arquivada
 * individualmente fica inalcançável para sempre, que é a assimetria que o bloco
 * existe para fechar.
 */
class QuoteArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeBudget(string $code = 'Scap 1', string $rut = '31.222.333-4'): Budget
    {
        $client = $this->makeClientWithUser([], ['rut' => $rut]);

        return Budget::create(['client_id' => $client->id, 'code' => $code]);
    }

    private function makeQuote(Budget $budget, int $seq = 1, string $status = 'pending'): Quote
    {
        return Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse(['name' => "C{$budget->id}-{$seq}"])->id,
            'seq_in_budget' => $seq,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => $status,
        ]);
    }

    public function test_lista_so_as_arquivadas_do_orcamento_pedido(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $a = $this->makeBudget('Scap 1', '31.222.333-4');
        $b = $this->makeBudget('Scap 2', '32.333.444-5');

        $daA = $this->makeQuote($a, 1);
        $vivaDaA = $this->makeQuote($a, 2);
        $daB = $this->makeQuote($b, 1);

        $daA->delete();
        $daB->delete();

        $this->getJson("/api/budgets/{$a->id}/quotes/archived")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.quote.id', $daA->id)
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        // A ativa do mesmo orçamento continua só na lista ativa.
        $this->getJson("/api/budgets/{$a->id}/quotes")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $vivaDaA->id);
    }

    public function test_arquivada_mostra_os_anexos_que_a_cascata_levou(): void
    {
        $this->actingAsAdmin();

        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $quote->files()->create([
            'type' => 'invoice', 'path' => 'docs/a.pdf', 'original_name' => 'a.pdf',
            'mime' => 'application/pdf', 'size' => 1024,
        ]);

        $quote->delete();

        $this->getJson("/api/budgets/{$budget->id}/quotes/archived")
            ->assertOk()
            ->assertJsonCount(1, '0.quote.files');
    }

    public function test_restaura_e_devolve_a_cotacao(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget, 3);
        $quote->delete();

        $this->postJson("/api/quotes/{$quote->id}/restore")
            ->assertOk()
            ->assertJsonPath('seq_in_budget', 3);

        $this->assertNull($quote->fresh()->deleted_at);
    }

    public function test_seq_in_budget_nao_colide_no_restore(): void
    {
        // O contraste medido da spec D1: `CreateQuoteAction` deriva o número com
        // `Quote::withTrashed()->max(...)`, então a cotação arquivada continua
        // ocupando o seu e o restore nunca colide. É o oposto de `Turma`.
        $this->actingAsAdmin();
        $budget = $this->makeBudget();

        $primeira = $this->makeQuote($budget, 1);
        $primeira->delete();

        $this->postJson("/api/budgets/{$budget->id}/quotes", [
            'course_id' => $this->makeCourse(['name' => 'Nova'])->id,
            'student_count' => 3, 'value_uf' => '5.0000',
        ])->assertCreated()->assertJsonPath('seq_in_budget', 2);

        $this->postJson("/api/quotes/{$primeira->id}/restore")->assertOk();
    }

    public function test_restaurar_cotacao_ativa_da_404(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);

        $this->postJson("/api/quotes/{$quote->id}/restore")->assertNotFound();
    }

    public function test_id_nao_numerico_da_404_e_nao_500(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/quotes/abc/restore')->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('commercial.quote.view');
        $this->actingAs($user, 'web');

        $budget = $this->makeBudget();
        $quote = $this->makeQuote($budget);
        $quote->delete();

        $this->getJson("/api/budgets/{$budget->id}/quotes/archived")->assertOk();
        $this->postJson("/api/quotes/{$quote->id}/restore")->assertForbidden();
    }
}
