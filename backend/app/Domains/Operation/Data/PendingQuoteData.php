<?php

namespace App\Domains\Operation\Data;

use App\Domains\Commercial\Models\Quote;
use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Cotação aprovada ainda SEM turma — a fila "pendentes de configuração" do hub.
 * Saída pura (achata cliente/curso/orçamento por relacionamento).
 */
#[TypeScript]
class PendingQuoteData extends Data
{
    public function __construct(
        public int $quote_id,
        public ?string $quote_code,
        public ?string $budget_code,
        public string $client_name,
        public string $course_name,
        public int $student_count,
    ) {}

    public static function fromModel(Quote $quote): self
    {
        return new self(
            quote_id: $quote->id,
            quote_code: $quote->code,
            budget_code: $quote->budget->code,
            client_name: $quote->budget->client->legal_name,
            course_name: $quote->course->name,
            student_count: $quote->student_count,
        );
    }
}
