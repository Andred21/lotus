<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
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
use Illuminate\Support\Str;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class PublicCertificateTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Certificate $certificate;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-08-05 14:30:00');

        $client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Legal SpA'],
            ['name' => 'Empresa Cliente', 'rut' => '76.123.456-7'],
        );
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $course = $this->makeCourse([
            'name' => 'Curso Vivo',
            'technical_name' => 'Nombre técnico vivo',
            'workload_hours' => 8,
        ]);
        $quote = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => 1,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $course->id,
            'modalidade' => TurmaModalidade::Presencial,
            'local_aplicacao' => 'Santiago',
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => TurmaStatus::Concluida,
        ]);
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create()->id,
            'current_client_id' => $client->id,
        ]);
        $enrollment = Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
        $redator = Redator::create([
            'user_id' => User::factory()->redator()->create()->id,
        ]);

        $this->certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $course->id,
            'redator_id' => $redator->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => [
                'aluno' => [
                    'id' => 501,
                    'name' => 'Juan Pérez',
                    'rut' => '12.345.678-5',
                ],
                'curso' => [
                    'id' => 502,
                    'name' => 'Seguridad en Alta Tensión',
                    'technical_name' => 'Operación Segura AT',
                    'workload_hours' => 16,
                ],
                'turma' => [
                    'id' => 503,
                    'start_date' => '2026-07-20',
                    'end_date' => '2026-07-24',
                    'modalidade' => 'presencial',
                ],
                'cliente' => [
                    'id' => 504,
                    'name' => 'Empresa Cliente',
                    'rut' => '76.123.456-7',
                ],
                'redator' => [
                    'id' => 505,
                    'name' => 'María Relatora',
                    'rut' => '9.876.543-3',
                ],
                'resultado' => [
                    'grades' => ['final' => 6.2],
                    'approval_status' => 'aprobado',
                    'attendance_pct' => '87.50',
                ],
                'template' => [
                    'version' => 2,
                    'layout_config' => ['city' => 'Santiago'],
                ],
                'ciudad_emision' => 'Santiago',
                'emitido_em' => '2026-08-05',
            ],
            'valido_ate' => '2027-08-05',
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_uuid_valido_devolve_payload_publico_sem_autenticacao(): void
    {
        $this->getJson($this->publicUrl())
            ->assertOk()
            ->assertExactJson([
                'codigo' => 'LOT-2026-1000',
                'status' => 'emitido',
                'valido_ate' => '2027-08-05',
                'revoked_at' => null,
                'aluno' => ['name' => 'Juan Pérez'],
                'curso' => [
                    'name' => 'Seguridad en Alta Tensión',
                    'workload_hours' => 16,
                ],
                'turma' => ['end_date' => '2026-07-24'],
                'cliente' => ['name' => 'Empresa Cliente'],
                'redator' => ['name' => 'María Relatora'],
            ]);
    }

    public function test_uuid_inexistente_retorna_404(): void
    {
        $this->getJson('/api/publico/certificados/'.Str::uuid())
            ->assertNotFound();
    }

    public function test_certificado_revogado_continua_publico_com_status_e_data(): void
    {
        $this->certificate->update([
            'status' => CertificateStatus::Revocado,
            'revoked_at' => now(),
            'revocation_reason' => 'Documento emitido con datos incorrectos.',
        ]);

        $this->getJson($this->publicUrl())
            ->assertOk()
            ->assertJsonPath('status', 'revocado')
            ->assertJsonPath('revoked_at', '2026-08-05T14:30:00.000000Z');
    }

    public function test_payload_publico_nao_expoe_ruts_ids_ou_notas(): void
    {
        $response = $this->getJson($this->publicUrl())->assertOk();

        $response
            ->assertJsonMissingPath('id')
            ->assertJsonMissingPath('uuid')
            ->assertJsonMissingPath('enrollment_id')
            ->assertJsonMissingPath('course_id')
            ->assertJsonMissingPath('redator_id')
            ->assertJsonMissingPath('aluno.id')
            ->assertJsonMissingPath('aluno.rut')
            ->assertJsonMissingPath('curso.id')
            ->assertJsonMissingPath('turma.id')
            ->assertJsonMissingPath('cliente.id')
            ->assertJsonMissingPath('cliente.rut')
            ->assertJsonMissingPath('redator.id')
            ->assertJsonMissingPath('redator.rut')
            ->assertJsonMissingPath('resultado')
            ->assertJsonMissingPath('resultado.grades')
            ->assertJsonMissingPath('grades')
            ->assertJsonMissingPath('snapshot')
            ->assertJsonMissingPath('revocation_reason');
    }

    /**
     * Esta rota é o que o fiscalizador abre pelo QR. A leitura do snapshot é
     * tolerante de propósito — campo que nasceu depois pode faltar —, mas
     * tolerância não pode virar um 200 dizendo `status: emitido` com o nome do
     * aluno em branco. Sem o que nomear, o documento não se apresenta.
     */
    public function test_snapshot_sem_o_nome_do_aluno_nao_e_apresentado_como_valido(): void
    {
        $snapshot = json_decode((string) $this->certificate->getRawOriginal('snapshot'), true);
        $snapshot['aluno']['name'] = '';
        $this->certificate->update(['snapshot' => $snapshot]);

        $response = $this->getJson($this->publicUrl());

        $response->assertStatus(500);
        $this->assertNotSame('emitido', $response->json('status'));
    }

    private function publicUrl(): string
    {
        return "/api/publico/certificados/{$this->certificate->uuid}";
    }
}
