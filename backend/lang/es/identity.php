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
        // Mesma frase exista ou não a conta: a rota pública não pode
        // virar enumerador de usuários.
        'requested' => 'Si el correo existe, enviaremos un enlace para cambiar la clave.',
        'subject' => 'Recuperación de clave — Lotus',
        'greeting' => 'Hola :name,',
        'line' => 'Recibimos una solicitud para cambiar tu clave.',
        'action' => 'Cambiar mi clave',
        'expiry' => 'Este enlace vence en 60 minutos. Si no fuiste tú, ignora este correo.',
    ],
];
