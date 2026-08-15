<?php

namespace Tests\Feature\Dashboard;

use App\Domains\Catalog\Models\Course;
use App\Domains\Certification\Enums\CertificateStatus;
use App\Domains\Certification\Models\Certificate;
use App\Domains\Commercial\Models\Budget;
use App\Domains\Commercial\Models\Client;
use App\Domains\Commercial\Models\Quote;
use App\Domains\Dashboard\Data\DashboardFilterData;
use App\Domains\Identity\Enums\RedatorDocumentType;
use App\Domains\Identity\Models\Redator;
use App\Domains\Identity\Models\Student;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Support\PermissionCatalog;
use App\Domains\Operation\Enums\EnrollmentApprovalStatus;
use App\Domains\Operation\Enums\TurmaStatus;
use App\Domains\Operation\Models\Enrollment;
use App\Domains\Operation\Models\Turma;
use App\Shared\Files\Models\File;
use Carbon\CarbonImmutable;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\Feature\Shared\DomainDependencyTest;
use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * Os 9 cenários da spec §6 sobre `GET /api/dashboard/metricas`.
 *
 * Os testes por serviço já provam cada agregação isoladamente. O que só este
 * arquivo prova é o que nasce da COMPOSIÇÃO: o papel escolhendo o payload, o
 * gate por seção decidindo o que existe no corpo, e — o risco ALTO da spec §9
 * — o que NÃO pode aparecer. As asserções de vazamento são por string no JSON
 * bruto de propósito: `assertJsonMissingPath` só olha onde você aponta, e o
 * risco aqui é justamente o campo que ninguém pensou em apontar.
 *
 * Nota de alcance real, achada ao provar o endpoint contra a API: nenhum
 * redator nasce com `is_active = true` (`CreateRedatorAction`, "até o fluxo de
 * ativação"), então hoje nenhum consegue autenticar em produção. `actingAs`
 * passa por cima disso porque o gate de `is_active` mora no login. O payload do
 * redator está correto e provado; alcançável ele ainda não está.
 */
class DashboardEndpointTest extends TestCase
{
    use RefreshDatabase;
    use ScansPhpSource;

    private const ENDPOINT = '/api/dashboard/metricas';

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        CarbonImmutable::setTestNow('2026-08-14 12:00:00');
    }

    protected function tearDown(): void
    {
        Model::preventLazyLoading(false);
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    // ---------------------------------------------------------------- (1)

    public function test_admin_completo_recebe_todas_as_secoes_com_valores_conferidos(): void
    {
        $this->actingAsAdmin();
        $cenario = $this->cenarioRico();

        $response = $this->getJson(self::ENDPOINT)->assertOk();

        $response->assertJsonPath('view', 'admin');

        // Janela default: 12 meses até hoje (spec §3, `DashboardFilterData`).
        $response->assertJsonPath('period_start', '2025-08-14');
        $response->assertJsonPath('period_end', '2026-08-14');

        $this->assertSame([
            'turmas_em_andamento' => 2,          // T1 e T3
            'turmas_encerrando_em_breve' => 1,   // só T1 (termina em 4 dias)
            'turmas_atrasadas' => 1,             // T3 passou do fim e não concluiu
            'conclusoes_por_confirmar' => 0,     // nenhuma tem documentação completa
            'cotacoes' => ['pending_count' => 1, 'pending_value_uf' => '100.0000'],
            'certificados_a_emitir' => 1,        // a segunda matrícula aprovada de T2
        ], $response->json('kpis'));

        // Cinco exemplares (2 cotações fora de turma + 3 turmas), cinco contados:
        // a soma é o que prova a exclusividade do funil, não os baldes.
        $pipeline = collect($response->json('pipeline'))
            ->mapWithKeys(fn (array $row): array => [$row['stage'] => $row['count']])
            ->all();
        $this->assertSame([
            'quote_pending' => 1,
            'quote_approved_without_turma' => 1,
            'turma_in_progress' => 2,
            'turma_ready_for_conclusion' => 0,
            'concluded_pending_issuance' => 1,
            'fully_issued' => 0,
        ], $pipeline);
        $this->assertSame(5, array_sum($pipeline));

        // Agenda: as janelas se sobrepõem por definição (T1 está em curso E
        // termina em breve); só `overdue` é disjunta das outras.
        $this->assertSame([], $response->json('agenda.starting_soon'));
        $this->assertSame([$cenario['t1']], array_column($response->json('agenda.ending_soon'), 'turma_id'));
        $this->assertSame([$cenario['t1']], array_column($response->json('agenda.in_progress'), 'turma_id'));
        $this->assertSame([$cenario['t3']], array_column($response->json('agenda.overdue'), 'turma_id'));

        // O alerta de turma atrasada é DERIVADO da janela `overdue` acima — não
        // é uma segunda definição de "atrasada" (D8).
        $this->assertSame([[
            'type' => 'turma_overdue',
            'severity' => 'high',
            'entity_id' => $cenario['t3'],
            'date' => '2026-08-01',
            'navigation' => ['turma_id' => $cenario['t3']],
        ]], array_map(
            fn (array $alerta): array => array_diff_key($alerta, ['description' => null]),
            $response->json('alertas'),
        ));

        // Pendências dos três módulos, cada uma etiquetada com sua origem.
        $this->assertSame([
            'commercial' => 2,   // cotação pendente + aprovada sem turma
            'operation' => 4,    // T1 e T3: sem relator + docs incompletos
            'certification' => 1, // T2: matrícula aprovada sem certificado
        ], array_count_values(array_column($response->json('pendencias'), 'module')));

        // Compliance cobre as turmas em andamento — a concluída saiu da mesa.
        // Ordem por `start_date`, não por id: T3 começou em julho e T1 em
        // agosto, então a atrasada vem primeiro.
        $this->assertSame(
            [$cenario['t3'], $cenario['t1']],
            array_column($response->json('compliance_turmas'), 'turma_id'),
        );

        $this->assertSame([
            ['month' => '2026-07', 'count' => 2],
            ['month' => '2026-08', 'count' => 1],
        ], $response->json('series.turmas_iniciadas'));
        $this->assertSame([['month' => '2026-07', 'count' => 1]], $response->json('series.turmas_concluidas'));
        $this->assertSame([['month' => '2026-08', 'count' => 1]], $response->json('series.certificados_emitidos'));
        $this->assertSame([['month' => '2026-08', 'count' => 2]], $response->json('series.matriculas'));
        $this->assertSame([
            ['month' => '2026-06', 'total_uf' => '500.0000'],
            ['month' => '2026-07', 'total_uf' => '400.0000'],
            ['month' => '2026-08', 'total_uf' => '500.0000'],
        ], $response->json('series.uf_aprovada'));

        $this->assertSame([
            ['id' => $cenario['alpha'], 'name' => 'Alpha', 'turmas' => 2, 'matriculas' => 0, 'certificados' => 0, 'uf_aprovada' => '800.0000'],
            ['id' => $cenario['beta'], 'name' => 'Beta', 'turmas' => 1, 'matriculas' => 2, 'certificados' => 1, 'uf_aprovada' => '600.0000'],
        ], $response->json('rankings.courses'));
        $this->assertSame([
            ['id' => $cenario['client'], 'name' => 'Cliente Uno', 'turmas' => 3, 'matriculas' => 2, 'certificados' => 1, 'uf_aprovada' => '1400.0000'],
        ], $response->json('rankings.clients'));
    }

    // ---------------------------------------------------------------- (2)

    public function test_admin_sem_gate_comercial_nao_recebe_nenhum_valor_de_uf(): void
    {
        $this->actingAsAdminSemComercial();
        $this->cenarioRico();

        $response = $this->getJson(self::ENDPOINT)->assertOk();

        $response->assertJsonPath('kpis.cotacoes', null);
        $response->assertJsonPath('series.uf_aprovada', null);

        // As seções do módulo autorizado seguem inteiras: o gate tira o que é
        // comercial, não degrada o resto.
        $this->assertSame(2, $response->json('kpis.turmas_em_andamento'));
        $this->assertSame(1, $response->json('kpis.certificados_a_emitir'));
        $this->assertNotEmpty($response->json('series.turmas_iniciadas'));

        // Funil sem as duas etapas de cotação, com as de turma intactas.
        $this->assertSame(
            ['turma_in_progress', 'turma_ready_for_conclusion', 'concluded_pending_issuance', 'fully_issued'],
            array_column($response->json('pipeline'), 'stage'),
        );

        // Ranking existe, mas a coluna de UF é nula linha a linha.
        $this->assertNotEmpty($response->json('rankings.courses'));
        foreach ([...$response->json('rankings.courses'), ...$response->json('rankings.clients')] as $linha) {
            $this->assertNull($linha['uf_aprovada']);
        }

        // Nenhuma pendência de origem comercial sobreviveu ao gate.
        $this->assertNotContains('commercial', array_column($response->json('pendencias'), 'module'));

        // A asserção que não depende de eu lembrar de todos os campos: o corpo
        // bruto não pode conter valor de UF em lugar NENHUM. Os quatro valores
        // abaixo existem no banco do cenário e apareceriam no payload completo.
        $bruto = $response->getContent();
        foreach (['100.0000', '200.0000', '500.0000', '1400.0000', 'value_uf', 'uf_aprovada": "'] as $agulha) {
            $this->assertStringNotContainsString($agulha, $bruto, "Vazamento comercial no corpo: {$agulha}");
        }
    }

    // ---------------------------------------------------------------- (3)

    public function test_redator_recebe_so_o_proprio_escopo_e_nenhuma_secao_de_admin(): void
    {
        $redator = $this->actingAsRedator();
        $cenario = $this->cenarioRico();
        $outro = $this->makeRedator('Otro Relator');

        // T1 é do redator autenticado; T3 é exclusiva do outro.
        Turma::find($cenario['t1'])->redatores()->attach($redator->id);
        Turma::find($cenario['t3'])->redatores()->attach($outro->id);

        $response = $this->getJson(self::ENDPOINT)->assertOk();

        $response->assertJsonPath('view', 'redator');
        $this->assertSame(
            ['agenda', 'alertas_documentos', 'historico', 'pendencias_documentais', 'resumo', 'view'],
            $this->chavesOrdenadas($response->json()),
        );

        // Nenhuma seção de admin, nem vazia: elas não existem neste payload.
        foreach (['kpis', 'pendencias', 'alertas', 'pipeline', 'compliance_turmas', 'redatores', 'series', 'rankings', 'period_start', 'period_end'] as $secao) {
            $this->assertArrayNotHasKey($secao, $response->json());
        }

        $this->assertSame([$cenario['t1']], array_column($response->json('agenda.in_progress'), 'turma_id'));
        $this->assertSame([$cenario['t1']], array_column($response->json('pendencias_documentais'), 'turma_id'));
    }

    /**
     * A rede de segurança do cenário (3), separada do teste acima de propósito:
     * junto dele ela nunca chegava a rodar — a asserção nomeada reprovava
     * primeiro e a rede ficava sem prova de que morde. Rede que só é exercitada
     * quando tudo já falhou não é rede.
     *
     * O que ela cobre e as asserções nomeadas não: o campo que ESTE teste não
     * sabe nomear. `assertJsonMissingPath` só olha onde você aponta.
     */
    public function test_corpo_do_redator_nao_carrega_turma_alheia_cliente_nem_uf_em_campo_nenhum(): void
    {
        $redator = $this->actingAsRedator();
        $cenario = $this->cenarioRico();
        $outro = $this->makeRedator('Otro Relator');

        Turma::find($cenario['t1'])->redatores()->attach($redator->id);
        Turma::find($cenario['t3'])->redatores()->attach($outro->id);

        $bruto = $this->getJson(self::ENDPOINT)->assertOk()->getContent();

        $this->assertStringContainsString('"turma_id":'.$cenario['t1'], $bruto, 'A turma própria precisa estar lá — senão o teste passaria por corpo vazio.');
        $this->assertStringNotContainsString('"turma_id":'.$cenario['t3'], $bruto);
        $this->assertStringNotContainsString('Cliente Uno', $bruto);
        $this->assertStringNotContainsString('client_name', $bruto);
        $this->assertStringNotContainsString('uf', $bruto);
    }

    // ---------------------------------------------------------------- (4)

    public function test_banco_vazio_responde_200_com_zeros_e_listas_vazias(): void
    {
        $this->actingAsAdmin();

        $response = $this->getJson(self::ENDPOINT)->assertOk();

        $this->assertSame([
            'turmas_em_andamento' => 0,
            'turmas_encerrando_em_breve' => 0,
            'turmas_atrasadas' => 0,
            'conclusoes_por_confirmar' => 0,
            'cotacoes' => ['pending_count' => 0, 'pending_value_uf' => '0.0000'],
            'certificados_a_emitir' => 0,
        ], $response->json('kpis'));

        $this->assertSame([], $response->json('pendencias'));
        $this->assertSame([], $response->json('alertas'));
        $this->assertSame([], $response->json('compliance_turmas'));
        $this->assertSame([], $response->json('redatores'));
        $this->assertSame([], $response->json('rankings.courses'));
        $this->assertSame([], $response->json('rankings.clients'));

        // Funil vazio ainda declara as seis etapas: gráfico com eixo, não
        // ausência de gráfico.
        $this->assertSame([0, 0, 0, 0, 0, 0], array_column($response->json('pipeline'), 'count'));

        foreach (['starting_soon', 'ending_soon', 'in_progress', 'overdue'] as $janela) {
            $this->assertSame([], $response->json("agenda.{$janela}"));
        }
        foreach (['turmas_iniciadas', 'turmas_concluidas', 'certificados_emitidos', 'matriculas', 'uf_aprovada'] as $serie) {
            $this->assertSame([], $response->json("series.{$serie}"), "Série {$serie} autorizada e vazia é `[]`, não `null`.");
        }
    }

    // ---------------------------------------------------------------- (5)

    public function test_periodo_restringe_as_series_e_nao_altera_o_estado_presente(): void
    {
        $this->actingAsAdmin();
        $this->cenarioRico();

        $completo = $this->getJson(self::ENDPOINT)->assertOk();
        $recorte = $this->getJson(self::ENDPOINT.'?period_start=2026-08-01&period_end=2026-08-14')->assertOk();

        $recorte->assertJsonPath('period_start', '2026-08-01');
        $recorte->assertJsonPath('period_end', '2026-08-14');

        // Julho e junho saem das séries...
        $this->assertSame([['month' => '2026-08', 'count' => 1]], $recorte->json('series.turmas_iniciadas'));
        $this->assertSame([], $recorte->json('series.turmas_concluidas'));
        $this->assertSame([['month' => '2026-08', 'total_uf' => '500.0000']], $recorte->json('series.uf_aprovada'));

        // ...e dos rankings, que também são do período: só T1 começou em
        // agosto, então Beta cai a zero turma. Beta continua NA lista porque
        // suas matrículas e seu certificado são de agosto — a linha é do
        // período, não do curso.
        $this->assertSame([1, 0], array_column($recorte->json('rankings.courses'), 'turmas'));
        $this->assertSame([0, 2], array_column($recorte->json('rankings.courses'), 'matriculas'));

        // ...enquanto o estado PRESENTE ignora o período por definição: turma
        // atrasada segue atrasada, pendência segue pendente.
        foreach (['kpis', 'pendencias', 'alertas', 'pipeline', 'agenda', 'compliance_turmas', 'redatores'] as $secao) {
            $this->assertSame(
                $completo->json($secao),
                $recorte->json($secao),
                "A seção `{$secao}` é estado presente e não pode responder ao filtro de período.",
            );
        }
    }

    // ---------------------------------------------------------------- (6)

    public function test_periodo_invertido_e_422_problem_json(): void
    {
        $this->actingAsAdmin();

        $this->getJson(self::ENDPOINT.'?period_start=2026-08-14&period_end=2026-01-01')
            ->assertStatus(422)
            ->assertHeader('content-type', 'application/problem+json')
            ->assertJsonPath('type', 'https://lotus.cl/errors/validation')
            ->assertJsonStructure(['type', 'title', 'status', 'detail', 'instance', 'errors' => ['period_end']]);
    }

    /**
     * O 422 não pode depender de o chamador ter mandado os DOIS limites: cada
     * limite ausente tem um default, e o default participa da janela. Com
     * `period_end` sozinho e anterior ao início default, a resposta era 200 com
     * a janela invertida e séries vazias — entrada inválida virando "não há
     * dado" (Q-2, a lição `falha-vs-lista-vazia` de novo).
     */
    public function test_periodo_com_um_limite_so_e_422_quando_a_janela_resolvida_inverte(): void
    {
        $this->actingAsAdmin();

        // Default de início = 2025-08-14. Um fim anterior a ele inverte a janela.
        $this->getJson(self::ENDPOINT.'?period_end=2020-01-01')
            ->assertStatus(422)
            ->assertHeader('content-type', 'application/problem+json')
            ->assertJsonPath('errors.period_end', [DashboardFilterData::PERIODO_INVERTIDO]);

        // O limite único que NÃO inverte segue válido: a regra é sobre a janela,
        // não sobre a ausência do campo.
        $this->getJson(self::ENDPOINT.'?period_end=2026-08-14')
            ->assertOk()
            ->assertJsonPath('period_start', '2025-08-14')
            ->assertJsonPath('period_end', '2026-08-14');
        $this->getJson(self::ENDPOINT.'?period_start=2026-01-01')
            ->assertOk()
            ->assertJsonPath('period_start', '2026-01-01');

        // Início posterior a hoje inverte contra o fim default.
        $this->getJson(self::ENDPOINT.'?period_start=2030-01-01')
            ->assertStatus(422)
            ->assertJsonPath('errors.period_end', [DashboardFilterData::PERIODO_INVERTIDO]);
    }

    /**
     * D7 ao pé da letra: seção não autorizada sai nula, nunca com zero que
     * mente. Os quatro KPIs de turma eram `int` não-nulo e saíam 0 sem
     * `operation.turma.view` — "não há turma" e "não posso ver turma" viravam a
     * mesma resposta (Q-3).
     */
    public function test_admin_sem_gate_de_operacao_recebe_kpi_de_turma_nulo_e_nao_zero(): void
    {
        $this->actingAsAdminSem('operation.');
        $this->cenarioRico();

        $response = $this->getJson(self::ENDPOINT)->assertOk();

        foreach ([
            'turmas_em_andamento',
            'turmas_encerrando_em_breve',
            'turmas_atrasadas',
            'conclusoes_por_confirmar',
        ] as $kpi) {
            $this->assertNull(
                $response->json("kpis.{$kpi}"),
                "O KPI `{$kpi}` sem `operation.turma.view` é `null`, não 0.",
            );
        }

        // O cenário TEM turmas: sem isso o teste passaria por banco vazio.
        $this->assertSame(3, Turma::query()->count());

        // O gate comercial e o de certificação seguem abertos e respondem.
        $this->assertSame(['pending_count' => 1, 'pending_value_uf' => '100.0000'], $response->json('kpis.cotacoes'));
        $this->assertSame(1, $response->json('kpis.certificados_a_emitir'));

        // E as seções que exigem operação caem inteiras, como já caíam.
        foreach (['pipeline', 'agenda', 'compliance_turmas', 'redatores', 'rankings'] as $secao) {
            $this->assertNull($response->json($secao), "A seção `{$secao}` exige operação.");
        }
    }

    /**
     * Documento de idoneidade é dado de Identity: sai sob `identity.user.view`,
     * o mesmo gate da seção `redatores`. Enquanto pegava carona no gate de
     * certificado, quem só podia ver certificado recebia o `redator_id` de uma
     * pessoa que o mesmo payload lhe negava (Q-1).
     */
    public function test_admin_sem_gate_de_identidade_nao_recebe_alerta_de_documento_de_relator(): void
    {
        $this->actingAsAdminSem('identity.');
        $redator = $this->makeRedator('Relator con Documento');
        $this->makeRedatorDocument($redator, '2026-08-13');

        $response = $this->getJson(self::ENDPOINT)->assertOk();

        $this->assertNull($response->json('redatores'), 'A seção `redatores` já respondia ao gate.');
        $this->assertNotContains(
            'redator_document_expired',
            array_column($response->json('alertas'), 'type'),
        );

        // A rede que não depende de eu apontar o campo: nem o id do relator nem
        // o nome dele podem estar no corpo bruto.
        $bruto = $response->getContent();
        $this->assertStringNotContainsString('redator_id', $bruto);
        $this->assertStringNotContainsString('Relator con Documento', $bruto);
    }

    /**
     * O par positivo do teste acima, em método separado porque a sessão do
     * primeiro request sobrevive ao `actingAs` seguinte — trocar de ator no meio
     * do teste devolveria o mesmo usuário e a asserção viraria enfeite. Sem este
     * método, o teste de cima passaria por um alerta que ninguém emite.
     */
    public function test_admin_com_gate_de_identidade_recebe_alerta_de_documento_de_relator(): void
    {
        $this->actingAsAdmin();
        $redator = $this->makeRedator('Relator con Documento');
        $documento = $this->makeRedatorDocument($redator, '2026-08-13');

        $alertas = $this->getJson(self::ENDPOINT)->assertOk()->json('alertas');

        $this->assertSame([[
            'type' => 'redator_document_expired',
            'severity' => 'high',
            'entity_id' => $documento->id,
            'date' => '2026-08-13',
            'navigation' => ['redator_id' => $redator->id],
        ]], array_map(
            fn (array $alerta): array => array_diff_key($alerta, ['description' => null]),
            $alertas,
        ));
    }

    /**
     * O funil injetava os três serviços de consulta e, sem binding
     * compartilhado, recebia instâncias próprias: a agregação inteira rodava
     * duas vezes por request. O teto conta só as queries contra `turmas` — é
     * onde a duplicação aparece e o total do request está cheio de ruído de
     * sessão e RBAC. Medido neste cenário: 13 depois do conserto, 20 antes
     * (reproduzido devolvendo ao funil as instâncias próprias). O teto é guarda
     * contra o regresso, não meta de performance (Q-6).
     */
    public function test_o_payload_do_admin_nao_reexecuta_a_agregacao_do_funil(): void
    {
        $this->actingAsAdmin();
        $this->cenarioRico();

        $queries = $this->queriesDaRequisicao();

        $emTurmas = array_values(array_filter(
            $queries,
            fn (string $sql): bool => str_contains($sql, 'from "turmas"'),
        ));
        $this->assertLessThanOrEqual(
            13,
            count($emTurmas),
            "Agregação de turma repetida — o funil voltou a consultar por conta própria:\n".implode("\n", $emTurmas),
        );
    }

    /**
     * Q-9: sem gate comercial a coluna de UF do ranking sai nula linha a linha —
     * então a cotação nem chega a ser lida. Carregar sob gate fechado é trabalho
     * que ninguém vai ver.
     */
    public function test_sem_gate_comercial_a_cotacao_do_ranking_nem_e_lida(): void
    {
        $this->actingAsAdminSemComercial();
        $this->cenarioRico();

        $this->assertSame(
            [],
            array_values(array_filter(
                $this->queriesDaRequisicao(),
                fn (string $sql): bool => str_contains($sql, 'value_uf'),
            )),
        );
    }

    /** @return string[] SQL de cada query executada por uma requisição ao endpoint. */
    private function queriesDaRequisicao(): array
    {
        $queries = [];
        DB::listen(function (QueryExecuted $query) use (&$queries): void {
            $queries[] = $query->sql;
        });

        $this->getJson(self::ENDPOINT)->assertOk();

        return $queries;
    }

    // ---------------------------------------------------------------- (7)

    public function test_certificado_revogado_nao_devolve_a_matricula_para_a_emitir(): void
    {
        $this->actingAsAdmin();
        $client = $this->makeCliente('Cliente Revogado');
        $course = Course::create(['name' => 'Gamma', 'workload_hours' => 8]);
        $turma = $this->makeTurma($client, $course, TurmaStatus::Concluida, '2026-07-01', '2026-07-10', '400.0000', '2026-07-01');
        $enrollment = $this->makeEnrollment($turma, $client, EnrollmentApprovalStatus::Aprobado);
        $this->makeCertificate($enrollment, $course, CertificateStatus::Revocado, validoAte: '2026-08-20');

        $response = $this->getJson(self::ENDPOINT)->assertOk();

        // D6: a matrícula foi certificada uma vez; revogar não a devolve à fila
        // de emissão. Reemitir é decisão humana, não consequência automática.
        $response->assertJsonPath('kpis.certificados_a_emitir', 0);
        $this->assertNotContains(
            'enrollment_awaiting_certificate',
            array_column($response->json('pendencias'), 'type'),
        );

        // E o certificado revogado, mesmo com validade dentro do horizonte, não
        // alerta: alertar sobre a validade de um documento já anulado é ruído.
        $this->assertSame([], $response->json('alertas'));

        // A turma tampouco fica presa em "emissão pendente" no funil.
        $this->assertSame(
            ['concluded_pending_issuance' => 0, 'fully_issued' => 1],
            collect($response->json('pipeline'))
                ->mapWithKeys(fn (array $row): array => [$row['stage'] => $row['count']])
                ->only(['concluded_pending_issuance', 'fully_issued'])
                ->all(),
        );
    }

    // ---------------------------------------------------------------- (8)

    public function test_cenario_representativo_nao_lazy_loada_sob_prevent_lazy_loading(): void
    {
        $this->actingAsAdmin();
        $this->cenarioRico();
        // `Model::preventLazyLoading()` só marca a instância quando ela vem de
        // um `hydrate()` com MAIS de uma linha. O `cenarioRico()` já produz 3
        // turmas, 2 matrículas e 2 cursos; os relatores abaixo fecham a última
        // coleção que ficaria com uma linha só — e é a seção `redatores` que
        // percorre relação por linha.
        $a = $this->makeRedator('Relator Uno');
        $b = $this->makeRedator('Relator Dos');
        Turma::query()->orderBy('id')->get()->each(fn (Turma $t) => $t->redatores()->attach([$a->id, $b->id]));

        Model::preventLazyLoading();

        $this->getJson(self::ENDPOINT)->assertOk()->assertJsonPath('view', 'admin');
    }

    // ---------------------------------------------------------------- (9)

    public function test_matriz_de_dependencia_do_dashboard_nao_tem_aresta_sobrando(): void
    {
        // `DomainDependencyTest` só reprova aresta USADA e não declarada. A
        // direção contrária — declarada e não usada — passa em silêncio, e foi
        // exatamente onde o plano deste bloco errou duas vezes (prometeu aresta
        // que não existia na Task 3, e faltou com duas na Task 4). Uma matriz
        // com permissão a mais é permissão que ninguém pediu.
        $codigo = '';

        foreach ($this->arquivosPhp(base_path('app/Domains/Dashboard')) as $arquivo) {
            $codigo .= $this->codigoSemComentarios($arquivo);
        }

        $declaradas = (new \ReflectionClass(DomainDependencyTest::class))
            ->getConstant('ALLOWED')['Dashboard'];

        $sobrando = array_values(array_filter(
            $declaradas,
            fn (string $aresta): bool => ! str_contains($codigo, 'App\\Domains\\'.$aresta),
        ));

        $this->assertSame([], $sobrando, "Aresta declarada para Dashboard sem `use` correspondente:\n".implode("\n", $sobrando));
    }

    // ------------------------------------------------------------- atores

    /** Admin com tudo menos as permissões comerciais (cenário 2 da spec §6). */
    private function actingAsAdminSemComercial(): User
    {
        return $this->actingAsAdminSem('commercial.');
    }

    /**
     * Admin com o catálogo inteiro MENOS um módulo. Cada gate de seção é
     * exercitado tirando exatamente uma permissão — o resto do payload segue
     * inteiro, que é o que separa "seção censurada" de "dashboard quebrado".
     */
    private function actingAsAdminSem(string $prefixo): User
    {
        $this->seed(RolePermissionSeeder::class);

        $role = Role::findOrCreate('sin-'.trim($prefixo, '.'), 'web');
        $role->syncPermissions(array_values(array_filter(
            array_keys(PermissionCatalog::descriptions()),
            fn (string $permissao): bool => ! str_starts_with($permissao, $prefixo),
        )));

        $user = User::factory()->create(['type' => 'admin', 'is_active' => true]);
        $user->assignRole($role);
        $this->actingAs($user, 'web');

        return $user;
    }

    private function actingAsRedator(): Redator
    {
        $this->seed(RolePermissionSeeder::class);

        $user = User::factory()->create(['type' => 'redator', 'is_active' => true]);
        $user->assignRole('redator');
        $this->actingAs($user, 'web');

        return Redator::create(['user_id' => $user->id]);
    }

    // ---------------------------------------------------------- fixtures

    /**
     * Cinco exemplares que cobrem os três módulos e as três janelas de tempo:
     * 2 cotações fora de turma, 1 turma em curso, 1 atrasada e 1 concluída
     * com emissão pela metade.
     *
     * @return array{client:int, alpha:int, beta:int, t1:int, t2:int, t3:int}
     */
    private function cenarioRico(): array
    {
        $client = $this->makeCliente('Cliente Uno');
        $alpha = Course::create(['name' => 'Alpha', 'workload_hours' => 8]);
        $beta = Course::create(['name' => 'Beta', 'workload_hours' => 16]);

        // Cotação pendente e cotação aprovada sem turma: os dois primeiros
        // baldes do funil, ambos em Beta para manter a UF de Alpha legível.
        $this->makeQuote($client, $beta, 'pending', '100.0000', null);
        $this->makeQuote($client, $beta, 'approved', '200.0000', '2026-08-05');

        $t1 = $this->makeTurma($client, $alpha, TurmaStatus::EmAndamento, '2026-08-10', '2026-08-18', '300.0000', '2026-08-01');
        $t3 = $this->makeTurma($client, $alpha, TurmaStatus::EmAndamento, '2026-07-01', '2026-08-01', '500.0000', '2026-06-15');
        $t2 = $this->makeTurma($client, $beta, TurmaStatus::Concluida, '2026-07-01', '2026-07-10', '400.0000', '2026-07-01');
        $t2->forceFill(['concluded_at' => '2026-07-11 09:00:00'])->save();

        // Duas matrículas aprovadas, uma certificada: T2 fica em "emissão
        // pendente", não em "tudo emitido".
        $this->makeCertificate($this->makeEnrollment($t2, $client, EnrollmentApprovalStatus::Aprobado), $beta);
        $this->makeEnrollment($t2, $client, EnrollmentApprovalStatus::Aprobado);

        return [
            'client' => $client->id,
            'alpha' => $alpha->id,
            'beta' => $beta->id,
            't1' => $t1->id,
            't2' => $t2->id,
            't3' => $t3->id,
        ];
    }

    private function makeCliente(string $legalName): Client
    {
        $n = ++$this->seq;
        $user = User::factory()->create([
            'name' => $legalName,
            'rut' => "76.000.00{$n}-{$n}",
            'type' => 'cliente',
            'is_active' => false,
        ]);

        return $user->client()->create(['legal_name' => $legalName, 'type' => 'client']);
    }

    private function makeRedator(string $name): Redator
    {
        $n = ++$this->seq;
        $user = User::factory()->create([
            'name' => $name,
            'rut' => "12.000.00{$n}-{$n}",
            'type' => 'redator',
            'is_active' => true,
        ]);

        return Redator::create(['user_id' => $user->id]);
    }

    private function makeRedatorDocument(Redator $redator, string $validUntil): File
    {
        $n = ++$this->seq;

        return File::create([
            'fileable_type' => 'redator',
            'fileable_id' => $redator->id,
            'type' => RedatorDocumentType::REUF->value,
            'path' => "dashboard/redatores/{$redator->id}/reuf-{$n}.pdf",
            'original_name' => "reuf-{$n}.pdf",
            'mime' => 'application/pdf',
            'size' => 100,
            'valid_until' => $validUntil,
        ]);
    }

    private function makeQuote(
        Client $client,
        Course $course,
        string $status,
        string $valueUf,
        ?string $approvedAt,
    ): Quote {
        $budget = Budget::firstOrCreate(['client_id' => $client->id, 'code' => "Scap {$client->id}"]);

        return Quote::create([
            'budget_id' => $budget->id,
            'course_id' => $course->id,
            'seq_in_budget' => ++$this->seq,
            'student_count' => 10,
            'value_uf' => $valueUf,
            'status' => $status,
            'approved_at' => $approvedAt,
            'planned_start_date' => '2026-09-01',
        ]);
    }

    private function makeTurma(
        Client $client,
        Course $course,
        TurmaStatus $status,
        string $start,
        string $end,
        string $valueUf,
        string $approvedAt,
    ): Turma {
        return Turma::create([
            'quote_id' => $this->makeQuote($client, $course, 'approved', $valueUf, $approvedAt)->id,
            'course_id' => $course->id,
            'modalidade' => 'online',
            'local_aplicacao' => null,
            'start_date' => $start,
            'end_date' => $end,
            'status' => $status,
        ]);
    }

    private function makeEnrollment(Turma $turma, Client $client, EnrollmentApprovalStatus $status): Enrollment
    {
        $n = ++$this->seq;
        $user = User::factory()->create([
            'name' => "Alumno {$n}",
            'rut' => "10.000.00{$n}-{$n}",
            'type' => 'aluno',
            'is_active' => false,
        ]);
        $student = Student::create(['user_id' => $user->id, 'current_client_id' => $client->id]);

        return Enrollment::create([
            'turma_id' => $turma->id,
            'student_id' => $student->id,
            'grades' => ['final' => 6.0],
            'attendance_pct' => '90.00',
            'approval_status' => $status,
        ]);
    }

    private function makeCertificate(
        Enrollment $enrollment,
        Course $course,
        CertificateStatus $status = CertificateStatus::Emitido,
        ?string $validoAte = null,
    ): Certificate {
        $n = ++$this->seq;

        return Certificate::create([
            'uuid' => (string) Str::uuid(),
            'enrollment_id' => $enrollment->id,
            'course_id' => $course->id,
            'redator_id' => $this->makeRedator("Firmante {$n}")->id,
            'codigo' => "LOT-DASH-EP-{$n}",
            'snapshot' => ['aluno' => ['name' => "Alumno {$n}"]],
            'valido_ate' => $validoAte,
            'status' => $status,
            'revoked_at' => $status === CertificateStatus::Revocado ? '2026-08-10 10:00:00' : null,
            'revocation_reason' => $status === CertificateStatus::Revocado ? 'Error en el nombre.' : null,
        ]);
    }

    /** @param array<string, mixed> $payload */
    private function chavesOrdenadas(array $payload): array
    {
        $chaves = array_keys($payload);
        sort($chaves);

        return $chaves;
    }
}
