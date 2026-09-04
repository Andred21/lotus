<?php

declare(strict_types=1);

return [
    'certificate' => [
        'already_revoked' => 'O certificado já foi revogado.',
    ],
    'eligibility' => [
        'turma_not_concluded' => 'A turma ainda não foi concluída: o certificado não pode ser emitido (RN-08).',
        'enrollment_not_approved' => 'O aluno não foi aprovado: o certificado não pode ser emitido.',
        'certificate_already_active' => 'Já existe um certificado vigente para esta matrícula.',
        'template_not_approved' => 'O curso não tem um template de certificado aprovado.',
        'template_city_invalid' => 'O template do curso não define uma cidade de emissão válida.',
        'redator_not_designated' => 'O redator não está designado nesta turma.',
    ],
    'enrollment' => [
        'not_found' => 'A matrícula não existe.',
    ],
    'snapshot' => [
        'not_presentable' => 'O certificado :codigo não pode ser apresentado: seu documento congelado não tem os campos :campos.',
    ],
];
