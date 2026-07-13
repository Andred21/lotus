<?php

namespace Tests\Feature\Comercial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Commercial\Services\BudgetSummaryService;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetSummaryServiceTest extends TestCase
{
    use RefreshDatabase;

    private BudgetSummaryService $service;

    private int $budgetCounter = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new BudgetSummaryService;
    }

    private function budgetWithValues(array $valuesUf): Budget
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $this->budgetCounter++;
        $budget = Budget::create(['client_id' => $clientId, 'code' => "Scap {$this->budgetCounter}"]);
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;

        foreach ($valuesUf as $i => $value) {
            Quote::create([
                'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => $i + 1,
                'student_count' => 1, 'value_uf' => $value, 'status' => 'pending',
            ]);
        }

        return $budget->load('quotes');
    }

    private function budgetWith(array $statuses): Budget
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $this->budgetCounter++;
        $budget = Budget::create(['client_id' => $clientId, 'code' => "Scap {$this->budgetCounter}"]);
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;

        foreach ($statuses as $i => $status) {
            Quote::create([
                'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => $i + 1,
                'student_count' => 10, 'value_uf' => 100, 'status' => $status,
            ]);
        }

        return $budget->load('quotes');
    }

    public function test_approved_when_any_quote_approved(): void
    {
        $budget = $this->budgetWith(['pending', 'approved', 'rejected']);
        $this->assertSame(QuoteStatus::Approved, $this->service->status($budget));
    }

    public function test_rejected_when_all_rejected(): void
    {
        $budget = $this->budgetWith(['rejected', 'rejected']);
        $this->assertSame(QuoteStatus::Rejected, $this->service->status($budget));
    }

    public function test_pending_when_no_quotes_or_still_pending(): void
    {
        $this->assertSame(QuoteStatus::Pending, $this->service->status($this->budgetWith([])));
        $this->assertSame(QuoteStatus::Pending, $this->service->status($this->budgetWith(['pending'])));
    }

    public function test_totals_sum_all_active_quotes(): void
    {
        $budget = $this->budgetWith(['pending', 'approved', 'rejected']);  // 3 × 100 UF, 3 × 10 alunos
        $this->assertSame('300.0000', $this->service->totalValueUf($budget));
        $this->assertSame(30, $this->service->totalStudents($budget));
    }

    /**
     * A soma é decimal (bcmath), não float: em float64, 0.1 + 0.2 dá
     * 0.30000000000000004. Dinheiro de peso legal não pode passar por float.
     */
    public function test_soma_e_decimal_exata_nao_float(): void
    {
        $budget = $this->budgetWithValues(['0.1', '0.2']);
        $this->assertSame('0.3000', $this->service->totalValueUf($budget));
    }

    public function test_cotacao_soft_deletada_fica_fora_das_somas_e_do_status(): void
    {
        $budget = $this->budgetWith(['approved', 'pending']);
        $budget->quotes->firstWhere('status', QuoteStatus::Approved)->delete();
        $budget->refresh();

        // sem a aprovada (soft-deletada), só resta a pendente
        $this->assertSame(QuoteStatus::Pending, $this->service->status($budget));
        $this->assertSame('100.0000', $this->service->totalValueUf($budget));
        $this->assertSame(10, $this->service->totalStudents($budget));
    }
}
