<?php

namespace App\Domains\Operation\Data;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato da turma. `quote_id`/`course_id`/`status`/`redatores` são read-only
 * (saída): `course_id` deriva da cotação, `status` nasce em_andamento, redatores
 * entram pela designação. `local_aplicacao` é exigido só no presencial.
 */
#[TypeScript]
class TurmaData extends Data
{
    public function __construct(
        public int|Optional $id,
        public int|Optional $quote_id,
        public int|Optional $course_id,
        public TurmaModalidade $modalidade,
        public ?string $local_aplicacao,
        public string $start_date,
        public string $end_date,
        public TurmaStatus|Optional $status,
        /** @var TurmaRedatorData[] */
        public array|Optional $redatores = [],
    ) {}

    public static function rules(): array
    {
        return [
            'modalidade' => ['required', Rule::enum(TurmaModalidade::class)],
            'local_aplicacao' => ['nullable', 'string', 'max:255', 'required_if:modalidade,presencial'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ];
    }

    public static function fromModel(Turma $turma): self
    {
        return new self(
            id: $turma->id,
            quote_id: $turma->quote_id,
            course_id: $turma->course_id,
            modalidade: $turma->modalidade,
            local_aplicacao: $turma->local_aplicacao,
            start_date: $turma->start_date->toDateString(),
            end_date: $turma->end_date->toDateString(),
            status: $turma->status,
            redatores: $turma->redatores->map(fn (Redator $r) => TurmaRedatorData::fromModel($r))->all(),
        );
    }
}
