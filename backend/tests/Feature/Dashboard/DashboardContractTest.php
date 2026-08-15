<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Dashboard\Data\AdminDashboardData;
use App\Domains\Dashboard\Data\AdminKpisData;
use App\Domains\Dashboard\Data\RedatorAgendaData;
use App\Domains\Dashboard\Data\RedatorDashboardData;
use App\Domains\Dashboard\Data\RedatorHistoricoData;
use App\Domains\Dashboard\Data\RedatorResumoData;
use Tests\TestCase;

/**
 * Contrato dos dois payloads-raiz do dashboard (spec §4.2/D5, Task 1). Nada
 * aqui lê do banco — só prova a FORMA da serialização: o discriminador
 * `view`, seção não autorizada presente como `null` (não ausente), coleção
 * autorizada e vazia serializando `[]`.
 */
class DashboardContractTest extends TestCase
{
    public function test_admin_dashboard_data_discrimina_view_e_preserva_secoes_nulas(): void
    {
        $data = new AdminDashboardData(
            view: 'admin',
            kpis: new AdminKpisData(
                turmas_em_andamento: 3,
                turmas_encerrando_em_breve: 1,
                turmas_atrasadas: 0,
                conclusoes_por_confirmar: 2,
                cotacoes: null,
                certificados_a_emitir: null,
            ),
            pendencias: [],
            alertas: [],
            pipeline: null,
            agenda: null,
            compliance_turmas: null,
            redatores: null,
            series: null,
            rankings: null,
            period_start: '2026-08-01',
            period_end: '2026-08-31',
        );

        $array = $data->toArray();

        $this->assertSame('admin', $array['view']);

        // Seções não autorizadas ficam PRESENTES como null — nunca ausentes
        // do array. `array_key_exists`, não `isset`, porque `null` faz
        // `isset` mentir.
        foreach (['pipeline', 'agenda', 'compliance_turmas', 'redatores', 'series', 'rankings'] as $secao) {
            $this->assertArrayHasKey($secao, $array, "seção '{$secao}' ausente do array — deveria estar presente como null");
            $this->assertNull($array[$secao], "seção '{$secao}' deveria ser null");
        }

        // Coleções autorizadas e sem dados serializam [], não null nem ausência.
        $this->assertSame([], $array['pendencias']);
        $this->assertSame([], $array['alertas']);
    }

    public function test_redator_dashboard_data_discrimina_view_e_serializa_colecoes_vazias(): void
    {
        $data = new RedatorDashboardData(
            view: 'redator',
            resumo: new RedatorResumoData(
                turmas_em_andamento: 2,
                proximas_turmas: 1,
                pendencias_documentais: 0,
                documentos_vencendo: 0,
            ),
            agenda: new RedatorAgendaData(
                starting_soon: [],
                ending_soon: [],
                in_progress: [],
                overdue: [],
            ),
            pendencias_documentais: [],
            alertas_documentos: [],
            historico: new RedatorHistoricoData(
                turmas_concluidas: 5,
                certificados_emitidos: 5,
            ),
        );

        $array = $data->toArray();

        $this->assertSame('redator', $array['view']);
        $this->assertSame([], $array['pendencias_documentais']);
        $this->assertSame([], $array['alertas_documentos']);
        $this->assertSame([], $array['agenda']['starting_soon']);
        $this->assertSame([], $array['agenda']['ending_soon']);
        $this->assertSame([], $array['agenda']['in_progress']);
        $this->assertSame([], $array['agenda']['overdue']);
    }
}
