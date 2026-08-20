<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class BudgetModelTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function quote(Budget $budget, int $seq, string $status = 'pending'): Quote
    {
        $courseId = $this->makeCourse()->id;

        return Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => $seq,
            'student_count' => 10, 'value_uf' => 50.5, 'status' => $status,
        ]);
    }

    public function test_status_casts_to_enum(): void
    {
        $budget = Budget::create(['client_id' => $this->makeClientWithUser()->id, 'code' => 'Scap 1']);
        $quote = $this->quote($budget, 1, 'approved');

        $this->assertInstanceOf(QuoteStatus::class, $quote->fresh()->status);
        $this->assertSame(QuoteStatus::Approved, $quote->fresh()->status);
    }

    public function test_relations(): void
    {
        $budget = Budget::create(['client_id' => $this->makeClientWithUser()->id, 'code' => 'Scap 1']);
        $this->quote($budget, 1);

        $this->assertCount(1, $budget->quotes);
        $this->assertTrue($budget->quotes->first()->budget->is($budget));
    }

    public function test_soft_delete_cascades_to_quotes(): void
    {
        $budget = Budget::create(['client_id' => $this->makeClientWithUser()->id, 'code' => 'Scap 1']);
        $quote = $this->quote($budget, 1);

        $budget->delete();

        $this->assertSoftDeleted('budgets', ['id' => $budget->id]);
        $this->assertSoftDeleted('quotes', ['id' => $quote->id]);
    }
}
