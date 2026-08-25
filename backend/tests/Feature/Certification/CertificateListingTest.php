<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Data\CertificateData;
use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\Support\CreatesCertificateTemplates;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CertificateListingTest extends TestCase
{
    use CreatesCertificateTemplates;
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Client $client;

    private Budget $budget;

    private Course $course;

    private Turma $turma;

    private Enrollment $enrollment;

    private Redator $redator;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 10:00:00');

        $builder = IssuableEnrollmentBuilder::make()->create();
        $this->client = $builder->clientModel();
        $this->course = $builder->courseModel();
        $this->turma = $builder->turmaModel();
        $this->enrollment = $builder->enrollmentModel();
        $this->redator = $builder->redatorModel();
        $this->budget = $this->turma->quote->budget;
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_index_lista_certificados_por_created_at_decrescente(): void
    {
        $this->actingAsAdmin();
        $older = $this->createCertificate(CertificateStatus::Revocado, 'LOT-2026-1000');

        Carbon::setTestNow('2026-08-05 11:00:00');
        $newer = $this->createCertificate(CertificateStatus::Emitido, 'LOT-2026-1001');

        $this->getJson('/api/certificates')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.id', $newer->id)
            ->assertJsonPath('1.id', $older->id);
    }

    public function test_show_devolve_o_snapshot_persistido(): void
    {
        $this->actingAsAdmin();
        $certificate = $this->createCertificate(
            CertificateStatus::Emitido,
            'LOT-2026-1000',
            [
                'aluno' => ['name' => 'Nombre Congelado'],
                'curso' => ['name' => 'Seguridad en Alta Tensión'],
            ],
        );

        $this->getJson("/api/certificates/{$certificate->id}")
            ->assertOk()
            ->assertJsonPath('id', $certificate->id)
            ->assertJsonPath('codigo', 'LOT-2026-1000')
            ->assertJsonPath('snapshot.aluno.name', 'Nombre Congelado');
    }

    /**
     * A listagem é a exceção deliberada ao "falhar alto": um registro
     * corrompido não pode derrubar a tabela inteira de quem só quer ver o
     * histórico. Ela marca a linha e segue.
     */
    public function test_index_marca_o_snapshot_corrompido_sem_derrubar_a_listagem(): void
    {
        $this->actingAsAdmin();
        // O são é o REVOGADO porque `active_enrollment_id` só admite um emitido
        // por matrícula: dois emitidos aqui colidem no índice antes de a
        // listagem responder. Quem interessa manter emitido é o corrompido.
        $sao = $this->createCertificate(CertificateStatus::Revocado, 'LOT-2026-1000');

        Carbon::setTestNow('2026-08-05 11:00:00');
        $corrompido = $this->createCertificate(
            CertificateStatus::Emitido,
            'LOT-2026-1001',
            [
                'aluno' => ['name' => ''],
                'curso' => ['name' => 'Seguridad en Alta Tensión'],
            ],
        );

        // Terceira linha REVOGADA E corrompida: sem ela, `status` seria um proxy
        // perfeito de `snapshot_ok` neste cenário, e um `snapshot_ok` derivado
        // do status — fonte inteiramente errada — passaria verde. Com ela,
        // `Revocado` mapeia para os DOIS valores e só o snapshot decide.
        //
        // E o campo que falta aqui é o `curso.name`, não o `aluno.name`: a
        // política obrigatória tem TRÊS campos e cada um precisa de quem o
        // mate. `aluno.name` já tem três testes; `emissor.name` tem o
        // `CertificatePdfTest::test_documento_da_versao_2_sem_emissor_recusa_
        // em_vez_de_usar_a_config`; `curso.name` não tinha nenhum, e removê-lo
        // da lista de obrigatórios deixava a suíte inteira verde.
        Carbon::setTestNow('2026-08-05 12:00:00');
        $revogadoCorrompido = $this->createCertificate(
            CertificateStatus::Revocado,
            'LOT-2026-1002',
            [
                'aluno' => ['name' => 'Ana Torres'],
                'curso' => ['name' => ''],
            ],
        );

        $this->getJson('/api/certificates')
            ->assertOk()
            ->assertJsonCount(3)
            ->assertJsonPath('0.id', $revogadoCorrompido->id)
            ->assertJsonPath('0.status', 'revocado')
            ->assertJsonPath('0.snapshot_ok', false)
            ->assertJsonPath('1.id', $corrompido->id)
            ->assertJsonPath('1.status', 'emitido')
            ->assertJsonPath('1.snapshot_ok', false)
            ->assertJsonPath('2.id', $sao->id)
            ->assertJsonPath('2.status', 'revocado')
            ->assertJsonPath('2.snapshot_ok', true);
    }

    /**
     * `show` alimenta a tela de detalhe do certificado. Devolver 200 com
     * `aluno.name: ""` ali é a mesma prova falsa que a rota pública e o PDF já
     * recusam — documento de peso legal não atesta o que não sabe.
     */
    public function test_show_de_snapshot_corrompido_falha_alto(): void
    {
        $this->actingAsAdmin();
        $certificate = $this->createCertificate(
            CertificateStatus::Emitido,
            'LOT-2026-1002',
            [
                'aluno' => ['name' => ''],
                'curso' => ['name' => 'Seguridad en Alta Tensión'],
            ],
        );

        $this->getJson("/api/certificates/{$certificate->id}")
            ->assertStatus(500)
            ->assertHeader('content-type', 'application/problem+json')
            // O `detail` é o produto da recusa, não um enfeite dela: é o que o
            // `CertificateViewDialog` imprime no `AppErrorState` quando o
            // suporte clica em Ver na linha marcada (D8). Sem esta asserção,
            // trocar o texto por um genérico — ou passar o `uuid` no lugar do
            // `codigo` ao gate — fica verde.
            ->assertJsonPath(
                'detail',
                'El certificado LOT-2026-1002 no puede presentarse: su documento congelado no tiene los campos aluno.name.',
            );
    }

    /**
     * A recusa tem de nomear o certificado e o campo **em produção**, que é
     * onde o suporte a lê. `ProblemDetails` troca o `detail` de todo 500 por
     * um genérico quando `app.debug` é falso, e nem a suíte nem o e2e do gate
     * viam isso: o `.env` do projeto tem `APP_DEBUG=true` e não existe
     * `.env.testing`. Com o debug ligado, a D8 se prova num caminho que a
     * produção não percorre.
     */
    public function test_o_detalhe_da_recusa_sobrevive_ao_debug_desligado(): void
    {
        config(['app.debug' => false]);
        $this->actingAsAdmin();
        $certificate = $this->createCertificate(
            CertificateStatus::Emitido,
            'LOT-2026-1003',
            [
                'aluno' => ['name' => ''],
                'curso' => ['name' => ''],
            ],
        );

        $this->getJson("/api/certificates/{$certificate->id}")
            ->assertStatus(500)
            ->assertJsonPath(
                'detail',
                'El certificado LOT-2026-1003 no puede presentarse: su documento congelado no tiene los campos aluno.name, curso.name.',
            );
    }

    /**
     * O painel de emissão é a projeção de LISTAGEM: toda turma concluída
     * aparece, com todos os alunos — aprovado, reprovado e pendente — e o
     * `emission_blocked` diz por que a emissão recusaria. Turma em andamento
     * não é assunto dele (porta 1 / RN-08).
     */
    public function test_panel_lista_turma_concluida_com_todos_os_alunos(): void
    {
        $this->actingAsAdmin();

        $emAndamento = $this->createTurma(TurmaStatus::EmAndamento, 2);
        $this->createEnrollment(
            $emAndamento,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno En Curso',
            '11.111.111-1',
        );

        $reprobado = $this->createEnrollment(
            $this->turma,
            EnrollmentApprovalStatus::Reprobado,
            'Alumno Reprobado',
            '22.222.222-2',
        );
        $pendiente = $this->createEnrollment(
            $this->turma,
            EnrollmentApprovalStatus::Pendiente,
            'Alumno Pendiente',
            '33.333.333-3',
        );

        // A vigência sai do template MAIS NOVO do curso: o setUp cria a v1 com
        // `validity_months` null, então 24 só aparece se a v2 vencer.
        $this->makeTemplate($this->course->id, [
            'version' => 2,
            'layout_config' => ['city' => 'Santiago'],
            'validity_months' => 24,
        ]);

        $this->getJson('/api/certificates/emission-panel')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonStructure(['*' => [
                'turma_id', 'course_name', 'client_name', 'end_date',
                'template_validity_months', 'emission_blocked',
                'enrollments' => ['*' => [
                    'enrollment_id', 'student_name', 'student_rut',
                    'approval_status', 'attendance_pct', 'nota_final', 'certificate',
                ]],
                'redatores' => ['*' => ['redator_id', 'name']],
            ]])
            ->assertJsonPath('0.turma_id', $this->turma->id)
            ->assertJsonPath('0.course_name', 'Seguridad en Alta Tensión')
            ->assertJsonPath('0.client_name', 'Empresa Legal SpA')
            ->assertJsonPath('0.end_date', '2026-07-24')
            ->assertJsonPath('0.template_validity_months', 24)
            ->assertJsonPath('0.emission_blocked', null)
            ->assertJsonCount(3, '0.enrollments')
            // Alunos em ordem de NOME, não de inserção: 'Alumno Pendiente' <
            // 'Alumno Reprobado' < 'Juan Pérez'. É a ordem que a tabela da tela
            // lê, e sem ORDER BY ela mudava entre dois requests.
            ->assertJsonPath('0.enrollments.0.enrollment_id', $pendiente->id)
            ->assertJsonPath('0.enrollments.0.approval_status', 'pendiente')
            ->assertJsonPath('0.enrollments.1.enrollment_id', $reprobado->id)
            ->assertJsonPath('0.enrollments.1.approval_status', 'reprobado')
            ->assertJsonPath('0.enrollments.2.enrollment_id', $this->enrollment->id)
            ->assertJsonPath('0.enrollments.2.student_name', 'Juan Pérez')
            ->assertJsonPath('0.enrollments.2.student_rut', '12.345.678-5')
            ->assertJsonPath('0.enrollments.2.approval_status', 'aprobado')
            ->assertJsonPath('0.enrollments.2.nota_final', '6.2')
            ->assertJsonPath('0.enrollments.2.attendance_pct', '87.50')
            ->assertJsonPath('0.enrollments.2.certificate', null)
            ->assertJsonPath('0.redatores.0.redator_id', $this->redator->id)
            ->assertJsonPath('0.redatores.0.name', 'María Relatora');
    }

    /**
     * A matrícula não some do painel quando ganha certificado: ela passa a
     * exibir o VIGENTE, e a revogação zera o campo de volta — que é como o
     * admin vê que pode reemitir.
     */
    public function test_panel_expoe_o_certificado_vigente_e_o_zera_depois_da_revogacao(): void
    {
        $this->actingAsSuperadmin();

        $this->getJson('/api/certificates/emission-panel')
            ->assertOk()
            ->assertJsonPath('0.enrollments.0.certificate', null);

        $emitido = $this->postJson(
            "/api/enrollments/{$this->enrollment->id}/certificate",
            ['redator_id' => $this->redator->id],
        )
            ->assertCreated()
            ->json();

        $this->getJson('/api/certificates/emission-panel')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.enrollments.0.enrollment_id', $this->enrollment->id)
            ->assertJsonPath('0.enrollments.0.certificate.id', $emitido['id'])
            ->assertJsonPath('0.enrollments.0.certificate.codigo', $emitido['codigo'])
            ->assertJsonPath('0.enrollments.0.certificate.status', 'emitido');

        $this->postJson("/api/certificates/{$emitido['id']}/revoke", [
            'reason' => 'Error en los datos del documento.',
        ])->assertOk();

        $this->getJson('/api/certificates/emission-panel')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonStructure(['*' => ['enrollments' => ['*' => ['certificate']]]])
            ->assertJsonPath('0.enrollments.0.enrollment_id', $this->enrollment->id)
            ->assertJsonPath('0.enrollments.0.certificate', null);
    }

    /**
     * Os certificados vigentes se resolvem UMA vez por chamada. Resolvê-los por
     * turma (ou por matrícula) devolve o N+1 numa tela que lista o histórico
     * inteiro de turmas concluídas.
     *
     * O cenário precisa de DUAS turmas e TRÊS matrículas: o custo do N+1 é
     * proporcional ao tamanho do cenário, e com uma turma de uma matrícula
     * `assertSame(1, ...)` passaria também numa implementação que consultasse
     * por turma ou por matrícula — a guarda não morderia nada.
     */
    public function test_panel_consulta_os_certificados_vigentes_uma_vez_so(): void
    {
        $this->actingAsSuperadmin();

        $this->createEnrollment(
            $this->turma,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno Dos',
            '22.222.222-2',
        );
        $segundaTurma = $this->createTurma(TurmaStatus::Concluida, 2, null, '2026-07-25');
        $segundaTurma->redatores()->attach($this->redator);
        $this->createEnrollment(
            $segundaTurma,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno Tres',
            '33.333.333-3',
        );

        $consultas = 0;
        DB::listen(function (QueryExecuted $query) use (&$consultas): void {
            if (str_contains($query->sql, 'from "certificates"')) {
                $consultas++;
            }
        });

        $this->getJson('/api/certificates/emission-panel')->assertOk()->assertJsonCount(2);

        $this->assertSame(1, $consultas);
    }

    public function test_panel_sem_permissao_de_emissao_retorna_403(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $viewer = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $viewer->givePermissionTo('certification.certificate.view');
        $this->actingAs($viewer, 'web');

        $this->getJson('/api/certificates/emission-panel')->assertForbidden();
    }

    /**
     * D-P3: a turma sem template APARECE bloqueada, não some. Ocultá-la deixava
     * o admin sem nada para clicar e sem nada para ler — falha visível ganha de
     * turma escondida.
     */
    public function test_panel_mostra_turma_sem_template_bloqueada(): void
    {
        $this->actingAsAdmin();
        $courseWithoutTemplate = $this->makeCourse(['name' => 'Curso sin plantilla']);
        $turmaWithoutTemplate = $this->createTurma(
            TurmaStatus::Concluida,
            2,
            $courseWithoutTemplate,
            '2026-07-25',
        );
        // O redator entra para que só a porta do TEMPLATE fique fechada: com
        // duas fechadas, `sin_plantilla` continuaria saindo por precedência e o
        // cenário deixaria de provar qual porta o painel reportou.
        $turmaWithoutTemplate->redatores()->attach($this->redator);
        $matricula = $this->createEnrollment(
            $turmaWithoutTemplate,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno sin plantilla',
            '33.333.333-3',
        );

        $this->getJson('/api/certificates/emission-panel')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.turma_id', $turmaWithoutTemplate->id)
            ->assertJsonPath('0.emission_blocked', 'sin_plantilla')
            ->assertJsonPath('0.template_validity_months', null)
            ->assertJsonPath('0.enrollments.0.enrollment_id', $matricula->id)
            ->assertJsonPath('1.turma_id', $this->turma->id)
            ->assertJsonPath('1.emission_blocked', null);
    }

    public function test_panel_mostra_turma_online_sem_cidade_bloqueada(): void
    {
        $this->actingAsAdmin();
        $courseOnline = $this->makeCourse(['name' => 'Curso online sin ciudad']);
        $this->makeTemplate($courseOnline->id, [
            'version' => 1,
            'layout_config' => [],
            'validity_months' => null,
        ]);
        $turmaOnline = $this->createTurma(TurmaStatus::Concluida, 2, $courseOnline, '2026-07-25');
        $turmaOnline->update([
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
        ]);
        $turmaOnline->redatores()->attach($this->redator);
        $this->createEnrollment(
            $turmaOnline,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno sin ciudad',
            '44.444.444-4',
        );

        $this->getJson('/api/certificates/emission-panel')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.turma_id', $turmaOnline->id)
            ->assertJsonPath('0.emission_blocked', 'plantilla_sin_ciudad')
            ->assertJsonPath('1.turma_id', $this->turma->id)
            ->assertJsonPath('1.emission_blocked', null);
    }

    public function test_panel_mostra_turma_sem_redator_bloqueada(): void
    {
        $this->actingAsAdmin();
        $turmaSemRedator = $this->createTurma(TurmaStatus::Concluida, 3, null, '2026-07-25');
        $this->createEnrollment(
            $turmaSemRedator,
            EnrollmentApprovalStatus::Aprobado,
            'Alumno sin relator',
            '55.555.555-5',
        );

        $this->getJson('/api/certificates/emission-panel')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.turma_id', $turmaSemRedator->id)
            ->assertJsonPath('0.emission_blocked', 'sin_redactor')
            ->assertJsonPath('1.turma_id', $this->turma->id)
            ->assertJsonPath('1.emission_blocked', null);
    }

    private function createTurma(
        TurmaStatus $status,
        int $seq,
        ?Course $course = null,
        string $endDate = '2026-07-24',
    ): Turma {
        $course ??= $this->course;
        $quote = Quote::forceCreate([
            'budget_id' => $this->budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => $seq,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);

        return Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial,
            'local_aplicacao' => 'Santiago',
            'start_date' => '2026-07-20',
            'end_date' => $endDate,
            'status' => $status,
        ]);
    }

    private function createEnrollment(
        Turma $turma,
        EnrollmentApprovalStatus $status,
        string $name,
        string $rut,
    ): Enrollment {
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
                'name' => $name,
                'rut' => $rut,
            ])->id,
            'current_client_id' => $this->client->id,
        ]);

        return Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.2],
            'attendance_pct' => '87.50',
            'approval_status' => $status,
        ]);
    }

    /** @param array<string, mixed> $snapshot */
    private function createCertificate(
        CertificateStatus $status,
        string $codigo,
        array $snapshot = [
            'aluno' => ['name' => 'Juan Pérez'],
            'curso' => ['name' => 'Seguridad en Alta Tensión'],
        ],
    ): Certificate {
        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => $codigo,
            'snapshot' => $snapshot,
            'valido_ate' => null,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'Documento reemplazado.' : null,
        ]);
    }

    /** O estado derivado é do BACKEND (spec D4): o React não o reconstrói. */
    public function test_a_listagem_traz_o_estado_derivado(): void
    {
        $certificate = $this->createCertificate(CertificateStatus::Emitido, 'LOT-2026-7001');

        $payload = CertificateData::fromModel($certificate->loadListingData());

        $this->assertSame(CertificateDisplayStatus::Vigente, $payload->display_status);
    }

    /** Peso legal: revogado NUNCA volta a parecer vigente por conta da data. */
    public function test_o_estado_derivado_respeita_a_precedencia_da_revogacao(): void
    {
        $certificate = $this->createCertificate(CertificateStatus::Revocado, 'LOT-2026-7002');
        $certificate->update(['valido_ate' => '2099-01-01']);

        $payload = CertificateData::fromModel($certificate->fresh()->loadListingData());

        $this->assertSame(CertificateDisplayStatus::Revocado, $payload->display_status);
    }
}
