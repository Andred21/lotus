<?php

namespace Tests\Unit\Identity;

use App\Domains\Identity\Enums\DocumentValidityStatus;
use App\Domains\Identity\Enums\RedatorDocumentType;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class DocumentValidityStatusTest extends TestCase
{
    public function test_documento_ausente_vence_qualquer_data(): void
    {
        $status = DocumentValidityStatus::for(CarbonImmutable::today()->addYear(), presente: false);

        $this->assertSame(DocumentValidityStatus::Ausente, $status);
    }

    /** `valid_until` nulo vale sempre — mesma semântica do RedatorIdoneidadeService. */
    public function test_sem_data_de_validade_e_vigente(): void
    {
        $status = DocumentValidityStatus::for(null, presente: true);

        $this->assertSame(DocumentValidityStatus::Vigente, $status);
    }

    public function test_data_passada_e_vencido(): void
    {
        $status = DocumentValidityStatus::for(CarbonImmutable::today()->subDay(), presente: true);

        $this->assertSame(DocumentValidityStatus::Vencido, $status);
    }

    /** Vence hoje ainda vale: o gate de idoneidade aceita `valid_until >= hoje`. */
    public function test_vence_hoje_e_vence_em_breve_nao_vencido(): void
    {
        $status = DocumentValidityStatus::for(CarbonImmutable::today(), presente: true);

        $this->assertSame(DocumentValidityStatus::VenceEmBreve, $status);
    }

    public function test_ultimo_dia_da_janela_ainda_e_vence_em_breve(): void
    {
        $limite = CarbonImmutable::today()->addDays(DocumentValidityStatus::DIAS_AVISO);

        $this->assertSame(DocumentValidityStatus::VenceEmBreve, DocumentValidityStatus::for($limite, presente: true));
    }

    public function test_um_dia_depois_da_janela_e_vigente(): void
    {
        $fora = CarbonImmutable::today()->addDays(DocumentValidityStatus::DIAS_AVISO + 1);

        $this->assertSame(DocumentValidityStatus::Vigente, DocumentValidityStatus::for($fora, presente: true));
    }

    /**
     * A D5 da spec vira propriedade do tipo. O REUF decide habilitação de
     * turma pela RN-09 lendo `valid_until`; self-service nele deixaria o
     * Redator declarar a própria validade e se auto-habilitar.
     */
    public function test_apenas_o_reuf_fica_fora_do_self_service(): void
    {
        $this->assertFalse(RedatorDocumentType::REUF->isSelfService());
        $this->assertTrue(RedatorDocumentType::CV->isSelfService());
        $this->assertTrue(RedatorDocumentType::TITULO->isSelfService());
        $this->assertTrue(RedatorDocumentType::POSTGRADO->isSelfService());

        $this->assertSame(['CV', 'TITULO', 'POSTGRADO'], RedatorDocumentType::selfServiceValues());
    }
}
