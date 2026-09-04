<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked' => 'The class has already been concluded: the academic record is locked (RN-15).',
        'archived' => 'This class was archived and no longer accepts changes.',
        'restore_conflict' => 'An active class already exists for this quote: archive it before restoring this one.',
        'restore_redator_archived' => 'An instructor of this class is archived: restore them before restoring the class.',
        'documents_incomplete' => 'Required documentation incomplete (RN-16). Missing: :tipos.',
        'quote_not_approved' => 'The quote must be approved before configuring the class.',
        'already_exists' => 'This quote already has a class configured.',
    ],
    'redator' => [
        'not_qualified' => 'The instructor is not qualified to teach this course.',
        'reuf_invalid' => 'The instructor has no valid REUF (document missing or expired).',
    ],
    'document_type' => [
        'MANUAL' => 'Manual',
        'PRUEBAS' => 'Tests',
        'EVALUACION_REDATOR' => 'Instructor evaluation',
    ],
];
