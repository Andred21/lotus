<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Services\SpreadsheetRowReader;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\TestCase;

class SpreadsheetRowReaderTest extends TestCase
{
    private function makeXlsx(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'imp').'.xlsx';
        $writer = new XlsxWriter;
        $writer->openToFile($path);
        foreach ($rows as $row) {
            $writer->addRow(Row::fromValues($row));
        }
        $writer->close();

        return new UploadedFile($path, 'alunos.xlsx', null, null, true);
    }

    private function makeCsv(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'imp').'.csv';
        $h = fopen($path, 'w');
        foreach ($rows as $row) {
            fputcsv($h, $row);
        }
        fclose($h);

        return new UploadedFile($path, 'alunos.csv', null, null, true);
    }

    private function comConteudo(string $bytes, string $nomeDeclarado): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'imp');
        file_put_contents($path, $bytes);

        return new UploadedFile($path, $nomeDeclarado, null, null, true);
    }

    public function test_o_leitor_e_escolhido_pelo_conteudo_e_nao_pela_extensao_declarada(): void
    {
        // `mimes:` valida a extensão DERIVADA dos bytes, então um CSV chamado
        // `.xlsx` passava a política de tipo e caía no `XlsxReader`, que estoura
        // ao abrir um não-zip: 500 numa entrada de cliente (achado Q-5 do review
        // de 2026-08-25).
        $file = $this->comConteudo(
            "RUT,Nombre,Email,Telefono\n11.111.111-1,Juan Soto,juan@acme.cl,+56 9 1111\n",
            'alunos.xlsx',
        );

        $rows = iterator_to_array((new SpreadsheetRowReader)->rows($file), false);

        $this->assertCount(1, $rows);
        $this->assertSame('Juan Soto', $rows[0]['name']);
    }

    public function test_conteudo_que_nao_e_planilha_e_recusado_com_422(): void
    {
        $file = $this->comConteudo("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n", 'alunos.csv');

        $this->expectException(ValidationException::class);

        iterator_to_array((new SpreadsheetRowReader)->rows($file), false);
    }

    public function test_o_teto_morde_na_linha_iterada_e_nao_na_aproveitada(): void
    {
        // Linha em branco é pulada sem nunca chegar ao chamador, então um teto
        // contado do outro lado do `yield` jamais mordia — e a leitura sozinha
        // já ocupa o processo (achado Q-4 do review de 2026-08-25).
        $file = $this->comConteudo("RUT,Nombre,Email,Telefono\n".str_repeat(",,,\n", 200), 'alunos.csv');

        $this->expectException(ValidationException::class);

        iterator_to_array((new SpreadsheetRowReader)->rows($file, 5), false);
    }

    public function test_planilha_dentro_do_teto_atravessa(): void
    {
        $file = $this->comConteudo(
            "RUT,Nombre,Email,Telefono\n11.111.111-1,Juan Soto,juan@acme.cl,\n",
            'alunos.csv',
        );

        $this->assertCount(1, iterator_to_array((new SpreadsheetRowReader)->rows($file, 5), false));
    }

    public function test_xlsx_pula_cabecalho_e_linhas_vazias_e_normaliza_opcionais(): void
    {
        $file = $this->makeXlsx([
            ['RUT', 'Nombre', 'Email', 'Teléfono'],
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '+56 9 1111'],
            ['', '', '', ''],
            ['22.222.222-2', 'Ana Rojas', '', ''],
        ]);

        $rows = iterator_to_array((new SpreadsheetRowReader)->rows($file), false);

        $this->assertCount(2, $rows);
        $this->assertSame(2, $rows[0]['row']);
        $this->assertSame('11.111.111-1', $rows[0]['rut']);
        $this->assertSame('juan@acme.cl', $rows[0]['email']);
        $this->assertSame(4, $rows[1]['row']); // linha vazia pulada, numeração preservada
        $this->assertNull($rows[1]['email']);  // '' vira null (D1: opcionais)
        $this->assertNull($rows[1]['phone']);
    }

    public function test_csv_produz_o_mesmo_contrato(): void
    {
        $file = $this->makeCsv([
            ['RUT', 'Nombre', 'Email', 'Teléfono'],
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', ''],
        ]);

        $rows = iterator_to_array((new SpreadsheetRowReader)->rows($file), false);

        $this->assertCount(1, $rows);
        $this->assertSame('Juan Soto', $rows[0]['name']);
        $this->assertNull($rows[0]['phone']);
    }

    public function test_csv_pula_linha_vazia_e_preserva_numeracao(): void
    {
        $file = $this->makeCsv([
            ['RUT', 'Nombre', 'Email', 'Teléfono'],
            ['11.111.111-1', 'Juan Soto', 'juan@acme.cl', '+56 9 1111'],
            ['', '', '', ''],
            ['22.222.222-2', 'Ana Rojas', '', ''],
        ]);

        $rows = iterator_to_array((new SpreadsheetRowReader)->rows($file), false);

        $this->assertCount(2, $rows);
        $this->assertSame(2, $rows[0]['row']);
        $this->assertSame('11.111.111-1', $rows[0]['rut']);
        $this->assertSame('juan@acme.cl', $rows[0]['email']);
        $this->assertSame(4, $rows[1]['row']); // linha vazia (row 3) pulada, numeração preservada
        $this->assertNull($rows[1]['email']);  // '' vira null (D1: opcionais)
        $this->assertNull($rows[1]['phone']);
    }
}
