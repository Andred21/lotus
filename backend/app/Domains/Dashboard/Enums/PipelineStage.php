<?php

namespace App\Domains\Dashboard\Enums;

/** Estágios do funil comercial-operacional-certificação (spec §4.2). */
enum PipelineStage: string
{
    case QuotePending = 'quote_pending';
    case QuoteApprovedWithoutTurma = 'quote_approved_without_turma';
    case TurmaInProgress = 'turma_in_progress';
    case TurmaReadyForConclusion = 'turma_ready_for_conclusion';
    case ConcludedPendingIssuance = 'concluded_pending_issuance';
    case FullyIssued = 'fully_issued';
}
