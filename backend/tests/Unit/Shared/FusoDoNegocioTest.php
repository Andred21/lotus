<?php

namespace Tests\Unit\Shared;

use App\Shared\Support\FusoDoNegocio;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

class FusoDoNegocioTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /** 02:00 UTC de 25/09 são 23:00 de 24/09 em Santiago (UTC-3, horário de verão). */
    public function test_agora_carrega_o_fuso_do_negocio(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-25 02:00:00', 'UTC'));

        $agora = FusoDoNegocio::agora();

        $this->assertSame(FusoDoNegocio::TIMEZONE, $agora->getTimezone()->getName());
        $this->assertSame('2026-09-24 23:00:00', $agora->toDateTimeString());
    }

    /**
     * A trava do relógio é global no Carbon 3: congelar pelo `Carbon` mutável
     * (como fazem os testes de emissão) congela também o `CarbonImmutable` que
     * o seam lê. Sem isto, os testes de emissão provariam o relógio real.
     */
    public function test_agora_obedece_a_trava_do_carbon_mutavel(): void
    {
        Carbon::setTestNow('2026-08-05 14:30:00');

        $this->assertSame('2026-08-05', FusoDoNegocio::agora()->toDateString());
    }

    /**
     * `hoje()` tem a forma do cast `date`: meia-noite no fuso da APLICAÇÃO.
     * Meia-noite de Santiago seria outro instante (03:00 UTC), e comparar
     * instantes marcaria vencido o que vence hoje.
     */
    public function test_hoje_e_o_dia_de_santiago_a_meia_noite_do_fuso_da_aplicacao(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-25 02:00:00', 'UTC'));

        $hoje = FusoDoNegocio::hoje();

        $this->assertSame('2026-09-24', $hoje->toDateString());
        $this->assertSame('00:00:00', $hoje->toTimeString());
        $this->assertSame(date_default_timezone_get(), $hoje->getTimezone()->getName());
        $this->assertTrue($hoje->equalTo(CarbonImmutable::parse('2026-09-24')));
    }

    /** No inverno o Chile é UTC-4: 03:30 UTC de 15/07 ainda são 23:30 de 14/07. */
    public function test_hoje_acompanha_o_horario_de_inverno(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-15 03:30:00', 'UTC'));

        $this->assertSame('2026-07-14', FusoDoNegocio::hoje()->toDateString());
    }

    public function test_data_de_projeta_o_instante_no_dia_local_sem_mutar_o_argumento(): void
    {
        $instante = Carbon::parse('2026-09-25 01:30:00', 'UTC');

        $this->assertSame('2026-09-24', FusoDoNegocio::dataDe($instante));
        $this->assertSame('UTC', $instante->getTimezone()->getName());
        $this->assertNull(FusoDoNegocio::dataDe(null));
    }
}
