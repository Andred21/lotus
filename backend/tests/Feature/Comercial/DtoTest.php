<?php

namespace Tests\Feature\Comercial;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Data\BudgetData;
use App\Domains\Commercial\Data\QuoteData;
use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DtoTest extends TestCase
{
    use RefreshDatabase;

    private function seedBudget(): Budget
    {
        $clientId = User::factory()->create(['type' => 'cliente', 'is_active' => false])
            ->client()->create(['legal_name' => 'ACME', 'type' => 'client'])->id;
        $budget = Budget::create(['client_id' => $clientId, 'code' => 'Scap 7']);
        $courseId = Course::create(['name' => 'C', 'workload_hours' => 8])->id;
        Quote::create([
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
    }

    public function test_budget_data_derives_status_and_totals(): void
    {
        $data = BudgetData::fromModel($this->seedBudget());

        $this->assertSame(QuoteStatus::Approved, $data->status);   // ≥1 aprovada
        $this->assertSame(120.0, $data->total_value_uf);
        $this->assertSame(15, $data->total_students);
        $this->assertCount(1, $data->quotes);
    }
}
