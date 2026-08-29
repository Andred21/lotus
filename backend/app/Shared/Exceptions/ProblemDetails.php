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
            $e instanceof ValidationException => [422, __('problem.title.validation'), 'https://lotus.cl/errors/validation'],
            $e instanceof AuthenticationException => [401, __('problem.title.unauthenticated'), 'https://lotus.cl/errors/unauthenticated'],
            $e instanceof AuthorizationException => [403, __('problem.title.forbidden'), 'https://lotus.cl/errors/forbidden'],
            $e instanceof ModelNotFoundException,
            $e instanceof NotFoundHttpException => [404, __('problem.title.not_found'), 'https://lotus.cl/errors/not-found'],
            $e instanceof ThrottleRequestsException => [429, __('problem.title.too_many_requests'), 'https://lotus.cl/errors/too-many-requests'],
            $e instanceof HttpExceptionInterface => [$e->getStatusCode(), __('problem.title.http'), 'https://lotus.cl/errors/http'],
            default => [500, __('problem.title.server'), 'https://lotus.cl/errors/server'],
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
     * Em 500 sem debug, não vaza mensagem interna. Nos demais, mostra a
     * mensagem — mas só quando a mensagem é NOSSA.
     *
     * A regra é por TIPO de exceção, não por inspeção do texto (spec D5):
     * adivinhar se uma string "parece do framework" seria heurística sobre
     * conteúdo. As exceções que o Laravel levanta com texto próprio em inglês
     * (`This action is unauthorized.`) passam a ter `detail` de `lang/`.
     *
     * Duas portas continuam com o `detail` próprio, e são as duas em que
     * alguém escreveu a frase para quem lê a resposta: `ValidationException`
     * (o `getMessage()` é a primeira mensagem de campo, já localizada no
     * `throw`) e quem implementa `PublicDetail` — sem ela o operador em
     * produção recebe "erro inesperado" onde o desenho prometeu o certificado
     * e o campo que falta.
     */
    private static function detailFor(Throwable $e, int $status): string
    {
        if ($status === 500 && ! config('app.debug') && ! $e instanceof PublicDetail) {
            return __('problem.detail.server');
        }

        if ($e instanceof PublicDetail || $e instanceof ValidationException) {
            return $e->getMessage() ?: __('problem.detail.generic');
        }

        return match (true) {
            $e instanceof ThrottleRequestsException => __('problem.detail.too_many_requests'),
            $e instanceof AuthenticationException => __('problem.detail.unauthenticated'),
            $e instanceof AuthorizationException => __('problem.detail.forbidden'),
            $e instanceof ModelNotFoundException,
            $e instanceof NotFoundHttpException => __('problem.detail.not_found'),
            default => $e->getMessage() ?: __('problem.detail.generic'),
        };
    }
}
