<?php

namespace App\Domains\Dashboard\Enums;

/** Tipos de alerta agregados no dashboard (spec §4.2). */
enum DashboardAlertType: string
{
    case TurmaOverdue = 'turma_overdue';
    case CertificateExpiringSoon = 'certificate_expiring_soon';
    case CertificateExpired = 'certificate_expired';
    case RedatorDocumentExpired = 'redator_document_expired';
    case RedatorDocumentExpiringSoon = 'redator_document_expiring_soon';
}
