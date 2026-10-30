<?php

declare(strict_types=1);

return [
    'file' => [
        'set_too_large' => 'El conjunto de archivos supera el máximo de :max MB. Envíelos en solicitudes separadas.',
        'scanner_unavailable' => 'El servicio de antivirus no está disponible. El archivo no fue guardado; intente nuevamente en unos minutos.',
        'image_too_narrow' => 'La firma debe tener al menos :min px de ancho; la enviada tiene :width px.',
        'image_unreadable' => 'No se pudo leer la imagen de la firma. Envíe un PNG válido.',
    ],
    'spreadsheet' => [
        'unsupported_format' => 'Formato no soportado — envíe xlsx o csv.',
        'too_many_rows' => 'La planilla supera el máximo de :max filas. Divídala y vuelva a enviarla.',
    ],
];
