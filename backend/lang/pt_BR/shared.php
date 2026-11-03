<?php

declare(strict_types=1);

return [
    'file' => [
        'malware_rejected' => 'O arquivo foi recusado: o antivírus detectou conteúdo malicioso.',
        'set_too_large' => 'O conjunto de arquivos passa do máximo de :max MB. Envie-os em requisições separadas.',
        'scanner_unavailable' => 'O serviço de antivírus está indisponível. O arquivo não foi salvo; tente de novo em alguns minutos.',
        'image_too_narrow' => 'A assinatura precisa ter pelo menos :min px de largura; a enviada tem :width px.',
        'image_unreadable' => 'Não foi possível ler a imagem da assinatura. Envie um PNG válido.',
    ],
    'rule' => [
        'rut_invalid' => 'O RUT informado é inválido.',
        'grade_not_printable' => 'A nota final deve ser um número ou um texto não vazio.',
    ],
    'spreadsheet' => [
        'unsupported_format' => 'Formato não suportado — envie xlsx ou csv.',
        'too_many_rows' => 'A planilha passa do máximo de :max linhas. Divida-a e envie de novo.',
    ],
];
