<?php

return [
    'alerta' => [
        'subject' => 'Lotus — alerta de acceso sospechoso',
        'greeting' => 'Alerta de seguridad',
        'familia' => [
            'login_falho_repetido' => 'Intentos de inicio de sesión fallidos repetidos desde la misma clave de origen.',
            'sessao_de_conta_desativada' => 'Uso de una sesión de una cuenta desactivada.',
            'sequencia_de_403' => 'Secuencia de accesos denegados por autorización.',
        ],
        'ocorrencias' => 'Ocurrencias registradas: :ocorrencias',
        'ip' => 'Dirección IP: :ip',
        'usuario' => 'Usuario involucrado: :usuario',
        'sem_usuario' => 'Sin usuario autenticado identificado.',
        'rodape' => 'Este aviso lo genera el propio sistema. Revise el registro de seguridad para el detalle.',
    ],
];
