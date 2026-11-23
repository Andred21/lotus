<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Catalog\Models\Course;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Enums\PendingItemType;
use App\Domains\Dashboard\Services\OperationMetricsQuery;
use App\Domains\Dashboard\Services\RedatorScopeQuery;
use App\Domains\Dashboard\Support\CorteDeEvaluaciones;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * As evaluaciones do cliente e dos alunos são opcionais (D-60): faltar uma é
 * AVISO nos dashboards, nunca pendência. O aviso vale para a turma em andamento
 * e para a concluída depois do corte (`CorteDeEvaluaciones`) — a anterior ao
 * corte nasceu sem a regra e não é cobrada.
 */
class EvaluacionesAvisoDashboardTest extends TestCase
{
    use RefreshDatabase;

    private Budget $budget;

    private Course $course;

    private Redator $redator;

    private Redator $outro;

    private int $quoteSequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-12-10 12:00:00');

        $clientUser = User::create([
            'name' => 'Cliente Aviso',
            'rut' => '76.543.210-3',
            'email' => 'cliente-aviso@example.test',
            'password' => 'secret',
            'type' => 'cliente',
            'is_active' => false,
        ]);
        $client = Client::create([
            'user_id' => $clientUser->id,
            'legal_name' => 'Cliente Aviso SpA',
            'type' => 'client',
        ]);
        $this->budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap Aviso']);
        $this->course = Course::create(['name' => 'Curso Aviso', 'workload_hours' => 16]);
        $this->redator = $this->createRedator('A', '12.345.678-5');
        $this->outro = $this->createRedator('B', '11111111-1');
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_compliance_inclui_concluida_apos_o_corte_com_aviso(): void
    {
        $concluida = $this->concluida(CorteDeEvaluaciones::inicio()->addDay(), [
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ]);
        // Segunda concluída: o `preventLazyLoading` só marca a instância vinda
        // de um hydrate com mais de uma linha.
        $outra = $this->concluida(CorteDeEvaluaciones::inicio()->addDays(2), [
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
            TurmaDocumentType::EVALUACION_CLIENTE,
        ]);

        $linhas = collect(app(OperationMetricsQuery::class)->complianceTurmas())->keyBy('turma_id');

        $this->assertCount(2, $linhas);
        $linha = $linhas->get($concluida->id);
        $this->assertTrue($linha->concluded);
        $this->assertFalse($linha->habilitada);
        $this->assertSame([], $linha->missing_types);
        $this->assertSame(
            [TurmaDocumentType::EVALUACION_CLIENTE, TurmaDocumentType::EVALUACION_ALUNO],
            $linha->missing_optional_types,
        );
        $this->assertSame(
            [TurmaDocumentType::EVALUACION_ALUNO],
            $linhas->get($outra->id)->missing_optional_types,
        );
    }

    public function test_compliance_ignora_concluida_antes_do_corte(): void
    {
        $this->concluida(CorteDeEvaluaciones::inicio()->subDay(), [
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ]);
        $this->concluida(CorteDeEvaluaciones::inicio()->subDays(5), []);

        $this->assertSame([], app(OperationMetricsQuery::class)->complianceTurmas());
    }

    public function test_compliance_ignora_concluida_sem_aviso(): void
    {
        $this->concluida(CorteDeEvaluaciones::inicio()->addDay(), TurmaDocumentType::cases());
        $this->concluida(CorteDeEvaluaciones::inicio()->addDays(2), TurmaDocumentType::cases());

        $this->assertSame([], app(OperationMetricsQuery::class)->complianceTurmas());
    }

    public function test_compliance_marca_em_andamento_como_nao_concluida_e_traz_o_aviso(): void
    {
        $andamento = $this->emAndamento([
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ]);

        $linha = app(OperationMetricsQuery::class)->complianceTurmas()[0];

        $this->assertSame($andamento->id, $linha->turma_id);
        $this->assertFalse($linha->concluded);
        $this->assertSame(
            [TurmaDocumentType::EVALUACION_CLIENTE, TurmaDocumentType::EVALUACION_ALUNO],
            $linha->missing_optional_types,
        );
    }

    public function test_pendencias_admin_nao_gera_docs_incomplete_por_aviso(): void
    {
        $andamento = $this->emAndamento([
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ]);
        $this->emAndamento([
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ]);
        $this->concluida(CorteDeEvaluaciones::inicio()->addDay(), [
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ]);

        $pendencias = collect(app(OperationMetricsQuery::class)->pendencias());

        $this->assertTrue($pendencias->contains(
            fn ($item) => $item->entity_id === $andamento->id
                && $item->type === PendingItemType::TurmaAwaitingConclusion,
        ));
        $this->assertFalse($pendencias->contains(
            fn ($item) => $item->type === PendingItemType::TurmaDocsIncomplete,
        ));
        // A concluída com aviso aparece na seção de compliance, não na lista de pendências.
        $this->assertCount(2, $pendencias);
    }

    public function test_redator_ve_so_alumnos_como_aviso(): void
    {
        $this->emAndamento([
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ], $this->redator);
        $this->emAndamento([
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
            TurmaDocumentType::EVALUACION_ALUNO,
        ], $this->redator);

        $linhas = app(RedatorScopeQuery::class)->pendenciasDocumentais($this->redator);

        $this->assertCount(1, $linhas);
        $this->assertSame([], $linhas[0]->missing_types);
        $this->assertSame([TurmaDocumentType::EVALUACION_ALUNO], $linhas[0]->missing_optional_types);
    }

