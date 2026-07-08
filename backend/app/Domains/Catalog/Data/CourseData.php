<?php

namespace App\Domains\Catalog\Data;

use App\Domains\Catalog\Models\Course;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do cadastro de curso. Curso NÃO tem valor (preço vive na cotação).
 * `redator_ids` é read-only (exibe habilitação); a edição da habilitação é por
 * endpoint dedicado, não por este DTO.
 */
#[TypeScript]
class CourseData extends Data
{
    public function __construct(
        public int|Optional $id,
        #[Required]
        public string $name,
        public string|Optional|null $technical_name = null,
        public string|Optional|null $description = null,
        #[Required]
        public int $workload_hours = 0,
        /** @var array<CertificateTemplateData> */
        #[DataCollectionOf(CertificateTemplateData::class)]
        public array $templates = [],
        /** @var array<int> */
        public array $redator_ids = [],
    ) {}

    /**
     * Hidrata o DTO do model. `redator_ids` vem do pivot de habilitação.
     */
    public static function fromModel(Course $course): self
    {
        return new self(
            id: $course->id,
            name: $course->name,
            technical_name: $course->technical_name,
            description: $course->description,
            workload_hours: $course->workload_hours,
            templates: CertificateTemplateData::collect($course->certificateTemplates->all()),
            redator_ids: $course->redatores->pluck('id')->all(),
        );
    }
}
