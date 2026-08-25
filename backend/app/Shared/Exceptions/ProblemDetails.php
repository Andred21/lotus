<?php

namespace App\Shared\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class ProblemDetails
{
    /**
     * Converte uma exceção no envelope RFC 7807 (application/problem+json).
     */
    public static function fromException(Throwable $e, Request $request): JsonResponse
    {
        [$status, $title, $type] = match (true) {
            $e instanceof ValidationException => [422, 'Erro de validação', 'https://lotus.cl/errors/validation'],
            $e instanceof AuthenticationException => [401, 'Não autenticado', 'https://lotus.cl/errors/unauthenticated'],
            $e instanceof AuthorizationException => [403, 'Acesso negado', 'https://lotus.cl/errors/forbidden'],
            $e instanceof ModelNotFoundException,
            $e instanceof NotFoundHttpException => [404, 'Recurso não encontrado', 'https://lotus.cl/errors/not-found'],
            $e instanceof ThrottleRequestsException => [429, 'Demasiadas solicitudes', 'https://lotus.cl/errors/too-many-requests'],
            $e instanceof HttpExceptionInterface => [$e->getStatusCode(), 'Erro na requisição', 'https://lotus.cl/errors/http'],
            default => [500, 'Erro interno', 'https://lotus.cl/errors/server'],
        };

        $payload = [
            'type' => $type,
            'title' => $title,
            'status' => $status,
            'detail' => self::detailFor($e, $status),
            'instance' => $request->getRequestUri(),
        ];

        // Erros de validação carregam o detalhamento por campo
        if ($e instanceof ValidationException) {
            $payload['errors'] = $e->errors();
        }

        // Os headers da exceção vêm PRIMEIRO e o Content-Type do envelope
        // depois, porque o segundo array vence o merge: `Retry-After` e
        // `X-RateLimit-*` do throttle chegam ao cliente, mas nenhuma exceção
        // consegue tirar a resposta do `application/problem+json` do ADR-03.
        $headers = $e instanceof HttpExceptionInterface ? $e->getHeaders() : [];

        return response()->json($payload, $status, array_merge($headers, [
            'Content-Type' => 'application/problem+json',
        ]));
    }

    /**
     * Em 500 sem debug, não vaza mensagem interna. Nos demais, mostra a mensagem.
     *
     * A exceção à exceção é `PublicDetail`: mensagem escrita para quem lê a
     * resposta atravessa o mascaramento, porque sem ela o operador em produção
     * recebe "erro inesperado" onde o desenho prometeu o certificado e o campo
     * que falta. O default segue sendo mascarar — só quem declara a interface
     * passa.
     */
    private static function detailFor(Throwable $e, int $status): string
    {
        if ($status === 500 && ! config('app.debug') && ! $e instanceof PublicDetail) {
            return 'Ocorreu um erro inesperado. Tente novamente.';
        }

        return $e->getMessage() ?: 'Erro ao processar a requisição.';
    }
}
