<?php

namespace Tests\Feature\CargaInicial;

use App\Console\CargaInicial\ArquivoDeCarga;
use App\Console\CargaInicial\Extracao\Normalizacao;
use App\Console\CargaInicial\Extracao\Normalizador;
use App\Shared\Support\Rut;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\CargaInicial\CargaSintetica;
use Tests\Support\CargaInicial\ComplementoSintetico;
use Tests\Support\CargaInicial\PlanilhaSintetica;
use Tests\TestCase;

/**
 * As regras R1–R12 da spec §2 e §5.1: o que sai da carga, o que vira recusa
 * (com o motivo) e o que aborta tudo como erro. Só dado inventado.
 */
class NormalizadorTest extends TestCase
{
    /**
     * Duas linhas na SCAP 176 (curso 200#, 16 h, dois dias) e uma na 178 (curso 201#, 8 h).
     *
     * @return list<array<string, mixed>>
     */
    private function linhasValidas(): array
    {
        return [
            PlanilhaSintetica::linha(),
            PlanilhaSintetica::linha([
                'codigo' => 'LOT-2026-002',
                'aluno_rut' => CargaSintetica::rut(16222222),
                'aluno_nome' => 'Alumno Dos',
                'evaluacion' => null,
                'nom_curso' => 'Nombre Técnico A',
            ]),
            PlanilhaSintetica::linha([
                'codigo' => 'LOT-2026-003',
                'curso_seletor' => '201# Curso Prueba B',
                'horas' => 8,
                'aluno_rut' => CargaSintetica::rut(16333333),
                'aluno_nome' => 'Alumno Tres',
                'fecha_curso' => '2026-07-25',
                'evaluacion' => 6.5,
                'servicio' => 'scap-178',
                'nom_curso' => 'Curso B',
                'realizado_en' => 'Santiago',
                'f_emision' => '2026-07-30',
            ]),
        ];
    }

    private function normalizar(array $linhas, ?array $complemento = null): Normalizacao
    {
        return (new Normalizador)->normalizar($linhas, $complemento ?? ComplementoSintetico::dados());
    }

    /** O complemento sem a SCAP 178, para os testes de uma linha só. */
    private function complementoSoComA176(): array
    {
        $complemento = ComplementoSintetico::dados();
        $complemento['cotacoes'] = array_values(array_filter(
            $complemento['cotacoes'],
            fn (array $c) => $c['scap'] !== 178,
        ));

        return $complemento;
    }

    /** Um número cujo DV é `K`, para o teste do RUT em minúsculas e sem pontos. */
    private function numeroComDvK(): int
    {
        for ($numero = 12_345_600; ; $numero++) {
            if (Rut::parse($numero.'K')->isValid()) {
                return $numero;
            }
        }
    }

    public function test_saida_cumpre_o_contrato_do_arquivo_de_carga(): void
    {
        $n = $this->normalizar($this->linhasValidas());

        $this->assertSame([], $n->erros);
        $this->assertSame([], ArquivoDeCarga::validar($n->carga));
        $this->assertSame(3, $n->linhasNoRecorte);
        $this->assertSame([], $n->recusas);
    }

    public function test_so_entra_o_prefixo_e_a_exclusao_explicita_vira_recusa(): void
    {
        $linhas = [
            ...$this->linhasValidas(),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2025-900', 'servicio' => 'SCAP-1']),
            PlanilhaSintetica::linha([
                'codigo' => 'LOT-2026-020',
                'aluno_rut' => CargaSintetica::rut(16444444),
                'aluno_nome' => 'Alumno Cuatro',
                'servicio' => '1000',
            ]),
        ];

        $n = $this->normalizar($linhas);

        $this->assertSame([], $n->erros);
        $this->assertSame(4, $n->linhasNoRecorte);
        $this->assertSame(
            [['codigo' => 'LOT-2026-020', 'motivo' => 'Curso de 2024 fora do recorte']],
            $n->recusas,
        );
        $codigos = [];
        foreach ($n->carga['orcamentos'] as $o) {
            foreach ($o['turma']['matriculas'] ?? [] as $m) {
                $codigos[] = $m['certificado']['codigo'];
            }
        }
        $this->assertSame(['LOT-2026-001', 'LOT-2026-002', 'LOT-2026-003'], $codigos);
    }

