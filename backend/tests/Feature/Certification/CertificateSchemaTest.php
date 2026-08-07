<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

class CertificateSchemaTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    private Course $course;

    private Enrollment $enrollment;

    private Redator $redator;

    protected function setUp(): void
    {
        parent::setUp();

        $client = $this->makeClientWithUser();
        $budget = Budget::create(['client_id' => $client->id, 'code' => 'Scap 1']);
        $this->course = $this->makeCourse();
        $quote = Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $this->course->id,
            'seq_in_budget' => 1,
            'student_count' => 1,
            'value_uf' => 10,
            'status' => 'approved',
        ]);
        $turma = Turma::create([
            'quote_id' => $quote->id,
            'course_id' => $this->course->id,
            'modalidade' => TurmaModalidade::Online,
            'local_aplicacao' => null,
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-10',
            'status' => TurmaStatus::Concluida,
        ]);
        $student = Student::create([
            'user_id' => User::factory()->create(['type' => 'aluno', 'is_active' => false])->id,
        ]);
        $this->enrollment = Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
        ]);
        $this->redator = Redator::create([
            'user_id' => User::factory()->redator()->create()->id,
        ]);
    }

    public function test_banco_recusa_segundo_certificado_vigente_da_mesma_matricula(): void
    {
        $this->createCertificate();

        $this->expectException(QueryException::class);

        // Insert direto: prova o índice do banco, sem Action ou validação PHP.
        Certificate::query()->getQuery()->insert([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-1001',
            'snapshot' => json_encode(['aluno' => ['name' => 'Juan']], JSON_THROW_ON_ERROR),
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido->value,
            'revoked_at' => null,
            'revocation_reason' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_certificado_revogado_libera_reemissao(): void
    {
        $first = $this->createCertificate();
        $first->update(['status' => CertificateStatus::Revocado]);

        $second = $this->createCertificate([
            'uuid' => (string) Str::uuid(),
            'codigo' => 'LOT-2026-1001',
        ]);

        $this->assertSame(CertificateStatus::Revocado, $first->fresh()->status);
        $this->assertSame(CertificateStatus::Emitido, $second->fresh()->status);
        $this->assertDatabaseCount('certificates', 2);
    }

    public function test_certificate_esta_registrado_no_morph_map(): void
    {
        $this->assertSame(Certificate::class, Relation::getMorphedModel('certificate'));
    }

    private function createCertificate(array $overrides = []): Certificate
    {
        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $this->enrollment->id,
            'course_id' => $this->course->id,
            'redator_id' => $this->redator->id,
            'codigo' => 'LOT-2026-1000',
            'snapshot' => ['aluno' => ['name' => 'Juan']],
            'valido_ate' => null,
            'status' => CertificateStatus::Emitido,
            'revoked_at' => null,
            'revocation_reason' => null,
            ...$overrides,
        ]);
    }
}
