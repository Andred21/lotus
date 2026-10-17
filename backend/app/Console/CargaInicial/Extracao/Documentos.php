<?php

namespace App\Console\CargaInicial\Extracao;

use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Exception\ExceptionInterface as ProcessException;
use Symfony\Component\Process\Process;
use ZipArchive;

/**
 * Grava na pasta de dados os PDFs dos redatores que o complemento descreve.
 *
 * Três formas de `origem`, relativa à pasta do levantamento: um arquivo comum
 * (copia os bytes), `x.zip#membro` (extrai o membro) e, com `paginas [i, f]`,
 * o recorte do PDF por `pdfseparate` e `pdfunite`. A regra de `#` e de
 * `paginas` é a do `Normalizador` (`explode('#', $origem, 2)`, `[i, f]`): os
 * dois leem o mesmo complemento e não podem divergir.
 *
 * O destino é `Normalizador::arquivoDoDocumento()`, o mesmo caminho que o
 * `carga.json` aponta. Documento é dado pessoal: o diretório temporário do
 * recorte é apagado no fim, com erro ou sem.
 */
final class Documentos
{
    private const PREFIXO_TEMPORARIO = 'lotus-carga-';

    private const TEMPO_LIMITE = 60;

    /**
     * @param  list<array<string, mixed>>  $redatoresDoComplemento  `complemento['redatores']`
     * @return list<string> o que impediu de gravar algum documento
     */
    public static function preparar(array $redatoresDoComplemento, string $origem, string $dados): array
    {
        $erros = [];

        foreach ($redatoresDoComplemento as $redator) {
            foreach ($redator['documentos'] ?? [] as $documento) {
                $rotulo = sprintf('redator %s, documento %s', $redator['chave'], $documento['type']);
                $resultado = self::documento($documento, $origem);

                if (is_array($resultado)) {
                    $erros[] = $rotulo.': '.$resultado['erro'];

                    continue;
                }

                $destino = $dados.'/'.Normalizador::arquivoDoDocumento($redator['chave'], $documento['type']);

                if (! is_dir(dirname($destino))) {
                    mkdir(dirname($destino), 0777, true);
                }

                file_put_contents($destino, $resultado);
            }
        }

        return $erros;
    }

    /**
     * Os bytes do documento, ou `['erro' => ...]`.
     *
     * @param  array<string, mixed>  $documento
     * @return string|array{erro: string}
     */
    private static function documento(array $documento, string $origem): string|array
    {
        $paginas = $documento['paginas'] ?? null;

        if ($paginas !== null && ! self::paginasValidas($paginas)) {
            return ['erro' => 'paginas deve ser [i, f] com 1 <= i <= f, ou nulo'];
        }

        [$arquivo, $membro] = array_pad(explode('#', (string) $documento['origem'], 2), 2, null);

        if (str_starts_with($arquivo, '/') || in_array('..', explode('/', $arquivo), true)) {
            return ['erro' => sprintf('a origem %s sai da pasta do levantamento', $arquivo)];
        }

        $caminho = $origem.'/'.$arquivo;

        if (! is_file($caminho)) {
            return ['erro' => sprintf('o arquivo %s não existe em %s', $arquivo, $origem)];
        }

        $bytes = $membro === null ? (string) file_get_contents($caminho) : self::membroDoZip($caminho, $arquivo, $membro);

        if (is_array($bytes) || $paginas === null) {
            return $bytes;
        }

        return self::recortar($bytes, $paginas[0], $paginas[1]);
    }

    private static function paginasValidas(mixed $paginas): bool
    {
        return is_array($paginas)
            && array_is_list($paginas)
            && count($paginas) === 2
            && is_int($paginas[0])
            && is_int($paginas[1])
            && $paginas[0] >= 1
            && $paginas[0] <= $paginas[1];
    }

    /** @return string|array{erro: string} */
    private static function membroDoZip(string $caminho, string $arquivo, string $membro): string|array
    {
        $zip = new ZipArchive;

        if ($zip->open($caminho, ZipArchive::RDONLY) !== true) {
            return ['erro' => sprintf('o zip %s não abriu', $arquivo)];
        }

        try {
            $bytes = $zip->getFromName($membro);

            if ($bytes !== false) {
                return $bytes;
            }

            $nomes = [];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $nomes[] = (string) $zip->getNameIndex($i);
            }

            return ['erro' => sprintf('o membro %s não existe em %s; o zip tem: %s', $membro, $arquivo, implode(', ', $nomes))];
        } finally {
            $zip->close();
        }
    }

    /**
     * As páginas `$de` a `$ate` do PDF, num PDF só.
     *
     * @return string|array{erro: string}
     */
    private static function recortar(string $pdf, int $de, int $ate): string|array
    {
        $temporario = sys_get_temp_dir().'/'.self::PREFIXO_TEMPORARIO.bin2hex(random_bytes(6));
        mkdir($temporario, 0700);

        try {
            file_put_contents($temporario.'/origem.pdf', $pdf);

            $separar = new Process(
                ['pdfseparate', '-f', (string) $de, '-l', (string) $ate, $temporario.'/origem.pdf', $temporario.'/pagina-%d.pdf'],
                null,
                null,
                null,
                self::TEMPO_LIMITE,
            );
            $separar->run();

            $paginas = [];
            for ($i = $de; $i <= $ate; $i++) {
                $paginas[] = $temporario.'/pagina-'.$i.'.pdf';
            }

            if (! $separar->isSuccessful() || array_filter($paginas, fn (string $p) => ! is_file($p)) !== []) {
                return ['erro' => sprintf('não foi possível separar as páginas %d-%d do PDF: %s', $de, $ate, trim($separar->getErrorOutput()))];
            }

            if (count($paginas) === 1) {
                return (string) file_get_contents($paginas[0]);
            }

            $unir = new Process(['pdfunite', ...$paginas, $temporario.'/recorte.pdf'], null, null, null, self::TEMPO_LIMITE);
            $unir->run();

            if (! $unir->isSuccessful()) {
                return ['erro' => sprintf('não foi possível unir as páginas %d-%d do PDF: %s', $de, $ate, trim($unir->getErrorOutput()))];
            }

            return (string) file_get_contents($temporario.'/recorte.pdf');
        } catch (ProcessException $e) {
            return ['erro' => sprintf('falha ao rodar o poppler: %s', $e->getMessage())];
        } finally {
            File::deleteDirectory($temporario);
        }
    }
}
