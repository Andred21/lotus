<?php

namespace Tests\Support\CargaInicial;

use InvalidArgumentException;

/**
 * Um PDF mínimo e válido de `n` páginas em branco, montado à mão (Catalog,
 * Pages, as `n` Page e o `xref` com os offsets calculados). É o que o
 * `pdfseparate` e o `pdfunite` precisam para o teste do recorte por páginas.
 */
final class PdfSintetico
{
    public static function paginas(int $n): string
    {
        if ($n < 1) {
            throw new InvalidArgumentException('um PDF tem ao menos uma página');
        }

        $filhas = [];
        for ($i = 0; $i < $n; $i++) {
            $filhas[] = sprintf('%d 0 R', 3 + $i);
        }

        $objetos = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            2 => sprintf('<< /Type /Pages /Kids [%s] /Count %d >>', implode(' ', $filhas), $n),
        ];

        for ($i = 0; $i < $n; $i++) {
            $objetos[3 + $i] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>';
        }

        $pdf = "%PDF-1.4\n";
        $offsets = [];

        foreach ($objetos as $numero => $corpo) {
            $offsets[$numero] = strlen($pdf);
            $pdf .= sprintf("%d 0 obj\n%s\nendobj\n", $numero, $corpo);
        }

        $xref = strlen($pdf);
        $total = count($objetos) + 1;

        $pdf .= sprintf("xref\n0 %d\n0000000000 65535 f \n", $total);
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf.sprintf("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", $total, $xref);
    }
}
