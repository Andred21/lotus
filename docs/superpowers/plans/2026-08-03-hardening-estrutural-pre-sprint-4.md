# Hardening estrutural pré-Sprint 4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** instalar três guardrails permanentes — matriz de dependências entre domínios do backend, as três fronteiras do frontend em lint, e testes de regressão das duas abstrações compartilhadas de maior fan-out — antes de o domínio `Certification` ser escrito na Sprint 4.

**Architecture:** nenhuma abstração nova e nenhuma mudança de contrato de API. O backend ganha um teste PHPUnit que varre `app/Domains/**` e compara as referências cross-domain contra uma matriz declarada em código; o frontend ganha três blocos `no-restricted-imports` no `eslint.config.js` e uma suíte `vitest` cobrindo `useTableFilter` e `useCrudPage`. Um defeito de empty state descoberto durante o brainstorming entra junto, porque a invariante que o corrige sobe para o mesmo hook que o bloco passa a testar.

**Tech Stack:** PHP 8.3 / Laravel 13 / PHPUnit 12.5 (backend, no container `app`) · React 19 + TS + Vite / ESLint 10 flat config / vitest + jsdom + @testing-library/react (frontend, nativo no WSL, pnpm).

**Spec:** `docs/superpowers/specs/2026-08-03-hardening-estrutural-pre-sprint-4-design.md`
**Context packet:** `docs/superpowers/context-packets/hardening-estrutural-pre-sprint-4.md`

## Global Constraints

- **Branch no main tree, sem worktree** (spec D14): o bloco toca `backend/` (P-03), `eslint.config.js` e `vite.config.ts`, e o DoD se prova contra o `docker compose` do main tree.
- **Backend roda no container:** `docker compose exec -T app php artisan test`. O host WSL não tem mbstring.
- **Pint roda no host, de dentro de `backend/`, sempre com argumento:** `cd backend && ./vendor/bin/pint <arquivos>`. Nunca sem argumento.
- **Frontend roda nativo, de dentro de `frontend/`:** `pnpm build`, `pnpm lint`, `pnpm test`.
- **Baseline de regressão:** suíte backend em **372 passed (1360 assertions)**. Qualquer número diferente que não seja `372 + testes novos` é regressão e para a task.
- **Não tocar:** `frontend/src/shared/types/generated.ts`, os 3 locales (`en.json`, `es-CL.json`, `pt-BR.json`), `backend/database/`, qualquer rota de API, RBAC ou schema. `git diff main...HEAD` nesses paths fica vazio até o fim (spec §4.6, §5.7).
- **Não instalar:** Pest, `pest-plugin-arch`, `eslint-boundaries`, `@testing-library/jest-dom` (spec D5, D7, D10).
- **Toda sonda de prova é temporária e revertida no mesmo passo que a cria.** Árvore limpa ao fim de cada task.
- **Lição 10:** guardrail que nunca foi visto reprovando não conta como entregue. Cada mecanismo deste plano tem um passo que o vê vermelho antes de valer.
- **Domínios do backend:** `Catalog`, `Certification`, `Commercial`, `Identity`, `Operation`.
- **Features do frontend:** `catalog`, `certification`, `commercial`, `identity`, `operation`.

---

### Task 0: Branch

**Files:** nenhum.

**Interfaces:**
- Consumes: nada.
- Produces: branch `hardening/estrutural-pre-sprint-4` a partir de `main`, base de todas as tasks.

- [ ] **Step 1: Confirmar árvore limpa e `main` atualizado**

```bash
cd /home/jvbat/projetos/lotus
git status --short
git rev-parse --abbrev-ref HEAD
```

Esperado: nenhuma saída de `git status --short` (árvore limpa) e `main` como branch. Se houver arquivo modificado que não seja deste bloco, é WIP do João — **pare e pergunte**, não faça stash (lição 9).

- [ ] **Step 2: Criar a branch**

```bash
git checkout -b hardening/estrutural-pre-sprint-4
git rev-parse --abbrev-ref HEAD
```

Esperado: `hardening/estrutural-pre-sprint-4`.

- [ ] **Step 3: Registrar a baseline de regressão**

```bash
docker compose up -d
docker compose exec -T app php artisan test 2>&1 | tail -3
```

Esperado: `Tests:  372 passed (1360 assertions)`. Anote o número — todas as tasks seguintes comparam com ele.

---

### Task 1: `DomainDependencyTest` — matriz de dependências do backend

**Files:**
- Create: `backend/tests/Feature/Shared/DomainDependencyTest.php`

**Interfaces:**
- Consumes: nada.
- Produces: nada consumido por outra task. É teste puro; a matriz vive dentro dele (spec D6).

O teste varre `backend/app/Domains/**/*.php`, extrai toda referência a `App\Domains\<Alvo>\<Camada>\<Classe>` do **texto do arquivo** (não só das linhas `use` — spec D5b) e aplica duas regras:

- **Regra A (superfície pública):** um domínio só referencia `Models`, `Enums` e `Services` de outro.
- **Regra B (arestas declaradas):** dentro da superfície, só os pares da matriz.

- [ ] **Step 1: Escrever o teste completo**

Create `backend/tests/Feature/Shared/DomainDependencyTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use Tests\TestCase;

/**
 * A direção de dependência entre domínios era instrução em doc, não mecanismo —
 * e o doc se contradizia sobre ela (`estrutura-monolito.md`, regra de ouro vs.
 * regra acionável do backend). Este teste é a fonte única: o que não está na
 * matriz não passa.
 *
 * `Certification` entra com ZERO arestas de propósito. Ele será escrito na
 * Sprint 4, depois deste guardrail, e é o domínio que mais se beneficia de
 * nascer sob a regra: cada import dele exige uma decisão explícita.
 *
 * A varredura é sobre o TEXTO do arquivo, não sobre as linhas `use`. Um teste
 * que só lesse `use` seria contornável por FQN inline
 * (`\App\Domains\X\Models\Y::find(1)`), e guardrail com escape conhecido é pior
 * que nenhum — passa a impressão de cobertura que não existe.
 */
class DomainDependencyTest extends TestCase
{
    /** Camadas que um domínio expõe para os outros. As demais são internas. */
    private const PUBLIC_LAYERS = ['Models', 'Enums', 'Services'];

    /**
     * Arestas permitidas, por classe alvo (spec D4). Lista que só encolhe por
     * refactor consciente: ampliar é 1 linha + justificativa no commit.
     *
     * As 21 entradas cobrem os 42 imports cross-domain medidos em 2026-08-03 e
     * classificados na spec §D2 — fluxo do processo (cotação -> turma ->
     * matrícula), Identity como dono de pessoa, e relação Eloquent inversa que
     * o ADR-02 permite.
     */
    private const ALLOWED = [
        'Catalog' => [
            'Identity\Models\Redator',
        ],
        'Certification' => [],
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
        $violacoesDeSuperficie = [];
        $violacoesDeAresta = [];

        foreach ($this->arquivosDeDominio() as $origem => $arquivos) {
            foreach ($arquivos as $arquivo) {
                foreach ($this->referenciasCrossDomain($arquivo, $origem) as $ref) {
                    [$alvo, $camada, $classe] = $ref;
                    $fqcnRelativo = "{$alvo}\\{$camada}\\{$classe}";
                    $local = str_replace(base_path().'/', '', $arquivo);

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

        $this->assertSame([], $violacoesDeSuperficie, implode("\n", array_merge(
            ['Regra A — um domínio só enxerga '.implode('/', self::PUBLIC_LAYERS).' de outro:'],
            $violacoesDeSuperficie,
        )));

        $this->assertSame([], $violacoesDeAresta, implode("\n", array_merge(
            ['Regra B — aresta fora da matriz de DomainDependencyTest::ALLOWED:'],
            $violacoesDeAresta,
        )));
    }

    public function test_group_use_de_dominio_nao_e_suportado(): void
    {
        $encontrados = [];

        foreach ($this->arquivosDeDominio() as $arquivos) {
            foreach ($arquivos as $arquivo) {
                if (preg_match('#App\\\\Domains\\\\[A-Za-z0-9_]+\\\\[^;]*\{#', (string) file_get_contents($arquivo))) {
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
     * Toda referência a outro domínio no texto do arquivo: `use`, `use ... as`,
     * FQN inline (`\App\Domains\...`) e string de classe (`'App\\Domains\\...'`).
     *
     * @return list<array{0: string, 1: string, 2: string}> [alvo, camada, classe]
     */
    private function referenciasCrossDomain(string $arquivo, string $origem): array
    {
        // Normaliza a barra dupla das strings PHP para a barra simples do código.
        $conteudo = str_replace('\\\\', '\\', (string) file_get_contents($arquivo));

        preg_match_all(
            '#App\\\\Domains\\\\([A-Za-z0-9_]+)\\\\([A-Za-z0-9_]+)\\\\([A-Za-z0-9_]+)#',
            $conteudo,
            $matches,
            PREG_SET_ORDER,
        );

        $refs = [];

        foreach ($matches as $match) {
            [, $alvo, $camada, $classe] = $match;

            if ($alvo === $origem) {
                continue;
            }

            $refs[] = [$alvo, $camada, $classe];
        }

        return $refs;
    }
}
```

