<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked' => 'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
        'archived' => 'Esta clase fue archivada y ya no acepta cambios.',
        'restore_conflict' => 'Ya existe una clase activa para esta cotización: archívala antes de restaurar esta.',
        'restore_redator_archived' => 'Un relator de esta clase está archivado: restáuralo antes de restaurar la clase.',
        'restore_quote_not_approved' => 'La cotización de esta clase no está aprobada: apruébala antes de restaurar la clase.',
        'restore_course_changed' => 'El curso de la cotización cambió: esta clase ya no corresponde a ella.',
        'documents_incomplete' => 'Documentación obligatoria incompleta (RN-16). Falta: :tipos.',
        'requirements_incomplete' => 'Falta para concluir la clase: :itens.',
        'quote_not_approved' => 'La cotización debe estar aprobada para configurar la clase.',
        'already_exists' => 'Esta cotización ya tiene una clase configurada.',
    ],
    'enrollment' => [
        'result_locked' => 'Esta matrícula ya tiene certificado emitido: el resultado ya no se puede modificar.',
        'import' => [
            'duplicate_rut' => 'Este RUT ya aparece en la fila :row de la planilla: solo vale la primera.',
            'duplicate_email' => 'Este correo ya aparece en la fila :row de la planilla: solo vale la primera.',
            'update_forbidden' => 'No tienes permiso para actualizar el registro del alumno.',
        ],
    ],
    'requirement' => [
        'redator' => 'relator designado',
        'local_aplicacao' => 'lugar de aplicación (clase presencial)',
    ],
    'document_type' => [
        'MANUAL' => 'Manual',
        'PRUEBAS' => 'Pruebas',
        'EVALUACION_REDATOR' => 'Evaluación del relator',
    ],
];
