<?php

namespace Tests\Feature\Shared;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * As bordas do `Accept-Language` são comportamento DECLARADO (spec §4.5), não
 * acidente: sem header, com locale não suportado ou com `es` puro, a resposta
 * sai em es-CL. E o header é lido pelo PRIMEIRO item, sem negociar `q` — é o
 * que o middleware sempre fez, e agora está medido em vez de suposto.
 */
class SetLocaleTest extends TestCase
{
    /** @return array<string, array{string|null, string}> */
    public static function cabecalhos(): array
    {
        return [
            'sem header' => [null, 'es_CL'],
            'es-CL' => ['es-CL', 'es_CL'],
            'es-cl minusculo' => ['es-cl', 'es_CL'],
            'pt-BR' => ['pt-BR', 'pt_BR'],
            'en' => ['en', 'en'],
            'es puro cai no fallback' => ['es', 'es_CL'],
            'fr-FR cai no fallback' => ['fr-FR', 'es_CL'],
            'primeiro item vence q' => ['pt-BR;q=0.9,es', 'pt_BR'],
        ];
    }

    #[Test]
    #[DataProvider('cabecalhos')]
    public function o_locale_efetivo_sai_do_accept_language(?string $header, string $esperado): void
    {
        $headers = $header === null ? [] : ['Accept-Language' => $header];

        $this->withHeaders($headers)->getJson('/api/me')->assertUnauthorized();

        $this->assertSame($esperado, app()->getLocale());
    }

    /**
     * O 404 de rota que NÃO EXISTE também fala o idioma pedido (Q-4 do review
     * de 2026-08-30).
     *
     * Middleware de GRUPO só roda em rota que casou: `NotFoundHttpException`
     * nasce durante o roteamento, antes da pilha do grupo `api`, então
     * `SetLocale` apendada ali nunca chegava a rodar e todo 404 de URL inválida
     * saía no locale padrão. O `EnvelopeLocalizadoTest` não pegava porque mede
     * `/api/turmas/999999` — rota que casou, 404 de model binding, pilha
     * inteira executada.
     *
     * O remédio é a pilha GLOBAL, que roda antes do roteamento.
     */
    #[Test]
    #[DataProvider('cabecalhos')]
    public function o_404_de_rota_inexistente_tambem_sai_no_locale_pedido(?string $header, string $esperado): void
    {
        $headers = $header === null ? [] : ['Accept-Language' => $header];

        $corpo = $this->withHeaders($headers)
            ->getJson('/api/rota-que-nunca-existiu')
            ->assertNotFound()
            ->json();

        $this->assertSame($esperado, app()->getLocale());

        app()->setLocale($esperado);
        $this->assertSame(__('problem.title.not_found'), $corpo['title']);
        $this->assertSame(__('problem.detail.not_found'), $corpo['detail']);
    }
}