- [ ] **Step 2: Rodar o teste — deve PASSAR no estado atual**

```bash
docker compose exec -T app php artisan test --filter=DomainDependencyTest
```

Esperado: `Tests:  2 passed`. Se reprovar, **a matriz está errada, não o código** — leia as violações listadas, confira contra a spec §D4 e corrija a constante `ALLOWED`. Não altere nenhum arquivo de `app/Domains/`.

- [ ] **Step 3: Ver reprovando — Regra A, via `use` (lição 10)**

**A sonda vive em arquivo próprio, nunca dentro de um arquivo de produção.** Um `git checkout` de
arquivo real reverteria junto qualquer WIP que estivesse nele (lição 9); e sonda esquecida em
`ConcludeTurmaAction` é dano permanente, enquanto sonda esquecida em arquivo dedicado é ruído óbvio.

Create `backend/app/Domains/Operation/Actions/SondaArchTemporaria.php`:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Identity\Actions\CreateStudentAction;

/** SONDA TEMPORÁRIA — apagada no Step 6. Existe só para ver o guardrail reprovar. */
class SondaArchTemporaria
{
    public function __invoke(): string
    {
        return CreateStudentAction::class;
    }
}
```

```bash
docker compose exec -T app php artisan test --filter=DomainDependencyTest
```

Esperado: FALHA na Regra A, com a linha
`app/Domains/Operation/Actions/SondaArchTemporaria.php: Operation -> Identity\Actions\CreateStudentAction (camada Actions é interna)`.

- [ ] **Step 4: Ver reprovando — Regra A, via FQN inline (spec D5b, prova 1b do DoD)**

Substitua **todo** o conteúdo de `backend/app/Domains/Operation/Actions/SondaArchTemporaria.php` pela mesma violação **sem nenhuma linha `use`**:

```php
<?php

namespace App\Domains\Operation\Actions;

/** SONDA TEMPORÁRIA — apagada no Step 6. Mesma violação do Step 3, agora só por FQN inline. */
class SondaArchTemporaria
{
    public function __invoke(): string
    {
        return \App\Domains\Identity\Actions\CreateStudentAction::class;
    }
}
```

```bash
docker compose exec -T app php artisan test --filter=DomainDependencyTest
```

Esperado: **mesma falha do Step 3**. É esta prova que separa o teste de um `grep` por `use` — sem ela, a D5b é intenção não-construída (lição 13).

- [ ] **Step 5: Ver reprovando — Regra B (aresta não declarada)**

Substitua **todo** o conteúdo do mesmo arquivo por uma classe de camada **pública** que não está na matriz:

```php
<?php

namespace App\Domains\Operation\Actions;

use App\Domains\Commercial\Models\Budget;

/** SONDA TEMPORÁRIA — apagada no Step 6. Models é camada pública: quem reprova aqui é a matriz. */
class SondaArchTemporaria
{
    public function __invoke(): string
    {
        return Budget::class;
    }
}
```

```bash
docker compose exec -T app php artisan test --filter=DomainDependencyTest
```

Esperado: FALHA na Regra B, com
`Operation -> Commercial\Models\Budget (aresta não declarada)`. Note que `Models` é camada pública — quem reprova aqui é a matriz, não a superfície. Se esta falha vier na **Regra A**, o teste está classificando camada errado: pare e conserte antes de seguir.

- [ ] **Step 6: Apagar a sonda e confirmar árvore limpa**

```bash
rm backend/app/Domains/Operation/Actions/SondaArchTemporaria.php
git status --short
docker compose exec -T app php artisan test --filter=DomainDependencyTest
```

Esperado: `git status --short` mostra **apenas** o arquivo de teste novo (untracked) — nenhum arquivo de `app/Domains/` modificado nem criado — e o teste volta a `2 passed`.

- [ ] **Step 7: Pint e suíte completa**

```bash
cd backend && ./vendor/bin/pint tests/Feature/Shared/DomainDependencyTest.php
cd /home/jvbat/projetos/lotus && docker compose exec -T app php artisan test 2>&1 | tail -3
```

Esperado: Pint sem erro; suíte em **374 passed** (372 da baseline + os 2 novos).

- [ ] **Step 8: Commit**

```bash
git add backend/tests/Feature/Shared/DomainDependencyTest.php
git commit -m "test(arch): matriz de dependências entre domínios vira mecanismo

Regra A: um domínio só enxerga Models/Enums/Services de outro; as outras 7
camadas são internas. Regra B: dentro da superfície, só as 21 arestas
declaradas, que cobrem os 42 imports cross-domain de hoje.

Certification entra com zero arestas de propósito — ele será escrito depois
deste guardrail e é quem mais ganha em nascer sob a regra.

