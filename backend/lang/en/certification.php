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
        'template_not_approved' => 'The course has no approved certificate template.',
        'template_city_invalid' => 'The course template does not define a valid issuing city.',
        'redator_not_designated' => 'The instructor is not designated for this class.',
    ],
    'enrollment' => [
        'not_found' => 'The enrollment does not exist.',
    ],
    'snapshot' => [
        'not_presentable' => 'Certificate :codigo cannot be presented: its frozen document is missing the fields :campos.',
    ],
];
