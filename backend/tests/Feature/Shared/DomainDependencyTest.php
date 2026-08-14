<?php

namespace Tests\Feature\Shared;

use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * A direção de dependência entre domínios era instrução em doc, não mecanismo —
 * e o doc se contradizia sobre ela (`estrutura-monolito.md`, regra de ouro vs.
 * regra acionável do backend). Este teste é a fonte única: o que não está na
 * matriz não passa.
 *
 * `Certification` entrou com ZERO arestas de propósito e nasceu sob este
 * guardrail na Sprint 4: cada import dele exigiu uma decisão explícita antes
 * de abrir a matriz.
 *
 * A varredura é sobre o CÓDIGO do arquivo, não sobre as linhas `use`. Um teste
 * que só lesse `use` seria contornável por FQN inline
 * (`\App\Domains\X\Models\Y::find(1)`), e guardrail com escape conhecido é pior
 * que nenhum — passa a impressão de cobertura que não existe.
 *
 * "Código", não "texto": os comentários são removidos por `token_get_all()`
 * antes da varredura. Citar uma classe num docblock não é depender dela, e
 * contar a menção reprovava a suíte por um vínculo que não existe (review de
 * 2026-08-04, Q-4).
 *
 * Referenciar o NAMESPACE em vez da classe (`use App\Domains\X\Enums;` +
 * `Enums\Y::CASE`) é violação de forma, não aresta: o import não diz qual
 * classe será usada, então a matriz não tem o que conferir. Escapava das duas
 * regras em silêncio até o review de 2026-08-04 (Q-1) — mesmo tratamento do
 * group use, que é banido em vez de fingidamente coberto.
 */
class DomainDependencyTest extends TestCase
{
    use ScansPhpSource;

    /** Camadas que um domínio expõe para os outros. As demais são internas. */
    private const PUBLIC_LAYERS = ['Models', 'Enums', 'Services'];

    /**
     * Arestas permitidas, por classe alvo (spec D4). Lista que só encolhe por
     * refactor consciente: ampliar é 1 linha + justificativa no commit.
     *
     * As 28 entradas combinam as 21 classes-alvo que cobriam os 42 imports
     * medidos em 2026-08-03 com as 7 de Certification abertas neste plano —
     * fluxo do processo (cotação -> turma -> matrícula), Identity como dono de
     * pessoa, e relação Eloquent inversa que o ADR-02 permite.
     */
    private const ALLOWED = [
        'Catalog' => [
            'Identity\Models\Redator',
        ],
        // Task 1 do bloco `dashboard-backend-agregacoes` nasceu com zero arestas:
        // apenas contrato próprio. A Task 2 abre, import a import, as quatro
        // superfícies de Operation usadas por OperationMetricsQuery: Turma, os
        // dois enums e TurmaHabilitacaoService (D8 — habilitação não se duplica).
        // As próximas tasks só acrescentam o que seus `use` efetivamente medirem.
        'Dashboard' => [
            'Operation\Enums\TurmaDocumentType',
            'Operation\Enums\TurmaStatus',
            'Operation\Models\Turma',
            'Operation\Services\TurmaHabilitacaoService',
        ],
        // D-P2 do plano: TurmaStatus é a 7ª aresta exigida pela porta de conclusão.
        // D-P9: CourseModule é a 8ª — o temário da página 2 do documento oficial
        // é `course_modules`, e o snapshot precisa congelá-lo no ato da emissão.
        'Certification' => [
            'Catalog\Models\Course',
            'Catalog\Models\CourseCertificateTemplate',
            'Catalog\Models\CourseModule',
            'Identity\Models\Redator',
            'Operation\Enums\EnrollmentApprovalStatus',
            'Operation\Enums\TurmaStatus',
            'Operation\Models\Enrollment',
            'Operation\Models\Turma',
            // B6: o resultado acadêmico tem dono em Operation; o snapshot congela a
            // partir do VO, não das colunas cruas da matrícula.
            'Operation\Services\AcademicResult',
        ],
        'Commercial' => [
            'Catalog\Models\Course',
            'Identity\Models\User',
            'Identity\Services\UserPhotoService',
            'Identity\Services\UserProvisioner',
            'Operation\Models\Turma',
        ],
        'Identity' => [
            'Catalog\Models\Course',
            'Commercial\Models\Client',
            'Operation\Enums\EnrollmentApprovalStatus',
            'Operation\Models\Enrollment',
        ],
        'Operation' => [
            'Catalog\Models\Course',
            'Commercial\Enums\QuoteStatus',
            'Commercial\Models\Client',
            'Commercial\Models\Quote',
            'Identity\Enums\RedatorDocumentType',
            'Identity\Enums\StudentResolutionOutcome',
            'Identity\Models\Redator',
            'Identity\Models\Student',
            'Identity\Services\StudentLookup',
            'Identity\Services\StudentResolution',
            'Identity\Services\StudentResolver',
        ],
    ];

