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
        'emission_city_missing' => 'No hay una ciudad de emisión configurada para esta clase.',
        'redator_not_designated' => 'El relator no está designado en esta clase.',
    ],
    'enrollment' => [
        'not_found' => 'La matrícula no existe.',
    ],
    'snapshot' => [
        'not_presentable' => 'El certificado :codigo no puede presentarse: su documento congelado no tiene los campos :campos.',
    ],
    'validation_url' => [
        'not_configured' => 'La dirección de validación de certificados no está configurada con https. Ningún certificado se emite ni se descarga hasta que el administrador del sistema la configure.',
    ],
    'signature' => [
        'missing_binary' => 'La imagen de la firma del archivo :id no está en el disco (:path).',
    ],
];
