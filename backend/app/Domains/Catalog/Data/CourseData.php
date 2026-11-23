<?php

namespace App\Domains\Catalog\Data;

use App\Domains\Catalog\Models\Course;
use App\Shared\Data\ComputedFields;
use App\Shared\Support\TetosImpressos;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Nullable;
use Spatie\LaravelData\Attributes\Validation\Regex;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\Unique;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\LaravelData\Support\Validation\References\RouteParameterReference;
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
        /**
         * Saída ("C-<id>", gerado na Action e imutável): `#[Computed]` + `rejected()`
         * no `rules()` — a chave no corpo de escrita é 422.
         */
        #[Computed]
        public string|Optional $code,
        #[Required, Max(TetosImpressos::NOME_CURSO)]
        public string $name,
        #[Max(TetosImpressos::NOME_TECNICO)]
        public string|Optional|null $technical_name,
        /**
         * Código SENCE digitado: só dígitos, único entre TODOS os cursos — o
         * arquivado inclusive (sem `withoutTrashed`). No update o próprio curso
         * é ignorado pelo parâmetro de rota.
         */
        #[Nullable, Regex('/^\d{1,20}$/'), Unique('courses', 'sence_code', ignore: new RouteParameterReference('course', 'id', nullable: true))]
        public string|Optional|null $sence_code,
        #[Max(TetosImpressos::DESCRICAO_CURSO)]
        public string|Optional|null $description,
        #[Required]
        public int $workload_hours,
        /** @var array<CourseModuleData>|Optional */
        #[DataCollectionOf(CourseModuleData::class)]
        public array|Optional $modules = new Optional,
        /**
         * Saída (habilitação): `#[Computed]` + `rejected()` no `rules()` — a chave no corpo de escrita é 422.
         *
         * @var array<int>
         */
        #[Computed]
        public array $redator_ids = [],
        public int|Optional $modules_total_hours = new Optional,
    ) {}

    public static function rules(): array
    {
        return [
            ...ComputedFields::rejected('code', 'redator_ids'),
        ];
    }

    /**
     * Hidrata o DTO do model. `redator_ids` vem do pivot de habilitação.
     */
    public static function fromModel(Course $course): self
    {
        return new self(
            id: $course->id,
            // Nulo só existe entre o insert e o `update` da Action (e em linha criada
            // fora dela): sem código, a chave sai ausente em vez de estourar o tipo.
            code: $course->code ?? new Optional,
            name: $course->name,
            technical_name: $course->technical_name,
            sence_code: $course->sence_code,
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
