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
    /**
     * `$maxLinhas` limita a ITERAÇÃO, não o aproveitamento. Quem passa o teto é
     * o chamador, porque o número é decisão dele.
     *
     * @return \Generator<array{row:int,rut:string,name:string,email:?string,phone:?string}>
     */
    public function rows(UploadedFile $file, ?int $maxLinhas = null): \Generator
    {
        // Despacho pelo CONTEÚDO, nunca pela extensão que o cliente declarou
        // (achado Q-5 do review de 2026-08-25): `mimes:` valida a extensão
        // DERIVADA dos bytes, então um CSV chamado `alunos.xlsx` passava a
        // política de tipo e caía no `XlsxReader`, que estourava 500 ao abrir um
        // não-zip. Os três MIMEs abaixo são exatamente os da classe `Planilha`
        // do `ContentClass` — nada mais chega aqui, porque o controller já
        // recusou o resto. (Sem citar a classe de propósito: este arquivo é
        // isento da catraca de política justamente por não a pedir.)
        $reader = match ($file->getMimeType()) {
            // SHOULD_PRESERVE_EMPTY_ROWS=true: sem isso, as duas implementações
            // (XLSX e CSV) descartam linhas em branco ANTES de chegarem aqui e
            // recontam do zero — quebrando a numeração real da linha (contrato D1).
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => new XlsxReader(
                new XlsxOptions(SHOULD_PRESERVE_EMPTY_ROWS: true),
            ),
            'text/csv', 'text/plain' => new CsvReader(new CsvOptions(SHOULD_PRESERVE_EMPTY_ROWS: true)),
            default => throw ValidationException::withMessages([
                'file' => 'Formato não suportado — envie xlsx ou csv.',
            ]),
        };

        $reader->open($file->getRealPath());

        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $rowNumber => $row) {
                    // O teto tem de morder na linha ITERADA, não na aproveitada
                    // (achado Q-4 do review de 2026-08-25): linha vazia é pulada
                    // logo abaixo sem nunca chegar ao chamador, então um arquivo
                    // com milhões de linhas em branco jamais atingia um teto
                    // contado do outro lado do `yield` — e a leitura sozinha já
                    // ocupa o processo. `+ 1` porque a linha 1 é cabeçalho.
                    if ($maxLinhas !== null && $rowNumber > $maxLinhas + 1) {
                        throw ValidationException::withMessages([
                            'file' => 'La planilla supera el máximo de '.$maxLinhas.' filas. Divídala y vuelva a enviarla.',
                        ]);
                    }

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
