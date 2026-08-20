<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class BudgetArchiveEndpointTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function makeBudget(string $code = 'Scap 1', string $rut = '21.222.333-4'): Budget
    {
        $client = $this->makeClientWithUser([], ['rut' => $rut]);

        return Budget::create(['client_id' => $client->id, 'code' => $code]);
    }

    private function makeQuote(Budget $budget, int $seq = 1): Quote
    {
        return Quote::forceCreate([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse(['name' => "C{$seq}"])->id,
            'seq_in_budget' => $seq,
            'student_count' => 5,
            'value_uf' => 10,
            'status' => 'pending',
        ]);
    }

    public function test_listagem_de_arquivados_nao_vaza_ativo_e_traz_data_e_autor(): void
    {
        $autor = $this->actingAsAdmin();
        $autor->update(['name' => 'Ana Torres']);

        $ativo = $this->makeBudget('Scap 1', '21.222.333-4');
        $arquivado = $this->makeBudget('Scap 2', '22.333.444-5');
        $arquivado->delete();

        $this->getJson('/api/budgets/archived')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.budget.id', $arquivado->id)
            ->assertJsonPath('0.budget.code', 'Scap 2')
            ->assertJsonPath('0.archived_by', 'Ana Torres');

        $this->getJson('/api/budgets')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $ativo->id);
    }

    public function test_arquivado_mostra_as_cotacoes_que_a_cascata_levou(): void
    {
        // Q-8 do review anterior: com a projeção normal a linha aparece com
        // `0 cotações` e total `0`, porque a cascata acabou de arquivá-las e o
        // global scope as esconde. O operador reconhece o orçamento por essas
        // colunas antes de restaurar.
        $this->actingAsAdmin();

        $budget = $this->makeBudget();
        $this->makeQuote($budget);
        $budget->delete();

        $this->getJson('/api/budgets/archived')
            ->assertOk()
            ->assertJsonCount(1, '0.budget.quotes')
            ->assertJsonPath('0.budget.total_students', 5);
    }

    public function test_arquivado_nao_mostra_a_cotacao_arquivada_antes_do_pai(): void
    {
        $this->actingAsAdmin();

        $budget = $this->makeBudget();
        $this->makeQuote($budget, 1)->delete();
        $this->makeQuote($budget, 2);
        $budget->delete();

        $this->getJson('/api/budgets/archived')
            ->assertOk()
            ->assertJsonCount(1, '0.budget.quotes')
            ->assertJsonPath('0.budget.quotes.0.seq_in_budget', 2);
    }

    public function test_restaura_e_devolve_o_orcamento(): void
    {
        $this->actingAsAdmin();
        $budget = $this->makeBudget('Scap 9');
        $budget->delete();

        $this->postJson("/api/budgets/{$budget->id}/restore")
            ->assertOk()
            ->assertJsonPath('code', 'Scap 9');

        $this->assertNull($budget->fresh()->deleted_at);
    }

    public function test_restaurar_orcamento_ativo_da_404(): void
    {
        // O restore resolve por `onlyTrashed()`: ativo não existe para esta rota.
        $this->actingAsAdmin();
        $budget = $this->makeBudget();

        $this->postJson("/api/budgets/{$budget->id}/restore")->assertNotFound();
    }

    public function test_id_nao_numerico_da_404_e_nao_500(): void
    {
        // Sem o `whereNumber` da rota, `int $budget` estoura `TypeError` antes
        // de qualquer consulta e o handler devolve 500 (Q-6 do review anterior).
        $this->actingAsAdmin();

        $this->postJson('/api/budgets/abc/restore')->assertNotFound();
    }

    public function test_sem_a_permissao_de_restore_da_403(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->givePermissionTo('commercial.budget.view');
        $this->actingAs($user, 'web');

        $budget = $this->makeBudget();
        $budget->delete();

        // Vê a lista (tem a `view`)...
        $this->getJson('/api/budgets/archived')->assertOk();
        // ...mas não restaura.
        $this->postJson("/api/budgets/{$budget->id}/restore")->assertForbidden();
    }

    public function test_archived_exige_a_permissao_de_view(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->redator()->create(['is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        $this->getJson('/api/budgets/archived')->assertForbidden();
    }
}