A varredura é sobre o texto do arquivo, não sobre linhas \`use\`: FQN inline
escaparia de um grep por use, e guardrail com escape conhecido dá impressão
de cobertura que não existe. Visto reprovando nos três sentidos (Regra A via
use, Regra A via FQN inline, Regra B) antes de valer.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Corrigir as contradições de `estrutura-monolito.md`

**Files:**
- Modify: `docs/estrutura-monolito.md:7-8` (regra de ouro), `:30` (RouteServiceProvider), `:64-69` (regras do backend)
- Modify: `docs/pendencias.md` (linha da P-04 — spec D15)

**Interfaces:**
- Consumes: `DomainDependencyTest` da Task 1 — o doc passa a apontar para ele como fonte da matriz (spec D6).
- Produces: nada consumido por código.

O doc que o `CLAUDE.md` §3 manda ler **antes de criar qualquer arquivo** se contradiz sobre a regra que a Task 1 acabou de automatizar (spec D6b).

- [ ] **Step 1: Confirmar as duas contradições antes de editar**

```bash
cd /home/jvbat/projetos/lotus
sed -n '7,8p;30p;67,68p' docs/estrutura-monolito.md
ls backend/app/Providers/
```

Esperado: a linha 8 diz que um domínio **NUNCA** importa de outro; a linha 68 diz "Acoplamento controlado, não proibido"; a linha 30 atribui a agregação de `routes.php` ao `RouteServiceProvider`; e `ls` mostra **só** `AppServiceProvider.php` e `TypeScriptTransformerServiceProvider.php` — o `RouteServiceProvider` não existe.

- [ ] **Step 2: Reescrever a regra de ouro**

Em `docs/estrutura-monolito.md`, substitua o bloco das linhas 7-8:

```markdown
## Regra de ouro (uma por lado — NÃO são a mesma regra)
**Frontend — proibição absoluta.** Uma feature **NUNCA** importa de outra feature, nem para tipo, e
`shared` **NUNCA** importa de feature. Composição acontece na camada `app`/rota. Lei §5.6 do
`CLAUDE.md`; mecanismo em `frontend/eslint.config.js` (`no-restricted-imports`).

**Backend — acoplamento controlado, não proibido.** Um domínio pode consumir outro, e consome: são
42 referências cross-domain hoje. O que é proibido é *duplicar a regra* do outro domínio, importar
camada interna dele, ou abrir aresta nova sem declarar. Mecanismo em
`backend/tests/Feature/Shared/DomainDependencyTest.php`, que é a **fonte única** da matriz:

- **superfície pública:** um domínio só enxerga `Models`, `Enums` e `Services` de outro; `Actions`,
  `Data`, `Http`, `Exceptions`, `Policies`, `QueryBuilders` e `Support` são internos;
- **arestas declaradas:** dentro da superfície, só os pares listados em `DomainDependencyTest::ALLOWED`.
  `Certification` está com zero — todo import dele exige decisão explícita.

Tratar as duas como a mesma regra foi o que fez este doc se contradizer até 2026-08-03: a regra de
ouro dizia "NUNCA", a regra acionável do backend dizia "não proibido", e o código seguia a segunda.
```

- [ ] **Step 3: Corrigir a linha do `RouteServiceProvider`**

Na árvore do backend, a linha que hoje diz:

```
│   │   └── routes.php          # rotas do domínio (agregadas pelo RouteServiceProvider)
```

passa a:

```
│   │   └── routes.php          # rotas do domínio (agregadas por glob() em routes/api.php)
```

- [ ] **Step 4: Apontar a regra acionável do backend para o teste**

Na seção `### Regras do backend (acionáveis)`, substitua o item "Cruzamento de domínio" por:

```markdown
- **Cruzamento de domínio:** ex. Operation consome Quote (Commercial) via Service/Action do Commercial
  OU lendo o Model — **nunca duplicando a regra**. Acoplamento controlado, não proibido; o que vale é
  a superfície pública + as arestas de `backend/tests/Feature/Shared/DomainDependencyTest.php`. A
  lista de arestas **não** é repetida aqui de propósito: doc que copia lista envelhece calado
  (lição 13). Para saber o que é permitido, leia o teste — ele reprova.
```

- [ ] **Step 5: Verificar que as contradições sumiram (prova 8 do DoD)**

```bash
grep -n "NUNCA importa de outro domínio" docs/estrutura-monolito.md
grep -n "RouteServiceProvider" docs/estrutura-monolito.md
```

Esperado: o primeiro `grep` **sem saída** (o enunciado absoluto que valia para os dois lados deixou de existir). O segundo devolve **apenas** a linha 51, que afirma corretamente que o provider não existe no repo — nenhuma linha atribuindo a ele a agregação de rotas.

- [ ] **Step 6: Atualizar P-04 em `docs/pendencias.md` (spec D15)**

P-04 **não fecha** — encolhe. O bloco entrega mecanismo para a fronteira de dependência (backend) e
para a lei §5.6 (frontend); continuam sem mecanismo a §5.1 (DDD-lite sem Repository) e a §5.2
(auditoria só na aplicação). Substitua a linha da P-04 por:

```markdown
| P-04 | Leis invioláveis (§5) são instrução, não guardrail — **parcialmente resolvida em 2026-08-03** | O bloco `hardening-estrutural-pre-sprint-4` entregou a substância para duas frentes, por outro meio que o previsto: `backend/tests/Feature/Shared/DomainDependencyTest.php` (superfície pública + arestas declaradas entre domínios) em PHPUnit puro, **não** Pest Arch — Pest não está instalado e trocá-lo custaria o runner dos 75 arquivos da suíte; e `no-restricted-imports` nativo no `frontend/eslint.config.js` para a lei §5.6, **não** `eslint-boundaries` — são 3 fronteiras, não uma hierarquia. **Seguem sem mecanismo:** §5.1 (DDD-lite, sem Repository sobre Eloquent) e §5.2 (auditoria só na aplicação, nunca em trigger de banco) | Reavaliar em **2026-08-15** (gatilho inalterado), agora só para §5.1 e §5.2 |
```

Confirme que o gatilho não se perdeu:

```bash
grep -n "P-04" docs/pendencias.md | grep -c "2026-08-15"
```

Esperado: `1`.

- [ ] **Step 7: Commit**

