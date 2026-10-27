<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked' => 'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
        'archived' => 'Esta clase fue archivada y ya no acepta cambios.',
        'restore_conflict' => 'Ya existe una clase activa para esta cotización: archívala antes de restaurar esta.',
        'restore_redator_archived' => 'Un relator de esta clase está archivado: restáuralo antes de restaurar la clase.',
        'documents_incomplete' => 'Documentación obligatoria incompleta (RN-16). Falta: :tipos.',
        'requirements_incomplete' => 'Falta para concluir la clase: :itens.',
        'quote_not_approved' => 'La cotización debe estar aprobada para configurar la clase.',
        'already_exists' => 'Esta cotización ya tiene una clase configurada.',
    ],
    'enrollment' => [
        'result_locked' => 'Esta matrícula ya tiene certificado emitido: el resultado ya no se puede modificar.',
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
