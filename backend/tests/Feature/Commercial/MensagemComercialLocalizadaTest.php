<?php

namespace Tests\Feature\Commercial;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Cinco recusas do Comercial escreviam literal — quatro em PORTUGUÊS, num
 * produto es-CL (D-07). O teste não repete as frases: mede que existem três
 * traduções distintas e que nenhuma delas é a chave crua.
 */
class MensagemComercialLocalizadaTest extends TestCase
{
    private const CHAVES = [
        'commercial.client.archived',
        'commercial.client.contact_required',
        'commercial.budget.approved_cannot_delete',
        'commercial.quote.approved_cannot_delete',
        'commercial.quote.approved_cannot_edit',
        'commercial.quote.budget_archived',
    ];

    #[Test]
    public function cada_recusa_tem_tres_traducoes_distintas(): void
    {
        foreach (self::CHAVES as $chave) {
            $valores = [];
            foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
                app()->setLocale($locale);
                $valor = __($chave);
                $this->assertNotSame($chave, $valor, "{$chave} não existe em {$locale}.");
                $valores[] = $valor;
            }
            $this->assertCount(3, array_unique($valores), "{$chave} repete texto entre locales.");
        }
    }
}
