<?php

namespace Tests\Feature\CargaInicial;

use App\Console\CargaInicial\CargaInvalidaException;
use App\Console\CargaInicial\Extracao\LeitorDeRegistros;
use DateTimeImmutable;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Tests\Support\CargaInicial\PlanilhaSintetica;
use Tests\TestCase;

/**
 * O leitor é a única porta da planilha: o que ele não lê (a coluna CLAVE) e o
 * que ele não deixa passar (cabeçalho trocado) valem mais que o que ele devolve.
 */
class LeitorDeRegistrosTest extends TestCase
{
    /** @var list<string> */
    private array $arquivos = [];

    protected function tearDown(): void
    {
        foreach ($this->arquivos as $arquivo) {
            @unlink($arquivo);
        }

        parent::tearDown();
    }

    /**
     * @param  list<array<string, mixed>>  $linhas
     * @param  array{cabecalho?: array<int, string>}  $opcoes
     */
    private function xlsx(array $linhas, array $opcoes = []): string
    {
        $caminho = sys_get_temp_dir().'/planilha-'.bin2hex(random_bytes(6)).'.xlsx';
        $this->arquivos[] = $caminho;
        PlanilhaSintetica::gravar($caminho, $linhas, $opcoes);

        return $caminho;
    }

    public function test_serial_de_46213_e_o_dia_10_de_julho_de_2026(): void
    {
        // A base do Excel: o número que o teste de datas usa é conferido aqui, não confiado.
        $this->assertSame(
            '2026-07-10',
            (new DateTimeImmutable('1899-12-30'))->modify('+46213 days')->format('Y-m-d'),
        );
    }

    public function test_le_a_aba_pelo_nome_e_descarta_a_clave(): void
    {
        $linhas = (new LeitorDeRegistros)->ler($this->xlsx([PlanilhaSintetica::linha()]));

        $this->assertCount(1, $linhas);
        $this->assertStringNotContainsString(PlanilhaSintetica::SEGREDO, json_encode($linhas));
        $this->assertSame(PlanilhaSintetica::linha(), $linhas[0]);
    }

    public function test_a_clave_nao_chega_nem_a_um_cabecalho_do_erro(): void
    {
        try {
            (new LeitorDeRegistros)->ler($this->xlsx([PlanilhaSintetica::linha()], ['cabecalho' => [10 => 'Fecha']]));
            $this->fail('esperava CargaInvalidaException');
        } catch (CargaInvalidaException $e) {
            $this->assertStringNotContainsString(PlanilhaSintetica::SEGREDO, $e->getMessage());
            $this->assertStringNotContainsString('CLAVE', $e->getMessage());
        }
    }

