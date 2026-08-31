<?php

return [
    'invitation' => [
        'subject' => 'Access to the Lotus platform',
        'greeting' => 'Hello :name,',
        'line' => 'Your instructor account was created. Set your password to sign in.',
        'action' => 'Set my password',
        'expiry' => 'This link expires in 7 days. If it does, request a new one at "Forgot my password".',
    ],
    'reset' => [
        // Mesma frase exista ou não a conta: a rota pública não pode
        // virar enumerador de usuários.
        'requested' => 'If the email exists, we will send a link to change the password.',
        'subject' => 'Password recovery — Lotus',
        'greeting' => 'Hello :name,',
        'line' => 'We received a request to change your password.',
        'action' => 'Change my password',
        'expiry' => 'This link expires in 60 minutes. If it was not you, ignore this email.',
    ],
    'errors' => [
        'rut_invalid' => 'Invalid RUT.',
        'rut_wrong_type' => 'This RUT belongs to a user of another type.',
        'student_email_required' => 'E-mail is required for a new student.',
        'student_client_required' => 'The client is required when registering a student.',
        'student_client_not_found' => 'Client not found.',
        'staff_password_required' => 'The password is required.',
        'role_name_taken' => 'A role with this name already exists.',
        'last_superadmin' => 'The system cannot be left without an active superadmin.',
        'redator_archived' => 'This instructor was archived and no longer accepts changes.',
        'redator_has_active_turmas' => 'The instructor has ongoing classes: conclude or reassign before archiving.',
        'documents_shape' => 'The documents field must be a map of type => file.',
        'document_type_invalid' => 'Invalid document type: :tipo',
        'permission_invalid' => 'Invalid permission, or not assignable to a custom role.',
        'system_role_immutable' => 'System roles are immutable.',
        'system_role_permissions_immutable' => "The permissions of the ':role' system role are immutable.",
        'system_role_not_deletable' => "The ':role' system role cannot be deleted.",
        'system_role_not_renamable' => "The ':role' system role cannot be renamed.",
        'redator_only_action' => 'Only instructors submit professional documentation.',
    ],
    'document_type' => [
        'CV' => 'Résumé',
        'REUF' => 'REUF',
        'TITULO' => 'Degree',
        'POSTGRADO' => 'Postgraduate',
    ],
];