    public function test_rut_com_dv_invalido_sai_inteiro(): void
    {
        $invalido = '16.555.555-0';
        $this->assertFalse(Rut::parse($invalido)->isValid());

        $n = $this->normalizar([
            ...$this->linhasValidas(),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-004', 'aluno_rut' => $invalido, 'aluno_nome' => 'Alumno Cinco']),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-005', 'aluno_rut' => $invalido, 'aluno_nome' => 'Alumno Cinco']),
        ]);

        $this->assertSame([], $n->erros);
        $this->assertSame(
            [
                ['codigo' => 'LOT-2026-004', 'motivo' => 'RUT com DV inválido'],
                ['codigo' => 'LOT-2026-005', 'motivo' => 'RUT com DV inválido'],
            ],
            $n->recusas,
        );
        $this->assertNotContains('16.555.555-0', array_column($n->carga['alunos'], 'rut'));
        $this->assertCount(3, $n->carga['alunos']);
    }

    public function test_rut_com_nomes_diferentes_sai_inteiro(): void
    {
        $rut = CargaSintetica::rut(16666666);

        $n = $this->normalizar([
            ...$this->linhasValidas(),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-004', 'aluno_rut' => $rut, 'aluno_nome' => 'Ana Pérez']),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-005', 'aluno_rut' => $rut, 'aluno_nome' => 'Ana Peres', 'servicio' => 'SCAP-178', 'curso_seletor' => '201# Curso Prueba B', 'horas' => 8, 'fecha_curso' => '2026-07-25', 'realizado_en' => 'Santiago']),
        ]);

        $this->assertSame([], $n->erros);
        $this->assertSame(
            [
                ['codigo' => 'LOT-2026-004', 'motivo' => 'RUT com nomes diferentes'],
                ['codigo' => 'LOT-2026-005', 'motivo' => 'RUT com nomes diferentes'],
            ],
            $n->recusas,
        );
        $this->assertNotContains($rut, array_column($n->carga['alunos'], 'rut'));
    }

    public function test_acento_e_caixa_contam_como_nome_diferente(): void
    {
        $rut = CargaSintetica::rut(16777777);

        $n = $this->normalizar([
            ...$this->linhasValidas(),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-004', 'aluno_rut' => $rut, 'aluno_nome' => 'Ana Pérez']),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-005', 'aluno_rut' => $rut, 'aluno_nome' => 'ANA PÉREZ', 'servicio' => 'SCAP-178', 'curso_seletor' => '201# Curso Prueba B', 'horas' => 8, 'fecha_curso' => '2026-07-25', 'realizado_en' => 'Santiago']),
        ]);

        $this->assertCount(2, $n->recusas);
    }

    public function test_espaco_a_mais_no_nome_nao_exclui_o_rut(): void
    {
        $rut = CargaSintetica::rut(16888888);

        $n = $this->normalizar([
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-001', 'aluno_rut' => $rut, 'aluno_nome' => 'Ana  Pérez ']),
            PlanilhaSintetica::linha([
                'codigo' => 'LOT-2026-002', 'aluno_rut' => $rut, 'aluno_nome' => 'Ana Pérez',
                'servicio' => 'SCAP-178', 'curso_seletor' => '201# Curso Prueba B', 'horas' => 8,
                'fecha_curso' => '2026-07-25', 'realizado_en' => 'Santiago',
            ]),
        ]);

        $this->assertSame([], $n->erros);
        $this->assertSame([], $n->recusas);
        $this->assertCount(1, $n->carga['alunos']);
        $this->assertSame('Ana Pérez', $n->carga['alunos'][0]['name']);
    }

    public function test_rut_sem_pontos_sai_formatado_e_com_email_minusculo(): void
    {
        $numero = $this->numeroComDvK();
        $formatado = Rut::parse($numero.'K')->format();

        $n = $this->normalizar([
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-001', 'aluno_rut' => $numero.'k', 'aluno_nome' => 'Alumno K']),
            PlanilhaSintetica::linha([
                'codigo' => 'LOT-2026-002', 'aluno_rut' => $formatado, 'aluno_nome' => 'Alumno K',
                'servicio' => 'SCAP-178', 'curso_seletor' => '201# Curso Prueba B', 'horas' => 8,
                'fecha_curso' => '2026-07-25', 'realizado_en' => 'Santiago',
            ]),
        ]);

        $this->assertSame([], $n->erros);
        $this->assertCount(1, $n->carga['alunos']);
        $aluno = $n->carga['alunos'][0];
        $this->assertSame($formatado, $aluno['rut']);
        $this->assertStringEndsWith('-K', $aluno['rut']);
        $this->assertSame($numero.'k@sin-correo.invalid', $aluno['email']);
        $this->assertSame(CargaSintetica::email($formatado), $aluno['email']);
        $this->assertSame('2026-07-10', $aluno['desde']);
        // As matrículas apontam para o RUT já formatado.
        $this->assertSame($formatado, $n->carga['orcamentos'][0]['turma']['matriculas'][0]['aluno']);
    }

    public function test_turma_de_dois_dias_quando_o_curso_pede(): void
    {
        $n = $this->normalizar($this->linhasValidas());

        $turma = $n->carga['orcamentos'][0]['turma'];
        $this->assertSame('2026-07-10', $turma['start_date']);
        $this->assertSame('2026-07-11', $turma['end_date']);
        $this->assertSame('200#', $turma['curso']);
        $this->assertSame('Talca', $turma['local_aplicacao']);
        $this->assertSame('R1', $turma['redator']);

        // Curso sem `dias_de_turma`: conta um dia.
        $umDia = $n->carga['orcamentos'][2]['turma']; // [0]=176, [1]=177 (sem turma), [2]=178
        $this->assertSame('2026-07-25', $umDia['start_date']);
        $this->assertSame('2026-07-25', $umDia['end_date']);
    }

    public function test_dois_dias_atravessam_o_fim_do_mes(): void
    {
        $n = $this->normalizar([
            PlanilhaSintetica::linha(['fecha_curso' => '2026-07-31']),
        ], $this->complementoSoComA176());

        $this->assertSame('2026-08-01', $n->carga['orcamentos'][0]['turma']['end_date']);
    }

    public function test_cotacao_com_turma_conta_os_alunos_e_sem_turma_fica_pendente(): void
    {
        $n = $this->normalizar($this->linhasValidas());

        $porScap = array_column($n->carga['orcamentos'], null, 'scap');
        $this->assertSame([176, 177, 178], array_keys($porScap));

        $com = $porScap[176];
        $this->assertSame('2026-07-10', $com['data']);
        $this->assertSame(
            ['curso' => '200#', 'student_count' => 2, 'value_uf' => '122.3200', 'status' => 'approved', 'approved_on' => '2026-07-10'],
            $com['cotacao'],
        );
        $this->assertCount(2, $com['turma']['matriculas']);

        $sem = $porScap[177];
        $this->assertNull($sem['turma']);
        $this->assertSame('2026-08-01', $sem['data']);
        $this->assertSame(
            ['curso' => '201#', 'student_count' => 5, 'value_uf' => '0.0000', 'status' => 'pending', 'approved_on' => null],
            $sem['cotacao'],
        );

        $this->assertSame('16.4700', $porScap[178]['cotacao']['value_uf']);
    }

    public function test_matricula_e_certificado_levam_o_que_a_linha_imprimiu(): void
    {
        $n = $this->normalizar($this->linhasValidas());
        $matriculas = $n->carga['orcamentos'][0]['turma']['matriculas'];

        $this->assertSame(CargaSintetica::rut(16111111), $matriculas[0]['aluno']);
        $this->assertSame(7, $matriculas[0]['nota']);
        $this->assertSame('aprobado', $matriculas[0]['approval_status']);
        $this->assertNull($matriculas[1]['nota']);
        $this->assertSame(
            [
                'codigo' => 'LOT-2026-001',
                'emitido_em' => '2026-07-15',
                'valido_ate' => '2028-07-09',
                'aluno_impresso' => 'Alumno Uno',
                'curso_impresso' => 'Nombre Técnico A',
                'horas_impressas' => 16,
                'cliente_impresso' => 'EMPRESA PRUEBA LTDA.',
                'cliente_rut_impresso' => CargaSintetica::rut(76111111),
                'redator_impresso' => 'Relator P.',
                'cidade' => 'Talca',
            ],
            $matriculas[0]['certificado'],
        );
        $this->assertSame(6.5, $n->carga['orcamentos'][2]['turma']['matriculas'][0]['nota']);
    }

    public function test_reprobado_e_erro_porque_toda_linha_traz_certificado(): void
    {
        // O ArquivoDeCarga recusa certificado em matrícula não aprobada; o extrator não pode gerar o que o contrato recusa.
        $n = $this->normalizar([PlanilhaSintetica::linha(['estado_eval' => 'Reprobado', 'evaluacion' => 3])], $this->complementoSoComA176());

        $this->assertSame(['estado_eval fora de Aprobado: LOT-2026-001'], $n->erros);
        $this->assertSame([], $n->carga);
    }

    public function test_cliente_vem_do_complemento_com_email_sintetico_e_desde_da_menor_data(): void
    {
        $n = $this->normalizar($this->linhasValidas());
        $cliente = $n->carga['cliente'];

        $this->assertSame(CargaSintetica::rut(76111111), $cliente['rut']);
        $this->assertSame(CargaSintetica::email($cliente['rut']), $cliente['email']);
        $this->assertSame('2026-07-10', $cliente['desde']);
        $this->assertSame('Empresa Prueba Servicios Ltda.', $cliente['legal_name']);
        $this->assertSame('Calle Uno', $cliente['endereco']['line1']);
        $this->assertNull($cliente['endereco']['line2']);
        $this->assertSame(
            ['name' => 'Contacto Prueba', 'email' => null, 'phone' => null, 'job_title' => null],
            $cliente['contato'],
        );
    }

    public function test_redator_sai_com_cursos_e_documentos_nomeados(): void
    {
        $n = $this->normalizar($this->linhasValidas());
        $redator = $n->carga['redatores'][0];

        $this->assertSame('R1', $redator['chave']);
        $this->assertSame(CargaSintetica::rut(15111111), $redator['rut']);
        $this->assertSame(['200#', '201#'], $redator['cursos']);
        $this->assertNull($redator['phone']);
        $this->assertSame(
            [
                ['type' => 'CV', 'arquivo' => 'documentos/R1-CV.pdf', 'original_name' => 'cv-r1.pdf', 'valid_until' => null],
                ['type' => 'TITULO', 'arquivo' => 'documentos/R1-TITULO.pdf', 'original_name' => 'Copia de CV R1 (p. 6-6).pdf', 'valid_until' => null],
                ['type' => 'REUF', 'arquivo' => 'documentos/R1-REUF.pdf', 'original_name' => 'reuf-r1.pdf', 'valid_until' => '2027-12-31'],
            ],
            $redator['documentos'],
        );
    }

    public function test_arquivo_do_documento(): void
    {
        $this->assertSame('documentos/CZR-REUF.pdf', Normalizador::arquivoDoDocumento('CZR', 'REUF'));
    }

    /** @return array<string, array{array<string, mixed>, string}> */
    public static function guardas(): array
    {
        return [
            'curso desconhecido' => [['curso_seletor' => '999# Desconocido'], 'seletor de curso sem chave'],
            'seletor sem chave' => [['curso_seletor' => 'Sin chave'], 'seletor de curso sem chave'],
            'instrutor ausente do mapa' => [['instrutor' => 'Otro Relator'], 'instrutor ausente'],
            'cliente diferente' => [['cliente_rut' => '76.000.000-0'], 'RUT de cliente'],
            'SCAP sem cotação' => [['servicio' => 'SCAP-999'], 'SCAP 999 sem item em cotacoes'],
            'SERVICIO fora do padrão' => [['servicio' => '1000'], 'SERVICIO fora do padrão'],
            'horas divergentes' => [['horas' => 12], 'horas diferente'],
            'modalidad online' => [['modalidad' => 'Online'], 'modalidad diferente de Presencial'],
            'estado fora do par' => [['estado_eval' => 'Pendiente'], 'estado_eval fora'],
            'fecha_curso fora do ISO' => [['fecha_curso' => '10/07/2026'], 'data fora do formato ISO (fecha_curso)'],
            'f_emision ausente' => [['f_emision' => null], 'data fora do formato ISO (f_emision)'],
            'vigencia ilegível' => [['vigencia' => 'a combinar'], 'data fora do formato ISO (vigencia)'],
            'nota ilegível' => [['evaluacion' => 'siete'], 'evaluacion inválida'],
            'nome impresso vazio' => [['nom_curso' => null], 'campo obrigatório vazio (nom_curso)'],
        ];
    }

    /** @param array<string, mixed> $sobrescreve */
    #[DataProvider('guardas')]
    public function test_guarda_vira_erro_e_carga_vazia(array $sobrescreve, string $trecho): void
    {
        $linhas = $this->linhasValidas();
        $linhas[1] = PlanilhaSintetica::linha([...$sobrescreve, 'codigo' => 'LOT-2026-002', 'aluno_rut' => CargaSintetica::rut(16222222), 'aluno_nome' => 'Alumno Dos']);

        $n = $this->normalizar($linhas);

        $this->assertNotSame([], $n->erros);
        $erros = implode("\n", $n->erros);
        $this->assertStringContainsString($trecho, $erros);
        $this->assertStringContainsString('LOT-2026-002', $erros);
        $this->assertSame([], $n->carga);
    }

    public function test_rut_repetido_na_mesma_scap_e_erro(): void
    {
        $linhas = $this->linhasValidas();
        $linhas[1] = PlanilhaSintetica::linha(['codigo' => 'LOT-2026-002']); // mesmo aluno, mesmo nome, mesma SCAP

        $n = $this->normalizar($linhas);

        $this->assertStringContainsString('SCAP 176: RUT repetido', implode("\n", $n->erros));
        $this->assertStringContainsString('LOT-2026-002', implode("\n", $n->erros));
        $this->assertSame([], $n->carga);
    }

    /** @return array<string, array{array<string, mixed>, string}> */
    public static function divergenciasNaScap(): array
    {
        return [
            'curso' => [['curso_seletor' => '201# Curso Prueba B', 'horas' => 8], 'curso diferente'],
            'fecha_curso' => [['fecha_curso' => '2026-07-11'], 'fecha_curso diferente'],
            'realizado_en' => [['realizado_en' => 'Santiago'], 'realizado_en diferente'],
            'instrutor' => [['instrutor' => 'Relator Q.'], 'instrutor diferente'],
        ];
    }

    /** @param array<string, mixed> $sobrescreve */
    #[DataProvider('divergenciasNaScap')]
    public function test_divergencia_dentro_da_scap_e_erro(array $sobrescreve, string $trecho): void
    {
        $complemento = ComplementoSintetico::dados();
        $complemento['instrutores']['Relator Q.'] = 'R1'; // mapeado, para só a divergência acusar

        $linhas = $this->linhasValidas();
        $linhas[1] = PlanilhaSintetica::linha([
            ...$sobrescreve,
            'codigo' => 'LOT-2026-002',
            'aluno_rut' => CargaSintetica::rut(16222222),
            'aluno_nome' => 'Alumno Dos',
        ]);

        $n = $this->normalizar($linhas, $complemento);

        $erros = implode("\n", $n->erros);
        $this->assertStringContainsString("SCAP 176: {$trecho}", $erros);
        $this->assertStringContainsString('LOT-2026-001', $erros);
        $this->assertStringContainsString('LOT-2026-002', $erros);
        $this->assertSame([], $n->carga);
    }

    public function test_codigo_repetido_e_erro(): void
    {
        $linhas = $this->linhasValidas();
        $linhas[1]['codigo'] = 'LOT-2026-001';

        $n = $this->normalizar($linhas);

        $this->assertStringContainsString('código repetido: LOT-2026-001', implode("\n", $n->erros));
        $this->assertSame([], $n->carga);
    }

    public function test_scap_do_complemento_sem_linha_e_sem_sem_turma_e_erro(): void
    {
        $linhas = array_slice($this->linhasValidas(), 0, 2); // sem as linhas da 178

        $n = $this->normalizar($linhas);

        $this->assertStringContainsString('SCAP 178', implode("\n", $n->erros));
        $this->assertSame([], $n->carga);
    }

    public function test_scap_sem_turma_com_linhas_na_planilha_e_erro(): void
    {
        $linhas = [...$this->linhasValidas(), PlanilhaSintetica::linha([
            'codigo' => 'LOT-2026-004', 'servicio' => 'SCAP-177', 'curso_seletor' => '201# Curso Prueba B', 'horas' => 8,
            'aluno_rut' => CargaSintetica::rut(16999999), 'aluno_nome' => 'Alumno Seis',
        ])];

        $n = $this->normalizar($linhas);

        $this->assertStringContainsString('SCAP 177: tem sem_turma', implode("\n", $n->erros));
        $this->assertSame([], $n->carga);
    }

    public function test_recorte_vazio_e_erro(): void
    {
        $n = $this->normalizar([PlanilhaSintetica::linha(['codigo' => 'LOT-2025-001'])]);

        $this->assertNotSame([], $n->erros);
        $this->assertSame([], $n->carga);
        $this->assertSame(0, $n->linhasNoRecorte);
    }

    public function test_a_saida_nao_carrega_a_clave(): void
    {
        $n = $this->normalizar($this->linhasValidas());

        $this->assertStringNotContainsString(PlanilhaSintetica::SEGREDO, json_encode($n));
    }
}
