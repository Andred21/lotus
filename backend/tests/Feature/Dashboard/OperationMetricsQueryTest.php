<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Enums\PendingItemType;
use App\Domains\Dashboard\Services\OperationMetricsQuery;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationMetricsQueryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-08-14 12:00:00');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_agrega_kpis_agenda_compliance_e_pendencias_operacionais(): void
    {
        $clientUser = User::create([
            'name' => 'Cliente Dashboard',
            'rut' => '76.543.210-3',
            'email' => 'cliente-dashboard@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);
        $client = Client::create([
            'user_id' => $clientUser->id,
            'legal_name' => 'Cliente Dashboard SpA',
            'type' => 'client',
        ]);
        $budget = Budget::create([
            'client_id' => $client->id,
            'code' => 'Scap Dashboard',
        ]);
        $course = Course::create([
            'name' => 'Operación de Subestaciones',
            'workload_hours' => 16,
        ]);

        $redatorUser = User::create([
            'name' => 'Redator Dashboard',
            'rut' => '12.345.678-5',
            'email' => 'redator-dashboard@example.test',
            'password' => 'secret',
            'type' => 'redator',
            'is_active' => true,
        ]);
        $redator = Redator::create(['user_id' => $redatorUser->id]);

        $endingSoon = $this->createTurma(
            $this->createApprovedQuote($budget, $course, 1),
            $course,
            CarbonImmutable::today()->subDays(2),
            CarbonImmutable::today()->addDays(3),
        );
        $overdue = $this->createTurma(
            $this->createApprovedQuote($budget, $course, 2),
            $course,
            CarbonImmutable::today()->subDays(10),
            CarbonImmutable::today()->subDay(),
        );
        $startingSoon = $this->createTurma(
            $this->createApprovedQuote($budget, $course, 3),
            $course,
            CarbonImmutable::today()->addDays(2),
            CarbonImmutable::today()->addDays(5),
        );
        $concluded = $this->createTurma(
            $this->createApprovedQuote($budget, $course, 4),
            $course,
            CarbonImmutable::today()->subDays(20),
            CarbonImmutable::today()->subDays(10),
            TurmaStatus::Concluida,
        );

        $endingSoon->redatores()->attach($redator->id);
        $startingSoon->redatores()->attach($redator->id);

        foreach (TurmaDocumentType::cases() as $type) {
            $this->createDocument($endingSoon, $type);
        }
        $this->createDocument($overdue, TurmaDocumentType::MANUAL);

        $query = app(OperationMetricsQuery::class);

        $this->assertSame([
            'em_andamento' => 3,
            'encerrando' => 1,
            'atrasadas' => 1,
            'conclusoes_por_confirmar' => 1,
        ], $query->kpis());

        $agenda = $query->agenda()->toArray();
        $this->assertSame([$startingSoon->id], array_column($agenda['starting_soon'], 'turma_id'));
        $this->assertSame([$endingSoon->id], array_column($agenda['ending_soon'], 'turma_id'));
        $this->assertSame([$endingSoon->id], array_column($agenda['in_progress'], 'turma_id'));
        $this->assertSame([$overdue->id], array_column($agenda['overdue'], 'turma_id'));
        $this->assertSame('Cliente Dashboard SpA', $agenda['ending_soon'][0]['client_name']);

        $compliance = collect($query->complianceTurmas())->keyBy('turma_id');
        $this->assertCount(3, $compliance);
        $this->assertSame([
            'turma_id' => $overdue->id,
            'course_name' => 'Operación de Subestaciones',
            'redatores' => [],
            'start_date' => '2026-08-04',
            'end_date' => '2026-08-13',
            // Desde a D-57 o DTO carrega o enum, e `toArray()` o preserva; o
            // JSON da borda continua ["MANUAL"], que é o que o contrato promete.
            'present_types' => [TurmaDocumentType::MANUAL],
            'missing_types' => [TurmaDocumentType::PRUEBAS, TurmaDocumentType::EVALUACION_REDATOR],
            'habilitada' => false,
        ], $compliance->get($overdue->id)->toArray());

        $pendencias = collect($query->pendencias());
        $this->assertTrue($pendencias->contains(
            fn ($item) => $item->entity_id === $overdue->id
                && $item->type === PendingItemType::TurmaWithoutRedator,
        ));
        $this->assertTrue($pendencias->contains(
            fn ($item) => $item->entity_id === $overdue->id
                && $item->type === PendingItemType::TurmaDocsIncomplete,
        ));
        $this->assertTrue($pendencias->contains(
            fn ($item) => $item->entity_id === $endingSoon->id
                && $item->type === PendingItemType::TurmaAwaitingConclusion,
        ));
        $this->assertFalse($pendencias->contains(
            fn ($item) => $item->entity_id === $concluded->id,
        ));
    }

    private function createApprovedQuote(Budget $budget, Course $course, int $sequence): Quote
    {
        return Quote::forceCreate([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => $sequence,
            'student_count' => 10,
            'value_uf' => '10.0000',
            'status' => 'approved',
            'approved_at' => CarbonImmutable::now(),
        ]);
    }

    private function createTurma(
        Quote $quote,
        Course $course,
        CarbonImmutable $startDate,
        CarbonImmutable $endDate,
        TurmaStatus $status = TurmaStatus::EmAndamento,
    ): Turma {
        return Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $course->id,
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'status' => $status,
        ]);
    }

    private function createDocument(Turma $turma, TurmaDocumentType $type): File
    {
        return File::create([
            'fileable_type' => 'turma',
            'fileable_id' => $turma->id,
            'type' => $type->value,
            'path' => "dashboard/{$turma->id}/{$type->value}.pdf",
            'original_name' => "{$type->value}.pdf",
            'mime' => 'application/pdf',
            'size' => 100,
        ]);
    }
}
