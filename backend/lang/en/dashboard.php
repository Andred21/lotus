<?php

declare(strict_types=1);

return [
    'pending' => [
        'quote_pending_approval' => 'Quote pending approval.',
        'quote_without_turma' => 'Approved quote without a configured class.',
        'turma_without_redator' => 'Class without an assigned instructor.',
        'turma_docs_incomplete' => 'Required documentation incomplete: :tipos.',
        'turma_awaiting_conclusion' => 'Enabled class awaiting conclusion confirmation.',
        'turma_overdue' => 'Class past its end date and still ongoing.',
        'certificates_pending' => 'Concluded class with approved enrollments pending certificates.',
    ],
    'alert' => [
        'certificate_expired' => 'Certificate expired.',
        'certificate_expiring' => 'Certificate expiring soon.',
        'redator_document_expired' => 'Instructor :tipo document expired.',
        'redator_document_expiring' => 'Instructor :tipo document expiring soon.',
        'document_expired' => ':tipo document expired.',
        'document_expiring' => ':tipo document expiring soon.',
    ],
    'filter' => [
        'inverted_period' => 'The end date cannot be earlier than the start date.',
    ],
];
