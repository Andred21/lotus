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
        'approved_cannot_delete' => 'An approved quote cannot be deleted. Reject it first.',
        'approved_cannot_edit' => 'An approved quote cannot be edited.',
        'budget_archived' => 'The budget of this quote is archived: restore it first.',
    ],
];
