<?php

declare(strict_types=1);

return [
    'certificate' => [
        'already_revoked' => 'The certificate has already been revoked.',
    ],
    'eligibility' => [
        'turma_not_concluded' => 'The class has not been concluded: the certificate cannot be issued (RN-08).',
        'enrollment_not_approved' => 'The student was not approved: the certificate cannot be issued.',
        'certificate_already_active' => 'An active certificate already exists for this enrollment.',
        'emission_city_missing' => 'No issuing city is configured for this class.',
        'redator_not_designated' => 'The instructor is not designated for this class.',
    ],
    'emission_panel' => [
        'inverted_period' => 'The end date cannot be earlier than the start date.',
    ],
    'export' => [
        'empty' => 'There are no certificates to export with the applied filters.',
        'over_limit' => 'The export has :total certificates and the maximum is :teto. Apply a narrower filter.',
        'spreadsheet_failed' => 'The spreadsheet could not be generated.',
    ],
    'enrollment' => [
        'not_found' => 'The enrollment does not exist.',
    ],
    'public' => [
        'revoked' => 'The certificate was revoked and its PDF is no longer available.',
    ],
    'snapshot' => [
        'not_presentable' => 'Certificate :codigo cannot be presented: its frozen document is missing the fields :campos.',
    ],
    'validation_url' => [
        'not_configured' => 'The certificate validation address is not configured with https. No certificate is issued or downloaded until the system administrator configures it.',
    ],
    'signature' => [
        'missing_binary' => 'The signature image of file :id is missing from the disk (:path).',
    ],
];
