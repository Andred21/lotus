<?php

namespace Tests\Unit\Shared;

use App\Shared\Retention\RetentionPolicy;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

/**
 * A política é peça única (spec §4.1). Este teste prova as três janelas e a
 * relação entre elas — anonimizar SEMPRE antes de descartar, senão a fase 1
 * nunca alcança linha nenhuma.
 */
class RetentionPolicyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-26 12:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_janelas_sao_as_decididas_pelo_joao(): void
    {
        $this->assertSame(12, RetentionPolicy::AUDITS_ANONIMIZAR_MESES);
        $this->assertSame(60, RetentionPolicy::AUDITS_DESCARTAR_MESES);
        $this->assertSame(12, RetentionPolicy::LOGIN_LOGS_DESCARTAR_MESES);
    }

    public function test_limites_sao_calculados_a_partir_de_agora(): void
    {
        $this->assertSame('2025-08-26', RetentionPolicy::limiteDeAnonimizacaoDeAudits()->toDateString());
        $this->assertSame('2021-08-26', RetentionPolicy::limiteDeDescarteDeAudits()->toDateString());
        $this->assertSame('2025-08-26', RetentionPolicy::limiteDeDescarteDeLoginLogs()->toDateString());
    }

    public function test_anonimizacao_vem_antes_do_descarte(): void
    {
        $this->assertTrue(
            RetentionPolicy::limiteDeDescarteDeAudits()->lessThan(RetentionPolicy::limiteDeAnonimizacaoDeAudits()),
            'A janela de descarte precisa ser mais antiga que a de anonimização.',
        );
    }

    public function test_chunk_e_positivo(): void
    {
        $this->assertGreaterThan(0, RetentionPolicy::CHUNK);
    }
}
