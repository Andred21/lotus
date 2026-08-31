<?php

namespace App\Domains\Dashboard\Services;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Data\PendingItemData;
use App\Domains\Dashboard\Data\QuoteKpisData;
use App\Domains\Dashboard\Enums\DashboardModule;
use App\Domains\Dashboard\Enums\DashboardSeverity;
use App\Domains\Dashboard\Enums\PendingItemType;

class CommercialMetricsQuery
{
    /**
     * A soma sai em `bcadd` e não em `SUM()` de propósito: `value_uf` é DECIMAL
     * de 4 casas; MySQL soma DECIMAL exato, sqlite (a suíte) devolve float e
     * arredonda. Somar no banco daria dois números diferentes para o mesmo dado
     * conforme o ambiente, em cifra com peso contratual. O `pluck` carrega uma
     * coluna só, das cotações pendentes — não a coleção de cotações (D9).
     */
    public function quoteKpis(): QuoteKpisData
    {
        $pending = Quote::query()->where('status', QuoteStatus::Pending);
        $pendingValueUf = (clone $pending)
            ->pluck('value_uf')
            ->reduce(
                fn (string $total, $value): string => bcadd($total, (string) $value, 4),
                '0.0000',
            );

        return new QuoteKpisData(
            pending_count: (clone $pending)->count(),
            pending_value_uf: $pendingValueUf,
        );
    }

    /** @return PendingItemData[] */
    public function pendencias(): array
    {
        $awaitingApproval = Quote::query()
            ->where('status', QuoteStatus::Pending)
            ->orderBy('id')
            ->get(['id', 'budget_id', 'planned_start_date'])
            ->map(fn (Quote $quote): PendingItemData => $this->pendingItem(
                quote: $quote,
                type: PendingItemType::QuoteAwaitingApproval,
                description: __('dashboard.pending.quote_pending_approval'),
                date: $quote->planned_start_date?->toDateString(),
            ));

        $approvedWithoutTurma = Quote::query()
            ->where('status', QuoteStatus::Approved)
            ->whereNotExists(
                fn ($query) => $query
                    ->from('turmas')
                    ->whereColumn('turmas.active_quote_id', 'quotes.id'),
            )
            ->orderBy('id')
            ->get(['id', 'budget_id', 'approved_at'])
            ->map(fn (Quote $quote): PendingItemData => $this->pendingItem(
                quote: $quote,
                type: PendingItemType::QuoteApprovedWithoutTurma,
                description: __('dashboard.pending.quote_without_turma'),
                date: $quote->approved_at?->toDateString(),
            ));

        return $awaitingApproval
            ->concat($approvedWithoutTurma)
            ->values()
            ->all();
    }

    private function pendingItem(
        Quote $quote,
        PendingItemType $type,
        string $description,
        ?string $date,
    ): PendingItemData {
        return new PendingItemData(
            module: DashboardModule::Commercial,
            type: $type,
            severity: DashboardSeverity::Normal,
            entity_id: $quote->id,
            description: $description,
            date: $date,
            navigation: [
                'budget_id' => $quote->budget_id,
                'quote_id' => $quote->id,
            ],
        );
    }
}
