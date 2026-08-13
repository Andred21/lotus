<?php

namespace App\Domains\Commercial\Data;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Services\BudgetSummaryService;
use App\Shared\Data\Attributes\ReadOnlyCollection;
use App\Shared\Files\Data\FileData;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

/**
 * Contrato do orçamento. `code`, `status` e os totais são DERIVADOS (não
 * colunas): computados das cotações pelo BudgetSummaryService. `status` reusa
 * QuoteStatus (mesmos valores).
 */
#[TypeScript]
class BudgetData extends Data
{
    public function __construct(
        public int|Optional $id,
        public int $client_id,
        public string|Optional $code,
        public QuoteStatus|Optional $status,
        // String pelo mesmo motivo do QuoteData::$value_uf: a soma vem do
        // BudgetSummaryService em decimal (bcmath), não em float.
        public string|Optional $total_value_uf,
        public string|Optional $total_approved_uf,
        public string|Optional $total_rejected_uf,
        public int|Optional $total_students,
        /**
         * Projeção de SAÍDA: o `fromModel` a preenche e nenhuma Action a lê da
         * entrada — cotação se escreve por `POST /budgets/{budget}/quotes`.
         * Por isso `#[ReadOnlyCollection]` em vez de `Optional`.
         *
         * @var array<QuoteData>
         */
        #[DataCollectionOf(QuoteData::class)]
        #[ReadOnlyCollection]
        public array $quotes = [],
        public string|Optional|null $payment_terms = null,
        /**
         * Projeção de SAÍDA, mesma razão de `$quotes`: arquivo se anexa pela
         * rota própria.
         *
         * O `#[DataCollectionOf]` não é decoração: sem ele a guarda de coleção
         * nested não olha esta propriedade de jeito nenhum, e o
         * `#[ReadOnlyCollection]` ao lado fingia uma cobertura que não existia
         * (review de 2026-08-13, Q-4).
         *
         * @var FileData[]
         */
        #[DataCollectionOf(FileData::class)]
        #[ReadOnlyCollection]
        public array|Optional $files = [],
    ) {}

    public static function rules(): array
    {
        return [
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'payment_terms' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * O serviço entra por parâmetro, não por `app()`: quem constrói o DTO é o
     * controller, que já recebe dependência por injeção de método. Piloto da
     * H.4.6 — a família de DTOs que assina URL (`photo_url`, `download_url`)
     * segue com o container de propósito (spec D10).
     */
    public static function fromModel(Budget $budget, BudgetSummaryService $summary): self
    {
        return new self(
            id: $budget->id,
            client_id: $budget->client_id,
            code: $budget->code,
            status: $summary->status($budget),
            total_value_uf: $summary->totalValueUf($budget),
            total_approved_uf: $summary->totalApprovedUf($budget),
            total_rejected_uf: $summary->totalRejectedUf($budget),
            total_students: $summary->totalStudents($budget),
            quotes: QuoteData::collect($budget->quotes->all()),
            payment_terms: $budget->payment_terms,
            files: $budget->files->map(fn ($f) => FileData::fromModel($f))->all(),
        );
    }
}
