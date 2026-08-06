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
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CertificatePdfTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Certificate $certificate;

    protected function setUp(): void
    {
        parent::setUp();

        $client = $this->makeClientWithUser(
            ['legal_name' => 'Empresa Viva SpA'],
            ['name' => 'Empresa Viva'],
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
            'local_aplicacao' => 'Ciudad viva',
            'start_date' => '2026-07-20',
            'end_date' => '2026-07-24',
            'status' => TurmaStatus::Concluida,
        ]);
        $student = Student::create([
            'user_id' => User::factory()->aluno()->create(['name' => 'Alumno Vivo'])->id,
            'current_client_id' => $client->id,
        ]);
        $enrollment = Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 4.0],
            'attendance_pct' => '50.00',
            'approval_status' => EnrollmentApprovalStatus::Aprobado,
        ]);
        $redator = Redator::create([
            'user_id' => User::factory()->redator()->create(['name' => 'Relator Vivo'])->id,
        ]);

        $this->certificate = Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $course->id,
            'redator_id' => $redator->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => [
                'aluno' => ['name' => 'Juan Pérez Congelado', 'rut' => '12.345.678-5'],
                'curso' => [
                    'name' => 'Seguridad Congelada',
                    'technical_name' => 'Operación Segura AT',
                    'workload_hours' => 16,
                ],
                'turma' => [
                    'id' => $turma->id,
                    'start_date' => '2026-07-20',
                    'end_date' => '2026-07-24',
                    'modalidade' => 'presencial',
                ],
                'cliente' => ['name' => 'Empresa Congelada', 'rut' => '76.123.456-7'],
                'redator' => ['name' => 'María Relatora Congelada', 'rut' => '9.876.543-3'],
                'resultado' => [
                    'grades' => null,
                    'approval_status' => 'aprobado',
                    'attendance_pct' => null,
                ],
                'template' => [
                    'version' => 2,
                    'layout_config' => [
                        'orientation' => 'landscape',
                        'city' => 'Valparaíso',
                    ],
                ],
                'ciudad_emision' => 'Santiago',
                'emitido_em' => '2026-08-05',
            ],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
    }

    public function test_pdf_devolve_conteudo_do_gotenberg(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $response = $this->get($this->pdfUrl());

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader(
                'Content-Disposition',
                'inline; filename="certificado-LOT-2026-1000.pdf"',
            );
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_html_usa_snapshot_e_omite_nota_e_presenca_nulas(): void
    {
        $this->actingAsAdmin();
        $this->fakeGotenberg();

        $this->get($this->pdfUrl())->assertOk();

        Http::assertSent(function (Request $request): bool {
            $body = (string) $request->body();

            return str_contains($body, 'LOT-2026-1000')
                && str_contains($body, 'Juan Pérez Congelado')
                && str_contains($body, 'Seguridad Congelada')
                && ! str_contains($body, 'Alumno Vivo')
                && ! str_contains($body, 'Curso Vivo')
                && ! str_contains($body, 'Nota final:')
                && ! str_contains($body, 'Asistencia:');
        });
    }

    public function test_qr_aponta_para_frontend_url_e_uuid(): void
    {
        $this->actingAsAdmin();
        config(['app.frontend_url' => 'https://frontend.example.test/base/']);
        $this->fakeGotenberg();
        $expectedUrl = "https://frontend.example.test/base/validar/{$this->certificate->uuid}";
        $expectedQr = base64_encode((string) QrCode::format('svg')
            ->size(180)
            ->margin(0)
            ->generate($expectedUrl));

        $this->get($this->pdfUrl())->assertOk();

        Http::assertSent(fn (Request $request): bool => str_contains(
            (string) $request->body(),
            "data:image/svg+xml;base64,{$expectedQr}",
        ));
    }

    public function test_gotenberg_fora_do_ar_retorna_500(): void
    {
        $this->actingAsAdmin();
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('boom', 503)]);

        $this->getJson($this->pdfUrl())->assertStatus(500);
    }

    public function test_pdf_exige_permissao_de_visualizacao(): void
    {
        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $this->actingAs($user, 'web');
        Http::preventStrayRequests();

        $this->getJson($this->pdfUrl())->assertForbidden();

        Http::assertNothingSent();
    }

    private function fakeGotenberg(): void
    {
        Http::preventStrayRequests();
        Http::fake(['*/forms/chromium/convert/html' => Http::response('%PDF-fake')]);
    }

    private function pdfUrl(): string
    {
        return "/api/certificates/{$this->certificate->id}/pdf";
    }
}
