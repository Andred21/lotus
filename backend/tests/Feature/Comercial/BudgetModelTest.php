<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetModelTest extends TestCase
{
    use RefreshDatabase;

    private function client(): int
    {
        return User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
    }

    private function quote(Budget $budget, int $seq, string $status = 'pending'): Quote
    {
        $courseId = \App\Domains\Catalog\Models\Course::create(['name' => 'C', 'workload_hours' => 8])->id;

        return Quote::create([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => $seq,
            'student_count' => 10, 'value_uf' => 50.5, 'status' => $status,
        ]);
    }

    public function test_status_casts_to_enum(): void
    {
        $budget = Budget::create(['client_id' => $this->client(), 'code' => 'Scap 1']);
        $quote = $this->quote($budget, 1, 'approved');

        $this->assertInstanceOf(QuoteStatus::class, $quote->fresh()->status);
        $this->assertSame(QuoteStatus::Approved, $quote->fresh()->status);
    }

    public function test_relations(): void
    {
        $budget = Budget::create(['client_id' => $this->client(), 'code' => 'Scap 1']);
        $this->quote($budget, 1);

        $this->assertCount(1, $budget->quotes);
        $this->assertTrue($budget->quotes->first()->budget->is($budget));
    }

    public function test_soft_delete_cascades_to_quotes(): void
    {
        $budget = Budget::create(['client_id' => $this->client(), 'code' => 'Scap 1']);
        $quote = $this->quote($budget, 1);

        $budget->delete();

        $this->assertSoftDeleted('budgets', ['id' => $budget->id]);
        $this->assertSoftDeleted('quotes', ['id' => $quote->id]);
    }
}
