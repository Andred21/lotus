<?php

namespace Tests\Unit\Certification;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

class CertificateDisplayStatusTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function hoje(string $data): Carbon
    {
        return Carbon::parse($data, CertificateDisplayStatus::TIMEZONE)->startOfDay();
    }

    /**
     * Peso legal: revogado NUNCA volta a parecer vigente por conta da data.
     * A precedência vem antes de qualquer leitura de `valido_ate`.
     */
    public function test_revogado_precede_data_futura(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Revocado,
            $this->hoje('2099-01-01'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Revocado, $status);
    }

    public function test_revogado_precede_vigencia_indeterminada(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Revocado,
            null,
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Revocado, $status);
    }

    /** O caso COMUM: certificado sem prazo é vigente por tempo indeterminado. */
    public function test_sem_valido_ate_e_vigente(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            null,
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Vigente, $status);
    }

    /** Vencer HOJE ainda é vigente — o certificado vale o dia inteiro. */
    public function test_vencer_hoje_ainda_e_vigente(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            $this->hoje('2026-08-24'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Vigente, $status);
    }

    /**
     * D10 regressão: o cast Eloquent (`Certificate::$casts['valido_ate'] =
     * 'date'`) grava `valido_ate` como Carbon em meia-noite UTC, porque
     * `config/app.php` fixa o timezone da aplicação em UTC. `hoje()` devolve
     * meia-noite em Santiago — mesma data de calendário, instante diferente
     * (a meia-noite chilena é ~4h depois da meia-noite UTC do mesmo dia).
     * Comparar por INSTANTE em vez de por data pura faz um certificado
     * vencendo HOJE ser reportado `Vencido` um dia adiantado.
     */
    public function test_valido_ate_em_meia_noite_utc_no_mesmo_dia_de_hoje_e_vigente(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            Carbon::parse('2026-08-24 00:00:00', 'UTC'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Vigente, $status);
    }

    public function test_dia_anterior_a_hoje_e_vencido(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            $this->hoje('2026-08-23'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Vencido, $status);
    }

    /** A borda da janela: 30 dias avisa, 31 ainda não. */
    public function test_trinta_dias_e_por_vencer(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            $this->hoje('2026-09-23'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::PorVencer, $status);
    }

    public function test_trinta_e_um_dias_ainda_e_vigente(): void
    {
        $status = CertificateDisplayStatus::for(
            CertificateStatus::Emitido,
            $this->hoje('2026-09-24'),
            $this->hoje('2026-08-24'),
        );

        $this->assertSame(CertificateDisplayStatus::Vigente, $status);
    }

    /**
     * D10: a derivação roda em America/Santiago mesmo com `config/app.php`
     * fixando UTC. Às 02:00 UTC ainda é o dia ANTERIOR no Chile — sem o fuso
     * explícito, um certificado que vence "amanhã" apareceria como vencendo
     * hoje durante três horas todo dia.
     *
     * A data certa não basta: também precisa ser meia-noite (não meio-dia, que
     * imprimiria a mesma data mas quebraria a comparação por dia inteiro de
     * `for()`) E precisa carregar o fuso Santiago de fato (não um instante UTC
     * que só por acaso imprime a data certa nesta chamada).
     */
    public function test_hoje_resolve_no_fuso_do_chile_e_nao_em_utc(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-10 02:00:00', 'UTC'));

        $hoje = CertificateDisplayStatus::hoje();

        $this->assertInstanceOf(CarbonImmutable::class, $hoje);
        $this->assertSame(CertificateDisplayStatus::TIMEZONE, $hoje->getTimezone()->getName());
        $this->assertSame('2026-03-09', $hoje->toDateString());
        $this->assertSame('00:00:00', $hoje->toTimeString());
    }

    /**
     * Os quatro valores persistidos são um contrato externo, não um detalhe
     * interno: alimentam as chaves i18n `certificate.status.<valor>` e a union
     * TypeScript gerada que o frontend consome. Renomear um caso sem tocar
     * este teste passaria em silêncio — este teste existe para não deixar.
     */
    public function test_valores_persistidos_sao_o_contrato_externo(): void
    {
        $this->assertSame('vigente', CertificateDisplayStatus::Vigente->value);
        $this->assertSame('por_vencer', CertificateDisplayStatus::PorVencer->value);
        $this->assertSame('vencido', CertificateDisplayStatus::Vencido->value);
        $this->assertSame('revocado', CertificateDisplayStatus::Revocado->value);
    }
}
