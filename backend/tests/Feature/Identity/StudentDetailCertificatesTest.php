<?php

namespace Tests\Feature\Identity;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * Os quatro ramos da célula de certificado no `GET /api/students/{id}`
 * (spec D7), mais o gate. A tela não compõe duas listas por `enrollment_id`:
 * o contrato vem embutido no `show` (spec D2).
 */
class StudentDetailCertificatesTest extends TestCase
{
    use RefreshDatabase;

    private IssuableEnrollmentBuilder $builder;

    private Enrollment $enrollment;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-24 12:00:00');
        $this->seed(RolePermissionSeeder::class);

        $this->builder = IssuableEnrollmentBuilder::make()->create();
        $this->enrollment = $this->builder->enrollmentModel();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    private function certificado(array $overrides = []): Certificate
    {
        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->builder->courseModel()->id,
            'redator_id' => $this->builder->redatorModel()->id,
            'codigo' => $overrides['codigo'] ?? 'LOT-2026-0001',
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
            'revocation_reason' => ($overrides['status'] ?? null) === CertificateStatus::Revocado ? 'Erro' : null,
        ]);
    }

    private function turmaDoAluno(): array
    {
        $studentId = $this->enrollment->student_id;

        return $this->actingAs($this->admin())
            ->getJson("/api/students/{$studentId}")
            ->assertOk()
            ->json('turmas.0');
    }

    /** Ramo 1: certificado presente, sem prazo — o caso comum. */
    public function test_certificado_sem_prazo_viaja_vigente_e_sem_data(): void
    {
        $this->certificado();

        $turma = $this->turmaDoAluno();

        $this->assertSame('LOT-2026-0001', $turma['certificate']['codigo']);
        $this->assertSame('vigente', $turma['certificate']['display_status']);
        $this->assertNull($turma['certificate']['valido_ate']);
        $this->assertTrue($turma['certificate']['snapshot_ok']);
        $this->assertSame(0, $turma['superseded_count']);
    }

    public function test_certificado_com_prazo_proximo_viaja_por_vencer_com_a_data(): void
    {
        $this->certificado(['valido_ate' => '2026-09-10']);

        $turma = $this->turmaDoAluno();

        $this->assertSame('por_vencer', $turma['certificate']['display_status']);
        $this->assertSame('2026-09-10', $turma['certificate']['valido_ate']);
    }

    public function test_certificado_revogado_nao_some_da_tela(): void
    {
        $this->certificado(['status' => CertificateStatus::Revocado, 'valido_ate' => '2099-01-01']);

        $turma = $this->turmaDoAluno();

        $this->assertSame('revocado', $turma['certificate']['display_status']);
    }

    /** Ramo 4: snapshot corrompido viaja marcado, sem derrubar a resposta. */
    public function test_snapshot_corrompido_viaja_marcado(): void
    {
        $certificate = $this->certificado();
        DB::table('certificates')->where('id', $certificate->id)->update([
            'snapshot' => json_encode(['aluno' => ['name' => '', 'rut' => '']]),
        ]);

        $turma = $this->turmaDoAluno();

        $this->assertFalse($turma['certificate']['snapshot_ok']);
    }

    /** Reemissão: a linha mostra o atual e conta os anteriores (spec D8). */
    public function test_reemissao_mostra_o_atual_e_conta_os_anteriores(): void
    {
        $revogado = $this->certificado(['codigo' => 'LOT-2026-0001', 'status' => CertificateStatus::Revocado]);
        $revogado->forceFill(['created_at' => Carbon::now()->subDay()])->save();
        $this->certificado(['codigo' => 'LOT-2026-0002']);

        $turma = $this->turmaDoAluno();

        $this->assertSame('LOT-2026-0002', $turma['certificate']['codigo']);
        $this->assertSame(1, $turma['superseded_count']);
    }

    /** Ramos 2 e 3 da célula: a ausência tem DOIS significados opostos, e a
     * distinção é o `approval_status` que a linha já traz — o payload não
     * inventa um campo para isso. */
    public function test_matricula_aprovada_sem_certificado_viaja_sem_certificado(): void
    {
        $turma = $this->turmaDoAluno();

        $this->assertNull($turma['certificate']);
        $this->assertSame(0, $turma['superseded_count']);
        $this->assertSame('aprobado', $turma['approval_status']);
    }

    public function test_matricula_reprovada_viaja_sem_certificado_e_com_o_estado(): void
    {
        $this->enrollment->update(['approval_status' => EnrollmentApprovalStatus::Reprobado]);

        $turma = $this->turmaDoAluno();

        $this->assertNull($turma['certificate']);
        $this->assertSame('reprobado', $turma['approval_status']);
    }

    /** O gate é o do `show`, herdado (spec D11): sem `identity.user.view`,
     * ninguém vê nem o aluno nem o certificado. */
    public function test_sem_identity_user_view_o_show_recusa(): void
    {
        $redator = User::factory()->create();
        $redator->assignRole('redator');

        $this->actingAs($redator)
            ->getJson("/api/students/{$this->enrollment->student_id}")
            ->assertForbidden();
    }

    /** A catraca do N+1 na ponta da API: o `show` custa o MESMO para um aluno
     * com 1 e com 10 matrículas certificadas. */
    public function test_o_show_nao_ganha_query_por_matricula(): void
    {
        $this->certificado();
        $studentId = $this->enrollment->student_id;
        $admin = $this->admin();

        // Aquece o cache de papéis/permissões do spatie/laravel-permission:
        // a PRIMEIRA requisição autenticada do processo paga 4 queries de
        // bootstrap (roles, permissions, pivots) que nada têm a ver com o
        // histórico de certificados — sem o aquecimento, a comparação abaixo
        // mediria esse custo fixo, não o N+1 que o teste existe para pegar.
        $this->actingAs($admin)->getJson("/api/students/{$studentId}")->assertOk();

        $comUma = $this->contarQueriesDoShow($admin, $studentId);

        for ($i = 0; $i < 9; $i++) {
            // Cada iteração materializa cliente, aluno e redator novos com
            // literais fixos e o índice único de `users.rut` recusa a
            // repetição (mesmo padrão de StudentCertificateHistoryTest).
            $outra = IssuableEnrollmentBuilder::make()
                ->client(['legal_name' => "Empresa {$i} SpA"], ['rut' => fake()->unique()->numerify('##.###.###-#')])
                ->student(['rut' => fake()->unique()->numerify('##.###.###-#')])
                ->redatorUser(['rut' => fake()->unique()->numerify('##.###.###-#')])
                ->create();
            $enrollment = $outra->enrollmentModel();
            $enrollment->update(['student_id' => $studentId]);
            Certificate::create([
                'uuid' => (string) Str::uuid(),
                'enrollment_id' => $enrollment->id,
                'course_id' => $outra->courseModel()->id,
                'redator_id' => $outra->redatorModel()->id,
                'codigo' => 'LOT-2026-'.(2000 + $i),
                'snapshot' => ['aluno' => ['name' => 'Juan Pérez', 'rut' => '12.345.678-5'], 'curso' => ['name' => 'AT', 'technical_name' => 'AT', 'workload_hours' => 8, 'modules' => []], 'turma' => ['start_date' => '2026-07-20', 'end_date' => '2026-07-24', 'modalidade' => 'online', 'local_aplicacao' => null], 'cliente' => ['name' => 'Empresa Legal SpA', 'rut' => '76.123.456-7'], 'redator' => ['name' => 'María Relatora', 'rut' => '9.876.543-3'], 'emision' => ['city' => 'Santiago', 'date' => '2026-07-25']],
                'valido_ate' => null,
                'status' => CertificateStatus::Emitido,
                'revoked_at' => null,
                'revocation_reason' => null,
            ]);
        }

        $comDez = $this->contarQueriesDoShow($admin, $studentId);

        $this->assertSame($comUma, $comDez, 'O `show` ganhou query por matrícula — o histórico voltou a ser resolvido em laço.');
    }

    private function contarQueriesDoShow(User $admin, int $studentId): int
    {
        $queries = 0;
        DB::listen(function () use (&$queries) {
            $queries++;
        });

        $this->actingAs($admin)->getJson("/api/students/{$studentId}")->assertOk();

        DB::flushQueryLog();

        return $queries;
    }
}
