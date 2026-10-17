<?php

namespace Tests\Feature\CargaInicial;

use App\Console\CargaInicial\ArquivoDeCarga;
use Illuminate\Support\Facades\File;
use Illuminate\Testing\PendingCommand;
use Tests\Support\CargaInicial\CargaSintetica;
use Tests\Support\CargaInicial\ComplementoSintetico;
use Tests\Support\CargaInicial\PdfSintetico;
use Tests\Support\CargaInicial\PlanilhaSintetica;
use Tests\TestCase;

/**
 * O comando de ponta a ponta sobre um levantamento inventado: planilha, PDFs e
 * zip na `origem`, o `complemento.json` na pasta de `dados`. Só dado inventado.
 */
class ExtrairCargaInicialCommandTest extends TestCase
{
    private string $raiz;

    private string $origem;

    private string $dados;

    protected function setUp(): void
    {
        parent::setUp();

        $this->raiz = sys_get_temp_dir().'/carga-cmd-'.bin2hex(random_bytes(6));
        $this->origem = $this->raiz.'/origem';
        $this->dados = $this->raiz.'/dados';

        mkdir($this->origem.'/Certificados', 0777, true);
        mkdir($this->origem.'/Instructores/R1', 0777, true);
        mkdir($this->dados, 0777, true);

        file_put_contents($this->origem.'/Instructores/R1/cv-r1.pdf', PdfSintetico::paginas(2));
        file_put_contents($this->origem.'/Instructores/R1/Copia de CV R1.pdf', PdfSintetico::paginas(6));

        $zip = new \ZipArchive;
        $zip->open($this->origem.'/Instructores/R1/registro.zip', \ZipArchive::CREATE);
        $zip->addFromString('interno/reuf-r1.pdf', PdfSintetico::paginas(1));
        $zip->close();

        $this->gravarPlanilha($this->linhas());
        $this->gravarComplemento(ComplementoSintetico::dados());
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->raiz);
        File::deleteDirectory(storage_path('framework/testing/carga-38'));

