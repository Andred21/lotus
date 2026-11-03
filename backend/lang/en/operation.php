<?php

declare(strict_types=1);

return [
    'turma' => [
        'concluded_locked' => 'The class has already been concluded: the academic record is locked (RN-15).',
        'archived' => 'This class was archived and no longer accepts changes.',
        'restore_conflict' => 'An active class already exists for this quote: archive it before restoring this one.',
        'restore_redator_archived' => 'An instructor of this class is archived: restore them before restoring the class.',
        'restore_quote_not_approved' => 'The quote for this class is not approved: approve it before restoring the class.',
        'restore_course_changed' => 'The course of the quote changed: this class no longer matches it.',
        'documents_incomplete' => 'Required documentation incomplete (RN-16). Missing: :tipos.',
        'requirements_incomplete' => 'Missing to conclude the class: :itens.',
        'quote_not_approved' => 'The quote must be approved before configuring the class.',
        'already_exists' => 'This quote already has a class configured.',
    ],
    'enrollment' => [
        'result_locked' => 'This enrollment already has an issued certificate: its result can no longer be changed.',
        'import' => [
            'duplicate_rut' => 'This RUT appears more than once in the spreadsheet: only the first row counts.',
            'duplicate_email' => 'This email appears more than once in the spreadsheet: only the first row counts.',
            'update_forbidden' => 'You are not allowed to update student records: the row was not saved.',
        ],
    ],
    'requirement' => [
        'redator' => 'assigned instructor',
        'local_aplicacao' => 'venue (in-person class)',
    ],
    'document_type' => [
        'MANUAL' => 'Manual',
        'PRUEBAS' => 'Tests',
        'EVALUACION_REDATOR' => 'Instructor evaluation',
    ],
];