```bash
git add docs/estrutura-monolito.md docs/pendencias.md
git commit -m "docs(estrutura): separa a regra de dependência do front da do back

A regra de ouro dizia que um domínio NUNCA importa de outro e afirmava valer
dos dois lados; a regra acionável do backend, 60 linhas abaixo, dizia
'acoplamento controlado, não proibido'. O código segue a segunda — são 42
referências cross-domain. Quem lesse a primeira concluiria que são 42
violações.

Agora são duas regras distintas, cada uma com seu mecanismo: eslint no front,
DomainDependencyTest no back. A lista de arestas não é copiada para cá de
propósito (lição 13) — o doc aponta para o teste, que reprova.

Corrige junto a linha que atribuía a agregação de routes.php ao
RouteServiceProvider, que não existe no repo (o mecanismo é glob()), e que já
era contradita por outras duas linhas do próprio doc.

P-04 encolhe: ganhou mecanismo para a dependência entre domínios e para a lei
§5.6, mas §5.1 e §5.2 seguem sem. Gatilho de 2026-08-15 inalterado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: As três fronteiras do frontend viram lint

**Files:**
- Modify: `frontend/eslint.config.js` (acrescentar ao fim do array de `defineConfig`)

**Interfaces:**
- Consumes: nada.
- Produces: nada consumido por outra task.

As 3 fronteiras estão **limpas hoje** — 0 `primereact` fora de `shared/ui`, 0 cross-feature, 0 `shared`→feature. A regra nasce **sem `ignores`** (spec D8).

- [ ] **Step 1: Confirmar que as 3 fronteiras estão limpas antes de ligar a regra**

```bash
cd /home/jvbat/projetos/lotus/frontend/src
grep -rln "from 'primereact" features/ | grep -v "^shared/ui/" ; echo "--- (1) vazio esperado"
grep -rn "@features/" features/ ; echo "--- (2) vazio esperado"
grep -rn "@features/" shared/ ; echo "--- (3) vazio esperado"
```

Esperado: as três buscas sem saída. Se alguma tiver, **pare** — é violação real pré-existente e vira achado do bloco (spec D8), não `ignores`.

- [ ] **Step 2: Acrescentar os três blocos ao `eslint.config.js`**

Em `frontend/eslint.config.js`, no topo do arquivo (depois dos imports existentes), acrescente:

```js
// As features do frontend. `certification` entra na lista mesmo sendo scaffold:
// ele será escrito na Sprint 4 e é quem mais ganha em nascer sob a regra.
const FEATURES = ['catalog', 'certification', 'commercial', 'identity', 'operation']
```

E, ao final do array passado a `defineConfig([...])`, **depois** do bloco de `max-lines`, acrescente:

```js
  // Lei §5.6 do CLAUDE.md vira mecanismo (lição 14). As 3 fronteiras estão
  // limpas hoje — 0 primereact fora de shared/ui, 0 cross-feature, 0
  // shared->feature — então a regra nasce SEM catraca, diferente das duas
  // anteriores. Violação encontrada aqui é achado, não exceção a registrar.
  //
  // Blocos SEPARADOS entre si e do no-restricted-syntax/max-lines acima: um
  // `ignores` compartilhado reabriria catraca alheia em silêncio (Q-1 de
  // abstracao-componentes-catalog, 2026-08-03).
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['primereact', 'primereact/*'],
              message:
                'Feature não importa PrimeReact direto: use o wrapper de @shared/ui (CLAUDE.md §5.6, ADR-05).',
            },
          ],
        },
      ],
    },
  },
  // Uma feature não enxerga outra — nem para tipo. Um bloco por feature,
  // proibindo as outras 4. O padrão `**/features/<outra>/**` cobre o caminho
  // relativo, que hoje não existe (nenhum import em features/ sobe 2+ níveis)
  // mas passaria despercebido pelo padrão de alias sozinho.
  ...FEATURES.map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: FEATURES.filter((outra) => outra !== feature).flatMap((outra) => [
                `@features/${outra}`,
                `@features/${outra}/*`,
                `**/features/${outra}/**`,
              ]),
              message:
                'Feature não importa de outra feature: a composição acontece em app/router, ou o dado vem da API (CLAUDE.md §5.6, ADR-05).',
            },
          ],
        },
      ],
    },
  })),
  // Dependência aponta só para baixo: shared é base, não conhece domínio.
  // `app/` fica de fora desta e da regra acima de propósito — AppRouter importa
  // 5 features, e compor rotas é o trabalho dele.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@features/*', '**/features/**'],
              message:
                'shared/ não importa de feature: a dependência aponta só para baixo (CLAUDE.md §5.6, ADR-05).',
            },
          ],
        },
      ],
    },
  },
```

- [ ] **Step 3: Lint verde no estado atual**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm lint
```

Esperado: sem erro. Se acusar algo, é violação real pré-existente — veja o Step 1.

- [ ] **Step 4: Ver reprovando — fronteira 1 (PrimeReact em feature)**

Acrescente como primeira linha de `frontend/src/features/catalog/components/Course/CoursesTable.tsx`:

```ts
import { Button } from 'primereact/button'
```

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm lint 2>&1 | grep -A1 "CoursesTable"
```

Esperado: erro `no-restricted-imports` com a mensagem "Feature não importa PrimeReact direto…".

```bash
git checkout src/features/catalog/components/Course/CoursesTable.tsx
```

- [ ] **Step 5: Ver reprovando — fronteira 2 (feature importa feature)**

Acrescente como primeira linha do mesmo `CoursesTable.tsx`:

```ts
import { ClientsTable } from '@features/commercial/components/Client/ClientsTable'
```

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm lint 2>&1 | grep -A1 "CoursesTable"
```

Esperado: erro com "Feature não importa de outra feature…".

```bash
git checkout src/features/catalog/components/Course/CoursesTable.tsx
```

- [ ] **Step 6: Ver reprovando — fronteira 3 (shared importa feature)**

Acrescente como primeira linha de `frontend/src/shared/hooks/useTableFilter.ts`:

```ts
import type { TurmaDisplayStatus } from '@features/operation/lib/turmaStatus'
```

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm lint 2>&1 | grep -A1 "useTableFilter"
```

Esperado: erro com "shared/ não importa de feature…". **Este caso é `import type`** — a prova de que a regra vale "nem para tipo", que é o texto literal da lei §5.6.

```bash
git checkout src/shared/hooks/useTableFilter.ts
```

- [ ] **Step 7: Provar que a regra NÃO dispara em import legítimo**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm lint 2>&1 | tail -3
grep -n "@shared/ui" src/features/catalog/components/Course/CoursesTable.tsx | head -2
grep -n "@features/" src/app/router/AppRouter.tsx | head -2
git status --short
```

Esperado: `pnpm lint` verde; `CoursesTable` importando `@shared/ui` sem reclamação; `AppRouter` importando 5 features sem reclamação (spec D9); e `git status --short` mostrando **apenas** `frontend/eslint.config.js` modificado — todas as sondas revertidas.

- [ ] **Step 8: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/eslint.config.js
git commit -m "feat(lint): as 3 fronteiras da lei §5.6 viram mecanismo

primereact fora de shared/ui, feature->feature e shared->feature passam a
reprovar no pnpm lint. Regra nativa (no-restricted-imports), sem
eslint-boundaries: são 3 fronteiras, não uma hierarquia de camadas.

Nasce SEM ignores — as 3 estão limpas hoje. Blocos separados entre si e das
regras acima: ignores compartilhado reabriria catraca alheia em silêncio.

certification entra na lista mesmo sendo scaffold; app/ fica de fora de
propósito, porque AppRouter compor rotas de 5 features é o trabalho dele.

