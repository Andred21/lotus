<?php

declare(strict_types=1);

return [
    'title' => [
        'validation' => 'Validation error',
        'unauthenticated' => 'Not authenticated',
        'forbidden' => 'Access denied',
        'not_found' => 'Resource not found',
        'http' => 'Request error',
        'too_many_requests' => 'Too many requests',
        'server' => 'Internal error',
    ],
    'detail' => [
        'server' => 'An unexpected error occurred. Please try again.',
        'too_many_requests' => 'Too many requests. Wait a few seconds and try again.',
        'unauthenticated' => 'You must sign in to continue.',
        'forbidden' => 'You do not have permission for this action.',
        'not_found' => 'The requested resource does not exist.',
        'generic' => 'The request could not be processed.',
    ],
];
