<?php

return [
    'invitation' => [
        'subject' => 'Acceso a la plataforma Lotus',
        'greeting' => 'Hola :name,',
        'line' => 'Tu cuenta de relator fue creada. Define tu clave para entrar.',
        'action' => 'Definir mi clave',
        'expiry' => 'Este enlace vence en 7 días. Si vence, puedes pedir uno nuevo en "Olvidé mi clave".',
    ],
    'reset' => [
        'subject' => 'Recuperación de clave — Lotus',
        'greeting' => 'Hola :name,',
        'line' => 'Recibimos una solicitud para cambiar tu clave.',
        'action' => 'Cambiar mi clave',
        'expiry' => 'Este enlace vence en 60 minutos. Si no fuiste tú, ignora este correo.',
    ],
];
