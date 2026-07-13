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

    /**
     * Soma em decimal (bcmath), nunca em float: dinheiro de peso legal não pode
     * herdar o erro de representação do float64 (0.1 + 0.2 = 0.30000000000000004).
     * Devolve string com as mesmas 4 casas do decimal(12,4) da coluna.
     */
    public function totalValueUf(Budget $budget): string
    {
        return $budget->quotes->reduce(
            fn (string $total, Quote $q) => bcadd($total, (string) $q->value_uf, 4),
            '0.0000',
        );
    }

    public function totalStudents(Budget $budget): int
    {
        return (int) $budget->quotes->sum('student_count');
    }
}
