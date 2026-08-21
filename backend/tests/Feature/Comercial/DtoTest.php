<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Commercial\Services\BudgetSummaryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class DtoTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function seedBudget(): Budget
    {
        $clientId = $this->makeClientWithUser()->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 7']);
        $courseId = $this->makeCourse()->id;
        Quote::forceCreate([
            'budget_id' => $budget->id, 'course_id' => $courseId, 'seq_in_budget' => 2,
            'student_count' => 15, 'value_uf' => 120.0, 'status' => 'approved',
        ]);

        return $budget->load('quotes');
    }

    public function test_quote_data_code_is_calculated(): void
    {
        $quote = $this->seedBudget()->quotes->first();
        $data = QuoteData::fromModel($quote);

        $this->assertSame("Scap {$quote->budget_id} - Cot 2", $data->code);
        $this->assertSame(QuoteStatus::Approved, $data->status);
        $this->assertSame('120.0000', $data->value_uf);   // string, com as 4 casas do decimal(12,4)
    }

    public function test_budget_data_derives_status_and_totals(): void
    {
        $data = BudgetData::fromModel($this->seedBudget(), app(BudgetSummaryService::class));

        $this->assertSame(QuoteStatus::Approved, $data->status);   // ≥1 aprovada
        $this->assertSame('120.0000', $data->total_value_uf);
        $this->assertSame(15, $data->total_students);
        $this->assertCount(1, $data->quotes);
    }
}
