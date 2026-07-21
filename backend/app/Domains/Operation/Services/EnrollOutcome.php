<?php

namespace App\Domains\Operation\Services;

use App\Domains\Identity\Services\StudentResolution;
use App\Domains\Operation\Models\Enrollment;

final readonly class EnrollOutcome
{
    public function __construct(
        public Enrollment $enrollment,
        public StudentResolution $resolution,
        public bool $alreadyEnrolled,
    ) {}
}
