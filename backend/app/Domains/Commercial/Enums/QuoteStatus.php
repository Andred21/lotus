<?php

namespace App\Domains\Commercial\Enums;

/**
 * Status de aprovação da cotação. Reusado como status agregado (derivado) do
 * orçamento (BudgetData): os valores são idênticos.
 */
enum QuoteStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
