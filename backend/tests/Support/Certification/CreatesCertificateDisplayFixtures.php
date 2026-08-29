<?php

namespace Tests\Support\Certification;

use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Shared\Support\Rut;
use Illuminate\Support\Str;

/**
 * Fixture compartilhada entre `CertificateDisplayStatusParityTest` e
 * `CertificatePaginationTest` (decisão do João sobre o brief da Task 6, que
 * mandava copiar os ~40 linhas): um certificado emitível completo por
 * chamada, cada um com cadeia própria (RUT é `unique`), no molde de
 * `Tests\Support\CreatesDomainRecords`.
 */
trait CreatesCertificateDisplayFixtures
{
    private int $displayFixtureSeq = 0;

    private function certificado(CertificateStatus $status, ?string $validoAte): Certificate
    {
        $n = ++$this->displayFixtureSeq;
        $builder = IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => $this->rut(70000000 + $n)])
            ->course(['name' => "Curso {$n}"])
            ->student(['name' => "Alumno {$n}", 'rut' => $this->rut(16000000 + $n)])
            ->redatorUser(['rut' => $this->rut(15000000 + $n)])
            ->create();

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $builder->enrollmentModel()->id,
            'course_id' => $builder->courseModel()->id,
            'redator_id' => $builder->redatorModel()->id,
            'codigo' => 'LOT-2026-'.str_pad((string) (1000 + $n), 4, '0', STR_PAD_LEFT),
            'snapshot' => [
                'schema_version' => 2,
                'aluno' => ['name' => "Alumno {$n}", 'rut' => $this->rut(16000000 + $n)],
                'curso' => ['name' => "Curso {$n}"],
                'emissor' => ['name' => 'Lotus'],
            ],
            'valido_ate' => $validoAte,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? now() : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'teste' : null,
        ]);
    }

    /** RUT válido (módulo 11) a partir do número — nunca DV hardcoded. */
    private function rut(int $numero): string
    {
        foreach ([...range(0, 9), 'K'] as $dv) {
            $candidato = Rut::parse($numero.$dv);
            if ($candidato->isValid()) {
                return $candidato->format();
            }
        }

        throw new \RuntimeException("Sem DV válido para {$numero}.");
    }
}
