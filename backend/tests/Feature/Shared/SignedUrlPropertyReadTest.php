<?php

namespace Tests\Feature\Shared;

use Tests\TestCase;

/**
 * Depois da spec D3, `download_url` e `photo_url` CARREGAM o path até a
 * serialização — quem assina é o `SignedUrlTransformer`. Ler a propriedade em
 * PHP devolve um path com nome de URL, em silêncio, e nenhum teste de JSON vê.
 *
 * Isto é mecanismo, não docblock (lição 14): a lição 13 é reincidente no
 * projeto, e "texto afirmando o que o repositório não faz" já custou quatro
 * achados de review.
 *
 * O `\w*` antes do sufixo é o que faz a guarda acompanhar o projeto em vez de
 * só o dia em que nasceu: `client_photo_url`, `student_photo_url` e
 * `aluno_photo_url` (bloco `celula-de-identidade`) escapavam pelo prefixo, e
 * mecanismo que só cobre o que já existia é docblock com outro nome.
 *
 * A varredura é sobre o CÓDIGO, não sobre o texto: `token_get_all()` remove
 * comentários antes da regex. Os docblocks destes DTOs citam `download_url` em
 * prosa, e contar a menção reprovaria por um vínculo que não existe — foi
 * exatamente o Q-4 do review de 2026-08-04.
 */
class SignedUrlPropertyReadTest extends TestCase
{
    public function test_nenhum_codigo_de_producao_le_a_propriedade_que_carrega_path(): void
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            if (preg_match('/->\s*\w*(download_url|photo_url)\b/', $this->codigoSemComentarios($arquivo))) {
                $encontrados[] = str_replace(base_path().'/', '', $arquivo);
            }
        }

        $this->assertSame([], $encontrados, 'Estas propriedades carregam o PATH até a serialização (spec D3). '
            ."Para a URL assinada, serialize o DTO ou use o SignedUrlTransformer:\n".implode("\n", $encontrados));
    }

    /** @return list<string> */
    private function arquivosPhp(string $raiz): array
    {
        $arquivos = [];
        $iterador = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($raiz));

        foreach ($iterador as $arquivo) {
            if ($arquivo->isFile() && $arquivo->getExtension() === 'php') {
                $arquivos[] = $arquivo->getPathname();
            }
        }

        return $arquivos;
    }

    private function codigoSemComentarios(string $arquivo): string
    {
        $codigo = '';

        foreach (token_get_all((string) file_get_contents($arquivo)) as $token) {
            if (is_array($token) && in_array($token[0], [T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }

            $codigo .= is_array($token) ? $token[1] : $token;
        }

        return $codigo;
    }
}