Visto reprovando nas 3 fronteiras (a de shared via import type, provando o
'nem para tipo' da lei) e visto NÃO reprovando em @shared/ui numa feature nem
em @features/* dentro de app/router.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Infra de teste do frontend + `useTableFilter`

**Files:**
- Modify: `frontend/package.json` (deps + scripts), `frontend/vite.config.ts` (bloco `test`)
- Create: `frontend/src/shared/hooks/useTableFilter.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `pnpm test` como comando de gate; o padrão de teste de hook que a Task 5 reusa (`renderHook` + `act` de `@testing-library/react`).

- [ ] **Step 1: Instalar as dependências de teste**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm add -D vitest jsdom @testing-library/react @testing-library/dom
```

Esperado: instalação sem erro de peer dependency. `@testing-library/react` deve resolver para **v16+** (React 19). Confira:

```bash
grep -E '"(vitest|jsdom|@testing-library/react|@testing-library/dom)"' package.json
```

Se `@testing-library/react` resolver abaixo de 16, pare: versão antiga não suporta React 19 e o fallback está na spec §6 (`happy-dom` só troca o ambiente, não isso).

- [ ] **Step 2: Configurar o vitest no `vite.config.ts`**

Em `frontend/vite.config.ts`, acrescente a diretiva de tipos como **primeira linha do arquivo**:

```ts
/// <reference types="vitest/config" />
```

E, dentro do objeto passado a `defineConfig({...})`, ao lado de `plugins` e `resolve`, acrescente:

```ts
  // Sem `globals`: cada teste importa describe/it/expect de 'vitest'. Assim os
  // arquivos de teste continuam type-checados pelo `tsc -b` do pnpm build, em
  // vez de virarem zona sem tipo.
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
```

- [ ] **Step 3: Acrescentar os scripts ao `package.json`**

Em `frontend/package.json`, na seção `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 4: Escrever os testes de `useTableFilter`**

Create `frontend/src/shared/hooks/useTableFilter.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTableFilter } from './useTableFilter'

interface Row {
  id: number
  name: string
  code: string | null
  status: 'ativo' | 'inativo'
}

const rows: Row[] = [
  { id: 1, name: 'Alta Tensão', code: 'AT-1', status: 'ativo' },
  { id: 2, name: 'Baixa Tensão', code: null, status: 'inativo' },
  { id: 3, name: 'Subestações', code: 'SUB-9', status: 'ativo' },
]

const searchable = (row: Row) => [row.name, row.code]

describe('useTableFilter', () => {
  it('sem searchable, digitar não filtra nada', () => {
    // A aba Alumnos depende disto: tem estado de página e clamp, não tem busca.
    const { result } = renderHook(() => useTableFilter(rows))

    act(() => result.current.onFilterChange('alta'))

    expect(result.current.rows).toHaveLength(3)
    expect(result.current.filter).toBe('alta')
  })

  it('aplica where ANTES da busca', () => {
    const { result } = renderHook(() =>
      useTableFilter(rows, searchable, (row) => row.status === 'ativo'),
    )

    expect(result.current.rows.map((r) => r.id)).toEqual([1, 3])

    act(() => result.current.onFilterChange('tensão'))

    // 'Baixa Tensão' casa a busca mas foi cortada pelo where.
    expect(result.current.rows.map((r) => r.id)).toEqual([1])
  })

  it('busca é case-insensitive e ignora campo nulo sem quebrar', () => {
    const { result } = renderHook(() => useTableFilter(rows, searchable))

    act(() => result.current.onFilterChange('  ALTA  '))

    expect(result.current.term).toBe('alta')
    expect(result.current.rows.map((r) => r.id)).toEqual([1])

    act(() => result.current.onFilterChange('SUB-9'))

    // A linha 2 tem code null: não pode casar nem lançar.
    expect(result.current.rows.map((r) => r.id)).toEqual([3])
  })

  it('onFilterChange volta para a primeira página', () => {
    const { result } = renderHook(() => useTableFilter(rows, searchable))

    act(() => result.current.onPage({ first: 2 }))
    expect(result.current.first).toBe(2)

    act(() => result.current.onFilterChange('tensão'))
    expect(result.current.first).toBe(0)
  })

  it('clampa a página durante o render e não deixa a página obsoleta voltar', () => {
    // Lista encolhe (ex. deleção na última página) e depois cresce de novo sem
    // o usuário trocar de página. O clamp é do ESTADO, não só da leitura —
    // sem isso a página obsoleta reaparece.
    const { result, rerender } = renderHook(({ items }) => useTableFilter(items), {
      initialProps: { items: rows },
    })

    act(() => result.current.onPage({ first: 2 }))
    expect(result.current.first).toBe(2)

    rerender({ items: rows.slice(0, 1) })
    expect(result.current.first).toBe(0)

    rerender({ items: rows })
    expect(result.current.first).toBe(0)
  })

  it('clear() zera termo e página', () => {
    const { result } = renderHook(() => useTableFilter(rows, searchable))

    act(() => result.current.onFilterChange('alta'))
    act(() => result.current.onPage({ first: 2 }))

    act(() => result.current.clear())

    expect(result.current.filter).toBe('')
    expect(result.current.term).toBe('')
    expect(result.current.first).toBe(0)
    expect(result.current.rows).toHaveLength(3)
  })
})
```

- [ ] **Step 5: Rodar — 6 passando**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test
```

Esperado: `Test Files  1 passed`, `Tests  6 passed`.

- [ ] **Step 6: Ver reprovando (lição 10) — quebrar o clamp**

Em `frontend/src/shared/hooks/useTableFilter.ts`, comente o bloco do clamp (linhas 70-72):

```ts
  // if (first >= rows.length && first !== 0) {
  //   setFirst(0)
  // }
```

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test 2>&1 | tail -20
```

Esperado: **FALHA** em "clampa a página durante o render…" — o terceiro `expect` (depois de a lista crescer de novo) recebe `2` em vez de `0`. Restaure:

```bash
git checkout src/shared/hooks/useTableFilter.ts
```

- [ ] **Step 7: Ver reprovando — ignorar o `where`**

Em `useTableFilter.ts`, troque a linha:

```ts
  const scoped = where ? items.filter(where) : items
```

por:

```ts
  const scoped = items
```

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test 2>&1 | tail -20
```

Esperado: **FALHA** em "aplica where ANTES da busca", no primeiro `expect` — recebe `[1, 2, 3]` onde esperava `[1, 3]`. Restaure:

```bash
git checkout src/shared/hooks/useTableFilter.ts
```

- [ ] **Step 8: Ver reprovando — quebrar o `searchable` opcional**

Em `useTableFilter.ts`, troque `term === '' || !searchable` por `term === ''`:

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test 2>&1 | tail -20
```

Esperado: **FALHA** em "sem searchable, digitar não filtra nada", com `TypeError: searchable is not a function`. Restaure:

```bash
git checkout src/shared/hooks/useTableFilter.ts
```

- [ ] **Step 9: Build e lint verdes com os testes no repo**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: os dois verdes. O `tsc -b` type-checa o arquivo de teste novo — se reclamar de `describe`/`it`, a diretiva `/// <reference types="vitest/config" />` do Step 2 não foi aplicada na primeira linha.

- [ ] **Step 10: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/package.json frontend/pnpm-lock.yaml frontend/vite.config.ts frontend/src/shared/hooks/useTableFilter.test.ts
git commit -m "test(shared): vitest + regressão de useTableFilter

O frontend não tinha test runner: as abstrações com maior fan-out do projeto
(useTableFilter em 8 telas, useCrudPage em 7) eram provadas só na tela do João.

vitest + jsdom + Testing Library v16, sem globals — os testes seguem
type-checados pelo tsc -b do pnpm build em vez de virarem zona sem tipo.

6 testes de comportamento, não de cobertura: searchable opcional (a aba
Alumnos depende dele), where antes da busca, busca case-insensitive com campo
nulo, reset de página, clamp do estado durante o render, clear().

Cada um visto vermelho contra o hook quebrado no ponto que guarda.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Regressão de `useCrudPage`

**Files:**
- Create: `frontend/src/shared/hooks/useCrudPage.test.ts`

**Interfaces:**
- Consumes: infra de teste da Task 4 (`pnpm test`, `renderHook`/`act`).
- Produces: nada consumido por outra task.

`useCrudPage` recebe `ListableResource<T>` **tipado por estrutura** — um objeto literal satisfaz o contrato. Sem `QueryClientProvider`, sem TanStack, sem mock de rede (spec D11).

- [ ] **Step 1: Escrever os testes**

Create `frontend/src/shared/hooks/useCrudPage.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCrudPage } from './useCrudPage'
import type { ProblemDetails } from '@shared/api/axios'

interface Item {
  id?: number
  name: string
}

/** `ListableResource` é estrutural: este literal basta, sem TanStack. */
function fakeResource(state: {
  data?: Item[]
  isLoading?: boolean
  isError?: boolean
  error?: ProblemDetails | null
}) {
  return {
    useList: () => ({
      data: state.data,
      isLoading: state.isLoading ?? false,
      isError: state.isError ?? false,
      error: state.error ?? null,
      refetch: () => undefined,
    }),
  }
}

