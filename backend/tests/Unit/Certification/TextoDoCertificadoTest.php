<?php

namespace Tests\Unit\Certification;

use App\Domains\Certification\Services\TextoDoCertificado;
use PHPUnit\Framework\TestCase;

class TextoDoCertificadoTest extends TestCase
{
    public function test_fecha_larga_usa_meses_em_espanhol(): void
    {
        $this->assertSame('28 de octubre de 2026', TextoDoCertificado::fechaLarga('2026-10-28'));
        $this->assertSame('1 de enero de 2026', TextoDoCertificado::fechaLarga('2026-01-01'));
    }

    public function test_periodo_no_mesmo_ano(): void
    {
        $this->assertSame(
            'entre el 13 de julio y el 7 de agosto de 2026',
            TextoDoCertificado::periodo('2026-07-13', '2026-08-07'),
        );
    }

    public function test_periodo_que_cruza_o_ano_imprime_os_dois_anos(): void
    {
        $this->assertSame(
            'entre el 28 de diciembre de 2025 y el 3 de enero de 2026',
            TextoDoCertificado::periodo('2025-12-28', '2026-01-03'),
        );
    }

    public function test_periodo_de_um_dia_so(): void
    {
        $this->assertSame('el 13 de julio de 2026', TextoDoCertificado::periodo('2026-07-13', '2026-07-13'));
    }

    public function test_periodo_com_ponta_nula_e_nulo(): void
    {
        $this->assertNull(TextoDoCertificado::periodo(null, '2026-07-13'));
        $this->assertNull(TextoDoCertificado::periodo('2026-07-13', null));
    }

    public function test_nota_usa_virgula_decimal(): void
    {
        $this->assertSame('6,5', TextoDoCertificado::nota('6.5'));
        $this->assertSame('6,5', TextoDoCertificado::nota(6.5));
        $this->assertSame('6,5', TextoDoCertificado::nota('6,5'));
        $this->assertSame('6', TextoDoCertificado::nota(6));
    }

    public function test_asistencia_com_espaco_antes_do_percentual(): void
    {
        $this->assertSame('92,5 %', TextoDoCertificado::asistencia('92.50'));
        $this->assertSame('100 %', TextoDoCertificado::asistencia('100.00'));
        $this->assertSame('95 %', TextoDoCertificado::asistencia('95'));
    }

    public function test_parrafo_completo(): void
    {
        $this->assertSame(
            'La actividad, realizada entre el 13 de julio y el 7 de agosto de 2026, abordó los siguientes '
            .'contenidos: Mantenimiento de subestaciones. El trabajador logró aprobar el curso con nota 6,5 '
            .'y una asistencia de 92,5 %.',
            TextoDoCertificado::parrafo(
                'entre el 13 de julio y el 7 de agosto de 2026',
                'Mantenimiento de subestaciones',
                '6,5',
                '92,5 %',
            ),
        );
    }

    public function test_parrafo_so_periodo(): void
    {
        $this->assertSame('La actividad fue realizada el 13 de julio de 2026.', TextoDoCertificado::parrafo('el 13 de julio de 2026', null, null, null));
    }

    public function test_parrafo_so_descricao_preserva_pontuacao_final(): void
    {
        $this->assertSame('La actividad abordó los siguientes contenidos: Alta tensión!', TextoDoCertificado::parrafo(null, 'Alta tensión!', null, null));
        $this->assertSame('La actividad abordó los siguientes contenidos: Alta tensión.', TextoDoCertificado::parrafo(null, 'Alta tensión', null, null));
    }

    public function test_parrafo_so_resultado(): void
    {
        $this->assertSame('El trabajador logró aprobar el curso con nota 6.', TextoDoCertificado::parrafo(null, null, '6', null));
        $this->assertSame('El trabajador registró una asistencia de 95 %.', TextoDoCertificado::parrafo(null, null, null, '95 %'));
    }

    public function test_parrafo_tudo_nulo(): void
    {
        $this->assertNull(TextoDoCertificado::parrafo(null, null, null, null));
    }
}
