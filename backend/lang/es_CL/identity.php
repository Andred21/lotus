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
    'errors' => [
        'rut_invalid' => 'RUT inválido.',
        'rut_wrong_type' => 'Este RUT pertenece a un usuario de otro tipo.',
        'student_email_required' => 'El correo es obligatorio para un alumno nuevo.',
        'student_client_required' => 'El cliente es obligatorio al registrar un alumno.',
        'student_client_not_found' => 'Cliente no encontrado.',
        'staff_password_required' => 'La contraseña es obligatoria.',
        'role_name_taken' => 'Ya existe un rol con ese nombre.',
        'last_superadmin' => 'No es posible dejar el sistema sin un superadministrador activo.',
        'redator_archived' => 'Este redactor fue archivado y ya no acepta cambios.',
        'redator_has_active_turmas' => 'El redactor tiene clases en curso: concluye o reasigna antes de archivarlo.',
        'documents_shape' => 'El campo documents debe ser un mapa de tipo => archivo.',
        'document_type_invalid' => 'Tipo de documento inválido: :tipo',
        'permission_invalid' => 'Permiso inválido o no asignable a un rol personalizado.',
        'system_role_immutable' => 'El rol de sistema es inmutable.',
        'system_role_permissions_immutable' => "Los permisos del rol de sistema ':role' son inmutables.",
        'system_role_not_deletable' => "El rol de sistema ':role' no puede ser eliminado.",
        'system_role_not_renamable' => "El rol de sistema ':role' no puede ser renombrado.",
        'redator_only_action' => 'Solo los redactores envían documentación profesional.',
    ],
    'document_type' => [
        'CV' => 'Currículum',
        'REUF' => 'REUF',
        'TITULO' => 'Título',
        'POSTGRADO' => 'Posgrado',
    ],
];
