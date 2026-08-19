<?php

return [
    'invitation' => [
        'subject' => 'Access to the Lotus platform',
        'greeting' => 'Hello :name,',
        'line' => 'Your instructor account was created. Set your password to sign in.',
        'action' => 'Set my password',
        'expiry' => 'This link expires in 7 days. If it does, request a new one at "Forgot my password".',
    ],
    'reset' => [
        // Mesma frase exista ou não a conta: a rota pública não pode
        // virar enumerador de usuários.
        'requested' => 'If the email exists, we will send a link to change the password.',
        'subject' => 'Password recovery — Lotus',
        'greeting' => 'Hello :name,',
        'line' => 'We received a request to change your password.',
        'action' => 'Change my password',
        'expiry' => 'This link expires in 60 minutes. If it was not you, ignore this email.',
    ],
];
