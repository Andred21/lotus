<?php

namespace App\Domains\Certification\Data;

use App\Domains\Operation\Models\Enrollment;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class IssuableEnrollmentData extends Data
{
    public function __construct(
        public int $enrollment_id,
        public string $student_name,
        public string $student_rut,
    ) {}

    public static function fromModel(Enrollment $enrollment): self
    {
        return new self(
            enrollment_id: $enrollment->id,
            student_name: $enrollment->student->user->name,
            student_rut: $enrollment->student->user->rut,
        );
    }
}
