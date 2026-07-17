<?php

namespace App\Domains\Catalog\Data;

use App\Domains\Catalog\Models\CourseModule;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Módulo do curso (nested de CourseData). `sort_order` NÃO é entrada: a Action
 * deriva do índice do array. `total_hours` é derivado — não existe coluna.
 */
#[TypeScript]
class CourseModuleData extends Data
{
    public function __construct(
        public int|Optional $id,
        #[Required]
        public string $name,
        public string|Optional|null $learnings = null,
        public string|Optional|null $contents = null,
        #[Min(0)]
        public int $theory_hours = 0,
        #[Min(0)]
        public int $practice_hours = 0,
        public int|Optional $sort_order = new Optional,
        public int|Optional $total_hours = new Optional,
    ) {}

    public static function fromModel(CourseModule $module): self
    {
        return new self(
            id: $module->id,
            name: $module->name,
            learnings: $module->learnings,
            contents: $module->contents,
            theory_hours: $module->theory_hours,
            practice_hours: $module->practice_hours,
            sort_order: $module->sort_order,
            total_hours: $module->theory_hours + $module->practice_hours,
        );
    }
}
