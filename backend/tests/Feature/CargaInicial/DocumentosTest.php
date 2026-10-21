<?php

namespace Tests\Feature\CargaInicial;

use App\Console\CargaInicial\Extracao\Documentos;
use App\Console\CargaInicial\Extracao\Normalizador;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;
use Tests\Support\CargaInicial\PdfSintetico;
use Tests\TestCase;

/**
 * `Documentos::preparar` copia os PDFs dos redatores para a pasta de dados:
 * arquivo inteiro, membro de zip e recorte por páginas. Só dado inventado.
 */
class DocumentosTest extends TestCase
{
    private string $origem;

    private string $dados;

    protected function setUp(): void
    {
        parent::setUp();

        $raiz = sys_get_temp_dir().'/carga-doc-'.bin2hex(random_bytes(6));
        $this->origem = $raiz.'/origem';
        $this->dados = $raiz.'/dados';

        mkdir($this->origem.'/Instructores/R1', 0777, true);
        mkdir($this->dados, 0777, true);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(dirname($this->origem));

        parent::tearDown();
    }

    /**
     * @param  list<array<string, mixed>>  $documentos
     * @return list<array<string, mixed>>
     */
    private function redatores(array $documentos): array
    {
        return [['chave' => 'R1', 'documentos' => $documentos]];
    }

    private function zip(string $nome, array $membros): void
    {
        $zip = new \ZipArchive;
        $zip->open($this->origem.'/'.$nome, \ZipArchive::CREATE);
        foreach ($membros as $membro => $bytes) {
            $zip->addFromString($membro, $bytes);
        }
        $zip->close();
    }

    public function test_copia_arquivo_inteiro_e_extrai_membro_de_zip(): void
    {
        $cv = PdfSintetico::paginas(2);
        $reuf = PdfSintetico::paginas(1);
        file_put_contents($this->origem.'/Instructores/R1/cv-r1.pdf', $cv);
        $this->zip('Instructores/R1/registro.zip', ['interno/reuf-r1.pdf' => $reuf]);

        $erros = Documentos::preparar($this->redatores([
            ['type' => 'CV', 'origem' => 'Instructores/R1/cv-r1.pdf', 'paginas' => null],
            ['type' => 'REUF', 'origem' => 'Instructores/R1/registro.zip#interno/reuf-r1.pdf', 'paginas' => null],
        ]), $this->origem, $this->dados);

        $this->assertSame([], $erros);
        $this->assertFileExists($this->dados.'/'.Normalizador::arquivoDoDocumento('R1', 'CV'));
        $this->assertSame($cv, file_get_contents($this->dados.'/'.Normalizador::arquivoDoDocumento('R1', 'CV')));
        $this->assertSame($reuf, file_get_contents($this->dados.'/'.Normalizador::arquivoDoDocumento('R1', 'REUF')));
    }

    public function test_membro_ausente_lista_os_nomes_do_zip(): void
    {
        $this->zip('Instructores/R1/registro.zip', ['interno/outro.pdf' => PdfSintetico::paginas(1)]);

        $erros = Documentos::preparar($this->redatores([
            ['type' => 'REUF', 'origem' => 'Instructores/R1/registro.zip#interno/reuf-r1.pdf', 'paginas' => null],
        ]), $this->origem, $this->dados);

        $this->assertCount(1, $erros);
        $this->assertStringContainsString('interno/reuf-r1.pdf', $erros[0]);
        $this->assertStringContainsString('interno/outro.pdf', $erros[0]);
        $this->assertFileDoesNotExist($this->dados.'/'.Normalizador::arquivoDoDocumento('R1', 'REUF'));
    }

    public function test_separa_paginas_de_um_pdf(): void
    {
        if ((new ExecutableFinder)->find('pdfseparate') === null) {
            $this->markTestSkipped('poppler ausente');
        }

        file_put_contents($this->origem.'/Instructores/R1/Copia de CV R1.pdf', PdfSintetico::paginas(3));
        $antes = glob(sys_get_temp_dir().'/lotus-carga-*') ?: [];

        $erros = Documentos::preparar($this->redatores([
            ['type' => 'TITULO', 'origem' => 'Instructores/R1/Copia de CV R1.pdf', 'paginas' => [2, 3]],
        ]), $this->origem, $this->dados);

        $this->assertSame([], $erros);

        $destino = $this->dados.'/'.Normalizador::arquivoDoDocumento('R1', 'TITULO');
        $this->assertMatchesRegularExpression('/Pages:\s+2/', (new Process(['pdfinfo', $destino]))->mustRun()->getOutput());
        $this->assertSame($antes, glob(sys_get_temp_dir().'/lotus-carga-*') ?: [], 'o diretório temporário tem de ser apagado');
    }