    public function test_datas_em_tres_formatos_viram_iso(): void
    {
        $linhas = (new LeitorDeRegistros)->ler($this->xlsx([
            PlanilhaSintetica::linha(['fecha_curso' => new DateTimeImmutable('2026-07-10')]),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-002', 'fecha_curso' => 46213.0]),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-003', 'fecha_curso' => '10/07/2026']),
        ]));

        $this->assertSame(['2026-07-10', '2026-07-10', '2026-07-10'], array_column($linhas, 'fecha_curso'));
    }

    public function test_as_tres_datas_da_linha_passam_pelo_mesmo_caminho(): void
    {
        $linhas = (new LeitorDeRegistros)->ler($this->xlsx([
            PlanilhaSintetica::linha([
                'fecha_curso' => '10-07-2026',
                'vigencia' => 47_000.0,
                'f_emision' => new DateTimeImmutable('2026-07-15'),
            ]),
        ]));

        $this->assertSame('2026-07-10', $linhas[0]['fecha_curso']);
        $this->assertSame('2028-09-04', $linhas[0]['vigencia']);
        $this->assertSame('2026-07-15', $linhas[0]['f_emision']);
    }

    public function test_data_ilegivel_volta_como_texto_e_vazia_vira_nula(): void
    {
        $linhas = (new LeitorDeRegistros)->ler($this->xlsx([
            PlanilhaSintetica::linha(['fecha_curso' => 'a combinar', 'vigencia' => null]),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-002', 'fecha_curso' => '31/02/2026']),
        ]));

        $this->assertSame('a combinar', $linhas[0]['fecha_curso']);
        $this->assertNull($linhas[0]['vigencia']);
        $this->assertSame('31/02/2026', $linhas[1]['fecha_curso']);
    }

    public function test_horas_saem_inteiras_e_a_nota_inteira_quando_exata(): void
    {
        $linhas = (new LeitorDeRegistros)->ler($this->xlsx([
            PlanilhaSintetica::linha(['horas' => 16.0, 'evaluacion' => 7.0]),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-002', 'evaluacion' => 6.5]),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-003', 'evaluacion' => null]),
        ]));

        $this->assertSame(16, $linhas[0]['horas']);
        $this->assertSame(7, $linhas[0]['evaluacion']);
        $this->assertSame(6.5, $linhas[1]['evaluacion']);
        $this->assertNull($linhas[2]['evaluacion']);
    }

    public function test_linha_sem_codigo_e_pulada_e_a_numeracao_nao_desloca(): void
    {
        $linhas = (new LeitorDeRegistros)->ler($this->xlsx([
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-001']),
            PlanilhaSintetica::linha(['codigo' => null, 'aluno_nome' => 'Sobra']),
            PlanilhaSintetica::linha(['codigo' => 'LOT-2026-003']),
        ]));

        $this->assertSame(['LOT-2026-001', 'LOT-2026-003'], array_column($linhas, 'codigo'));
    }

    public function test_celula_de_formula_le_o_valor_calculado_e_nao_o_texto_da_formula(): void
    {
        // Na planilha real HrCap, Instructor, Vigencia e F.EMISION são VLOOKUP com valor em cache.
        $linhas = (new LeitorDeRegistros)->ler($this->xlsx([
            PlanilhaSintetica::linha([
                'horas' => PlanilhaSintetica::formula(8),
                'instrutor' => PlanilhaSintetica::formula('Relator Inventado Prueba'),
                'vigencia' => PlanilhaSintetica::formula(new DateTimeImmutable('2028-01-14')),
                'f_emision' => PlanilhaSintetica::formula(new DateTimeImmutable('2026-02-20')),
            ]),
        ]));

        $this->assertSame(8, $linhas[0]['horas']);
        $this->assertSame('Relator Inventado Prueba', $linhas[0]['instrutor']);
        $this->assertSame('2028-01-14', $linhas[0]['vigencia']);
        $this->assertSame('2026-02-20', $linhas[0]['f_emision']);
        $this->assertStringNotContainsString(PlanilhaSintetica::SEGREDO, json_encode($linhas));
    }

    public function test_cabecalho_divergente_aborta(): void
    {
        $this->expectException(CargaInvalidaException::class);

        (new LeitorDeRegistros)->ler($this->xlsx([PlanilhaSintetica::linha()], ['cabecalho' => [10 => 'Fecha']]));
    }

    public function test_cabecalho_compara_sem_caixa_e_com_espacos_colapsados(): void
    {
        $linhas = (new LeitorDeRegistros)->ler($this->xlsx(
            [PlanilhaSintetica::linha()],
            ['cabecalho' => [1 => '  cº   CERTIFICADO ', 10 => 'fecha  curso']],
        ));

        $this->assertCount(1, $linhas);
    }

    public function test_aba_registros_ausente_aborta(): void
    {
        $caminho = sys_get_temp_dir().'/planilha-'.bin2hex(random_bytes(6)).'.xlsx';
        $this->arquivos[] = $caminho;

        $writer = new Writer;
        $writer->openToFile($caminho);
        $writer->getCurrentSheet()->setName('Config');
        $writer->addRow(Row::fromValues(['x']));
        $writer->close();

        $this->expectException(CargaInvalidaException::class);

        (new LeitorDeRegistros)->ler($caminho);
    }

    public function test_arquivo_inexistente_aborta(): void
    {
        $this->expectException(CargaInvalidaException::class);

        (new LeitorDeRegistros)->ler(sys_get_temp_dir().'/nao-existe-'.bin2hex(random_bytes(4)).'.xlsx');
    }
}
