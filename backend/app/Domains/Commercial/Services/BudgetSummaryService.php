<?php

namespace App\Domains\Commercial\Services;

use App\Domains\Commercial\Enums\QuoteStatus;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Quote;

/**
 * Deriva o estado agregado do orçamento a partir das cotações filhas (lado
 * leitura, sem trigger — ADR-08). RN-06: aprovado se ≥1 cotação aprovada.
 * RF-ORC-07: valor/alunos = soma das cotações. Requer `$budget->quotes` carregado.
 */
class BudgetSummaryService
{
    public function status(Budget $budget): QuoteStatus
    {
        $quotes = $budget->quotes;

        if ($quotes->contains(fn (Quote $q) => $q->status === QuoteStatus::Approved)) {
            return QuoteStatus::Approved;
        }

        if ($quotes->isNotEmpty() && $quotes->every(fn (Quote $q) => $q->status === QuoteStatus::Rejected)) {
            return QuoteStatus::Rejected;
        }

        return QuoteStatus::Pending;
    }

    public function totalValueUf(Budget $budget): float
    {
        return (float) $budget->quotes->sum(fn (Quote $q) => $q->value_uf);
    }

    public function totalStudents(Budget $budget): int
    {
        return (int) $budget->quotes->sum('student_count');
    }
}
