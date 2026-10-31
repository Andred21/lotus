<?php

namespace App\Domains\Operation\Services;

use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;

/**
 * Grava o modelo `.xlsx` da importação de alunos: só o cabeçalho, que vem da
 * constante única do leitor (D14/D21). Zero regra de negócio.
 */
class SpreadsheetTemplate
{
    public function write(string $path): void
    {
        $writer = new Writer;
        $writer->openToFile($path);

        try {
            $writer->addRow(Row::fromValues(SpreadsheetRowReader::HEADER));
        } finally {
            $writer->close();
        }
    }
}
