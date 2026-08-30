<?php

return [
    'invitation' => [
        'subject' => 'Acesso à plataforma Lotus',
        'greeting' => 'Olá :name,',
        'line' => 'Sua conta de redator foi criada. Defina sua senha para entrar.',
        'action' => 'Definir minha senha',
        'expiry' => 'Este link vence em 7 dias. Se vencer, peça um novo em "Esqueci minha senha".',
    ],
    'reset' => [
        // Mesma frase exista ou não a conta: a rota pública não pode
        // virar enumerador de usuários.
        'requested' => 'Se o e-mail existir, enviaremos um link para alterar a senha.',
        'subject' => 'Recuperação de senha — Lotus',
        'greeting' => 'Olá :name,',
        'line' => 'Recebemos uma solicitação para alterar sua senha.',
        'action' => 'Alterar minha senha',
        'expiry' => 'Este link vence em 60 minutos. Se não foi você, ignore este e-mail.',
    ],
    'errors' => [
        'rut_invalid' => 'RUT inválido.',
        'rut_wrong_type' => 'Este RUT pertence a um usuário de outro tipo.',
        'student_email_required' => 'E-mail é obrigatório para aluno novo.',
        'student_client_required' => 'O cliente é obrigatório no cadastro do aluno.',
        'student_client_not_found' => 'Cliente não encontrado.',
        'staff_password_required' => 'A senha é obrigatória.',
        'role_name_taken' => 'Já existe uma role com esse nome.',
        'last_superadmin' => 'Não é possível deixar o sistema sem superadmin ativo.',
        'redator_archived' => 'Este redator foi arquivado e não aceita mais alterações.',
        'redator_has_active_turmas' => 'O redator tem turmas em curso: conclua ou reatribua antes de arquivá-lo.',
        'documents_shape' => 'O campo documents deve ser um mapa de tipo => arquivo.',
        'document_type_invalid' => 'Tipo de documento inválido: :tipo',
        'permission_invalid' => 'Permissão inválida ou não atribuível a uma role customizada.',
    ],
    'document_type' => [
        'CV' => 'Currículo',
        'REUF' => 'REUF',
        'TITULO' => 'Diploma',
        'POSTGRADO' => 'Pós-graduação',
    ],
];
