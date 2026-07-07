<?php

namespace Tests\Unit\Shared;

use App\Shared\Support\Rut;
use PHPUnit\Framework\TestCase;

class RutTest extends TestCase
{
    public function test_rut_valido_com_pontos_e_traco(): void
    {
        $this->assertTrue(Rut::parse('12.345.678-5')->isValid());
    }

    public function test_rut_valido_sem_formatacao(): void
    {
        $this->assertTrue(Rut::parse('123456785')->isValid());
    }

    public function test_dv_k_maiusculo_ou_minusculo(): void
    {
        $this->assertTrue(Rut::parse('20.347.878-K')->isValid());
        $this->assertTrue(Rut::parse('20347878-k')->isValid());
    }

    public function test_dv_incorreto_invalido(): void
    {
        $this->assertFalse(Rut::parse('12.345.678-9')->isValid());
    }

    public function test_lixo_invalido(): void
    {
        $this->assertFalse(Rut::parse('abc')->isValid());
        $this->assertFalse(Rut::parse('')->isValid());
    }

    public function test_format_normaliza(): void
    {
        $this->assertSame('12.345.678-5', Rut::parse('123456785')->format());
    }
}
