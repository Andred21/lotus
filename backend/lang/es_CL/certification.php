<?php

declare(strict_types=1);

return [
    'certificate' => [
        'already_revoked' => 'El certificado ya fue revocado.',
    ],
    'eligibility' => [
        'turma_not_concluded' => 'La clase aún no fue concluida: no se puede emitir el certificado (RN-08).',
        'enrollment_not_approved' => 'El alumno no fue aprobado: no se puede emitir el certificado.',
        'certificate_already_active' => 'Ya existe un certificado vigente para esta matrícula.',
        'template_not_approved' => 'El curso no tiene una plantilla de certificado aprobada.',
        'template_city_invalid' => 'La plantilla del curso no define una ciudad de emisión válida.',
        'redator_not_designated' => 'El relator no está designado en esta clase.',
    ],
    'enrollment' => [
        'not_found' => 'La matrícula no existe.',
    ],
    'snapshot' => [
        'not_presentable' => 'El certificado :codigo no puede presentarse: su documento congelado no tiene los campos :campos.',
    ],
];
