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
    'enrollment' => [
        'not_found' => 'The enrollment does not exist.',
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