describe('useCrudPage', () => {
  it('deriva a entidade da lista viva, sem congelar o objeto', () => {
    // O dialog guarda o ID, não o objeto: invalidação de query (upload,
    // edição de nested) tem de chegar ao dialog aberto.
    const { result, rerender } = renderHook(({ items }) => useCrudPage(fakeResource({ data: items })), {
      initialProps: { items: [{ id: 1, name: 'antigo' }] as Item[] },
    })

    act(() => result.current.openView({ id: 1, name: 'antigo' }))
    expect(result.current.dialog?.entity?.name).toBe('antigo')

    rerender({ items: [{ id: 1, name: 'novo' }] })
    expect(result.current.dialog?.entity?.name).toBe('novo')
  })

  it('distingue lista vazia de GET falho (D16)', () => {
    const vazio = renderHook(() => useCrudPage(fakeResource({ data: [] })))
    expect(vazio.result.current.items).toEqual([])
    expect(vazio.result.current.error).toBeNull()

    const falho = renderHook(() =>
      useCrudPage(fakeResource({ isError: true, error: { detail: 'sem permissão' } as ProblemDetails })),
    )
    expect(falho.result.current.items).toEqual([])
    expect(falho.result.current.error?.detail).toBe('sem permissão')
  })

  it('erro de rede sem ProblemDetails ainda sobe truthy', () => {
    // O erro que não passa pelo interceptor: isError sem corpo. Se caísse em
    // null, a tela mostraria o empty state que convida a cadastrar sobre falha.
    const { result } = renderHook(() => useCrudPage(fakeResource({ isError: true, error: null })))

    expect(result.current.error).toBeTruthy()
  })

  it('openViewById abre sem entidade e a recebe quando a lista chega', () => {
    const { result, rerender } = renderHook(({ items }) => useCrudPage(fakeResource({ data: items })), {
      initialProps: { items: [] as Item[] },
    })

    act(() => result.current.openViewById(7))
    expect(result.current.dialog?.mode).toBe('view')
    expect(result.current.dialog?.entity).toBeNull()

    rerender({ items: [{ id: 7, name: 'chegou' }] })
    expect(result.current.dialog?.entity?.name).toBe('chegou')
  })

  it('startEdit não entra em edit sem entidade', () => {
    const { result } = renderHook(() => useCrudPage(fakeResource({ data: [{ id: 1, name: 'x' }] })))

    act(() => result.current.openCreate())
    act(() => result.current.startEdit())

    expect(result.current.dialog?.mode).toBe('create')
  })
})
```

- [ ] **Step 2: Rodar — 11 passando no total**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test
```

Esperado: `Test Files  2 passed`, `Tests  11 passed` (6 da Task 4 + 5 desta).

- [ ] **Step 3: Ver reprovando — congelar a entidade**

Em `frontend/src/shared/hooks/useCrudPage.ts`, troque a derivação da linha 34 por um congelamento:

```ts
  const entity = dialog?.id != null ? (items.find((i) => i.id === dialog.id) ?? null) : null
```

por

```ts
  const [frozen] = useState<T | null>(null)
  const entity = frozen
```

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test 2>&1 | tail -20
```

Esperado: **FALHA** em "deriva a entidade da lista viva…" e em "openViewById…". Restaure:

```bash
git checkout src/shared/hooks/useCrudPage.ts
```

- [ ] **Step 4: Ver reprovando — apagar a distinção erro/vazio**

Em `useCrudPage.ts`, troque a linha 43 por `error: null,`:

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test 2>&1 | tail -20
```

Esperado: **FALHA** em "distingue lista vazia de GET falho (D16)" e em "erro de rede sem ProblemDetails…". Restaure:

```bash
git checkout src/shared/hooks/useCrudPage.ts
```

- [ ] **Step 5: Build, lint e árvore limpa**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
cd /home/jvbat/projetos/lotus && git status --short
```

Esperado: build e lint verdes; `git status --short` mostrando apenas o arquivo de teste novo.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/hooks/useCrudPage.test.ts
git commit -m "test(shared): regressão de useCrudPage

5 testes de comportamento, sem QueryClientProvider: ListableResource é
tipado por estrutura, então um objeto literal satisfaz o contrato.

Guardam o que a tela depende: entidade derivada da lista viva (o bug que a
task 4.2.2 escondeu), erro != vazio (D16), erro de rede sem ProblemDetails
ainda truthy, deep link por openViewById, startEdit sem entidade.

Vistos vermelhos contra a entidade congelada e contra error fixado em null.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `filtering` sobe para o hook e corrige o empty state das duas telas

**Files:**
- Modify: `frontend/src/shared/hooks/useTableFilter.ts` (interface `TableFilter`, JSDoc, retorno)
- Modify: `frontend/src/shared/hooks/useTableFilter.test.ts` (teste 7)
- Modify: `frontend/src/features/operation/components/Turma/TurmasTable.tsx:26-38,75-80`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx:47,~52,~88`
- Modify: `.claude/rules/frontend-fsliced.md:119-128`

**Interfaces:**
- Consumes: `useTableFilter` (Task 4) e sua suíte.
- Produces: `TableFilter<T>.filtering: boolean` — `true` quando há termo de busca **ou** filtro próprio ativo.

**Causa, provada no source** (spec §7): `dropdown.cjs.js:1441-1442` devolve o **objeto da opção** quando `option.value` é vazio por `ObjectUtils.isEmpty` — e `isEmpty(null)` é `true`. Logo `onChange` entrega `{ label: 'Todos', value: null }`, `status` vira objeto, `status !== null` fica `true`, e o `where` compara string com objeto: nenhuma linha passa. Antídoto já usado em `StaffUserDialog.tsx:101,106`: `optionValue="value"`.

- [ ] **Step 1: Escrever o teste 7 (falha primeiro)**

Em `frontend/src/shared/hooks/useTableFilter.test.ts`, acrescente dentro do `describe`:

```ts
  it('filtering responde por termo e por where, e é falso sem nenhum dos dois', () => {
    // Quem decide "estou filtrando?" é o hook. Duas telas reimplementavam a
    // pergunta com `status === null` e erravam o empty state.
    const semNada = renderHook(() => useTableFilter(rows, searchable))
    expect(semNada.result.current.filtering).toBe(false)

    act(() => semNada.result.current.onFilterChange('alta'))
    expect(semNada.result.current.filtering).toBe(true)

    act(() => semNada.result.current.clear())
    expect(semNada.result.current.filtering).toBe(false)

    const comWhere = renderHook(() =>
      useTableFilter(rows, searchable, (row) => row.status === 'ativo'),
    )
    expect(comWhere.result.current.filtering).toBe(true)
  })
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test 2>&1 | tail -20
```

Esperado: FALHA com `expected undefined to be false` — `filtering` ainda não existe.

- [ ] **Step 3: Implementar `filtering` e corrigir o JSDoc**

Em `frontend/src/shared/hooks/useTableFilter.ts`:

Na interface `TableFilter<T>`, depois de `term`, acrescente:

```ts
  /** `true` quando há busca ativa OU filtro próprio da tela (`where`). É a
   * resposta autoritativa para "mostrar o empty state de filtro ou o de lista
   * vazia?" — a tela não recalcula essa pergunta. */
  filtering: boolean
```

