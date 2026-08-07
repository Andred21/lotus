<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Catalog\Models\CourseCertificateTemplate;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Certification\Services\CertificateSnapshotBuilder;
use App\Domains\Certification\Services\CertificateTemplateResolver;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CertificateSnapshotTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Client $client;

    private Budget $budget;

    private Quote $quote;

    private Course $course;

    private CourseCertificateTemplate $template;

    private Turma $turma;

    private Enrollment $enrollment;

    private Redator $redator;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 14:30:00');
        // Valores DIFERENTES do default de `config/app.php`: com os mesmos,
        // trocar o `config()` do builder por literais mantinha a suíte verde e
        // a origem configurável do emissor ficava sem guarda (R-3).
        config([
            'app.certificate_issuer.name' => 'OTEC Configurada SpA',
            'app.certificate_issuer.rut' => '76.900.900-9',
        ]);

        $this->client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Legal SpA'],
            ['name' => 'Empresa Cliente', 'rut' => '76.123.456-7'],
        );
        $this->budget = Budget::create([
            'client_id' => $this->client->id,
            'code' => 'Scap 1',
        ]);
        $this->course = $this->makeCourse([
            'name' => 'Seguridad en Alta Tensión',
            'technical_name' => 'Operación Segura AT',
            'workload_hours' => 16,
            'description' => 'abordó las responsabilidades del Jefe de Faena en la seguridad eléctrica.',
        ]);
        $this->course->modules()->createMany([
            [
                'sort_order' => 2,
                'name' => '2. Definiciones Clave',
                'contents' => "Tipos de Tierras\nZona de Trabajo",
            ],
            [
                'sort_order' => 1,
                'name' => '1. Introducción y Marco General',
                'contents' => 'Objetivos de seguridad y prevención de riesgos',
            ],
        ]);
        $this->template = CourseCertificateTemplate::create([
            'course_id' => $this->course->id,
            'version' => 2,
            'layout_config' => [
                'orientation' => 'landscape',
                'city' => 'Valparaíso',
            ],
            'validity_months' => null,
        ]);
        $this->quote = Quote::create([
            'budget_id' => $this->budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => 1,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $this->turma = Turma::create([
            'quote_id' => $this->quote->id,
            'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Presencial,
            'local_aplicacao' => 'Santiago',
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => TurmaStatus::Concluida,
        ]);

        $student = Student::create([
            'user_id' => User::factory()->aluno()->create([
                'name' => 'Juan Pérez',
                'rut' => '12.345.678-5',
            ])->id,
            'current_client_id' => $this->client->id,
        ]);
        $this->enrollment = Enrollment::create([
            'turma_id' => $this->turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.2],
            'attendance_pct' => '87.50',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
        $this->redator = Redator::create([
            'user_id' => User::factory()->redator()->create([
                'name' => 'María Relatora',
                'rut' => '9.876.543-3',
            ])->id,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /**
     * A cidade vem do resolver de propósito, não de um literal: é a mesma
     * fonte que a emissão e o `issuable` consultam, e um literal aqui deixaria
     * o teste passar enquanto a regra real divergisse.
     */
    private function emissionCity(): string
    {
        return app(CertificateTemplateResolver::class)->emissionCityFor(
            $this->turma->fresh(),
            $this->template,
        );
    }

    public function test_snapshot_tem_exatamente_as_chaves_e_valores_dos_models(): void
    {
        $snapshot = app(CertificateSnapshotBuilder::class)->build(
            $this->enrollment,
            $this->redator,
            $this->template,
            now(),
            $this->emissionCity(),
        );

        $this->assertSame([
            'schema_version' => 2,
            'aluno' => ['name' => 'Juan Pérez', 'rut' => '12.345.678-5'],
            'curso' => [
                'name' => 'Seguridad en Alta Tensión',
                'technical_name' => 'Operación Segura AT',
                'workload_hours' => 16,
                // Narrativa e temário do documento oficial (D-P9). Os módulos
                // saem por `sort_order`, não pela ordem de criação — a fixture
                // os cria fora de ordem de propósito.
                'description' => 'abordó las responsabilidades del Jefe de Faena en la seguridad eléctrica.',
                'modules' => [
                    [
                        'sort_order' => 1,
                        'name' => '1. Introducción y Marco General',
                        'contents' => 'Objetivos de seguridad y prevención de riesgos',
                    ],
                    [
                        'sort_order' => 2,
                        'name' => '2. Definiciones Clave',
                        'contents' => "Tipos de Tierras\nZona de Trabajo",
                    ],
                ],
            ],
            'turma' => [
                'id' => $this->turma->id,
                'start_date' => '2026-07-20',
                'end_date' => '2026-07-24',
                'modalidade' => 'presencial',
            ],
            'cliente' => ['name' => 'Empresa Legal SpA', 'rut' => '76.123.456-7'],
            'emissor' => ['name' => 'OTEC Configurada SpA', 'rut' => '76.900.900-9'],
            'redator' => ['name' => 'María Relatora', 'rut' => '9.876.543-3'],
            'resultado' => [
                'grades' => ['final' => 6.2],
                'approval_status' => 'aprobado',
                'attendance_pct' => '87.50',
            ],
            // Do `layout_config` só a `city` tem consumidor desde o D-P9, e é
            // ela que congela nomeada (B2). Snapshot da versão 1 guardava o
            // JSON inteiro, e a leitura aceita as duas formas.
            'template' => [
                'version' => 2,
                'city' => 'Valparaíso',
            ],
            'ciudad_emision' => 'Santiago',
            'emitido_em' => '2026-08-05',
        ], $snapshot->toArray());
    }

    public function test_snapshot_persistido_nao_muda_quando_curso_e_renomeado_depois(): void
    {
        $snapshot = app(CertificateSnapshotBuilder::class)->build(
            $this->enrollment,
            $this->redator,
            $this->template,
            now(),
            $this->emissionCity(),
        );
        $certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => $snapshot,
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);

        $this->course->update(['name' => 'Nombre Alterado Después']);

        $reloaded = Certificate::query()->findOrFail($certificate->id);

        $this->assertSame('Nombre Alterado Después', $this->course->fresh()->name);
        $this->assertSame('Seguridad en Alta Tensión', $reloaded->snapshot->curso->name);
        $this->assertEquals($snapshot->toArray(), $reloaded->snapshot->toArray());
    }

    public function test_datas_do_snapshot_sao_strings_em_y_m_d(): void
    {
        $snapshot = app(CertificateSnapshotBuilder::class)->build(
            $this->enrollment,
            $this->redator,
            $this->template,
            now(),
            $this->emissionCity(),
        );

        $this->assertSame('2026-07-20', $snapshot->turma->start_date);
        $this->assertSame('2026-07-24', $snapshot->turma->end_date);
        $this->assertSame('2026-08-05', $snapshot->emitido_em);
        $this->assertIsString($snapshot->turma->start_date);
        $this->assertIsString($snapshot->turma->end_date);
        $this->assertIsString($snapshot->emitido_em);
    }

    public function test_cliente_com_user_e_caminho_arquivados_ainda_resolve_o_nome(): void
    {
        $clientUserId = $this->client->user->id;

        $this->turma->delete();
        $this->budget->delete();
        $this->client->delete();

        $this->assertSoftDeleted('turmas', ['id' => $this->turma->id]);
        $this->assertSoftDeleted('quotes', ['id' => $this->quote->id]);
        $this->assertSoftDeleted('budgets', ['id' => $this->budget->id]);
        $this->assertSoftDeleted('clients', ['id' => $this->client->id]);
        $this->assertSoftDeleted('users', ['id' => $clientUserId]);

        $freshEnrollment = Enrollment::query()->findOrFail($this->enrollment->id);
        $snapshot = app(CertificateSnapshotBuilder::class)->build(
            $freshEnrollment,
            $this->redator->fresh(),
            $this->template,
            now(),
            $this->emissionCity(),
        );

        $this->assertSame('Empresa Legal SpA', $snapshot->cliente->name);
        $this->assertSame('76.123.456-7', $snapshot->cliente->rut);
    }

    public function test_template_persistido_nao_muda_quando_template_e_editado_e_arquivado(): void
    {
        $snapshot = app(CertificateSnapshotBuilder::class)->build(
            $this->enrollment,
            $this->redator,
            $this->template,
            now(),
            $this->emissionCity(),
        );
        $certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => $snapshot,
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);

        $this->template->update([
            'version' => 3,
            'layout_config' => ['orientation' => 'portrait', 'city' => 'Temuco'],
        ]);
        $this->template->delete();

        $reloaded = Certificate::query()->findOrFail($certificate->id);

        $this->assertSoftDeleted('course_certificate_templates', ['id' => $this->template->id]);
        $this->assertSame(2, $reloaded->snapshot->template->version);
        $this->assertSame('Valparaíso', $reloaded->snapshot->template->city);
        $this->assertEquals($snapshot->toArray(), $reloaded->snapshot->toArray());
    }

    public function test_turma_online_usa_cidade_fixa_do_template_e_nao_endereco_do_cliente(): void
    {
        $this->client->addresses()->create([
            'city' => 'Ciudad del Cliente',
            'is_primary' => true,
        ]);
        $this->turma->update([
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
        ]);

        $snapshot = app(CertificateSnapshotBuilder::class)->build(
            $this->enrollment->fresh(),
            $this->redator,
            $this->template,
            now(),
            $this->emissionCity(),
        );

        $this->assertSame('Valparaíso', $snapshot->ciudad_emision);
        $this->assertNotSame('Ciudad del Cliente', $snapshot->ciudad_emision);
    }

    /**
     * Mesma promessa da D12 que `test_template_persistido_…` faz pelo template:
     * o temário impresso na página 2 é o do dia da emissão. Curso reescrito ou
     * módulo arquivado depois não pode reescrever certificado já assinado.
     */
    public function test_temario_e_narrativa_persistidos_nao_mudam_quando_o_curso_e_reescrito(): void
    {
        $snapshot = app(CertificateSnapshotBuilder::class)->build(
            $this->enrollment,
            $this->redator,
            $this->template,
            now(),
            $this->emissionCity(),
        );
        $certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => $snapshot,
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);

        $this->course->update(['description' => 'Narrativa reescrita después.']);
        $this->course->modules()->where('sort_order', 1)->update(['name' => 'Módulo renombrado']);
        $this->course->modules()->where('sort_order', 2)->first()->delete();

        $reloaded = Certificate::query()->findOrFail($certificate->id);

        $this->assertCount(1, $this->course->fresh()->modules);
        $this->assertSame(
            'abordó las responsabilidades del Jefe de Faena en la seguridad eléctrica.',
            $reloaded->snapshot->curso->description,
        );
        $this->assertCount(2, $reloaded->snapshot->curso->modules);
        $this->assertSame(
            '1. Introducción y Marco General',
            $reloaded->snapshot->curso->modules[0]->name,
        );
        $this->assertEquals($snapshot->toArray(), $reloaded->snapshot->toArray());
    }

    public function test_curso_sem_descricao_e_sem_modulos_congela_nulo_e_lista_vazia(): void
    {
        $this->course->update(['description' => null]);
        $this->course->modules()->get()->each(fn ($module) => $module->delete());

        $snapshot = app(CertificateSnapshotBuilder::class)->build(
            $this->enrollment->fresh(),
            $this->redator,
            $this->template,
            now(),
            $this->emissionCity(),
        );

        $this->assertNull($snapshot->curso->description);
        $this->assertSame([], $snapshot->curso->modules);
    }

    public function test_notas_e_presenca_nulas_permanecem_nulas_no_snapshot(): void
    {
        $this->enrollment->update([
            'grades' => null,
            'attendance_pct' => null,
        ]);

        $snapshot = app(CertificateSnapshotBuilder::class)->build(
            $this->enrollment->fresh(),
            $this->redator,
            $this->template,
            now(),
            $this->emissionCity(),
        );

        $this->assertNull($snapshot->resultado->grades);
        $this->assertNull($snapshot->resultado->attendance_pct);
    }

    /**
     * O snapshot é congelado no ato da emissão e não se reescreve depois —
     * nem de raspão. O cast de objeto entrava no cache de casts do Eloquent, e
     * `save()` de QUALQUER campo devolvia o DTO pela `set()`: bastava ler o
     * documento e revogar o certificado para o JSON histórico ser reserializado
     * na forma de hoje, perdendo `template.layout_config`, ganhando o `emissor`
     * da config atual e saindo com `schema_version` errado.
     */
    public function test_salvar_outro_campo_depois_de_ler_o_snapshot_nao_reescreve_o_documento(): void
    {
        $certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-2000',
            'snapshot' => [],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);

        // Um documento da versão 1, com a forma que o banco guardava antes de
        // o tipo existir: sem `schema_version`, sem `emissor`, com o
        // `layout_config` inteiro dentro de `template`.
        $congelado = json_encode([
            'aluno' => ['name' => 'Juan Histórico', 'rut' => '12.345.678-5'],
            'curso' => ['name' => 'Curso Histórico', 'workload_hours' => 8],
            'turma' => ['id' => 1, 'start_date' => '2026-01-05', 'end_date' => '2026-01-09'],
            'cliente' => ['name' => 'Empresa Histórica SpA', 'rut' => '76.123.456-7'],
            'redator' => ['name' => 'María Histórica', 'rut' => '11.111.111-1'],
            'resultado' => ['grades' => ['final' => 6.2], 'approval_status' => 'aprobado'],
            'template' => ['version' => 1, 'layout_config' => ['city' => 'Arica']],
            'ciudad_emision' => 'Arica',
            'emitido_em' => '2026-01-09',
        ], JSON_UNESCAPED_UNICODE);
        DB::table('certificates')->where('id', $certificate->id)->update(['snapshot' => $congelado]);

        $reloaded = Certificate::query()->findOrFail($certificate->id);
        $this->assertSame('Juan Histórico', $reloaded->snapshot->aluno->name);

        $reloaded->update(['revocation_reason' => 'Emitido por engano']);

        $this->assertSame(
            $congelado,
            (string) DB::table('certificates')->where('id', $certificate->id)->value('snapshot'),
        );
    }
}
