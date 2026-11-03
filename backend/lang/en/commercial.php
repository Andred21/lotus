<?php

declare(strict_types=1);

return [
    'client' => [
        'archived' => 'This client was archived and no longer accepts changes.',
        'contact_required' => 'The client needs at least one contact.',
        'primary_contact_required' => 'The client needs exactly one primary contact.',
    ],
    'budget' => [
        'approved_cannot_delete' => 'A budget with an approved quote cannot be deleted. Reject it first.',
    ],
    'quote' => [
        'archived' => 'This quote has been archived.',
        'already_approved' => 'The quote is already approved.',
        'already_rejected' => 'The quote is already rejected.',
        'turma_exists_cannot_reject' => 'The quote has an active or concluded class: it cannot be rejected.',
        'approved_cannot_delete' => 'An approved quote cannot be deleted. Reject it first.',
        'approved_cannot_edit' => 'An approved quote cannot be edited.',
        'turma_locks_field' => 'The quote has a class: only the UF value can change.',
        'budget_archived' => 'The budget of this quote is archived: restore it first.',
    ],
];
