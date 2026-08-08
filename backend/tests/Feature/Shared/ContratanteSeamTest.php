<?php

namespace Tests\Feature\Shared;

use Tests\TestCase;

/**
 * Catraca (ratchet): a travessia manual `->budget->client` — a cadeia
 * comercial cotação -> orçamento -> cliente — só pode existir dentro dos
 * dois arquivos que hoje SÃO o seam (Task B4 do plano
 * `profundidade-backend-b4-b7`): `Turma::contratanteClient()`/`contratante()`
 * e `Quote::contratante()`. Todo outro call site que precisar do contratante
 * chama o seam; reescrever a travessia à mão em outro lugar é o regresso que
 * este teste existe para barrar.
 *
 * NÃO cobre, de propósito (D-P3 do plano): strings de eager-load como
 * `'quote.budget.client'` ou `'budget.client'` passadas para `->with()` /
 * `->load()`. Isso é carga de query (concern dos QueryBuilders, Task B5, e de
 * `CertificateEligibility`), não travessia de código — o regex aqui varre
 * acesso a propriedade (`->budget->client`), não literal de string, e essa
 * separação é deliberada, não uma lacuna esquecida.
 *
 * Duas fontes, dois modos de varredura:
 * - `app/Domains/**\/*.php`: comentários removidos via `token_get_all()`,
 *   mesmo racional do `DomainDependencyTest` — citar a travessia num
 *   docblock não é reintroduzi-la. Diferente do `DomainDependencyTest`,
 *   aqui o comentário é trocado por linhas em branco na mesma quantidade
 *   (não apagado), porque a falha precisa apontar o número de linha do
 *   arquivo fonte, e remover o comentário por completo desalinha a contagem.
 * - `resources/views/**\/*.blade.php`: varredura RAW, sem stripping — Blade
 *   não passa por `token_get_all()` do PHP puro.
 */
class ContratanteSeamTest extends TestCase
{
    private const REGEX = '/->\s*budget\s*->\s*client\b/';

    /** Os dois donos do seam (Task B4) — travessia aqui é a implementação, não o regresso. */
    private const ALLOWLIST = [
        'app/Domains/Operation/Models/Turma.php',
        'app/Domains/Commercial/Models/Quote.php',
    ];

    public function test_travessia_budget_client_so_existe_nos_donos_do_seam(): void
    {
        $violacoes = [];

        foreach ($this->arquivosPhp(base_path('app/Domains')) as $arquivo) {
            $violacoes = array_merge($violacoes, $this->ocorrencias($arquivo, $this->codigoSemComentarios($arquivo)));
        }

        foreach ($this->arquivosBlade(base_path('resources/views')) as $arquivo) {
            $violacoes = array_merge($violacoes, $this->ocorrencias($arquivo, (string) file_get_contents($arquivo)));
        }

        $this->assertSame([], $violacoes, implode("\n", array_merge(
            ['Travessia manual `->budget->client` fora dos donos do seam (Turma::contratanteClient()/contratante() ou Quote::contratante()):'],
            $violacoes,
        )));
    }

    /** @return list<string> uma entrada "arquivo:linha" por ocorrência */
    private function ocorrencias(string $caminho, string $conteudo): array
    {
        $relativo = str_replace(base_path().'/', '', $caminho);

        if (in_array($relativo, self::ALLOWLIST, true)) {
            return [];
        }

        preg_match_all(self::REGEX, $conteudo, $matches, PREG_OFFSET_CAPTURE);

        return array_map(
            fn (array $match): string => sprintf('%s:%d', $relativo, substr_count($conteudo, "\n", 0, $match[1]) + 1),
            $matches[0],
        );
    }

    /** @return list<string> */
    private function arquivosPhp(string $raiz): array
    {
        return $this->arquivosComExtensao($raiz, fn (string $nome) => str_ends_with($nome, '.php'));
    }

    /** @return list<string> */
    private function arquivosBlade(string $raiz): array
    {
        return $this->arquivosComExtensao($raiz, fn (string $nome) => str_ends_with($nome, '.blade.php'));
    }

    /** @return list<string> */
    private function arquivosComExtensao(string $raiz, callable $aceita): array
    {
        if (! is_dir($raiz)) {
            return [];
        }

        $encontrados = [];
        $iterador = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($raiz));

        foreach ($iterador as $arquivo) {
            if ($arquivo->isFile() && $aceita($arquivo->getFilename())) {
                $encontrados[] = $arquivo->getPathname();
            }
        }

        return $encontrados;
    }

    /**
     * O código do arquivo sem comentários nem docblocks, com a contagem de
     * linha preservada: cada comentário removido vira a mesma quantidade de
     * quebras de linha que continha, em vez de sumir — senão a linha
     * reportada na falha desalinha da linha real do arquivo fonte assim que
     * há um comentário multi-linha antes da ocorrência.
     */
    private function codigoSemComentarios(string $arquivo): string
    {
        $codigo = '';

        foreach (token_get_all((string) file_get_contents($arquivo)) as $token) {
            if (! is_array($token)) {
                $codigo .= $token;

                continue;
            }

            if ($token[0] === T_COMMENT || $token[0] === T_DOC_COMMENT) {
                $codigo .= str_repeat("\n", substr_count($token[1], "\n"));

                continue;
            }

            $codigo .= $token[1];
        }

        return $codigo;
    }
}
