<?php

namespace Tests\Feature\Comercial;

use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class OmissaoPreservaCotacaoTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private function cotacao(): Quote
    {
        $client = $this->makeClientWithUser();
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);

        return Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $this->makeCourse()->id,
            'seq_in_budget' => 1,
            'student_count' => 5,
            'value_uf' => '10.0000',
            'purchase_order' => 'OC-123',
            'planned_start_date' => '2026-09-01',
            'planned_end_date' => '2026-09-30',
            'status' => 'pending',
        ]);
    }

    public function test_put_sem_purchase_order_e_datas_preserva_os_tres(): void
    {
        $this->actingAsAdmin();
        $quote = $this->cotacao();

        $this->putJson("/api/quotes/{$quote->id}", [
            'course_id' => $quote->course_id,
            'student_count' => 8,
            'value_uf' => '12.0000',
        ])->assertOk();

        $quote->refresh();
        $this->assertSame('OC-123', $quote->purchase_order);
        $this->assertSame('2026-09-01', $quote->planned_start_date?->toDateString());
        $this->assertSame('2026-09-30', $quote->planned_end_date?->toDateString());
    }

    public function test_put_com_null_explicito_apaga_os_tres(): void
    {
        $this->actingAsAdmin();
        $quote = $this->cotacao();

        $this->putJson("/api/quotes/{$quote->id}", [
            'course_id' => $quote->course_id,
            'student_count' => 8,
            'value_uf' => '12.0000',
            'purchase_order' => null,
            'planned_start_date' => null,
            'planned_end_date' => null,
        ])->assertOk();

        $quote->refresh();
        $this->assertNull($quote->purchase_order);
        $this->assertNull($quote->planned_start_date);
        $this->assertNull($quote->planned_end_date);
    }
}
