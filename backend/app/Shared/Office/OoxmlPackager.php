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
    /**
     * @param  array<string, string>  $parts  caminho dentro do pacote => bytes
     *
     * @throws OfficeRenderException quando o pacote não pôde ser fechado
     */
    public function package(array $parts): string
    {
        // ZipArchive não escreve em memória; o temporário é do mecanismo, não
        // do documento, e morre nesta função — inclusive quando ela falha, daí
        // o `finally`.
        $file = tempnam(sys_get_temp_dir(), 'ooxml');

        if ($file === false) {
            throw OfficeRenderException::packagingFailed('não há onde escrever o temporário');
        }

        try {
            return $this->write($file, $parts);
        } finally {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }

    /**
     * Cada passo é conferido: um `.docx` truncado passa por documento válido
     * para quem só olha o status da resposta, e este documento é oficial.
     *
     * @param  array<string, string>  $parts
     */
    private function write(string $file, array $parts): string
    {
        $zip = new ZipArchive;
        $abertura = $zip->open($file, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        if ($abertura !== true) {
            throw OfficeRenderException::packagingFailed("ZipArchive::open devolveu {$abertura}");
        }

        $first = '[Content_Types].xml';
        if (isset($parts[$first])) {
            $this->add($zip, $first, $parts[$first]);
            unset($parts[$first]);
        }

        foreach ($parts as $path => $bytes) {
            $this->add($zip, $path, $bytes);
        }

        if (! $zip->close()) {
            throw OfficeRenderException::packagingFailed('o ZIP não pôde ser fechado');
        }

        // Fechar um ZIP sem nenhuma entrada faz o libzip APAGAR o arquivo; sem
        // esta porta, o `false` do `file_get_contents` virava string vazia e um
        // documento de zero byte seguia adiante como se fosse o manual.
        $bytes = is_file($file) ? file_get_contents($file) : false;

        if ($bytes === false || $bytes === '') {
            throw OfficeRenderException::packagingFailed('o pacote saiu sem nenhum byte');
        }

        return $bytes;
    }

    private function add(ZipArchive $zip, string $path, string $bytes): void
    {
        if (! $zip->addFromString($path, $bytes)) {
            throw OfficeRenderException::packagingFailed("a part {$path} não entrou no pacote");
        }
    }
}
