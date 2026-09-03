<?php

namespace Tests\Unit\Shared;

use App\Shared\Exceptions\RecusaDeDominio;
use PHPUnit\Framework\Attributes\Test;
use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * Exceção de domínio não conhece HTTP.
 *
 * O bloco do envelope tirou o status de dentro de quatro exceções e o pôs no
 * `TipoDeRecusa`. Sem esta régua, a quinta nasce estendendo `HttpException`
 * com `422` no corpo e a decisão volta a ficar repartida — que é exatamente
 * o estado que o candidato 6 do review de 2026-09-02 mediu.
 *
 * Régua ESTÁTICA de propósito: o teste comportamental prova o que existe, e
 * esta prova o que não pode existir.
 */
class RecusaDeDominioTest extends TestCase
{
    use ScansPhpSource;

    /**
     * @return list<string>
     */
    private function excecoesDeDominio(): array
    {
        $saida = [];

        foreach (glob(base_path('app/Domains/*/Exceptions'), GLOB_ONLYDIR) as $pasta) {
            $saida = array_merge($saida, $this->arquivosPhp($pasta));
        }

        return $saida;
    }

    #[Test]
    public function nenhuma_excecao_de_dominio_estende_http_exception(): void
    {
        $ofensores = [];

        foreach ($this->excecoesDeDominio() as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);

            if (preg_match('/extends\s+HttpException\b/', $codigo)
                || preg_match('/extends\s+\\\\?Symfony\\\\Component\\\\HttpKernel\\\\Exception\\\\HttpException\b/', $codigo)) {
                $ofensores[] = basename($arquivo);
            }
        }

        $this->assertSame([], $ofensores, "Exceção de domínio estendendo HttpException:\n".implode("\n", $ofensores));
    }

    #[Test]
    public function nenhuma_excecao_de_dominio_escreve_status_http(): void
    {
        $ofensores = [];

        foreach ($this->excecoesDeDominio() as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);

            if (preg_match('/\b(?:400|401|403|404|409|422|429|500)\b/', $codigo, $achado)) {
                $ofensores[] = basename($arquivo).'  '.$achado[0];
            }
        }

        $this->assertSame([], $ofensores, "Status HTTP escrito dentro do domínio:\n".implode("\n", $ofensores));
    }

    #[Test]
    public function toda_recusa_de_dominio_declara_um_tipo(): void
    {
        foreach ($this->excecoesDeDominio() as $arquivo) {
            $classe = 'App\\Domains\\'.str_replace(
                '/',
                '\\',
                trim(substr($arquivo, strlen(base_path('app/Domains/')), -4), '/'),
            );

            if (! class_exists($classe) || ! is_subclass_of($classe, RecusaDeDominio::class)) {
                continue;
            }

            $metodo = new \ReflectionMethod($classe, 'tipo');
            $this->assertFalse(
                $metodo->isAbstract(),
                "{$classe} estende RecusaDeDominio sem declarar tipo().",
            );
        }
    }
}
