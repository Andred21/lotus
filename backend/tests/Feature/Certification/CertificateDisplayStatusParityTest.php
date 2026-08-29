<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\Certification\CreatesCertificateDisplayFixtures;
use Tests\TestCase;

/**
 * Catraca de paridade (spec D4, §4.3): o `CASE` de `whereDisplayStatus()` e a
 * classificação de domínio `CertificateDisplayStatus::for()` têm de devolver
 * os MESMOS conjuntos — paginar no servidor e filtrar no cliente é
 * contradição, e duas classificações que divergem num documento de peso legal
 * é o que este teste impede.
 *
 * Um certificado em cada ramo, com as bordas: `hoje` (vigente — vencer HOJE
 * ainda é vigente), `hoje + DIAS` (por vencer), `hoje + DIAS + 1` (vigente),
 * `valido_ate` nulo, e revogado com data futura (revogado vence a data).
 */
class CertificateDisplayStatusParityTest extends TestCase
{
    use CreatesCertificateDisplayFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-05 12:00:00');

        $hoje = CertificateDisplayStatus::hoje();

        $this->certificado(CertificateStatus::Emitido, null);
        $this->certificado(CertificateStatus::Emitido, $hoje->subDay()->toDateString());
        $this->certificado(CertificateStatus::Emitido, $hoje->toDateString());
        $this->certificado(CertificateStatus::Emitido, $hoje->addDay()->toDateString());
        $this->certificado(CertificateStatus::Emitido, $hoje->addDays(30)->toDateString());
        $this->certificado(CertificateStatus::Emitido, $hoje->addDays(31)->toDateString());
        $this->certificado(CertificateStatus::Revocado, $hoje->addDays(10)->toDateString());
        $this->certificado(CertificateStatus::Revocado, null);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_o_filtro_sql_devolve_o_mesmo_conjunto_que_a_classificacao_de_dominio(): void
    {
        $hoje = CertificateDisplayStatus::hoje();
        $todos = Certificate::query()->get();
        $this->assertCount(8, $todos);

        foreach (CertificateDisplayStatus::cases() as $status) {
            $esperado = $todos
                ->filter(fn (Certificate $c) => CertificateDisplayStatus::for($c->status, $c->valido_ate, $hoje) === $status)
                ->pluck('id')->sort()->values()->all();

            $sql = Certificate::query()->whereDisplayStatus($status)->pluck('id')->sort()->values()->all();

            $this->assertSame($esperado, $sql, "Divergência em {$status->value}.");
            $this->assertNotSame([], $esperado, "Fixture sem exemplar de {$status->value} — o ramo não foi provado.");
        }
    }

    public function test_o_resumo_conta_cada_ramo_com_o_mesmo_case(): void
    {
        $resumo = Certificate::query()->summaryByDisplayStatus();

        $this->assertSame(
            ['vigente' => 3, 'por_vencer' => 2, 'vencido' => 1, 'revocado' => 2],
            ['vigente' => $resumo->vigente, 'por_vencer' => $resumo->por_vencer, 'vencido' => $resumo->vencido, 'revocado' => $resumo->revocado],
        );
    }
}
