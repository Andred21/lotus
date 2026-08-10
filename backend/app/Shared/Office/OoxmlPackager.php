<?php

namespace App\Shared\Office;

use ZipArchive;

/**
 * Empacota parts renderizadas num `.docx`. Só zipa o que recebe — quem sabe
 * QUAIS parts o documento tem é o documento, não o transporte.
 *
 * `[Content_Types].xml` entra primeiro de propósito: a OPC pede que ele abra o
 * pacote, e há leitor que só olha o início do arquivo.
 */
final class OoxmlPackager
{
    /** @param array<string, string> $parts caminho dentro do pacote => bytes */
    public function package(array $parts): string
    {
        // ZipArchive não escreve em memória; o temporário é do mecanismo, não
        // do documento, e morre nesta função.
        $file = tempnam(sys_get_temp_dir(), 'ooxml');

        $zip = new ZipArchive;
        $zip->open($file, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $first = '[Content_Types].xml';
        if (isset($parts[$first])) {
            $zip->addFromString($first, $parts[$first]);
            unset($parts[$first]);
        }

        foreach ($parts as $path => $bytes) {
            $zip->addFromString($path, $bytes);
        }

        $zip->close();

        $bytes = (string) file_get_contents($file);
        unlink($file);

        return $bytes;
    }
}
