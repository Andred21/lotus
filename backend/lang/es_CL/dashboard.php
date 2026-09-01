<?php

declare(strict_types=1);

return [
    'pending' => [
        'quote_pending_approval' => 'Cotización pendiente de aprobación.',
        'quote_without_turma' => 'Cotización aprobada sin clase configurada.',
        'turma_without_redator' => 'Clase sin relator designado.',
        'turma_docs_incomplete' => 'Documentación obligatoria incompleta: :tipos.',
        'turma_awaiting_conclusion' => 'Clase habilitada pendiente de confirmación de conclusión.',
        'turma_overdue' => 'Clase con fecha de término vencida y aún en curso.',
        'certificates_pending' => 'Clase concluida con matrículas aprobadas pendientes de certificado.',
    ],
    'alert' => [
        'certificate_expired' => 'Certificado vencido.',
        'certificate_expiring' => 'Certificado próximo a vencer.',
        'redator_document_expired' => 'Documento :tipo de relator vencido.',
        'redator_document_expiring' => 'Documento :tipo de relator próximo a vencer.',
        'document_expired' => 'Documento :tipo vencido.',
        'document_expiring' => 'Documento :tipo próximo a vencer.',
    ],
    'filter' => [
        'inverted_period' => 'La fecha de término no puede ser anterior a la de inicio.',
    ],
];
