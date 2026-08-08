<?php

namespace App\Domains\Operation\Services;

use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Models\Enrollment;

/**
 * O resultado acadêmico com dono (B6). Aprovação é DECLARADA pelo admin
 * (decisão do João, 2026-08-07) — este VO tipa forma, não inventa regra de
 * corte. Vive em Services porque é a camada pública da Regra A: o
 * CertificateSnapshotBuilder (Certification) o consome por type-hint.
 */
final readonly class AcademicResult
{
    public function __construct(
        public ?array $grades,
        public ?string $attendancePct,
        public EnrollmentApprovalStatus $approvalStatus,
    ) {}

    public static function fromEnrollment(Enrollment $enrollment): self
    {
        return new self(
            grades: $enrollment->grades,
            attendancePct: $enrollment->attendance_pct,
            approvalStatus: $enrollment->approval_status,
        );
    }
}
