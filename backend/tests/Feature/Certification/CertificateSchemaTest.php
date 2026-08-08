<?php

namespace Tests\Feature\Certification;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

class CertificateSchemaTest extends TestCase
{
    use RefreshDatabase;

    private Course $course;

    private Enrollment $enrollment;

    private Redator $redator;

    protected function setUp(): void
    {
        parent::setUp();

        $builder = IssuableEnrollmentBuilder::make()->create();
        $this->course = $builder->courseModel();
        $this->enrollment = $builder->enrollmentModel();
        $this->redator = $builder->redatorModel();
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
