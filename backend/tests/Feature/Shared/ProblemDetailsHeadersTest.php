<?php

namespace Tests\Feature\Shared;

use App\Shared\Exceptions\ProblemDetails;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Tests\TestCase;

/**
 * O `429` já saía com o envelope certo — o que se perdia eram os headers. A
 * exceção do throttle CARREGA `Retry-After` e `X-RateLimit-*`, e o
 * `response()->json()` do ProblemDetails montava os headers do zero, jogando
 * fora os únicos que dizem ao cliente quando ele pode voltar.
 */
class ProblemDetailsHeadersTest extends TestCase
{
    private function resposta(\Throwable $e): JsonResponse
    {
        return ProblemDetails::fromException($e, Request::create('/api/login', 'POST'));
    }

    public function test_429_tem_titulo_e_type_proprios(): void
    {
        $resposta = $this->resposta(new ThrottleRequestsException('Too Many Attempts.', null, []));

        $this->assertSame(429, $resposta->getStatusCode());
        $this->assertSame(__('problem.title.too_many_requests'), $resposta->getData(true)['title']);
        $this->assertSame(
            'https://lotus.cl/errors/too-many-requests',
            $resposta->getData(true)['type'],
        );
    }

    public function test_429_repassa_retry_after_e_x_rate_limit(): void
    {
        $resposta = $this->resposta(new ThrottleRequestsException('Too Many Attempts.', null, [
            'Retry-After' => 37,
            'X-RateLimit-Limit' => 5,
            'X-RateLimit-Remaining' => 0,
        ]));

        $this->assertSame('37', $resposta->headers->get('Retry-After'));
        $this->assertSame('5', $resposta->headers->get('X-RateLimit-Limit'));
        $this->assertSame('0', $resposta->headers->get('X-RateLimit-Remaining'));
    }

    public function test_content_type_do_problem_details_vence_o_header_da_excecao(): void
    {
        // Uma exceção que tentasse impor outro Content-Type não pode tirar a
        // resposta do envelope do ADR-03. A ordem do merge É o comportamento.
        $resposta = $this->resposta(new ServiceUnavailableHttpException(60, 'Fuera de servicio.', null, 0, [
            'Content-Type' => 'text/plain',
            'Retry-After' => 60,
        ]));

        $this->assertSame(503, $resposta->getStatusCode());
        $this->assertStringStartsWith(
            'application/problem+json',
            (string) $resposta->headers->get('Content-Type'),
        );
        $this->assertSame('60', $resposta->headers->get('Retry-After'));
    }

    public function test_excecao_sem_headers_nao_quebra(): void
    {
        $resposta = $this->resposta(new \RuntimeException('qualquer coisa'));

        $this->assertSame(500, $resposta->getStatusCode());
        $this->assertStringStartsWith(
            'application/problem+json',
            (string) $resposta->headers->get('Content-Type'),
        );
    }
}
