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
        'emission_city_missing' => 'Não há uma cidade de emissão configurada para esta turma.',
        'redator_not_designated' => 'O redator não está designado nesta turma.',
    ],
    'emission_panel' => [
        'inverted_period' => 'A data de término não pode ser anterior à de início.',
    ],
    'export' => [
        'empty' => 'Não há certificados para exportar com os filtros aplicados.',
        'over_limit' => 'A exportação tem :total certificados e o máximo é :teto. Aplique um filtro mais estreito.',
    ],
    'enrollment' => [
        'not_found' => 'A matrícula não existe.',
    ],
    'public' => [
        'revoked' => 'O certificado foi revogado e o PDF não está mais disponível.',
    ],
    'snapshot' => [
        'not_presentable' => 'O certificado :codigo não pode ser apresentado: seu documento congelado não tem os campos :campos.',
    ],
    'validation_url' => [
        'not_configured' => 'O endereço de validação de certificados não está configurado com https. Nenhum certificado é emitido nem baixado até que o administrador do sistema o configure.',
    ],
    'signature' => [
        'missing_binary' => 'A imagem da assinatura do arquivo :id não está no disco (:path).',
    ],
];
