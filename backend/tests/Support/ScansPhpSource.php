<?php

namespace Tests\Support;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Varredura de fonte PHP para guarda de arquitetura.
 *
 * `codigoSemComentarios` nasceu privado no `DomainDependencyTest` e passou a
 * ser compartilhado quando o `PersistenceLawsTest` precisou da mesma coisa:
 * citar `CREATE TRIGGER` num comentário que EXPLICA a lei não pode reprovar a
 * lei (mesmo defeito do review de 2026-08-04, Q-4).
 */
trait ScansPhpSource
{
    /** @return list<string> paths absolutos dos `.php` sob a pasta, ordenados */
    protected function arquivosPhp(string $pasta): array
    {
        if (! is_dir($pasta)) {
            return [];
        }

        $arquivos = [];

        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($pasta)) as $arquivo) {
            if ($arquivo->isFile() && $arquivo->getExtension() === 'php') {
                $arquivos[] = $arquivo->getPathname();
            }
        }

        sort($arquivos);

        return $arquivos;
    }

    /** O código do arquivo sem comentários nem docblocks. */
    protected function codigoSemComentarios(string $arquivo): string
    {
        $codigo = '';

        foreach (token_get_all((string) file_get_contents($arquivo)) as $token) {
            if (! is_array($token)) {
                $codigo .= $token;

                continue;
            }

            if ($token[0] === T_COMMENT || $token[0] === T_DOC_COMMENT) {
                continue;
            }

            $codigo .= $token[1];
        }

        return $codigo;
    }
}
