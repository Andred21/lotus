<?php

namespace Tests\Feature\Shared;

use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * C-1 do plano de 2026-08-25. Medido na stack de dev: o nginx entrega ao PHP o
 * `X-Forwarded-For` que o CLIENTE mandou, e `fastcgi_params` já põe em
 * `REMOTE_ADDR` o peer como o nginx o viu — que em produção é o cliente, porque
 * lá o nginx é a borda.
 *
 * Logo `trustProxies` não conserta nada aqui: ele TROCA um endereço correto por
 * um header que qualquer um escolhe, e todo limitador por IP deste bloco vira
 * contornável com uma linha de `curl`. Este teste é a guarda de que ninguém
 * religa isso sem reabrir a decisão.
 */
class ClientIpTrustTest extends TestCase
{
    private function requisicaoForjada(): Request
    {
        return Request::create('/api/login', 'POST', [], [], [], [
            'REMOTE_ADDR' => '172.20.0.1',
            'HTTP_X_FORWARDED_FOR' => '203.0.113.9',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);
    }

    public function test_x_forwarded_for_do_cliente_nao_vira_o_ip_da_requisicao(): void
    {
        $this->assertSame('172.20.0.1', $this->requisicaoForjada()->ip());
    }

    public function test_a_aplicacao_nao_declara_proxy_confiavel(): void
    {
        $this->assertSame(
            [],
            Request::getTrustedProxies(),
            implode("\n", [
                'Algum proxy foi declarado confiável. Com o nginx atual — que apaga o',
                'X-Forwarded-* de entrada — isso é inofensivo; sem ele, é bypass de',
                'todo limitador por IP. Se um balanceador L7 entrou na frente, a',
                'decisão reabre no bloco que o provisionar (item 10), com real_ip_module.',
            ]),
        );
    }
}
