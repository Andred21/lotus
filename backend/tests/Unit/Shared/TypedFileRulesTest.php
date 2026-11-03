<?php

namespace Tests\Unit\Shared;

use App\Domains\Commercial\Enums\BudgetDocumentType;
use App\Domains\Commercial\Enums\QuoteDocumentType;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Operation\Enums\TurmaDocumentType;
use App\Shared\Files\ContentClass;
use App\Shared\Files\Data\TypedFileRules;
use App\Shared\Files\Rules\ScannedForMalware;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class TypedFileRulesTest extends TestCase
{
    public function test_tipo_valido_pede_a_classe_do_enum(): void
    {
        $regras = TypedFileRules::for(['type' => 'purchase_order'], BudgetDocumentType::class);

        $this->assertEquals(ContentClass::Documento->regras(), $regras['file']);
    }

    public function test_tipo_invalido_nao_pede_regra_de_conteudo(): void
    {
        $regras = TypedFileRules::for(['type' => 'xxx'], BudgetDocumentType::class);

        $this->assertSame(['required'], $regras['file']);
        foreach ($regras['file'] as $regra) {
            $this->assertNotInstanceOf(ScannedForMalware::class, $regra);
        }
    }

    public function test_type_fora_dos_permitidos_reprova(): void
    {
        $payload = ['type' => RedatorDocumentType::REUF->value, 'file' => 'x'];
        $regras = TypedFileRules::for($payload, RedatorDocumentType::class, RedatorDocumentType::selfServiceValues());

        $falhas = Validator::make($payload, $regras)->errors()->keys();

        $this->assertSame(['type'], $falhas);
        $this->assertSame(['required'], $regras['file']);
    }

    public function test_validade_aceita_e_proibida(): void
    {
        $cv = TypedFileRules::for(['type' => 'CV'], RedatorDocumentType::class, null, true);
        $firma = TypedFileRules::for(['type' => 'FIRMA'], RedatorDocumentType::class, null, true);
        $semFlag = TypedFileRules::for(['type' => 'CV'], RedatorDocumentType::class);

        $this->assertSame(['nullable', 'date'], $cv['valid_until']);
        $this->assertSame(['prohibited'], $firma['valid_until']);
        $this->assertArrayNotHasKey('valid_until', $semFlag);
    }

    public function test_mapa_dos_enums(): void
    {
        foreach (BudgetDocumentType::cases() as $tipo) {
            $this->assertSame(ContentClass::Documento, $tipo->conteudo());
            $this->assertFalse($tipo->aceitaValidade());
        }
        $this->assertSame(ContentClass::Documento, QuoteDocumentType::QUOTE_DOCUMENT->conteudo());
        $this->assertFalse(QuoteDocumentType::QUOTE_DOCUMENT->aceitaValidade());
        foreach (TurmaDocumentType::cases() as $tipo) {
            $this->assertSame(ContentClass::DocumentoDeTurma, $tipo->conteudo());
            $this->assertFalse($tipo->aceitaValidade());
        }
    }
}
