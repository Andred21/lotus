<?php

namespace App\Domains\Commercial\Data;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use App\Shared\Files\Data\FileData;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato da cotação. `budget_id`, `seq_in_budget`, `status`, `approved_at` e
 * `code` são read-only (saída). `code` é o composto calculado (ADR-17), nunca
 * persistido. `budget` vem da rota no store, não do DTO.
 */
#[TypeScript]
class QuoteData extends Data
{
    public function __construct(
        public int|Optional $id,
        public int|Optional $budget_id,
        public int|Optional $seq_in_budget,
        public int $course_id,
        public int $student_count,
        // String, não float: o cast decimal:4 do Eloquent já devolve string de
        // propósito — dinheiro não trafega por float (ADR-04 / critério 6.1.3).
        public string $value_uf,
        public QuoteStatus|Optional $status,
        public string|Optional|null $approved_at,
        public string|Optional $code,
        public string|Optional|null $purchase_order = null,
        public string|Optional|null $planned_start_date = null,
        public string|Optional|null $planned_end_date = null,
        /** @var FileData[] */
        public array|Optional $files = [],
    ) {}

    public static function rules(): array
    {
        return [
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'student_count' => ['required', 'integer', 'min:1'],
            'value_uf' => ['required', 'numeric', 'min:0'],
            'purchase_order' => ['nullable', 'string', 'max:255'],
            'planned_start_date' => ['nullable', 'date'],
            'planned_end_date' => ['nullable', 'date'],
        ];
    }

    public static function fromModel(Quote $quote): self
    {
        return new self(
            id: $quote->id,
            budget_id: $quote->budget_id,
            seq_in_budget: $quote->seq_in_budget,
            course_id: $quote->course_id,
            student_count: $quote->student_count,
            value_uf: (string) $quote->value_uf,
            status: $quote->status,
            approved_at: $quote->approved_at?->toIso8601String(),
            code: "Scap {$quote->budget_id} - Cot {$quote->seq_in_budget}",
            purchase_order: $quote->purchase_order,
            planned_start_date: $quote->planned_start_date?->toDateString(),
            planned_end_date: $quote->planned_end_date?->toDateString(),
            files: $quote->files->map(fn ($f) => FileData::fromModel($f))->all(),
        );
    }
}
