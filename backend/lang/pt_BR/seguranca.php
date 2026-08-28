<?php

return [
    'alerta' => [
        'subject' => 'Lotus — alerta de acesso suspeito',
        'greeting' => 'Alerta de segurança',
        'familia' => [
            'login_falho_repetido' => 'Tentativas de login malsucedidas repetidas a partir da mesma chave de origem.',
            'sessao_de_conta_desativada' => 'Uso de sessão de uma conta desativada.',
            'sequencia_de_403' => 'Sequência de acessos negados por autorização.',
        ],
        'ocorrencias' => 'Ocorrências registradas: :ocorrencias',
        'ip' => 'Endereço IP: :ip',
        'usuario' => 'Usuário envolvido: :usuario',
        'sem_usuario' => 'Sem usuário autenticado identificado.',
        'rodape' => 'Este aviso é gerado pelo próprio sistema. Consulte o log de segurança para o detalhe.',
    ],
];
