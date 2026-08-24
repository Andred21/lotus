<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\StudentCertificateHistory;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class StudentCertificateHistoryTest extends TestCase
{
    use RefreshDatabase;

    private StudentCertificateHistory $history;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-24 12:00:00');
        $this->history = app(StudentCertificateHistory::class);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** Cria um certificado cru para a matrícula — sem passar pelas portas de
     * emissão, que recusariam o segundo. O histórico existe justamente para
     * enxergar o que a emissão já deixou para trás. */
    private function certificado(Enrollment $enrollment, array $overrides = []): Certificate
    {
        $turma = $enrollment->turma;

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $turma->course_id,
            'redator_id' => $overrides['redator_id'] ?? $this->redatorId,
            'codigo' => $overrides['codigo'] ?? 'LOT-2026-'.fake()->unique()->numberBetween(1000, 9999),
            'snapshot' => [
                'aluno' => ['name' => 'Juan Pérez', 'rut' => '12.345.678-5'],
                'curso' => ['name' => 'Alta Tensión', 'technical_name' => 'AT', 'workload_hours' => 16, 'modules' => []],
                'turma' => ['start_date' => '2026-07-20', 'end_date' => '2026-07-24', 'modalidade' => 'online', 'local_aplicacao' => null],
                'cliente' => ['name' => 'Empresa Legal SpA', 'rut' => '76.123.456-7'],
                'redator' => ['name' => 'María Relatora', 'rut' => '9.876.543-3'],
                'emision' => ['city' => 'Santiago', 'date' => '2026-07-25'],
            ],
            'valido_ate' => $overrides['valido_ate'] ?? null,
            'status' => $overrides['status'] ?? CertificateStatus::Emitido,
            'revoked_at' => ($overrides['status'] ?? null) === CertificateStatus::Revocado ? Carbon::now() : null,
            'revocation_reason' => ($overrides['status'] ?? null) === CertificateStatus::Revocado ? 'Erro de digitação' : null,
        ]);
    }

    private int $redatorId;

    private function matricula(): Enrollment
    {
        $builder = IssuableEnrollmentBuilder::make()->create();
        $this->redatorId = $builder->redatorModel()->id;

        return $builder->enrollmentModel();
    }

    public function test_matricula_sem_certificado_nao_aparece_na_colecao(): void
    {
        $enrollment = $this->matricula();

        $resumos = $this->history->forEnrollments([$enrollment->id]);

        $this->assertFalse($resumos->has($enrollment->id));
    }

    public function test_lista_vazia_nao_consulta_o_banco(): void
    {
        $queries = 0;
        DB::listen(function (QueryExecuted $query) use (&$queries) {
            $queries++;
        });

        $resumos = $this->history->forEnrollments([]);

        $this->assertTrue($resumos->isEmpty());
        $this->assertSame(0, $queries, 'Lista vazia não pode consultar o banco.');
    }

    /** Reemissão: o atual é o EMITIDO, não o mais recente por data. */
    public function test_o_atual_e_o_emitido_mesmo_com_revogado_mais_novo(): void
    {
        $enrollment = $this->matricula();
        $emitido = $this->certificado($enrollment, ['codigo' => 'LOT-2026-0001']);
        $revogado = $this->certificado($enrollment, ['codigo' => 'LOT-2026-0002', 'status' => CertificateStatus::Revocado]);
        $revogado->forceFill(['created_at' => Carbon::now()->addMinute()])->save();

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertSame($emitido->id, $resumo->id);
        $this->assertSame('LOT-2026-0001', $resumo->codigo);
        $this->assertSame(1, $resumo->supersededCount);
    }

    /** Sem nenhum emitido, o atual é o revogado mais RECENTE. */
    public function test_sem_emitido_o_atual_e_o_revogado_mais_recente(): void
    {
        $enrollment = $this->matricula();
        $antigo = $this->certificado($enrollment, ['codigo' => 'LOT-2026-0010', 'status' => CertificateStatus::Revocado]);
        $antigo->forceFill(['created_at' => Carbon::now()->subDay()])->save();
        $novo = $this->certificado($enrollment, ['codigo' => 'LOT-2026-0011', 'status' => CertificateStatus::Revocado]);

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertSame($novo->id, $resumo->id);
        $this->assertSame(CertificateDisplayStatus::Revocado, $resumo->displayStatus);
        $this->assertSame(1, $resumo->supersededCount);
    }

    public function test_certificado_unico_nao_tem_anteriores(): void
    {
        $enrollment = $this->matricula();
        $this->certificado($enrollment);

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertSame(0, $resumo->supersededCount);
        $this->assertNull($resumo->validoAte);
        $this->assertSame(CertificateDisplayStatus::Vigente, $resumo->displayStatus);
        $this->assertTrue($resumo->snapshotOk);
    }

    public function test_valido_ate_no_passado_vira_vencido(): void
    {
        $enrollment = $this->matricula();
        $this->certificado($enrollment, ['valido_ate' => '2026-08-23']);

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertSame('2026-08-23', $resumo->validoAte);
        $this->assertSame(CertificateDisplayStatus::Vencido, $resumo->displayStatus);
    }

    /** Snapshot corrompido não derruba o histórico: viaja marcado. */
    public function test_snapshot_corrompido_viaja_marcado(): void
    {
        $enrollment = $this->matricula();
        $certificate = $this->certificado($enrollment);
        DB::table('certificates')->where('id', $certificate->id)->update([
            'snapshot' => json_encode(['aluno' => ['name' => '', 'rut' => '']]),
        ]);

        $resumo = $this->history->forEnrollments([$enrollment->id])->get($enrollment->id);

        $this->assertFalse($resumo->snapshotOk);
    }

    /**
     * A catraca do N+1: DEZ matrículas, UMA query. Resolver por matrícula
     * devolveria o N+1 na tela que lista o histórico inteiro de turmas.
     */
    public function test_dez_matriculas_saem_em_uma_query(): void
    {
        $ids = [];
        for ($i = 0; $i < 10; $i++) {
            // Dez cadeias no MESMO teste: os RUTs default do builder são
            // literais fixos e o índice único de `users.rut` recusa a
            // repetição (mesmo padrão de EnrollmentArchiveEndpointTest).
            $builder = IssuableEnrollmentBuilder::make()
                ->client(['legal_name' => "Empresa {$i} SpA"], ['rut' => fake()->unique()->numerify('##.###.###-#')])
                ->student(['rut' => fake()->unique()->numerify('##.###.###-#')])
                ->redatorUser(['rut' => fake()->unique()->numerify('##.###.###-#')])
                ->create();
            $this->redatorId = $builder->redatorModel()->id;

            $enrollment = $builder->enrollmentModel();
            $this->certificado($enrollment);
            $ids[] = $enrollment->id;
        }

        $queries = 0;
        DB::listen(function (QueryExecuted $query) use (&$queries) {
            $queries++;
        });

        $resumos = $this->history->forEnrollments($ids);

        $this->assertCount(10, $resumos);
        $this->assertSame(1, $queries, 'O histórico de N matrículas tem de sair em UMA query.');
    }
}
