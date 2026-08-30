<?php

declare(strict_types=1);

return [
    'pending' => [
        'quote_pending_approval' => 'Cotação pendente de aprovação.',
        'quote_without_turma' => 'Cotação aprovada sem turma configurada.',
        'turma_without_redator' => 'Turma sem redator designado.',
        'turma_docs_incomplete' => 'Documentação obrigatória incompleta: :tipos.',
        'turma_awaiting_conclusion' => 'Turma habilitada aguardando confirmação de conclusão.',
        'turma_overdue' => 'Turma com data de término vencida e ainda em curso.',
        'certificates_pending' => 'Turma concluída com matrículas aprovadas pendentes de certificado.',
    ],
    'alert' => [
        'certificate_expired' => 'Certificado vencido.',
        'certificate_expiring' => 'Certificado próximo do vencimento.',
        'redator_document_expired' => 'Documento :tipo do redator vencido.',
        'redator_document_expiring' => 'Documento :tipo do redator próximo do vencimento.',
        'document_expired' => 'Documento :tipo vencido.',
        'document_expiring' => 'Documento :tipo próximo do vencimento.',
    ],
    'filter' => [
        'inverted_period' => 'A data de término não pode ser anterior à de início.',
    ],
];
