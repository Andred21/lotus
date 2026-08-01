<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Support\PermissionCatalog;
use Tests\TestCase;

/**
 * O catálogo de permissões vive no backend; o texto que o usuário lê no picker
 * vive nas locales do front (`perm.<name>`, com `.` trocado por `_`). Nada
 * ligava os dois: permissão nova sem tradução renderizava a chave crua.
 *
 * Sem banco e sem `markTestSkipped`. Um teste que passa porque não conseguiu
 * ler o arquivo é a lição 10 de novo — se o caminho não resolver, o teste
 * REPROVA.
 *
 * `base_path('../frontend/...')` resolve nos dois ambientes: no host é
 * `backend/../frontend`; no container é `/var/www/../frontend` = `/frontend`,
 * que o compose já monta.
 */
class PermissionI18nParityTest extends TestCase
{
    private const LOCALES = ['en', 'es-CL', 'pt-BR'];

    public function test_todas_as_locales_cobrem_o_catalogo_de_permissoes(): void
    {
        $esperadas = array_map(
            fn (string $perm) => str_replace('.', '_', $perm),
            array_keys(PermissionCatalog::descriptions()),
        );
        sort($esperadas);

        foreach (self::LOCALES as $locale) {
            $path = "/frontend/src/shared/config/locales/{$locale}.json";
            $this->assertFileExists($path, "Locale {$locale} não encontrado em {$path}");

            $json = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
            $this->assertArrayHasKey('perm', $json, "Locale {$locale} não tem o namespace `perm`");

            $chaves = array_keys($json['perm']);
            sort($chaves);

            $this->assertSame(
                $esperadas,
                $chaves,
                "Locale {$locale}: chaves `perm.*` divergem de PermissionCatalog::descriptions(). ".
                'Faltando: '.implode(', ', array_diff($esperadas, $chaves)).'. '.
                'Sobrando: '.implode(', ', array_diff($chaves, $esperadas)).'.',
            );

            foreach ($json['perm'] as $chave => $texto) {
                $this->assertIsString($texto, "Locale {$locale}: `perm.{$chave}` não é string");
                $this->assertNotSame('', trim($texto), "Locale {$locale}: `perm.{$chave}` está vazio");
            }
        }
    }
}
