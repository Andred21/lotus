<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked' => 'La clase ya fue concluida: el registro académico está bloqueado (RN-15).',
        'archived' => 'Esta clase fue archivada y ya no acepta cambios.',
        'restore_conflict' => 'Ya existe una clase activa para esta cotización: archívala antes de restaurar esta.',
        'restore_redator_archived' => 'Un relator de esta clase está archivado: restáuralo antes de restaurar la clase.',
        'documents_incomplete' => 'Documentación obligatoria incompleta (RN-16). Falta: :tipos.',
        'quote_not_approved' => 'La cotización debe estar aprobada para configurar la clase.',
        'already_exists' => 'Esta cotización ya tiene una clase configurada.',
    ],
    'redator' => [
        'not_qualified' => 'El relator no está habilitado para dictar este curso.',
        'reuf_invalid' => 'El relator no tiene REUF válido (documento ausente o vencido).',
    ],
    'document_type' => [
        'MANUAL' => 'Manual',
        'PRUEBAS' => 'Pruebas',
        'EVALUACION_REDATOR' => 'Evaluación del relator',
    ],
];
