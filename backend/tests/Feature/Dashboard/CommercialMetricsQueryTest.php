<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Enums\PendingItemType;
use App\Domains\Dashboard\Services\CommercialMetricsQuery;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommercialMetricsQueryTest extends TestCase
{
    use RefreshDatabase;

    public function test_agrega_kpis_e_pendencias_de_cotacao(): void
    {
        $clientUser = User::create([
            'name' => 'Cliente Comercial Dashboard',
            'rut' => '76.543.210-3',
            'email' => 'cliente-commercial-dashboard@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);
        $client = Client::create([
            'user_id' => $clientUser->id,
            'legal_name' => 'Cliente Comercial Dashboard SpA',
            'type' => 'client',
        ]);
        $budget = Budget::create([
            'client_id' => $client->id,
            'code' => 'Scap Comercial Dashboard',
        ]);
        $course = Course::create([
            'name' => 'Métricas Comerciales',
            'workload_hours' => 8,
        ]);

        $pendingOne = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => 1,
            'student_count' => 10,
            'value_uf' => '100.5000',
            'status' => 'pending',
        ]);
        $pendingTwo = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => 2,
            'student_count' => 12,
            'value_uf' => '200.2500',
            'status' => 'pending',
        ]);
        $approvedWithoutTurma = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => 3,
            'student_count' => 8,
            'value_uf' => '300.0000',
            'status' => 'approved',
            'approved_at' => '2026-08-14 12:00:00',
        ]);
        $approvedWithTurma = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => 4,
            'student_count' => 6,
            'value_uf' => '400.0000',
            'status' => 'approved',
            'approved_at' => '2026-08-14 12:00:00',
        ]);
        Turma::create([
            'quote_id' => $approvedWithTurma->id,
            'course_id' => $course->id,
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => '2026-08-15',
            'end_date' => '2026-08-20',
            'status' => 'em_andamento',
        ]);

        $query = app(CommercialMetricsQuery::class);

        $this->assertSame([
            'pending_count' => 2,
            'pending_value_uf' => '300.7500',
        ], $query->quoteKpis()->toArray());

        $pendencias = collect($query->pendencias());
        $this->assertCount(3, $pendencias);
        $this->assertEqualsCanonicalizing(
            [$pendingOne->id, $pendingTwo->id],
            $pendencias
                ->where('type', PendingItemType::QuoteAwaitingApproval)
                ->pluck('entity_id')
                ->all(),
        );
        $this->assertSame(
            [$approvedWithoutTurma->id],
            $pendencias
                ->where('type', PendingItemType::QuoteApprovedWithoutTurma)
                ->pluck('entity_id')
                ->all(),
        );
        $this->assertFalse($pendencias->contains(
            fn ($item): bool => $item->entity_id === $approvedWithTurma->id,
        ));
    }
}
