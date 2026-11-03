<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked' => 'A turma já foi concluída: o registro acadêmico está bloqueado (RN-15).',
        'archived' => 'Esta turma foi arquivada e não aceita mais alterações.',
        'restore_conflict' => 'Já existe uma turma ativa para esta cotação: arquive-a antes de restaurar esta.',
        'restore_redator_archived' => 'Um redator desta turma está arquivado: restaure-o antes de restaurar a turma.',
        'restore_quote_not_approved' => 'A cotação desta turma não está aprovada: aprove-a antes de restaurar a turma.',
        'restore_course_changed' => 'O curso da cotação mudou: esta turma não corresponde mais a ela.',
        'documents_incomplete' => 'Documentação obrigatória incompleta (RN-16). Falta: :tipos.',
        'requirements_incomplete' => 'Falta para concluir a turma: :itens.',
        'quote_not_approved' => 'A cotação precisa estar aprovada para configurar a turma.',
        'already_exists' => 'Esta cotação já tem uma turma configurada.',
    ],
    'enrollment' => [
        'result_locked' => 'Esta matrícula já tem certificado emitido: o resultado não pode mais ser alterado.',
        'import' => [
            'duplicate_rut' => 'Este RUT aparece mais de uma vez na planilha: só a primeira linha vale.',
            'duplicate_email' => 'Este e-mail aparece mais de uma vez na planilha: só a primeira linha vale.',
            'update_forbidden' => 'Você não tem permissão para atualizar o cadastro de alunos: a linha não foi gravada.',
        ],
    ],
    'requirement' => [
        'redator' => 'redator designado',
        'local_aplicacao' => 'local de aplicação (turma presencial)',
    ],
    'document_type' => [
        'MANUAL' => 'Manual',
        'PRUEBAS' => 'Provas',
        'EVALUACION_REDATOR' => 'Avaliação do redator',
    ],
];
