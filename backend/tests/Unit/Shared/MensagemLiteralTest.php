<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Mensagem ao usuário não nasce literal em `app/`.
 *
 * A régua é estática de propósito: o teste comportamental prova o que EXISTE,
 * e esta prova o que NÃO PODE existir. Sem ela, o 42º `withMessages` nasce em
 * português num produto es-CL e ninguém vê até o cliente ver — foi exatamente
 * assim que a D-07 chegou a 41 sítios.
 */
class MensagemLiteralTest extends TestCase
{
    /** @return list<string> */
    private function arquivosPhp(string $diretorio): array
    {
        $saida = [];
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(base_path($diretorio)));
        foreach ($it as $arquivo) {
            if ($arquivo->isFile() && $arquivo->getExtension() === 'php') {
                $saida[] = $arquivo->getPathname();
            }
        }

        return $saida;
    }

    #[Test]
    public function nenhum_with_messages_carrega_texto_literal(): void
    {
        $ofensores = [];

        foreach ($this->arquivosPhp('app') as $caminho) {
            $linhas = file($caminho);
            foreach ($linhas as $i => $linha) {
                if (! str_contains($linha, 'withMessages')) {
                    continue;
                }

                $bloco = implode('', array_slice($linhas, $i, 8));

                // Um par `'campo' => '<texto com espaço>'` é mensagem escrita à
                // mão. Chave de tradução não tem espaço; `__(...)` não casa.
                if (preg_match("/'[a-z_]+'\s*=>\s*['\"][^'\"]*\s[^'\"]*['\"]/", $bloco)) {
                    $ofensores[] = basename($caminho).':'.($i + 1);
                }
            }
        }

        $this->assertSame([], $ofensores, "Mensagem literal em withMessages: \n".implode("\n", $ofensores));
    }

    #[Test]
    public function o_problem_details_nao_tem_texto_literal(): void
    {
        $fonte = file_get_contents(base_path('app/Shared/Exceptions/ProblemDetails.php'));

        // Só as linhas de código: docblock e comentário podem citar texto.
        $codigo = preg_replace('#/\*.*?\*/|//[^\n]*#s', '', $fonte);

        $this->assertDoesNotMatchRegularExpression(
            "/(?:title|detail)['\"]?\s*(?:=>|:)\s*['\"][^'\"]*\s[^'\"]*['\"]/",
            $codigo,
            'O ProblemDetails voltou a escrever texto literal.'
        );
    }
}
