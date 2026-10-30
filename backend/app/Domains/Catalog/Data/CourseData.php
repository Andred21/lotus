<?php

namespace App\Domains\Catalog\Data;

use App\Domains\Catalog\Models\Course;
use App\Shared\Support\TetosImpressos;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Attributes\Validation\Max;
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
 * `modules` é `Optional` na ENTRADA: ausente = não mexe na coleção; `[]` =
 * apaga tudo (explícito). Sem o `Optional`, um payload que apenas omite a
 * coleção apagava todos os registros dela em silêncio — peso legal. A saída
 * (`fromModel`) sempre a preenche. Templates de certificado não fazem parte do
 * contrato desde o bloco 39: chave `templates` no payload é ignorada.
 */
#[TypeScript]
class CourseData extends Data
{
    public function __construct(
        public int|Optional $id,
        #[Required, Max(TetosImpressos::NOME_CURSO)]
        public string $name,
        #[Max(TetosImpressos::NOME_TECNICO)]
        public string|Optional|null $technical_name = new Optional,
        #[Max(TetosImpressos::DESCRICAO_CURSO)]
        public string|Optional|null $description = new Optional,
        #[Required]
        public int $workload_hours = 0,
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
            modules: CourseModuleData::collect($course->modules->all()),
            redator_ids: $course->redatores->pluck('id')->all(),
            modules_total_hours: $course->modules->sum(
                fn ($m) => $m->theory_hours + $m->practice_hours
            ),
        );
    }
}
