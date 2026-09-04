<?php

declare(strict_types=1);

return [
    'title' => [
        'validation' => 'Erro de validação',
        'unauthenticated' => 'Não autenticado',
        'forbidden' => 'Acesso negado',
        'not_found' => 'Recurso não encontrado',
        'http' => 'Erro na requisição',
        'too_many_requests' => 'Muitas solicitações',
        'server' => 'Erro interno',
    ],
    'detail' => [
        'server' => 'Ocorreu um erro inesperado. Tente novamente.',
        'too_many_requests' => 'Muitas solicitações. Aguarde alguns segundos e tente novamente.',
        'unauthenticated' => 'É preciso entrar para continuar.',
        'forbidden' => 'Você não tem permissão para esta ação.',
        'not_found' => 'O recurso solicitado não existe.',
        'generic' => 'Não foi possível processar a requisição.',
        'csrf' => 'Sua sessão expirou ou o formulário perdeu validade. Recarregue a página e tente de novo.',
    ],
];
