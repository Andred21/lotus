<?php

namespace Tests\Feature\Shared;

use App\Domains\Commercial\Models\Budget;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\CreatesDomainRecords;
use Tests\TestCase;

/**
 * P-107: o 422 de upload nomeia o CAMPO no idioma de quem lê. O Laravel
 * troca `:attribute` por `validation.attributes.<campo>` e, sem a chave, cai
 * no nome técnico — "El campo file debe ser…" num produto es-CL.
 */
class UploadAttributeLocaleTest extends TestCase
{
    use CreatesDomainRecords;
    use RefreshDatabase;

    /** O 422 do `.exe` mandado como fatura, no idioma pedido. */
    private function recusaDoExe(string $locale): string
    {
        Storage::fake();
        $this->actingAsAdmin();

        $budget = Budget::create(['client_id' => $this->makeClientWithUser()->id, 'code' => 'Scap 1']);

        $resposta = $this->withHeader('Accept-Language', $locale)
            ->postJson("/api/budgets/{$budget->id}/files", [
                'type' => 'invoice',
                'file' => UploadedFile::fake()->create('virus.exe', 5, 'application/x-msdownload'),
            ])->assertStatus(422)->assertJsonValidationErrors('file');

        return $resposta->json('errors.file.0');
    }

    #[Test]
    public function o_422_de_upload_nomeia_o_campo_em_es_cl(): void
    {
        $frase = $this->recusaDoExe('es-CL');

        $this->assertStringContainsString('archivo', $frase);
        $this->assertStringNotContainsString('file ', $frase);
    }

    #[Test]
    public function o_422_de_upload_nomeia_o_campo_em_pt_br(): void
    {
        $frase = $this->recusaDoExe('pt-BR');

        $this->assertStringContainsString('arquivo', $frase);
        $this->assertStringNotContainsString('file ', $frase);
    }

    #[Test]
    public function o_422_de_upload_em_en_vem_de_lang_en(): void
    {
        $frase = $this->recusaDoExe('en');

        // O atributo em inglês é `file`; o que se prova é que a frase inteira
        // sai do `lang/en`, pela mesma chave que o Laravel usa.
        app()->setLocale('en');
        $this->assertStringContainsString(__('validation.attributes.file'), $frase);
        $this->assertStringStartsWith('The '.__('validation.attributes.file').' field', $frase);
    }

    #[Test]
    public function os_atributos_do_upload_existem_nos_tres_locales(): void
    {
        foreach (['es_CL', 'pt_BR', 'en'] as $locale) {
            app()->setLocale($locale);
            foreach (['file', 'photo', 'type', 'valid_until', 'documents', 'documents.*'] as $campo) {
                // `documents.*` é chave plana: `__()` a leria como caminho aninhado.
                $this->assertNotEmpty(trans('validation.attributes')[$campo] ?? null, "{$campo} falta em {$locale}.");
            }
        }
    }

    #[Test]
    public function o_atributo_curinga_de_documentos_nomeia_o_documento_nos_tres_locales(): void
    {
        // As regras reais são `documents.{TIPO}`: é a chave curinga que as casa.
        foreach (['es_CL' => 'documento', 'pt_BR' => 'documento', 'en' => 'document'] as $locale => $nome) {
            app()->setLocale($locale);

            $mensagem = validator(
                ['documents' => ['CV' => 'não-é-arquivo']],
                ['documents.CV' => ['file']],
            )->errors()->first('documents.CV');

            $this->assertStringContainsString($nome, $mensagem, "documents.CV em {$locale}: {$mensagem}");
            $this->assertStringNotContainsString('documents.CV', $mensagem, "documents.CV em {$locale}: {$mensagem}");
        }
    }
}