    public function test_dependencia_entre_dominios_respeita_a_matriz(): void
    {
        $violacoesDeForma = [];
        $violacoesDeSuperficie = [];
        $violacoesDeAresta = [];

        foreach ($this->arquivosDeDominio() as $origem => $arquivos) {
            foreach ($arquivos as $arquivo) {
                foreach ($this->referenciasCrossDomain($arquivo, $origem) as $ref) {
                    [$alvo, $camada, $classe] = $ref;
                    $local = str_replace(base_path().'/', '', $arquivo);

                    if ($camada === '' || $classe === '') {
                        $parcial = rtrim("{$alvo}\\{$camada}", '\\');
                        $violacoesDeForma[] = "{$local}: {$origem} -> {$parcial} (referência ao namespace; importe a classe)";

                        continue;
                    }

                    $fqcnRelativo = "{$alvo}\\{$camada}\\{$classe}";

                    if (! in_array($camada, self::PUBLIC_LAYERS, true)) {
                        $violacoesDeSuperficie[] = "{$local}: {$origem} -> {$fqcnRelativo} (camada {$camada} é interna)";

                        continue;
                    }

                    if (! in_array($fqcnRelativo, self::ALLOWED[$origem] ?? [], true)) {
                        $violacoesDeAresta[] = "{$local}: {$origem} -> {$fqcnRelativo} (aresta não declarada)";
                    }
                }
            }
        }

        // Vem antes das Regras A e B porque um import de namespace as torna
        // inconferíveis: sem o nome da classe não há aresta para comparar.
        $this->assertSame([], $violacoesDeForma, implode("\n", array_merge(
            ['Forma — importe a CLASSE, não o namespace do outro domínio:'],
            $violacoesDeForma,
        )));

        $this->assertSame([], $violacoesDeSuperficie, implode("\n", array_merge(
            ['Regra A — um domínio só enxerga '.implode('/', self::PUBLIC_LAYERS).' de outro:'],
            $violacoesDeSuperficie,
        )));

        $this->assertSame([], $violacoesDeAresta, implode("\n", array_merge(
            ['Regra B — aresta fora da matriz de DomainDependencyTest::ALLOWED:'],
            $violacoesDeAresta,
        )));
    }

    public function test_todo_dominio_em_disco_esta_declarado_na_matriz(): void
    {
        $emDisco = array_values(array_filter(
            scandir(base_path('app/Domains')) ?: [],
            fn (string $entrada) => $entrada !== '.' && $entrada !== '..'
                && is_dir(base_path("app/Domains/{$entrada}")),
        ));

        $declarados = array_keys(self::ALLOWED);
        sort($emDisco);
        sort($declarados);

        // `arquivosDeDominio()` percorre as CHAVES de ALLOWED. Domínio que nasce
        // sem entrada aqui não seria varrido como origem — todas as dependências
        // dele ficariam invisíveis, que é o oposto do que a matriz promete.
        // Achado do review de 2026-08-04 (Q-5), provado com um Feedback/ de sonda
        // importando camada interna de Identity sem reprovar nada.
        $this->assertSame($declarados, $emDisco, 'Domínio em app/Domains/ sem entrada em DomainDependencyTest::ALLOWED (ou vice-versa) — declare a matriz dele, nem que seja com zero arestas, como Certification.');
    }

