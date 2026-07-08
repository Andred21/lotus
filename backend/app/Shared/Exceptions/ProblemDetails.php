<?php

namespace App\Shared\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class ProblemDetails
{
    /**
     * Converte uma exceção no envelope RFC 7807 (application/problem+json).
     */
    public static function fromException(Throwable $e, Request $request): JsonResponse
    {
        [$status, $title, $type] = match (true) {
            $e instanceof ValidationException =>
                [422, 'Erro de validação', 'https://lotus.cl/errors/validation'],
            $e instanceof AuthenticationException =>
                [401, 'Não autenticado', 'https://lotus.cl/errors/unauthenticated'],
            $e instanceof AuthorizationException =>
                [403, 'Acesso negado', 'https://lotus.cl/errors/forbidden'],
            $e instanceof ModelNotFoundException,
            $e instanceof NotFoundHttpException =>
                [404, 'Recurso não encontrado', 'https://lotus.cl/errors/not-found'],
            $e instanceof HttpExceptionInterface =>
                [$e->getStatusCode(), 'Erro na requisição', 'https://lotus.cl/errors/http'],
            default =>
                [500, 'Erro interno', 'https://lotus.cl/errors/server'],
        };

        $payload = [
            'type'     => $type,
            'title'    => $title,
            'status'   => $status,
            'detail'   => self::detailFor($e, $status),
            'instance' => $request->getRequestUri(),
        ];

        // Erros de validação carregam o detalhamento por campo
        if ($e instanceof ValidationException) {
            $payload['errors'] = $e->errors();
        }

        return response()->json($payload, $status, [
            'Content-Type' => 'application/problem+json',
        ]);
    }

    /**
     * Em 500 sem debug, não vaza mensagem interna. Nos demais, mostra a mensagem.
     */
    private static function detailFor(Throwable $e, int $status): string
    {
        if ($status === 500 && ! config('app.debug')) {
            return 'Ocorreu um erro inesperado. Tente novamente.';
        }

        return $e->getMessage() ?: 'Erro ao processar a requisição.';
    }
}