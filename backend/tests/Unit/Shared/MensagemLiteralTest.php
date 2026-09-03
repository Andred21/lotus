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

    /**
     * A OUTRA porta de mensagem ao usuário: a exceção que carrega o próprio
     * texto. `withMessages` não é o único caminho até a tela — um
     * `HttpException` com frase própria atravessa o `ProblemDetails` inteiro e
     * sai no `detail`, e foi por essa fresta que quatro recusas de role de
     * sistema seguiram em português depois de o bloco traduzir as outras 41
     * (Q-2 do review de 2026-08-30).
     *
     * Lista dupla, no molde do `ParentLockOnChildWriteTest`: quem carrega texto
     * literal está em `DEBITO_CONHECIDO` com o motivo escrito ao lado, e
     * **silêncio reprova**. Sítio novo nasce vermelho e escolhe — traduzir ou
     * declarar. A lista não é permissão para crescer: é o inventário do que
     * ficou, e ela só encolhe.
     */
    #[Test]
    public function nenhuma_excecao_nova_carrega_texto_literal(): void
    {
        $ofensores = [];

        foreach ($this->arquivosPhp('app') as $caminho) {
            // `new self(...)` só conta dentro de uma classe de exceção: é a
            // forma das factories (`CorruptedSnapshotException::missingFields`).
            // Fora delas, `new self` é DTO montando a si mesmo.
            $ehClasseDeExcecao = str_contains(basename($caminho), 'Exception');
            $gatilho = $ehClasseDeExcecao
                ? '/new (?:[A-Z][A-Za-z]*Exception|self|static)\(/'
                : '/new [A-Z][A-Za-z]*Exception\(/';

            $linhas = file($caminho);
            foreach ($linhas as $i => $linha) {
                if (! preg_match($gatilho, $linha)) {
                    continue;
                }

                $frase = $this->fraseLiteralNaChamada($linhas, $i);

                if ($frase === null) {
                    continue;
                }

                $sitio = basename($caminho).':'.($i + 1);

                if (! array_key_exists($sitio, self::DEBITO_CONHECIDO)) {
                    $ofensores[] = $sitio.'  '.$frase;
                }
            }
        }

        $this->assertSame([], $ofensores, "Exceção com texto literal fora de lang/ e fora da lista:\n".implode("\n", $ofensores));
    }

    /**
     * A primeira frase escrita à mão dentro da chamada que começa na linha
     * `$inicio`, ou `null` se não houver.
     *
     * Lê literal por literal em vez de casar de aspa a aspa: `__('chave', ['x'
     * => $y])` tem duas aspas separadas por `, [`, e um regex de fronteira
     * frouxa lê esse MIOLO como frase — foi o falso-positivo que reprovou os
     * três sítios recém-traduzidos na primeira volta desta catraca. A janela
     * termina no fim da instrução para não colher literal da linha seguinte.
     *
     * @param  list<string>  $linhas
     */
    private function fraseLiteralNaChamada(array $linhas, int $inicio): ?string
    {
        $bloco = '';

        for ($n = $inicio; $n < min($inicio + 6, count($linhas)); $n++) {
            $bloco .= $linhas[$n];

            if (str_contains($linhas[$n], ';')) {
                break;
            }
        }

        // Literais completos: aspas simples ou duplas, com escape respeitado.
        preg_match_all('/\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*"/', $bloco, $encontrados);

        foreach ($encontrados[0] as $literal) {
            $miolo = substr($literal, 1, -1);

            // Chave de tradução não tem espaço; frase tem.
            if (preg_match('/\s/', $miolo)) {
                return $literal;
            }
        }

        return null;
    }

    /**
     * O que ficou literal, com o motivo. Cada linha aqui é dívida declarada, e
     * some quando o sítio passar a ler `lang/`. As entradas restantes são
     * diagnóstico interno: viram 500 mascarado em produção (`ProblemDetails`
     * §detailFor) e nunca chegam ao usuário, então traduzir seria trabalho para
     * ninguém ler. As cinco que CHEGAVAM ao usuário saíram no bloco
     * `backend-envelope-de-erro-e-recusa-de-dominio` (2026-09-02); a lista é
     * inventário, não permissão, e ela só encolhe.
     */
    private const DEBITO_CONHECIDO = [
        // Diagnóstico interno: 500 mascarado em produção, ninguém lê.
        'UploadFileAction.php:86' => 'RuntimeException interna; 500 mascarado.',
        'DashboardController.php:48' => 'RuntimeException interna; 500 mascarado.',
        'UserPhotoService.php:64' => 'RuntimeException interna; 500 mascarado.',
        'PdfRenderException.php:16' => 'RuntimeException interna; 500 mascarado.',
        'OfficeRenderException.php:16' => 'RuntimeException interna; 500 mascarado.',
        'OfficeRenderException.php:26' => 'RuntimeException interna; 500 mascarado.',
        'ArchivedListing.php:68' => 'InvalidArgumentException: chamador esqueceu `onlyTrashed()`; 500 mascarado.',
        'CorruptedSnapshotException.php:48' => 'Separador em implode(); parâmetro de interpolação, não mensagem.',
    ];

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
