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
        // A Task 3 acrescenta Quote e QuoteStatus para os KPIs e pendências
        // comerciais. A Task 4 acrescenta as superfícies usadas por
        // CertificationMetricsQuery para matrículas aprovadas sem certificado
        // e alertas de vencimento ativos, e por AnalyticsQuery para séries e
        // rankings; Course e Client resolvem os nomes das linhas, enquanto
        // RedatorDocumentType restringe os documentos regulatórios. A Task 5
        // acrescenta só Redator: o RedatorScopeQuery escopa por `turma_redator`
        // e não alcança nenhuma superfície nova além do próprio redator.
        // As próximas tasks só acrescentam o que seus `use` efetivamente
        // medirem — a lista do plano é indicativa e já errou nos dois sentidos.
        'Dashboard' => [
            'Catalog\Models\Course',
            'Certification\Enums\CertificateStatus',
            'Certification\Models\Certificate',
            'Commercial\Enums\QuoteStatus',
            'Commercial\Models\Client',
            'Commercial\Models\Quote',
            'Identity\Enums\RedatorDocumentType',
            'Identity\Models\Redator',
            'Identity\Models\User',
            'Operation\Enums\EnrollmentApprovalStatus',
            'Operation\Enums\TurmaDocumentType',
            'Operation\Enums\TurmaStatus',
            'Operation\Models\Enrollment',
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
        // O bloco `certificacao-historico-do-aluno` abre TRÊS arestas para
        // Certification: `StudentCertificateHistory` (o histórico por
        // matrícula), `StudentCertificateSummary` (o VO que atravessa — vive
        // em Services porque `Data` é camada interna pela Regra A, mesmo lugar
        // e mesmo motivo de `Operation\Services\AcademicResult`) e
        // `CertificateDisplayStatus`, o enum que a união fechada do front
        // exige. `Certificate`, `CertificateStatus` e o snapshot continuam sem
        // cruzar. O ciclo `Identity <-> Certification` que isso cria não é
        // inédito: `Identity <-> Operation` já está aqui com a mesma natureza.
        // Task 7 do bloco `arquivados-roots-restantes` (D3) abre `Turma` e
        // `TurmaStatus`: `Redator::turmas()` é a inversa de `Turma::redatores()`, e
        // `ArchiveRedatorAction` lê `TurmaStatus` para recusar o arquivamento
        // de quem ainda tem turma em andamento. Mesma natureza das duas que já
        // estavam aqui por `Student::enrollments()` — Identity é dono da
        // pessoa e a pergunta "este redator tem trabalho pendente?" é do
        // arquivamento do redator; um service em Operation só empurraria a
        // mesma travessia para outro lugar.
        'Identity' => [
            'Catalog\Models\Course',
            'Certification\Enums\CertificateDisplayStatus',
            'Certification\Services\StudentCertificateHistory',
            'Certification\Services\StudentCertificateSummary',
            'Commercial\Models\Client',
            'Operation\Enums\EnrollmentApprovalStatus',
            'Operation\Enums\TurmaStatus',
            'Operation\Models\Enrollment',
            'Operation\Models\Turma',
        ],
        // Task 1 do bloco `hardening-acesso-ownership-e-integridade` abre `User`:
        // `TurmaQueryBuilder::visibleTo(User $user)` escopa a listagem por
        // `redatores.user_id` (spec D1) — quem autentica é o User, o Redator é
        // o perfil pendurado nele. Aresta existia em código desde `9882fabe`;
        // faltou nesta matriz até o Step 9 da Task 7 rodar a catraca.
        'Operation' => [
            'Catalog\Models\Course',
            'Commercial\Enums\QuoteStatus',
            'Commercial\Models\Client',
            'Commercial\Models\Quote',
            'Identity\Enums\RedatorDocumentType',
            'Identity\Enums\StudentResolutionOutcome',
            'Identity\Models\Redator',
            'Identity\Models\Student',
            'Identity\Models\User',
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

        foreach ($this->referenciasPorDominio() as $origem => $referencias) {
            foreach ($referencias as $ref) {
                if ($ref['fqcn'] === '') {
                    $parcial = rtrim("{$ref['alvo']}\\{$ref['camada']}", '\\');
                    $violacoesDeForma[] = "{$ref['local']}: {$origem} -> {$parcial} (referência ao namespace; importe a classe)";

                    continue;
                }

                if (! in_array($ref['camada'], self::PUBLIC_LAYERS, true)) {
                    $violacoesDeSuperficie[] = "{$ref['local']}: {$origem} -> {$ref['fqcn']} (camada {$ref['camada']} é interna)";

                    continue;
                }

                if (! in_array($ref['fqcn'], self::ALLOWED[$origem] ?? [], true)) {
                    $violacoesDeAresta[] = "{$ref['local']}: {$origem} -> {$ref['fqcn']} (aresta não declarada)";
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

    /**
     * Regra C — a direção contrária da Regra B (D-17).
     *
     * A Regra B pega aresta USADA e não declarada; sem esta, a matriz envelhece
     * com sobra em silêncio: o import sai no refactor e a linha fica, dando
     * permissão a um vínculo que ninguém mais tem.
     *
     * A varredura é a MESMA da Regra B por ESTRUTURA, não por promessa de
     * comentário: as duas leem `referenciasPorDominio()`, e é lá que mora a
     * decisão de o que é aresta conferível (review de 2026-08-22, Q-4). Escrita
     * sobre linhas `use`, esta regra acusaria de órfã toda aresta consumida só
     * por FQN inline (`\App\Domains\X\Models\Y::find(1)`), que é justamente o
     * escape que o docblock desta classe fecha de propósito.
     *
     * Referência ao namespace (`fqcn` vazio) não conta como consumo: é violação
     * de forma e a Regra B já a reprova pelo nome certo.
     */
    public function test_toda_aresta_declarada_tem_consumidor(): void
    {
        $orfas = [];

        foreach ($this->referenciasPorDominio() as $origem => $referencias) {
            $usadas = array_column($referencias, 'fqcn');

            foreach (self::ALLOWED[$origem] as $declarada) {
                if (! in_array($declarada, $usadas, true)) {
                    $orfas[] = "{$origem} -> {$declarada}";
                }
            }
        }

        $this->assertSame([], $orfas, implode("\n", array_merge(
            ['Regra C — aresta declarada em DomainDependencyTest::ALLOWED sem nenhum consumidor no domínio de origem. A matriz só encolhe por refactor consciente: se o import saiu, a linha sai junto.'],
            $orfas,
        )));
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
     * Base ÚNICA das Regras B e C: toda referência cross-domain do código,
     * agrupada pelo domínio de origem, em uma varredura só.
     *
     * Existe porque as duas regras liam a mesma coisa por dois laços próprios, e
     * a igualdade entre eles era garantida por comentário (review de 2026-08-22,
     * Q-4). Um filtro que divergisse devolvia a Regra C acusando de órfã a aresta
     * que a Regra B considera usada — o falso positivo que o desenho da D-17
     * nomeia como risco principal.
     *
     * `fqcn` é a aresta conferível (`Alvo\Camada\Classe`) e vem VAZIO quando a
     * referência é ao namespace, sem camada ou sem classe. Essa é a decisão que
     * mora aqui, e não repetida em cada regra: a Regra B reprova o vazio por
     * forma, a Regra C o ignora.
     *
     * @return array<string, list<array{local: string, alvo: string, camada: string, classe: string, fqcn: string}>>
     */
    private function referenciasPorDominio(): array
    {
        $porDominio = [];

        foreach ($this->arquivosDeDominio() as $origem => $arquivos) {
            $porDominio[$origem] = [];

            foreach ($arquivos as $arquivo) {
                foreach ($this->referenciasCrossDomain($arquivo, $origem) as [$alvo, $camada, $classe]) {
                    $porDominio[$origem][] = [
                        'local' => str_replace(base_path().'/', '', $arquivo),
                        'alvo' => $alvo,
                        'camada' => $camada,
                        'classe' => $classe,
                        'fqcn' => ($camada === '' || $classe === '') ? '' : "{$alvo}\\{$camada}\\{$classe}",
                    ];
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
