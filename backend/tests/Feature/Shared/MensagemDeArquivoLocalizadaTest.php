<?php

namespace Tests\Feature\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagemDeArquivoLocalizadaTest extends TestCase
{
    #[Test]
    public function a_planilha_em_formato_errado_recusa_no_locale_pedido(): void
    {
        app()->setLocale('pt_BR');
        $ptBR = __('shared.spreadsheet.unsupported_format');

        app()->setLocale('es_CL');
        $esCL = __('shared.spreadsheet.unsupported_format');

        $this->assertNotSame($ptBR, $esCL);
        $this->assertStringNotContainsString('shared.', $esCL);
    }

    #[Test]
    public function o_teto_de_linhas_interpola_o_numero_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            $this->assertStringContainsString('100', __('shared.spreadsheet.too_many_rows', ['max' => 100]));
        }
    }

    #[Test]
    public function o_teto_do_conjunto_interpola_os_m_b_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            $this->assertStringContainsString('10', __('shared.file.set_too_large', ['max' => 10]));
        }
    }
}
