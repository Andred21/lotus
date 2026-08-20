<?php

namespace App\Domains\Catalog\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Composição, não extensão: `CourseData` NÃO muda (spec D8). Gêmeo de
 * `ArchivedClientData`.
 */
#[TypeScript]
class ArchivedCourseData extends Data
{
    public function __construct(
        public CourseData $course,
        public string $archived_at,
        /** `null` quando a audit `deleted` não tem usuário (seeder, console). */
        public ?string $archived_by,
    ) {}
}