No JSDoc do hook, **substitua** a frase final do parágrafo de `searchable`/`where`:

```
 * que este hook existe para matar. `where` é o filtro próprio da tela (estado,
 * tipo) e roda ANTES da busca; saber se ele está ativo continua sendo da tela,
 * não do hook.
```

por:

```
 * que este hook existe para matar. `where` é o filtro próprio da tela (estado,
 * tipo) e roda ANTES da busca.
 *
 * **Saber se há filtro ativo é do hook, não da tela** (`filtering`). Era o
 * contrário até 2026-08-03, e as duas telas que reimplementaram a pergunta
 * erraram junto: `TurmasTable` e `BudgetsTable` comparavam o estado do
 * dropdown com `=== null`, mas o PrimeReact devolve o OBJETO da opção quando
 * `option.value` é vazio (`dropdown.cjs.js:1441`, `ObjectUtils.isEmpty(null)`
 * é `true`). Com "Todos" selecionado a tela dizia "sem resultados para os
 * filtros aplicados" sobre uma lista que só estava vazia.
```

No objeto de retorno, acrescente:

```ts
    filtering: term !== '' || where !== undefined,
```

- [ ] **Step 4: Rodar — 12 passando**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test
```

Esperado: `Tests  12 passed`.

- [ ] **Step 5: Corrigir `TurmasTable`**

Em `frontend/src/features/operation/components/Turma/TurmasTable.tsx`:

Substitua a linha do cálculo local (linha 38):

```ts
  const filtering = table.term !== '' || status !== null
```

por:

```ts
  const filtering = table.filtering
```

E no `AppDropdown` do filtro de estado (linha ~75), acrescente `optionValue="value"`:

```tsx
              <AppDropdown
                value={status}
                options={statusOptions}
                optionValue="value"
                onChange={(e) => { setStatus(e.value as TurmaDisplayStatus | null); table.resetPage() }}
              />
```

- [ ] **Step 6: Corrigir `BudgetsTable`**

Em `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`, substitua a linha 51:

```ts
  const filtering = table.term !== '' || status !== null
```

por:

```ts
  const filtering = table.filtering
```

E no `AppDropdown` do filtro de estado (linha ~88), acrescente `optionValue="value"`:

```tsx
              <AppDropdown
                value={status}
                options={statusOptions}
                optionValue="value"
                onChange={(e) => { setStatus(e.value as QuoteStatus | null); table.resetPage() }}
              />
```

Note que o `useTableFilter` desta tela recebe `status === null ? undefined : (b) => b.status === status` (linha 43) — **não mude essa linha**. Com `optionValue="value"`, `status` volta a ser `null` de verdade ao escolher "Todos", e o ternário passa a entregar `undefined` como sempre deveria.

- [ ] **Step 7: Confirmar que nenhuma outra tela tem o mesmo defeito**

```bash
cd /home/jvbat/projetos/lotus/frontend/src
grep -rn "value: null" features/ app/ shared/ --include=*.tsx
grep -rn "term !== ''" features/ --include=*.tsx
```

Esperado: o primeiro `grep` devolve as **mesmas 2 linhas** de sempre (`TurmasTable:34`, `BudgetsTable:47`) — agora protegidas por `optionValue`. O segundo **sem saída**: nenhuma feature recalcula a pergunta.

- [ ] **Step 8: Atualizar a rule**

Em `.claude/rules/frontend-fsliced.md`, no parágrafo "**Tabela em card = `useTableFilter` + `AppCardToolbar` + `footerCount`**", substitua a primeira frase:

```
Busca, `first` controlado
  e `clear()` vêm do hook (`shared/hooks/useTableFilter.ts`); a feature só declara `searchable` e,
  quando tem filtro próprio, `where`.
```

por:

```
Busca, `first` controlado,
  `clear()` **e `filtering`** vêm do hook (`shared/hooks/useTableFilter.ts`); a feature só declara
  `searchable` e, quando tem filtro próprio, `where`. **Não recalcule "estou filtrando?" na tela:**
  `TurmasTable` e `BudgetsTable` faziam isso com `status === null` e erravam o empty state juntas,
  porque o Dropdown do PrimeReact devolve o OBJETO da opção quando `option.value` é vazio
  (`dropdown.cjs.js:1441`; use `optionValue="value"` sempre que uma opção valer `null`/`''`).
```

- [ ] **Step 9: Build, lint e teste verdes**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm test && pnpm build && pnpm lint
```

Esperado: 12 testes passando, build e lint verdes.

- [ ] **Step 10: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/shared/hooks/useTableFilter.ts frontend/src/shared/hooks/useTableFilter.test.ts frontend/src/features/operation/components/Turma/TurmasTable.tsx frontend/src/features/commercial/components/Budget/BudgetsTable.tsx .claude/rules/frontend-fsliced.md
git commit -m "fix(tabela): empty state de filtro aparecia sobre lista vazia

Com o dropdown em 'Todos' e busca vazia, Operação e Presupuestos mostravam
'Sem resultados para os filtros aplicados' e rodapé '0 turmas'.

Causa, no source do primereact instalado (dropdown.cjs.js:1441): sem a prop
optionValue, o onChange devolve o OBJETO da opção quando option.value é vazio
por ObjectUtils.isEmpty — e isEmpty(null) é true. status virava
{label:'Todos', value:null}, o !== null dava true, e o where comparava string
com objeto: nenhuma linha passava.

Fix em duas camadas: optionValue='value' nos 2 dropdowns (molde do
StaffUserDialog) e 'estou filtrando?' sobe para useTableFilter.filtering. Só o
primeiro corrigiria o sintoma e deixaria de pé a construção que o permitiu —
a tela decidindo por conta própria, que é o que fez duas telas errarem junto.

JSDoc e frontend-fsliced.md atualizados: a frase que dizia que saber do filtro
ativo 'continua sendo da tela, não do hook' é justamente a que autorizou a
duplicação.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Checkpoint visual (João)

**Files:** nenhum.

**Interfaces:**
- Consumes: Task 6.
- Produces: aprovação que libera a Task 8.

Este é o único ponto do bloco que muda pixel (spec D13). **Não prossiga sem a aprovação explícita do João.**

- [ ] **Step 1: Subir o ambiente**

```bash
cd /home/jvbat/projetos/lotus && docker compose up -d
cd frontend && pnpm dev
```

Backend via nginx em http://localhost:8080, frontend em http://localhost:5173.

- [ ] **Step 2: Pedir a prova ao João, nomeando o que olhar**

Em **Operação** (`/operacion`) e em **Presupuestos** (`/comercial`):

1. dropdown em **"Todos"** com busca vazia e **lista vazia** → deve aparecer "Nenhuma turma ainda" / equivalente de orçamentos, com o ícone de calendário, **sem** botão "Limpar filtros";
2. dropdown em **"Todos"** com busca vazia e **lista com dados** → todas as linhas aparecem, rodapé com a contagem certa;
3. selecionar um estado que **não** tem registro → "Sem resultados para os filtros aplicados" + "Limpar filtros", e o botão limpa de volta ao estado 2;
4. digitar na busca algo inexistente → "Sem resultados para «termo»" + "Limpar busca";
5. alternar entre um estado real e "Todos" várias vezes → a lista volta cheia toda vez.

- [ ] **Step 3: Registrar a aprovação**

Aprovação explícita do João, com data, antes de seguir. Se algum dos 5 pontos falhar, **volte à Task 6** — não siga para o gate.

