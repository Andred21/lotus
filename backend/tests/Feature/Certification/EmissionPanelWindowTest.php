<?php

namespace Tests\Feature\Certification;

use App\Domains\Operation\Models\Turma;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Support\Certification\IssuableEnrollmentBuilder;
use Tests\TestCase;

/**
 * DoD 4 da spec: o painel de emissão não pagina (lote e dropdown precisam da
 * turma inteira em memória) — ganha janela por data. Sem parâmetro, só as
 * turmas concluídas nos últimos `JANELA_MESES`; com `concluidas_desde`, o que
 * o operador pedir. A forma do payload não muda.
 */
class EmissionPanelWindowTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-28 12:00:00');
        $this->actingAsAdmin();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_sem_parametro_devolve_so_as_concluidas_nos_ultimos_doze_meses(): void
    {
        $recente = $this->turmaConcluidaEm('2026-07-24');
        $noLimite = $this->turmaConcluidaEm('2025-08-28');
        $this->turmaConcluidaEm('2025-08-27');
        $this->turmaConcluidaEm('2021-03-01');

        $response = $this->getJson('/api/certificates/emission-panel')->assertOk()->assertJsonCount(2);

        // Mais recente primeiro (`end_date` desc), como antes.
        $this->assertSame([$recente->id, $noLimite->id], array_column($response->json(), 'turma_id'));
    }

    public function test_concluidas_desde_abre_a_janela(): void
    {
        $this->turmaConcluidaEm('2026-07-24');
        $this->turmaConcluidaEm('2021-03-01');

        $this->getJson('/api/certificates/emission-panel?concluidas_desde=2021-01-01')->assertOk()->assertJsonCount(2);
        $this->getJson('/api/certificates/emission-panel?concluidas_desde=2026-08-01')->assertOk()->assertJsonCount(0);
    }

    public function test_data_fora_do_formato_e_422(): void
    {
        $this->getJson('/api/certificates/emission-panel?concluidas_desde=01-01-2021')
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json');
    }

    private function turmaConcluidaEm(string $endDate): Turma
    {
        $n = ++$this->seq;
        $pad = str_pad((string) $n, 3, '0', STR_PAD_LEFT);

        return IssuableEnrollmentBuilder::make()
            ->client(['legal_name' => "Empresa {$n} SpA"], ['rut' => "1.000.{$pad}-0"])
            ->course(['name' => "Curso {$n}"])
            ->student(['rut' => "2.000.{$pad}-0"])
            ->redatorUser(['rut' => "3.000.{$pad}-0"])
            ->turma(['start_date' => $endDate, 'end_date' => $endDate])
            ->create()
            ->turmaModel();
    }
}