    public function test_kpi_pendencias_documentais_conta_so_bloqueantes(): void
    {
        $soAviso = $this->emAndamento([
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ], $this->redator);
        $bloqueada = $this->emAndamento([TurmaDocumentType::MANUAL], $this->redator);

        $query = app(RedatorScopeQuery::class);

        $this->assertEqualsCanonicalizing(
            [$soAviso->id, $bloqueada->id],
            array_column($query->pendenciasDocumentais($this->redator), 'turma_id'),
        );
        $this->assertSame(1, $query->resumo($this->redator)->pendencias_documentais);
    }

    public function test_kpi_nao_conta_turma_so_com_aviso(): void
    {
        $soAviso = $this->emAndamento([
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ], $this->redator);

        $query = app(RedatorScopeQuery::class);

        $this->assertSame(
            [$soAviso->id],
            array_column($query->pendenciasDocumentais($this->redator), 'turma_id'),
        );
        $this->assertSame(0, $query->resumo($this->redator)->pendencias_documentais);
    }

    public function test_redator_concluida_apos_o_corte_sem_alumnos_aparece(): void
    {
        $semAlumnos = $this->concluida(CorteDeEvaluaciones::inicio()->addDay(), [
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
            TurmaDocumentType::EVALUACION_CLIENTE,
        ], $this->redator);
        $completa = $this->concluida(CorteDeEvaluaciones::inicio()->addDay(), TurmaDocumentType::cases(), $this->redator);
        $antesDoCorte = $this->concluida(CorteDeEvaluaciones::inicio()->subDay(), [
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ], $this->redator);

        $query = app(RedatorScopeQuery::class);
        $linhas = collect($query->pendenciasDocumentais($this->redator))->keyBy('turma_id');

        $this->assertSame([$semAlumnos->id], $linhas->keys()->all());
        $this->assertNotContains($completa->id, $linhas->keys()->all());
        $this->assertNotContains($antesDoCorte->id, $linhas->keys()->all());
        $this->assertSame([], $linhas->get($semAlumnos->id)->missing_types);
        $this->assertSame(
            [TurmaDocumentType::EVALUACION_ALUNO],
            $linhas->get($semAlumnos->id)->missing_optional_types,
        );
        // Concluída com aviso não é pendência: o número do KPI não sobe.
        $this->assertSame(0, $query->resumo($this->redator)->pendencias_documentais);
    }

    public function test_redator_nao_ve_turma_alheia(): void
    {
        $this->emAndamento([TurmaDocumentType::MANUAL], $this->outro);
        $this->concluida(CorteDeEvaluaciones::inicio()->addDay(), [
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ], $this->outro);
        $minha = $this->concluida(CorteDeEvaluaciones::inicio()->addDay(), [
            TurmaDocumentType::MANUAL,
            TurmaDocumentType::EVALUACION_REDATOR,
        ], $this->redator);

        $linhas = app(RedatorScopeQuery::class)->pendenciasDocumentais($this->redator);

        $this->assertSame([$minha->id], array_column($linhas, 'turma_id'));
    }

    public function test_corte_comeca_no_inicio_do_dia_do_negocio(): void
    {
        $this->assertSame(
            CarbonImmutable::parse(CorteDeEvaluaciones::DESDE.' 00:00:00', 'America/Santiago')->getTimestamp(),
            CorteDeEvaluaciones::inicio()->getTimestamp(),
        );
    }

    /**
     * @param  array<TurmaDocumentType>  $docs
     */
    private function emAndamento(array $docs, ?Redator $redator = null): Turma
    {
        return $this->criar(TurmaStatus::EmAndamento, null, $docs, $redator);
    }

    /**
     * @param  array<TurmaDocumentType>  $docs
     */
    private function concluida(CarbonImmutable $concluidaEm, array $docs, ?Redator $redator = null): Turma
    {
        return $this->criar(TurmaStatus::Concluida, $concluidaEm, $docs, $redator);
    }

    /**
     * @param  array<TurmaDocumentType>  $docs
     */
    private function criar(TurmaStatus $status, ?CarbonImmutable $concluidaEm, array $docs, ?Redator $redator): Turma
    {
        $quote = Quote::forceCreate([
            'budget_id' => $this->budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => ++$this->quoteSequence,
            'student_count' => 10,
            'value_uf' => '10.0000',
            'status' => 'approved',
            'approved_at' => CarbonImmutable::now(),
        ]);
        $hoje = CarbonImmutable::today();

        $turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $this->course->id,
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => $hoje->subDays(2)->toDateString(),
            'end_date' => $hoje->addDays(3)->toDateString(),
            'status' => $status,
        ]);
        // `concluded_at` não é fillable: só o `ConcludeTurmaAction` o escreve.
        $turma->forceFill(['concluded_at' => $concluidaEm])->save();

        // Todo cenário tem redator: turma sem redator seria `missing_requirements`
        // e ruído para o que este teste mede.
        $turma->redatores()->attach(($redator ?? $this->redator)->id);

        foreach ($docs as $type) {
            File::create([
                'fileable_type' => 'turma',
                'fileable_id' => $turma->id,
                'type' => $type->value,
                'path' => "dashboard/aviso/{$turma->id}/{$type->value}.pdf",
                'original_name' => "{$type->value}.pdf",
                'mime' => 'application/pdf',
                'size' => 100,
            ]);
        }

        return $turma;
    }

    private function createRedator(string $sufixo, string $rut): Redator
    {
        $user = User::create([
            'name' => "Redator Aviso {$sufixo}",
            'rut' => $rut,
            'email' => 'redator-aviso-'.strtolower($sufixo).'@example.test',
            'password' => 'secret',
            'type' => 'redator',
            'is_active' => true,
        ]);

        return Redator::create(['user_id' => $user->id]);
    }
}
