<?php

declare(strict_types=1);

return [
    'title' => [
        'validation' => 'Error de validación',
        'unauthenticated' => 'No autenticado',
        'forbidden' => 'Acceso denegado',
        'not_found' => 'Recurso no encontrado',
        'http' => 'Error en la solicitud',
        'too_many_requests' => 'Demasiadas solicitudes',
        'server' => 'Error interno',
    ],
    'detail' => [
        'server' => 'Ocurrió un error inesperado. Vuelva a intentarlo.',
        'too_many_requests' => 'Demasiadas solicitudes. Espere unos segundos y vuelva a intentarlo.',
        'unauthenticated' => 'Debe iniciar sesión para continuar.',
        'forbidden' => 'No tiene permiso para realizar esta acción.',
        'not_found' => 'El recurso solicitado no existe.',
        'generic' => 'No fue posible procesar la solicitud.',
        'csrf' => 'Tu sesión expiró o el formulario perdió validez. Recarga la página e inténtalo de nuevo.',
    ],
];
