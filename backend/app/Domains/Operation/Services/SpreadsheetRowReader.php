<?php

namespace App\Domains\Operation\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use OpenSpout\Reader\CSV\Options as CsvOptions;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Options as XlsxOptions;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

/**
 * Só leitura: itera a planilha de alunos (D1: RUT, Nombre, Email, Teléfono,
 * linha 1 = cabeçalho) e entrega linhas normalizadas. Zero regra de negócio.
 */
class SpreadsheetRowReader
{
    /** @return \Generator<array{row:int,rut:string,name:string,email:?string,phone:?string}> */
    public function rows(UploadedFile $file): \Generator
    {
        // SHOULD_PRESERVE_EMPTY_ROWS=true: sem isso, as duas implementações
        // (XLSX e CSV) descartam linhas em branco ANTES de chegarem aqui e
        // recontam do zero — quebrando a numeração real da linha (contrato D1).
        $reader = match (strtolower($file->getClientOriginalExtension())) {
            'xlsx' => new XlsxReader(new XlsxOptions(SHOULD_PRESERVE_EMPTY_ROWS: true)),
            'csv', 'txt' => new CsvReader(new CsvOptions(SHOULD_PRESERVE_EMPTY_ROWS: true)),
            default => throw ValidationException::withMessages([
                'file' => 'Formato não suportado — envie xlsx ou csv.',
            ]),
        };

        $reader->open($file->getRealPath());

        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $rowNumber => $row) {
                    if ($rowNumber === 1) {
                        continue; // cabeçalho (D1)
                    }
                    $cells = array_map(fn ($c) => trim((string) $c), $row->toArray());
                    if (implode('', $cells) === '') {
                        continue; // linha vazia
                    }
                    yield [
                        'row' => $rowNumber,
                        'rut' => $cells[0] ?? '',
                        'name' => $cells[1] ?? '',
                        'email' => ($cells[2] ?? '') !== '' ? $cells[2] : null,
                        'phone' => ($cells[3] ?? '') !== '' ? $cells[3] : null,
                    ];
                }
                break; // só a 1ª aba
            }
        } finally {
            $reader->close();
        }
    }
}
