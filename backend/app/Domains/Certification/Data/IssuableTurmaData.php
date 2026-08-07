<?php

namespace App\Domains\Certification\Data;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class IssuableTurmaData extends Data
{
    public function __construct(
        public int $turma_id,
        public string $course_name,
        public string $client_name,
        public string $end_date,
        /** @var array<IssuableEnrollmentData> */
        public array $enrollments,
        /** @var array<IssuableRedatorData> */
        public array $redatores,
    ) {}

    public static function fromModel(Turma $turma): self
    {
        return new self(
            turma_id: $turma->id,
            course_name: $turma->course->name,
            client_name: $turma->quote->budget->client->legal_name,
            end_date: $turma->end_date->toDateString(),
            enrollments: $turma->enrollments
                ->map(fn (Enrollment $enrollment) => IssuableEnrollmentData::fromModel($enrollment))
                ->all(),
            redatores: $turma->redatores
                ->map(fn (Redator $redator) => IssuableRedatorData::fromModel($redator))
                ->all(),
        );
    }
}
