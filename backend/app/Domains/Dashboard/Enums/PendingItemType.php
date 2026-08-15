<?php

namespace App\Domains\Dashboard\Enums;

/** Tipos de pendência agregados no dashboard do admin (spec §4.2). */
enum PendingItemType: string
{
    case QuoteAwaitingApproval = 'quote_awaiting_approval';
    case QuoteApprovedWithoutTurma = 'quote_approved_without_turma';
    case TurmaWithoutRedator = 'turma_without_redator';
    case TurmaDocsIncomplete = 'turma_docs_incomplete';
    case TurmaAwaitingConclusion = 'turma_awaiting_conclusion';
    case EnrollmentAwaitingCertificate = 'enrollment_awaiting_certificate';
}
