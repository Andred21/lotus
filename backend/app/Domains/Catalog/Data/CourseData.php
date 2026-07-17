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
 * endpoint dedicado, não por este DTO. `modules` é nested read-write (entrada
 * e saída); `modules_total_hours` é derivado em runtime — não existe coluna,
 * e é independente de `workload_hours` (contratado, não se ajusta à soma).
 *
 * `templates` e `modules` são `Optional` na ENTRADA: ausente = não mexe na
 * coleção; `[]` = apaga tudo (explícito). Sem o `Optional`, um payload que
 * apenas omite a coleção apagava todos os registros dela em silêncio — peso
 * legal. A saída (`fromModel`) sempre preenche as duas.
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
        /** @var array<CertificateTemplateData>|Optional */
        #[DataCollectionOf(CertificateTemplateData::class)]
        public array|Optional $templates = new Optional,
        /** @var array<CourseModuleData>|Optional */
        #[DataCollectionOf(CourseModuleData::class)]
        public array|Optional $modules = new Optional,
        /** @var array<int> */
        public array $redator_ids = [],
        public int|Optional $modules_total_hours = new Optional,
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
            modules: CourseModuleData::collect($course->modules->all()),
            redator_ids: $course->redatores->pluck('id')->all(),
            modules_total_hours: $course->modules->sum(
                fn ($m) => $m->theory_hours + $m->practice_hours
            ),
        );
    }
}