        parent::tearDown();
    }

    /** @return list<array<string, mixed>> */
    private function linhas(): array
    {
        return [
            PlanilhaSintetica::linha(),
            PlanilhaSintetica::linha([
                'codigo' => 'LOT-2026-002',
                'aluno_rut' => CargaSintetica::rut(16222222),
                'aluno_nome' => 'Alumno Dos',
                'evaluacion' => null,
            ]),
            PlanilhaSintetica::linha([
                'codigo' => 'LOT-2026-003',
                'curso_seletor' => '201# Curso Prueba B',
                'horas' => 8,
                'aluno_rut' => CargaSintetica::rut(16333333),
                'aluno_nome' => 'Alumno Tres',
                'fecha_curso' => '2026-07-25',
                'evaluacion' => 6.5,
                'servicio' => 'SCAP-178',
                'nom_curso' => 'Curso B',
                'realizado_en' => 'Santiago',
                'f_emision' => '2026-07-30',
            ]),
            // Excluída pelo complemento: vira recusa no relatório.
            PlanilhaSintetica::linha([
                'codigo' => 'LOT-2026-020',
                'aluno_rut' => CargaSintetica::rut(16444444),
                'aluno_nome' => 'Alumno Excluido',
            ]),
        ];
    }

    /** @param  list<array<string, mixed>>  $linhas */
    private function gravarPlanilha(array $linhas): void
    {
        PlanilhaSintetica::gravar($this->origem.'/Certificados/PLANILHA SINTETICA.xlsx', $linhas);
    }

    /** @param  array<string, mixed>  $complemento */
    private function gravarComplemento(array $complemento): void
    {
        file_put_contents($this->dados.'/complemento.json', json_encode($complemento, JSON_UNESCAPED_UNICODE));
    }

    private function executar(?string $dados = null): PendingCommand
    {
        return $this->artisan('lotus:extrair-carga-inicial', ['origem' => $this->origem, 'dados' => $dados ?? $this->dados]);
    }

    public function test_gera_carga_documentos_e_relatorio(): void
    {
        $this->executar()->assertExitCode(0);

        $this->assertSame([], ArquivoDeCarga::validar(ArquivoDeCarga::ler($this->dados), $this->dados));
        $this->assertFileExists($this->dados.'/documentos/R1-TITULO.pdf');

        $relatorio = file_get_contents($this->dados.'/relatorio.md');
        $this->assertStringContainsString('## Contagens', $relatorio);
        $this->assertStringContainsString('## Recusas', $relatorio);
        $this->assertStringContainsString('LOT-2026-020', $relatorio);
        $this->assertStringContainsString('## Por SCAP', $relatorio);
        $this->assertStringContainsString('## Cursos', $relatorio);
        $this->assertStringContainsString('## Redatores', $relatorio);
        $this->assertStringNotContainsString('SEGREDO-NAO-LER', $relatorio.file_get_contents($this->dados.'/carga.json'));

        foreach ([
            '| linhas no recorte | 4 |',
            '| linhas recusadas | 1 |',
            '| certificados | 3 |',
            '| cotações pendentes | 1 |',
            '| LOT-2026-020 | Curso de 2024 fora do recorte |',
            '| 176 | 200# | Talca | 2026-07-10 | 2026-07-11 | 2 | 122.3200 | approved |',
            '| 177 | 201# | — | — | — | 5 | 0.0000 | pending |',
            '| R1 | Relator Prueba | relator@prueba.test | 200#, 201# | CV, TITULO, REUF |',
        ] as $linha) {
            $this->assertStringContainsString($linha, $relatorio);
        }
    }

    public function test_relatorio_nao_traz_nome_nem_rut_de_aluno(): void
    {
        $this->executar()->assertExitCode(0);

        $relatorio = file_get_contents($this->dados.'/relatorio.md');

        foreach (['Alumno Uno', 'Alumno Dos', 'Alumno Tres', 'Alumno Excluido'] as $nome) {
            $this->assertStringNotContainsString($nome, $relatorio);
        }

        foreach ([16111111, 16222222, 16333333, 16444444] as $numero) {
            $this->assertStringNotContainsString((string) $numero, $relatorio);
            $this->assertStringNotContainsString(CargaSintetica::rut($numero), $relatorio);
        }
    }

    public function test_saida_do_console_traz_as_contagens_e_nenhum_dado_pessoal(): void
    {
        $this->executar()
            ->expectsOutputToContain('certificados: 3')
            ->doesntExpectOutputToContain('Alumno')
            ->doesntExpectOutputToContain('SEGREDO-NAO-LER')
            ->assertExitCode(0);
    }

    public function test_erro_de_normalizacao_nao_grava_nada(): void
    {
        $this->gravarPlanilha([PlanilhaSintetica::linha(['curso_seletor' => '999# Curso Desconhecido'])]);

        $this->executar()->assertExitCode(1);

        $this->assertFileDoesNotExist($this->dados.'/carga.json');
        $this->assertFileDoesNotExist($this->dados.'/relatorio.md');
        $this->assertDirectoryDoesNotExist($this->dados.'/documentos');
    }

    public function test_documento_com_erro_sai_com_1_e_nao_grava_a_carga(): void
    {
        unlink($this->origem.'/Instructores/R1/cv-r1.pdf');

        $this->executar()->assertExitCode(1);

        $this->assertFileDoesNotExist($this->dados.'/carga.json');
    }

    public function test_complemento_ausente_sai_com_1(): void
    {
        unlink($this->dados.'/complemento.json');

        $this->executar()->assertExitCode(1);
    }

    public function test_recusa_pasta_de_dados_dentro_do_backend(): void
    {
        $dentro = storage_path('framework/testing/carga-38');
        @mkdir($dentro, 0777, true);
        copy($this->dados.'/complemento.json', $dentro.'/complemento.json');

        $this->executar($dentro)->assertExitCode(1);

        $this->assertFileDoesNotExist($dentro.'/carga.json');
    }
}