    public function test_pagina_unica_vira_um_pdf_de_uma_pagina(): void
    {
        file_put_contents($this->origem.'/Instructores/R1/Copia de CV R1.pdf', PdfSintetico::paginas(3));

        $erros = Documentos::preparar($this->redatores([
            ['type' => 'TITULO', 'origem' => 'Instructores/R1/Copia de CV R1.pdf', 'paginas' => [3, 3]],
        ]), $this->origem, $this->dados);

        $this->assertSame([], $erros);
        $destino = $this->dados.'/'.Normalizador::arquivoDoDocumento('R1', 'TITULO');
        $this->assertMatchesRegularExpression('/Pages:\s+1/', (new Process(['pdfinfo', $destino]))->mustRun()->getOutput());
    }

    public function test_recorte_de_zip_separa_as_paginas_do_membro(): void
    {
        $this->zip('Instructores/R1/registro.zip', ['interno/cv.pdf' => PdfSintetico::paginas(4)]);

        $erros = Documentos::preparar($this->redatores([
            ['type' => 'CV', 'origem' => 'Instructores/R1/registro.zip#interno/cv.pdf', 'paginas' => [1, 3]],
        ]), $this->origem, $this->dados);

        $this->assertSame([], $erros);
        $destino = $this->dados.'/'.Normalizador::arquivoDoDocumento('R1', 'CV');
        $this->assertMatchesRegularExpression('/Pages:\s+3/', (new Process(['pdfinfo', $destino]))->mustRun()->getOutput());
    }

    public function test_arquivo_inexistente_vira_erro(): void
    {
        $erros = Documentos::preparar($this->redatores([
            ['type' => 'CV', 'origem' => 'Instructores/R1/nao-existe.pdf', 'paginas' => null],
        ]), $this->origem, $this->dados);

        $this->assertCount(1, $erros);
        $this->assertStringContainsString('nao-existe.pdf', $erros[0]);
    }

    public function test_pagina_alem_do_fim_do_pdf_vira_erro(): void
    {
        file_put_contents($this->origem.'/Instructores/R1/cv.pdf', PdfSintetico::paginas(2));

        $erros = Documentos::preparar($this->redatores([
            ['type' => 'CV', 'origem' => 'Instructores/R1/cv.pdf', 'paginas' => [2, 5]],
        ]), $this->origem, $this->dados);

        $this->assertCount(1, $erros);
        $this->assertFileDoesNotExist($this->dados.'/'.Normalizador::arquivoDoDocumento('R1', 'CV'));
    }

    /** @return array<string, array{mixed}> */
    public static function paginasInvalidas(): array
    {
        return [
            'invertidas' => [[3, 2]],
            'zero' => [[0, 2]],
            'um só número' => [[2]],
            'texto' => [['a', 'b']],
        ];
    }

    #[DataProvider('paginasInvalidas')]
    public function test_paginas_invalidas_viram_erro(mixed $paginas): void
    {
        file_put_contents($this->origem.'/Instructores/R1/cv.pdf', PdfSintetico::paginas(3));

        $erros = Documentos::preparar($this->redatores([
            ['type' => 'CV', 'origem' => 'Instructores/R1/cv.pdf', 'paginas' => $paginas],
        ]), $this->origem, $this->dados);

        $this->assertCount(1, $erros);
        $this->assertStringContainsString('paginas', $erros[0]);
    }

    public function test_origem_que_sai_da_pasta_do_levantamento_vira_erro(): void
    {
        file_put_contents(dirname($this->origem).'/fora.pdf', PdfSintetico::paginas(1));

        $erros = Documentos::preparar($this->redatores([
            ['type' => 'CV', 'origem' => '../fora.pdf', 'paginas' => null],
        ]), $this->origem, $this->dados);

        $this->assertCount(1, $erros);
        $this->assertFileDoesNotExist($this->dados.'/'.Normalizador::arquivoDoDocumento('R1', 'CV'));
    }
}
