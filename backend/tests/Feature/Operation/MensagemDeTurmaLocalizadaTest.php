<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Enums\TurmaDocumentType;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MensagemDeTurmaLocalizadaTest extends TestCase
{
    #[Test]
    public function a_recusa_de_turma_concluida_tem_tres_traducoes(): void
    {
        $valores = [];
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            $valor = __('operation.turma.concluded_locked');
            $this->assertNotSame('operation.turma.concluded_locked', $valor);
            $valores[] = $valor;
        }
        $this->assertCount(3, array_unique($valores));
    }

    #[Test]
    public function a_lista_de_documentos_faltantes_chega_traduzida_e_nao_como_codigo(): void
    {
        app()->setLocale('es_CL');

        $rotulos = array_map(
            fn (TurmaDocumentType $t) => __('operation.document_type.'.$t->value),
            [TurmaDocumentType::MANUAL, TurmaDocumentType::EVALUACION_REDATOR],
        );

        $frase = __('operation.turma.documents_incomplete', ['tipos' => implode(', ', $rotulos)]);

        $this->assertStringNotContainsString('EVALUACION_REDATOR', $frase);
        $this->assertStringContainsString('Manual', $frase);
    }

    #[Test]
    public function todo_tipo_de_documento_de_turma_tem_rotulo_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            foreach (TurmaDocumentType::cases() as $tipo) {
                $chave = 'operation.document_type.'.$tipo->value;
                $this->assertNotSame($chave, __($chave), "{$chave} falta em {$locale}.");
            }
        }
    }
}
