<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked' => 'A turma já foi concluída: o registro acadêmico está bloqueado (RN-15).',
        'archived' => 'Esta turma foi arquivada e não aceita mais alterações.',
        'restore_conflict' => 'Já existe uma turma ativa para esta cotação: arquive-a antes de restaurar esta.',
        'restore_redator_archived' => 'Um redator desta turma está arquivado: restaure-o antes de restaurar a turma.',
        'documents_incomplete' => 'Documentação obrigatória incompleta (RN-16). Falta: :tipos.',
    ],
    'document_type' => [
        'MANUAL' => 'Manual',
        'PRUEBAS' => 'Provas',
        'EVALUACION_REDATOR' => 'Avaliação do redator',
    ],
];
