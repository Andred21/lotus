<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * As duas portas por onde a projeção de arquivados voltaria a existir oito
 * vezes. Régua estática de propósito: o teste comportamental prova o que
 * EXISTE, esta prova o que NÃO PODE existir.
 *
 * `App\Shared\*` não é varrido pelo `DomainDependencyTest`, cuja matriz só
 * enxerga `app/Domains/` — então esta é a única régua estrutural do module.
 *
 * A varredura e a remoção de comentário vêm do `ScansPhpSource`, que já
 * serve outras cinco catracas: o `codigoSemComentarios` de lá usa
 * `token_get_all()`, e por isso não confunde `//` dentro de string com
 * comentário — o `preg_replace` que esta classe reimplementava confundia, e
 * apagava o resto da linha depois de uma URL (Q-4 do review de 2026-09-02).
 */
class ProjecaoDeArquivadosTest extends TestCase
{
    use ScansPhpSource;

    /**
     * O module, por ARQUIVO e não por pasta.
     *
     * Isentar `Shared/Audit/` e `Shared/Http/` inteiras deixaria uma classe
     * vizinha reconstruir a duplicação com a régua aplaudindo — e as duas
     * pastas crescem (`Shared/Http/` já hospeda `Middleware/SetLocale.php`).
     * A isenção tem o tamanho da peça (Q-3 do mesmo review).
     */
    private const MODULE = [
        'ArchivedListing.php',
        'RespostaDeRecurso.php',
    ];

    private function ehDoModule(string $caminho): bool
    {
        return in_array(basename($caminho), self::MODULE, strict: true);
    }

    /**
     * Qualquer chamada estática ao método, não a uma grafia dele.
     *
     * `str_contains('ArchiveTrailQuery::archivedBy')` não via
     * `use ... as Trail; Trail::archivedBy()`. Casar `::archivedBy(` pega o
     * alias, o FQN e a variável de classe, e não pega a DECLARAÇÃO em
     * `ArchiveTrailQuery.php` (que é `function archivedBy(`, sem `::`).
     */
    #[Test]
    public function o_archive_trail_query_so_e_chamado_de_dentro_do_module(): void
    {
        $ofensores = [];

        foreach ($this->arquivosPhp(base_path('app')) as $caminho) {
            if ($this->ehDoModule($caminho)) {
                continue;
            }

            if (preg_match('/::\s*archivedBy\s*\(/', $this->codigoSemComentarios($caminho))) {
                $ofensores[] = str_replace(base_path().'/', '', $caminho);
            }
        }

        $this->assertSame([], $ofensores, implode("\n", array_merge(
            [
                'A montagem da listagem de arquivados mora em App\Shared\Audit\ArchivedListing::lista().',
                'Chamar `ArchiveTrailQuery::archivedBy` fora do module é reconstruir as seis linhas',
                'que existiam oito vezes. Arquivos encontrados:',
            ],
            $ofensores,
        )));
    }

    /**
     * O 200, em qualquer grafia.
     *
     * A régua anterior casava só `setStatusCode(Response::HTTP_OK)` e
     * `setStatusCode(200)`, e escapavam quatro formas que o Pint aceita:
     * `\Illuminate\Http\Response::HTTP_OK` (FQN), `JsonResponse::HTTP_OK`
     * (mesma constante, outra classe), alias de import e
     * `setStatusCode(status: 200)` (argumento nomeado). Régua que pega uma
     * grafia e não a outra é a porta por onde a dívida volta — é a decisão
     * §3.3 da spec, e a lição que as catracas `GRAFIA_LITERAL` e
     * `RAIO_LITERAL` do frontend compraram.
     *
     * `\b200\b` não casa `2000` nem `201`. A lista de exceções é VAZIA: os
     * catorze sítios migraram, e sítio novo nasce vermelho e escolhe.
     */
    #[Test]
    public function o_200_contra_o_201_mora_num_lugar_so(): void
    {
        $ofensores = [];

        foreach ($this->arquivosPhp(base_path('app')) as $caminho) {
            if ($this->ehDoModule($caminho)) {
                continue;
            }

            if (preg_match('/setStatusCode\(\s*[^)]*\b(?:HTTP_OK|200)\b/', $this->codigoSemComentarios($caminho))) {
                $ofensores[] = str_replace(base_path().'/', '', $caminho);
            }
        }

        $this->assertSame([], $ofensores, implode("\n", array_merge(
            [
                'O 200 contra o 201 que o `ResponsableData` força em POST mora em',
                'App\Shared\Http\RespostaDeRecurso::ok(). Arquivos encontrados:',
            ],
            $ofensores,
        )));
    }
}