    public function test_group_use_de_dominio_nao_e_suportado(): void
    {
        $encontrados = [];

        foreach ($this->arquivosDeDominio() as $arquivos) {
            foreach ($arquivos as $arquivo) {
                // A classe de caractere só admite nome e barra: um `{` que venha
                // depois de qualquer outra coisa (`match (\App\Domains\X\Enums\Y::C) {`,
                // ou o `{` da classe várias linhas abaixo) não é group use. Com
                // `[^;]*` era, e reprovava a suíte com o diagnóstico errado
                // (review de 2026-08-04, Q-4).
                if (preg_match('#App\\\\Domains\\\\[A-Za-z0-9_\\\\]*\{#', $this->codigoSemComentarios($arquivo))) {
                    $encontrados[] = str_replace(base_path().'/', '', $arquivo);
                }
            }
        }

        // Group use (`use App\Domains\X\{Models\A, Enums\B};`) escaparia da
        // varredura por classe. Zero ocorrências em 2026-08-03; proibir é mais
        // honesto que fingir que a regex cobre.
        $this->assertSame([], $encontrados, "Declare os imports um a um — group use de App\\Domains não é coberto pela matriz:\n".implode("\n", $encontrados));
    }

    /** @return array<string, list<string>> domínio => arquivos PHP */
    private function arquivosDeDominio(): array
    {
        $raiz = base_path('app/Domains');
        $porDominio = [];

        foreach (array_keys(self::ALLOWED) as $dominio) {
            $porDominio[$dominio] = [];
            $pasta = "{$raiz}/{$dominio}";

            if (! is_dir($pasta)) {
                continue;
            }

            $iterador = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($pasta));

            foreach ($iterador as $arquivo) {
                if ($arquivo->isFile() && $arquivo->getExtension() === 'php') {
                    $porDominio[$dominio][] = $arquivo->getPathname();
                }
            }
        }

        return $porDominio;
    }

    /**
     * Toda referência a outro domínio no código do arquivo: `use`, `use ... as`,
     * FQN inline (`\App\Domains\...`), string de classe (`'App\\Domains\\...'`)
     * e import de namespace (`use App\Domains\X\Enums;`), que vem com camada ou
     * classe vazias e é tratado como violação de forma pelo chamador.
     *
     * @return list<array{0: string, 1: string, 2: string}> [alvo, camada, classe]
     */
    private function referenciasCrossDomain(string $arquivo, string $origem): array
    {
        // Normaliza a barra dupla das strings PHP para a barra simples do código.
        $conteudo = str_replace('\\\\', '\\', $this->codigoSemComentarios($arquivo));

        // Camada e classe são OPCIONAIS: `use App\Domains\Identity\Actions;`
        // não casava a regex de 3 segmentos e dava acesso à camada interna
        // inteira sem reprovar nada (review de 2026-08-04, Q-1).
        preg_match_all(
            '#App\\\\Domains\\\\([A-Za-z0-9_]+)(?:\\\\([A-Za-z0-9_]+))?(?:\\\\([A-Za-z0-9_]+))?#',
            $conteudo,
            $matches,
            PREG_SET_ORDER,
        );

        $refs = [];

        foreach ($matches as $match) {
            $alvo = $match[1];

            if ($alvo === $origem) {
                continue;
            }

            $refs[] = [$alvo, $match[2] ?? '', $match[3] ?? ''];
        }

        return $refs;
    }
}
