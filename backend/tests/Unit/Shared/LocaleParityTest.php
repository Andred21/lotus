<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Os três locales do backend têm de carregar exatamente o mesmo conjunto de
 * chaves. Tradução faltando não se anuncia: o Laravel devolve a CHAVE quando
 * não acha o valor, e a resposta HTTP sai com `commercial.quote.x` no lugar da
 * frase. Por isso o teste recusa três coisas: chave a mais, chave a menos e
 * valor igual à própria chave.
 */
class LocaleParityTest extends TestCase
{
    private const LOCALES = ['en', 'es_CL', 'pt_BR'];

    /** @return array<string, string> chave achatada => valor */
    private function achatar(array $itens, string $prefixo = ''): array
    {
        $saida = [];
        foreach ($itens as $chave => $valor) {
            $completa = $prefixo === '' ? (string) $chave : $prefixo.'.'.$chave;
            if (is_array($valor)) {
                $saida += $this->achatar($valor, $completa);
            } else {
                $saida[$completa] = (string) $valor;
            }
        }

        return $saida;
    }

    /** @return array<string, string> */
    private function dicionario(string $locale): array
    {
        $saida = [];
        foreach (glob(lang_path($locale.'/*.php')) as $arquivo) {
            $nome = basename($arquivo, '.php');
            $saida += $this->achatar(require $arquivo, $nome);
        }
        $json = lang_path($locale.'.json');
        if (file_exists($json)) {
            $saida += $this->achatar(json_decode(file_get_contents($json), true) ?: [], 'json');
        }

        return $saida;
    }

    #[Test]
    public function os_tres_locales_tem_o_mesmo_conjunto_de_chaves(): void
    {
        $referencia = array_keys($this->dicionario('es_CL'));
        sort($referencia);

        foreach (self::LOCALES as $locale) {
            $chaves = array_keys($this->dicionario($locale));
            sort($chaves);

            $this->assertSame(
                $referencia,
                $chaves,
                "O locale {$locale} divergiu do es_CL. Faltando: "
                .implode(', ', array_diff($referencia, $chaves))
                .' | Sobrando: '.implode(', ', array_diff($chaves, $referencia))
            );
        }
    }

    #[Test]
    public function nenhum_valor_esta_vazio_ou_igual_a_propria_chave(): void
    {
        foreach (self::LOCALES as $locale) {
            foreach ($this->dicionario($locale) as $chave => $valor) {
                $this->assertNotSame('', trim($valor), "{$locale}: {$chave} está vazia.");
                $this->assertNotSame($chave, $valor, "{$locale}: {$chave} não foi traduzida.");
            }
        }
    }

    #[Test]
    public function o_espanhol_neutro_nao_existe_mais(): void
    {
        $this->assertDirectoryDoesNotExist(lang_path('es'));
        $this->assertFileDoesNotExist(lang_path('es.json'));
        $this->assertFileExists(lang_path('es_CL.json'));
    }
}
