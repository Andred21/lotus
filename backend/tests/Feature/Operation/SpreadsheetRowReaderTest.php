<?php

namespace Tests\Feature\Operation;

use App\Domains\Operation\Services\SpreadsheetRowReader;
use Illuminate\Http\UploadedFile;
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
