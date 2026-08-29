<?php

namespace Tests\Feature\Certification;

use App\Domains\Certification\Enums\CertificateDisplayStatus;
use App\Domains\Certification\Enums\CertificateStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\Certification\CreatesCertificateDisplayFixtures;
use Tests\TestCase;

/** DoD 2 da spec sobre `GET /api/certificates`. */
class CertificatePaginationTest extends TestCase
{
    use CreatesCertificateDisplayFixtures;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-05 12:00:00');
        $this->actingAsAdmin();

        $hoje = CertificateDisplayStatus::hoje();
        $this->certificado(CertificateStatus::Emitido, null);                                  // vigente, LOT-2026-1001
        Carbon::setTestNow('2026-08-05 12:00:01');
        $this->certificado(CertificateStatus::Emitido, $hoje->addDays(5)->toDateString());     // por_vencer, 1002
        Carbon::setTestNow('2026-08-05 12:00:02');
        $this->certificado(CertificateStatus::Emitido, $hoje->subDays(5)->toDateString());     // vencido, 1003
        Carbon::setTestNow('2026-08-05 12:00:03');
        $this->certificado(CertificateStatus::Revocado, null);                                 // revocado, 1004
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_display_status_filtra_e_o_resumo_soma_o_escopo_inteiro(): void
    {
        $response = $this->getJson('/api/certificates?display_status=por_vencer')->assertOk();

        $this->assertSame(['por_vencer'], array_unique(array_column($response->json('data'), 'display_status')));
        $response->assertJsonPath('meta.total', 1)->assertJsonPath('meta.total_unfiltered', 4);

        $summary = $response->json('meta.summary');
        $this->assertSame(['vigente' => 1, 'por_vencer' => 1, 'vencido' => 1, 'revocado' => 1], $summary);
        $this->assertSame($response->json('meta.total_unfiltered'), array_sum($summary));
    }

    public function test_default_ordena_por_created_at_decrescente_e_sort_codigo_inverte(): void
    {
        $this->assertSame(
            ['LOT-2026-1004', 'LOT-2026-1003', 'LOT-2026-1002', 'LOT-2026-1001'],
            array_column($this->getJson('/api/certificates')->assertOk()->json('data'), 'codigo'),
        );
        $this->assertSame(
            ['LOT-2026-1001', 'LOT-2026-1002', 'LOT-2026-1003', 'LOT-2026-1004'],
            array_column($this->getJson('/api/certificates?sort=codigo')->assertOk()->json('data'), 'codigo'),
        );
    }

    public function test_q_varre_codigo_e_o_aluno_do_snapshot_e_o_resumo_segue_o_q(): void
    {
        $porCodigo = $this->getJson('/api/certificates?q=1003')->assertOk();
        $this->assertSame(['LOT-2026-1003'], array_column($porCodigo->json('data'), 'codigo'));
        // O resumo é sobre o escopo de `q`: só o vencido sobrou.
        $porCodigo->assertJsonPath('meta.summary.vencido', 1)->assertJsonPath('meta.summary.vigente', 0);

        $porAluno = $this->getJson('/api/certificates?q=Alumno 2')->assertOk();
        $this->assertSame(['LOT-2026-1002'], array_column($porAluno->json('data'), 'codigo'));
    }

    public function test_display_status_fora_do_enum_e_422(): void
    {
        $this->getJson('/api/certificates?display_status=foo')
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json');
    }
}
