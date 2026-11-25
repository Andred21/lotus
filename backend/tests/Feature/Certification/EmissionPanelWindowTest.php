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
 * turmas concluídas nos últimos `JANELA_MESES`; com `period_start` e/ou
 * `period_end` (inclusivos), o que o operador pedir. Cada turma traz o código
 * da cotação (`quote_code`).
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

    public function test_sem_parametro_aplica_os_12_meses_de_santiago(): void
    {
        $recente = $this->turmaConcluidaEm('2026-07-24');
        $noLimite = $this->turmaConcluidaEm('2025-08-28');
        $this->turmaConcluidaEm('2025-08-27');
        $this->turmaConcluidaEm('2021-03-01');

        $response = $this->getJson('/api/certificates/emission-panel')->assertOk()->assertJsonCount(2);

        // Mais recente primeiro (`end_date` desc), como antes.
        $this->assertSame([$recente->id, $noLimite->id], array_column($response->json(), 'turma_id'));
    }

    public function test_period_start_e_period_end_sao_inclusivos(): void
    {
        $noInicio = $this->turmaConcluidaEm('2026-03-10');
        $noFim = $this->turmaConcluidaEm('2026-05-20');
        $this->turmaConcluidaEm('2026-03-09');
        $this->turmaConcluidaEm('2026-05-21');

        $response = $this->getJson('/api/certificates/emission-panel?period_start=2026-03-10&period_end=2026-05-20')
            ->assertOk()
            ->assertJsonCount(2);

        $this->assertSame([$noFim->id, $noInicio->id], array_column($response->json(), 'turma_id'));
    }

    public function test_so_period_start_nao_tem_limite_superior(): void
    {
        $this->turmaConcluidaEm('2026-08-28');
        $this->turmaConcluidaEm('2021-03-01');

        $this->getJson('/api/certificates/emission-panel?period_start=2024-08-28')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/certificates/emission-panel?period_start=2021-01-01')->assertOk()->assertJsonCount(2);
    }

    public function test_janela_invertida_e_422_em_period_end(): void
    {
        $this->getJson('/api/certificates/emission-panel?period_start=2026-05-20&period_end=2026-03-10')
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonValidationErrors(['period_end'])
            ->assertJsonPath('errors.period_end.0', __('certification.emission_panel.inverted_period'));
    }

    public function test_so_period_end_anterior_ao_inicio_default_e_422(): void
    {
        // Sem `period_start` o início resolve para hoje − 12 meses; um fim de 2
        // anos atrás inverte a janela RESOLVIDA, não os dois campos crus.
        $this->getJson('/api/certificates/emission-panel?period_end=2024-08-28')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['period_end']);
    }

    public function test_data_fora_do_formato_e_422(): void
    {
        $this->getJson('/api/certificates/emission-panel?period_start=01-01-2021')
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json');
    }

    public function test_turma_traz_o_codigo_da_cotacao(): void
    {
        $turma = $this->turmaConcluidaEm('2026-07-24');
        $quote = $turma->quote;

        $this->assertSame("Scap {$quote->budget_id} - R{$quote->seq_in_budget}", $quote->code);

        $this->getJson('/api/certificates/emission-panel')
            ->assertOk()
            ->assertJsonPath('0.quote_code', $quote->code);
    }

    public function test_concluidas_desde_nao_e_mais_aceito(): void
    {
        $this->turmaConcluidaEm('2026-07-24');
        $this->turmaConcluidaEm('2021-03-01');

        // O parâmetro antigo é ignorado: a resposta é a do default de 12 meses.
        $this->getJson('/api/certificates/emission-panel?concluidas_desde=2021-01-01')->assertOk()->assertJsonCount(1);
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
