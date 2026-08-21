<?php

namespace App\Domains\Operation\Data;

use App\Domains\Identity\Models\Redator;
use App\Domains\Operation\Enums\TurmaModalidade;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Turma;
use App\Domains\Operation\Services\TurmaHabilitacaoService;
use App\Shared\Data\ComputedFields;
use App\Shared\Files\Transformers\SignedUrlTransformer;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Attributes\Computed;
use Spatie\LaravelData\Attributes\WithTransformer;
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
        public bool|Optional $habilitada,
        /** @var string[] */
        public array|Optional $missing_document_types,
        public string|null|Optional $concluded_at,
        /** @var TurmaRedatorData[] */
        public array|Optional $redatores = [],
        public string|Optional $course_name = new Optional,
        public string|Optional $client_name = new Optional,
        public int|Optional $enrolled_count = new Optional,
        public string|null|Optional $quote_code = new Optional,
        public string|null|Optional $budget_code = new Optional,
        public int|null|Optional $budget_id = new Optional,
        /** RUT do contratante. Mesmo `ContratanteData` de onde sai o
         * `client_name` — o valor já vinha e era descartado. */
        public string|null|Optional $client_rut = new Optional,
        /** Foto do usuário do cliente. `#[Computed]` porque nunca entra por
         * payload, e o transformer assina na saída como em ClientData. */
        #[Computed]
        #[WithTransformer(SignedUrlTransformer::class, 60)]
        public ?string $client_photo_url = null,
    ) {}

    public static function rules(): array
    {
        return [
            ...ComputedFields::rejected('client_photo_url'),
            'modalidade' => ['required', Rule::enum(TurmaModalidade::class)],
            'local_aplicacao' => ['nullable', 'string', 'max:255', 'required_if:modalidade,presencial'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ];
    }

    /**
     * EXIGE a turma com a projeção de listagem carregada — `withListingData()`
     * na query ou `loadListingData()` na instância. `enrolled_count` lê o
     * `enrollments_count` do `loadCount` sem fallback (D-B3): sem a carga o
     * construtor recusa `null` em vez de pagar uma query por turma em silêncio.
     */
    public static function fromModel(Turma $turma, TurmaHabilitacaoService $habilitacao): self
    {
        $habilitacaoStatus = $habilitacao->for($turma);

        return new self(
            id: $turma->id,
            quote_id: $turma->quote_id,
            course_id: $turma->course_id,
            modalidade: $turma->modalidade,
            local_aplicacao: $turma->local_aplicacao,
            start_date: $turma->start_date->toDateString(),
            end_date: $turma->end_date->toDateString(),
            status: $turma->status,
            habilitada: $habilitacaoStatus->isHabilitada(),
            missing_document_types: $habilitacaoStatus->missingTypes(),
            concluded_at: $turma->concluded_at?->toISOString(),
            redatores: $turma->redatores->map(fn (Redator $r) => TurmaRedatorData::fromModel($r))->all(),
            course_name: $turma->course->name,
            client_name: $turma->contratante()->name,
            enrolled_count: $turma->enrollments_count,
            quote_code: $turma->quote->code,
            budget_code: $turma->quote->budget->code,
            budget_id: $turma->quote->budget->id,
            client_rut: $turma->contratante()->rut,
            client_photo_url: $turma->contratanteClient()->user->photo_path,
        );
    }
}
