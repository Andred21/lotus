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
}
