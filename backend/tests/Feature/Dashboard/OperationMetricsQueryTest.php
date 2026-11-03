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
use App\Domains\Operation\Enums\TurmaDisplayStatus;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaRequirement;
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

        // `iniciadas` é novo (bloco 54): overdue + ending_soon + in_progress =
        // 1 + 1 + 0. A `startingSoon` (começa em +2 dias) conta em `em_andamento`
        // (o total do funil, 3) mas não em `iniciadas`.
        $this->assertSame([
            'em_andamento' => 3,
            'iniciadas' => 2,
            'encerrando' => 1,
            'atrasadas' => 1,
            'conclusoes_por_confirmar' => 1,
        ], $query->kpis());

        $agenda = $query->agenda()->toArray();
        $this->assertSame([$startingSoon->id], array_column($agenda['starting_soon'], 'turma_id'));
        $this->assertSame([$endingSoon->id], array_column($agenda['ending_soon'], 'turma_id'));
        // Baldes disjuntos (bloco 54): a `endingSoon` deixou de aparecer também
        // em `in_progress`, que agora guarda só as em curso SEM fim próximo.
        $this->assertSame([], array_column($agenda['in_progress'], 'turma_id'));
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
            // Desde a D-57 o DTO carrega o enum, e `toArray()` o preserva. Quem
            // devolve o código ao contrato é o `json_encode` na borda, e a borda
            // é medida onde ela existe — `DashboardEndpointTest`, no
            // `test_compliance_do_admin_publica_os_tipos_como_codigo_do_enum`.
            // Este teste é do serviço e para no serviço.
            'present_types' => [TurmaDocumentType::MANUAL],
            'missing_types' => [TurmaDocumentType::PRUEBAS, TurmaDocumentType::EVALUACION_REDATOR],
            'missing_requirements' => [TurmaRequirement::Redator],
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

    public function test_turma_dez_dias_a_frente_esta_na_agenda_e_no_total(): void
    {
        [$budget, $course] = $this->cenarioBase();

        $futura = $this->createTurma(
            $this->createApprovedQuote($budget, $course, 1),
            $course,
            CarbonImmutable::today()->addDays(10),
            CarbonImmutable::today()->addDays(12),
        );

        $query = app(OperationMetricsQuery::class);

        $this->assertSame([$futura->id], array_column($query->agenda()->toArray()['starting_soon'], 'turma_id'));
        $kpis = $query->kpis();
        $this->assertSame(1, $kpis['em_andamento']);
        $this->assertSame(0, $kpis['iniciadas']);
    }

    public function test_kpis_sao_o_tamanho_dos_baldes(): void
    {
        [$budget, $course] = $this->cenarioBase();
        $hoje = CarbonImmutable::today();

        $this->createTurma($this->createApprovedQuote($budget, $course, 1), $course, $hoje->subDays(10), $hoje->subDay());
        $this->createTurma($this->createApprovedQuote($budget, $course, 2), $course, $hoje->subDays(2), $hoje->addDays(3));
        $this->createTurma($this->createApprovedQuote($budget, $course, 3), $course, $hoje->subDays(2), $hoje->addDays(30));
        $this->createTurma($this->createApprovedQuote($budget, $course, 4), $course, $hoje->addDays(10), $hoje->addDays(12));

        $query = app(OperationMetricsQuery::class);
        $kpis = $query->kpis();
        $agenda = $query->agenda()->toArray();

        $this->assertSame(count($agenda['ending_soon']), $kpis['encerrando']);
        $this->assertSame(count($agenda['overdue']), $kpis['atrasadas']);
        $this->assertSame(
            count($agenda['overdue']) + count($agenda['ending_soon']) + count($agenda['in_progress']),
            $kpis['iniciadas'],
        );
        $this->assertSame(3, $kpis['iniciadas']);
        $this->assertSame(4, $kpis['em_andamento']);

        $ids = array_merge(...array_map(
            fn (string $balde): array => array_column($agenda[$balde], 'turma_id'),
            ['overdue', 'starting_soon', 'ending_soon', 'in_progress'],
        ));
        $this->assertCount(4, $ids);
        $this->assertSame($ids, array_values(array_unique($ids)), 'Nenhuma turma pode estar em dois baldes.');
    }

    public function test_conclusoes_por_confirmar_e_o_display_status_habilitada(): void
    {
        [$budget, $course] = $this->cenarioBase();
        $hoje = CarbonImmutable::today();
        $redatorUser = User::create([
            'name' => 'Redator Habilitada',
            'rut' => '12.345.678-5',
            'email' => 'redator-habilitada@example.test',
            'password' => 'secret',
            'type' => 'redator',
            'is_active' => true,
        ]);
        $redator = Redator::create(['user_id' => $redatorUser->id]);

        $habilitada = $this->createTurma($this->createApprovedQuote($budget, $course, 1), $course, $hoje->subDays(2), $hoje->addDays(3));
        $habilitada->redatores()->attach($redator->id);
        foreach (TurmaDocumentType::cases() as $type) {
            $this->createDocument($habilitada, $type);
        }
        $this->createTurma($this->createApprovedQuote($budget, $course, 2), $course, $hoje->subDays(2), $hoje->addDays(3));

        $porConfirmar = app(OperationMetricsQuery::class)->kpis()['conclusoes_por_confirmar'];

        $this->assertSame(1, $porConfirmar);
        $this->assertSame(
            Turma::query()->whereDisplayStatus(TurmaDisplayStatus::Habilitada)->count(),
            $porConfirmar,
        );
    }

    public function test_turma_concluida_nao_entra_em_agenda_nem_kpi(): void
    {
        [$budget, $course] = $this->cenarioBase();
        $hoje = CarbonImmutable::today();

        $redatorUser = User::create([
            'name' => 'Redator Concluida',
            'rut' => '12.345.678-5',
            'email' => 'redator-concluida@example.test',
            'password' => 'secret',
            'type' => 'redator',
            'is_active' => true,
        ]);
        $redator = Redator::create(['user_id' => $redatorUser->id]);

        // Documentação completa e redator: se o status `concluida` não a
        // tirasse da conta, ela seria a "habilitada" que o KPI de conclusões
        // por confirmar procura. Sem documentos nem redator o zero sairia de
        // qualquer jeito, e o teste não provaria nada sobre o status.
        $concluida = $this->createTurma(
            $this->createApprovedQuote($budget, $course, 1),
            $course,
            $hoje->addDays(5),
            $hoje->addDays(8),
            TurmaStatus::Concluida,
        );
        $concluida->redatores()->attach($redator->id);
        foreach (TurmaDocumentType::cases() as $type) {
            $this->createDocument($concluida, $type);
        }

        $query = app(OperationMetricsQuery::class);

        $this->assertSame([], $query->agenda()->toArray()['starting_soon']);
        $this->assertSame([
            'em_andamento' => 0,
            'iniciadas' => 0,
            'encerrando' => 0,
            'atrasadas' => 0,
            'conclusoes_por_confirmar' => 0,
        ], $query->kpis());
    }

    public function test_compliance_lista_requisitos_faltantes(): void
    {
        [$budget, $course] = $this->cenarioBase();
        $hoje = CarbonImmutable::today();

        $presencial = $this->createTurma($this->createApprovedQuote($budget, $course, 1), $course, $hoje->subDays(2), $hoje->addDays(3));
        $presencial->update(['modalidade' => 'presencial', 'local_aplicacao' => '   ']);
        foreach (TurmaDocumentType::cases() as $type) {
            $this->createDocument($presencial, $type);
        }

        $linhas = app(OperationMetricsQuery::class)->complianceTurmas();

        $this->assertCount(1, $linhas);
        $this->assertSame([], $linhas[0]->missing_types);
        $this->assertSame(
            [TurmaRequirement::Redator, TurmaRequirement::LocalAplicacao],
            $linhas[0]->missing_requirements,
        );
        $this->assertFalse($linhas[0]->habilitada);
    }

    public function test_pendencias_sinalizam_presencial_sem_local(): void
    {
        [$budget, $course] = $this->cenarioBase();
        $hoje = CarbonImmutable::today();

        $presencial = $this->createTurma($this->createApprovedQuote($budget, $course, 1), $course, $hoje->subDays(2), $hoje->addDays(3));
        $presencial->update(['modalidade' => 'presencial', 'local_aplicacao' => '   ']);
        $online = $this->createTurma($this->createApprovedQuote($budget, $course, 2), $course, $hoje->subDays(2), $hoje->addDays(3));
        $online->update(['modalidade' => 'online', 'local_aplicacao' => null]);

        $itens = array_values(array_filter(
            app(OperationMetricsQuery::class)->pendencias(),
            fn ($item): bool => $item->type === PendingItemType::TurmaPresencialWithoutLocal,
        ));

        $this->assertCount(1, $itens);
        $this->assertSame($presencial->id, $itens[0]->entity_id);
        $this->assertSame($presencial->start_date->toDateString(), $itens[0]->date);
        $this->assertSame(['turma_id' => $presencial->id], $itens[0]->navigation);
    }

    /** @return array{0: Budget, 1: Course} */
    private function cenarioBase(): array
    {
        $clientUser = User::create([
            'name' => 'Cliente Base',
            'rut' => '76.543.210-3',
            'email' => 'cliente-base@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);
        $client = Client::create([
            'user_id' => $clientUser->id,
            'legal_name' => 'Cliente Base SpA',
            'type' => 'client',
        ]);
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap Base']);
        $course = Course::create(['name' => 'Curso Base', 'workload_hours' => 16]);

        return [$budget, $course];
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