---

### Task 8: Gate automatizado

**Files:** nenhum (só verificação).

**Interfaces:**
- Consumes: Tasks 1-7.
- Produces: evidência para `/revisar-sprint`.

- [ ] **Step 1: Regressão do backend**

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan test 2>&1 | tail -3
```

Esperado: **374 passed** (372 da baseline + os 2 do `DomainDependencyTest`). Qualquer outro número é regressão.

- [ ] **Step 2: Frontend completo**

```bash
cd frontend && pnpm test && pnpm build && pnpm lint
```

Esperado: 12 testes passando; build e lint verdes.

- [ ] **Step 3: Os diffs proibidos estão vazios**

```bash
cd /home/jvbat/projetos/lotus
git diff --name-only main...HEAD -- frontend/src/shared/types/generated.ts
git diff --name-only main...HEAD -- frontend/src/shared/config/locales/
git diff --name-only main...HEAD -- backend/database/
git diff --name-only main...HEAD -- backend/app/
```

Esperado: **os quatro sem saída**. O último é a prova de que H.4.1 não corrigiu import nenhum (spec §4.2): a entrega foi teste + doc.

- [ ] **Step 4: Reprovar os guardrails de novo, no próprio gate (lição 10)**

Repita, com sondas novas, uma prova de cada mecanismo:

**Backend** — recrie `backend/app/Domains/Operation/Actions/SondaArchTemporaria.php` com a versão de FQN inline do Step 4 da Task 1, depois:

```bash
docker compose exec -T app php artisan test --filter=DomainDependencyTest
rm backend/app/Domains/Operation/Actions/SondaArchTemporaria.php
```

Esperado: FALHA na Regra A citando `SondaArchTemporaria.php`, e o arquivo apagado em seguida.

**Frontend** — acrescente como primeira linha de `frontend/src/features/catalog/components/Course/CoursesTable.tsx`:

```ts
import { ClientsTable } from '@features/commercial/components/Client/ClientsTable'
```

```bash
cd frontend && pnpm lint 2>&1 | grep -c "no-restricted-imports"
git checkout src/features/catalog/components/Course/CoursesTable.tsx
cd /home/jvbat/projetos/lotus && git status --short
```

Esperado: o `grep -c` devolve ao menos `1`; `git status --short` volta vazio depois das duas reversões.

- [ ] **Step 5: Nenhum órfão**

```bash
cd /home/jvbat/projetos/lotus/frontend/src
grep -rn "filtering" features/ shared/ --include=*.ts --include=*.tsx | grep -v ".test."
```

Esperado: a definição em `useTableFilter.ts` e **exatamente 2** consumidores (`TurmasTable`, `BudgetsTable`). Campo de hook sem leitor é órfão parcial.

- [ ] **Step 6: Pint**

```bash
cd /home/jvbat/projetos/lotus/backend && ./vendor/bin/pint tests/Feature/Shared/DomainDependencyTest.php
```

Esperado: sem alteração pendente (o arquivo já passou pelo Pint na Task 1).

- [ ] **Step 7: `typescript:transform` — n/a, mas confirme**

```bash
cd /home/jvbat/projetos/lotus
git diff --name-only main...HEAD -- backend/app/ | grep -c "Data/" || echo "nenhum DTO tocado"
```

Esperado: `nenhum DTO tocado` — logo não há o que regenerar.

- [ ] **Step 8: Commit do estado (se houver ajuste) e handoff**

Se nada mudou nos steps acima, não há o que commitar. Reporte o placar do gate e siga para `/revisar-sprint`.

---

## Handoff de execução

**executor: misto** — Tasks 1, 2 e 5 vão ao **Codex**; as demais ficam com **Claude**.

Divisão por camada, para leitura rápida: **backend** é só a Task 1; **docs** é a Task 2;
**frontend** são as Tasks 3, 4, 5 e 6; a Task 7 é humana; a 0 e a 8 são git e gate.

### executor: codex — Tasks 1, 2, 5

Critério: paths fechados, verificação executável, e **nenhuma decisão em aberto** — a matriz das 21
arestas, o texto dos dois docs e o código dos 5 testes estão escritos literalmente no plano. O Codex
transcreve e verifica; não escolhe.

**`paths_autorizados`:**

```
backend/tests/Feature/Shared/DomainDependencyTest.php
backend/app/Domains/Operation/Actions/SondaArchTemporaria.php
docs/estrutura-monolito.md
docs/pendencias.md
frontend/src/shared/hooks/useCrudPage.test.ts
```

Nada além disso. `backend/app/Domains/**` (exceto o arquivo de sonda, que é criado e apagado dentro
da própria Task 1), `frontend/src/shared/hooks/useCrudPage.ts`, `eslint.config.js`, `vite.config.ts`,
`package.json` e qualquer arquivo de feature estão **fora** — mudança necessária em qualquer um
deles é `BLOCKED`, não ajuste.

**Regras de parada, específicas destas tasks:**

1. **Task 1, Step 2** — se `DomainDependencyTest` reprovar no estado atual, **pare e reporte as
   violações**. Não edite a matriz `ALLOWED` e não toque em nenhum arquivo de `app/Domains/`. Uma
   reprovação aqui significa que a classificação da spec §D2 não viu algum import, e reclassificar é
   decisão de arquitetura — do João, não da execução.
2. **Tasks 1 e 5, sondas** — cada passo de "ver reprovando" exige conferir que a falha vem **pelo
   motivo certo**, não só que houve falha. Teste que quebra por `TypeError` onde deveria quebrar por
   asserção não conta como prova (lição 10). Falha pelo motivo errado → `BLOCKED`.
3. **Task 5 depende da Task 4** (infra do vitest). Não comece antes de `pnpm test` existir e rodar.
4. **Task 2, Step 5** — se os dois `grep` de verificação não voltarem o esperado, pare: o texto foi
   aplicado no lugar errado.
5. Nunca rodar `./vendor/bin/pint` sem argumento, nunca tocar `generated.ts`, locales ou
   `backend/database/`.

### executor: claude — Tasks 0, 3, 4, 6, 7, 8

- **Task 3** toca a lei §5.6 e o `eslint.config.js`, que vale para o repositório inteiro; a decisão
  "violação encontrada é achado, não `ignores`" (spec D8) é julgamento, e `ignores` compartilhado
  entre blocos já custou um achado de review neste projeto.
- **Task 4** instala dependências e escolhe versões (`@testing-library/react` v16, fallback
  `happy-dom` da spec §6) — decisão de infra, com efeito em `package.json` e lockfile.
- **Task 6** corrige duas telas de produção com base numa causa lida em `node_modules`. Se o
  comportamento divergir do que o source diz, isso é achado do bloco, não ajuste mecânico.
- **Task 7** é gate humano; **Task 8** é o gate do bloco, que precisa julgar o placar.

### Ordem

```
0 (claude)
├── 1 (codex) ──┐
├── 2 (codex) ──┤  independentes entre si
├── 3 (claude) ─┤
└── 4 (claude) ─┴── 5 (codex, depende da 4)
                    └── 6 (claude, depende da 4)
                        └── 7 (JOÃO) → 8 (claude)
```

As Tasks 1 e 2 não dependem de nada além da branch e podem rodar no Codex em paralelo ao frontend
do Claude. A 5 espera a 4; a 6 espera a 4; a 7 espera a 6.
