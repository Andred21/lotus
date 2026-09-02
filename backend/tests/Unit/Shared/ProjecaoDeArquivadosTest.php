<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * As duas portas por onde a projeção de arquivados voltaria a existir oito
 * vezes. Régua estática de propósito: o teste comportamental prova o que
 * EXISTE, esta prova o que NÃO PODE existir.
 *
 * `App\Shared\*` não é varrido pelo `DomainDependencyTest`, cuja matriz só
 * enxerga `app/Domains/` — então esta é a única régua estrutural do module.
 */
class ProjecaoDeArquivadosTest extends TestCase
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

    /**
     * Só as linhas de código: docblock e comentário podem citar o método.
     * Sem isto a régua nasceria vermelha por dois docblocks que apenas o
     * MENCIONAM (`Shared/Pagination/Paginates.php` e o `TurmaController`).
     */
    private function codigoSemComentario(string $caminho): string
    {
        return preg_replace('#/\*.*?\*/|//[^\n]*#s', '', file_get_contents($caminho));
    }

    #[Test]
    public function o_archive_trail_query_so_e_chamado_de_dentro_do_module(): void
    {
        $ofensores = [];

        foreach ($this->arquivosPhp('app') as $caminho) {
            if (str_contains($caminho, '/app/Shared/Audit/')) {
                continue;
            }

            if (str_contains($this->codigoSemComentario($caminho), 'ArchiveTrailQuery::archivedBy')) {
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
     * As DUAS grafias. Régua que pega uma e não a outra é a porta por onde a
     * dívida volta — foi a lição que as catracas `GRAFIA_LITERAL` e
     * `RAIO_LITERAL` do frontend compraram. A lista de exceções é VAZIA: os
     * catorze sítios migraram, e sítio novo nasce vermelho e escolhe.
     */
    #[Test]
    public function o_200_contra_o_201_mora_num_lugar_so(): void
    {
        $ofensores = [];

        foreach ($this->arquivosPhp('app') as $caminho) {
            if (str_contains($caminho, '/app/Shared/Http/')) {
                continue;
            }

            if (preg_match('/setStatusCode\(\s*(?:Response::HTTP_OK|200)\s*\)/', $this->codigoSemComentario($caminho))) {
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
