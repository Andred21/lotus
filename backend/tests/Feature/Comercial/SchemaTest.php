<?php

namespace Tests\Feature\Comercial;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_budgets_columns(): void
    {
        foreach (['id', 'client_id', 'code', 'payment_terms', 'created_at', 'deleted_at'] as $col) {
            $this->assertTrue(Schema::hasColumn('budgets', $col), "budgets.$col ausente");
        }
    }

    public function test_quotes_columns(): void
    {
        foreach ([
            'id', 'budget_id', 'course_id', 'seq_in_budget', 'student_count',
            'planned_start_date', 'planned_end_date', 'purchase_order', 'value_uf',
            'status', 'approved_at', 'deleted_at',
        ] as $col) {
            $this->assertTrue(Schema::hasColumn('quotes', $col), "quotes.$col ausente");
        }
    }
}
