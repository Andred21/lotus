# `guardas-que-faltam` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar oito instruções por mecanismos que reprovam sozinhos, sem mudar uma linha do que o usuário vê.

**Architecture:** Cinco guardas são varredura (de código PHP, de rota registrada, de doc Markdown) e três são teste de comportamento já existente. Nenhuma corrige defeito: a superfície das oito foi medida limpa em 2026-08-10, então o critério de aceite é **guarda vista vermelha com sonda deliberada**, não suíte verde (lição 10). Quatro tasks tocam `backend/`, quatro tocam `frontend/`, e a última confere o estado final dos docs que a penúltima editou.

**Tech Stack:** PHPUnit sobre `Tests\TestCase` (sqlite `:memory:`, dentro do container `app`) · vitest 4 + jsdom + `@testing-library/react` (nativo no WSL, de `frontend/`) · `token_get_all()` para varredura de PHP sem comentário · `Route::getRoutes()` para o universo de rotas.

**Spec:** [`docs/superpowers/specs/2026-08-10-guardas-que-faltam-design.md`](../specs/2026-08-10-guardas-que-faltam-design.md)

## Global Constraints

- **Backend roda no container.** `docker compose exec -T app php artisan test …`. O host WSL não tem mbstring.
- **Pint roda no host, de `backend/`, sempre com argumento.** `cd backend && ./vendor/bin/pint <arquivos>` — nunca sem, que reformata o repositório inteiro (lição 9).
- **Frontend roda nativo, de `frontend/`.** `pnpm lint` · `pnpm build` · `pnpm test`.
- **Zero schema.** `git diff main...HEAD -- backend/database/` termina o bloco vazio.
- **`generated.ts` não é tocado.** Nenhum DTO muda de forma; `typescript:transform` sai sem diff.
- **Linha de base da suíte:** backend **522 passed, 1 skipped (1961 assertions)**; frontend **13 arquivos / 47 testes**.
- **Cada guarda é vista vermelha antes de passar.** A sonda é deliberada, o texto da reprovação vai no corpo do commit, e a sonda é desfeita antes do commit.
- **Um commit por task**, no idioma do repositório (mensagem sem acento, `Co-Authored-By` ao final).
- **Main tree, branch `hardening/guardas-que-faltam`.** Sem worktree (P-03).

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `backend/tests/Support/ScansPhpSource.php` | trait: lista `.php` de uma pasta e devolve código sem comentário | 1 |
| `backend/tests/Feature/Shared/PersistenceLawsTest.php` | leis §5.1 (sem Repository) e §5.2 (sem trigger) | 1 |
| `backend/tests/Feature/Shared/DomainDependencyTest.php` | passa a consumir o trait em vez do método privado | 1 |
| `backend/tests/Feature/Shared/NestedRouteOwnershipTest.php` | universo passa a ser a URI, não a assinatura | 2 |
| `frontend/src/shared/api/axios.test.ts` | a instância real não fixa `Content-Type` (lição 6) | 3 |
| `frontend/src/shared/hooks/useCrudForm.ts` | `unclassifiedPayloadKeys` ganha a recíproca | 4 |
| `frontend/src/shared/hooks/useCrudForm.test.ts` | casos da recíproca | 4 |
| `frontend/src/shared/hooks/index.ts` | barrel perde três símbolos internos | 5 |
| `frontend/src/shared/hooks/useEntityPhoto.test.tsx` | seis casos do hook da foto | 6 |
| `frontend/tests/repo-docs-refs.test.ts` | path citado em doc normativo existe | 7 |
| `frontend/vite.config.ts` | `include` do vitest alcança `tests/` | 7 |
| `frontend/tsconfig.node.json` | `tests/` entra no type-check, com `types: node` | 7 |
| `.claude/rules/frontend-fsliced.md` | P-25 e a frase vencida do corte do runner | 8 |

---

### Task 0: Baseline reconferido, não herdado

**Files:** nenhum.

- [ ] **Step 1: Suíte do backend**

```bash
docker compose exec -T app php artisan test
```

Esperado: `Tests: 1 skipped, 522 passed (1961 assertions)`. Divergiu → **PARE** e reporte; o plano inteiro compara contra este número.

- [ ] **Step 2: Frontend**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: lint sem saída, build verde, `Test Files 13 passed (13)` e `Tests 47 passed (47)`.

- [ ] **Step 3: Árvore limpa**

```bash
git status --porcelain
```

Esperado: saída vazia.

---

### Task 1: Leis §5.1 e §5.2 viram teste

**Files:**
- Create: `backend/tests/Support/ScansPhpSource.php`
- Create: `backend/tests/Feature/Shared/PersistenceLawsTest.php`
- Modify: `backend/tests/Feature/Shared/DomainDependencyTest.php` (remove o método privado `codigoSemComentarios`, passa a usar o trait)

**Interfaces:**
- Produces: trait `Tests\Support\ScansPhpSource` com `arquivosPhp(string $pasta): array` (lista de paths absolutos, ordenada) e `codigoSemComentarios(string $arquivo): string`.
- Consumes: nada de tasks anteriores.

- [ ] **Step 1: Escrever o trait**

Create `backend/tests/Support/ScansPhpSource.php`:

```php
<?php

namespace Tests\Support;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Varredura de fonte PHP para guarda de arquitetura.
 *
 * `codigoSemComentarios` nasceu privado no `DomainDependencyTest` e passou a
 * ser compartilhado quando o `PersistenceLawsTest` precisou da mesma coisa:
 * citar `CREATE TRIGGER` num comentário que EXPLICA a lei não pode reprovar a
 * lei (mesmo defeito do review de 2026-08-04, Q-4).
 */
trait ScansPhpSource
{
    /** @return list<string> paths absolutos dos `.php` sob a pasta, ordenados */
    protected function arquivosPhp(string $pasta): array
    {
        if (! is_dir($pasta)) {
            return [];
        }

        $arquivos = [];

        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($pasta)) as $arquivo) {
            if ($arquivo->isFile() && $arquivo->getExtension() === 'php') {
                $arquivos[] = $arquivo->getPathname();
            }
        }

        sort($arquivos);

        return $arquivos;
    }

    /** O código do arquivo sem comentários nem docblocks. */
    protected function codigoSemComentarios(string $arquivo): string
    {
        $codigo = '';

        foreach (token_get_all((string) file_get_contents($arquivo)) as $token) {
            if (! is_array($token)) {
                $codigo .= $token;

                continue;
            }

            if ($token[0] === T_COMMENT || $token[0] === T_DOC_COMMENT) {
                continue;
            }

            $codigo .= $token[1];
        }

        return $codigo;
    }
}
```

- [ ] **Step 2: Escrever o teste das duas leis**

Create `backend/tests/Feature/Shared/PersistenceLawsTest.php`:

```php
<?php

namespace Tests\Feature\Shared;

use Tests\Support\ScansPhpSource;
use Tests\TestCase;

/**
 * As leis §5.1 e §5.2 do `CLAUDE.md` eram parágrafo: valiam quando alguém
 * lembrava. A P-04 registrava exatamente isso desde 2026-08-04 — lei que
 * precisa valer sempre quer teste, não prosa (lição 14).
 *
 * As duas nasceram VERDES: em 2026-08-10 havia zero classe `Repository` em
 * `app/` e zero trigger em `database/`. O teste não corrige nada; ele impede
 * que a primeira violação entre sem ninguém ver.
 */
class PersistenceLawsTest extends TestCase
{
    use ScansPhpSource;

    /**
     * §5.1 — DDD-lite, SEM Repository sobre Eloquent (ADR-02).
     *
     * A varredura é sobre `app/` INTEIRO, não só `Domains/`: a lei não abre
     * exceção para `Shared/`, e foi assim que a superfície foi medida.
     *
     * `QueryBuilders/` fica fora de propósito. `TurmaQueryBuilder` e
     * `EnrollmentQueryBuilder` são o padrão APROVADO pelo ADR-02 — reprovar
     * por semelhança de nome mataria o que a lei manda usar. A diferença é a
     * razão de a lei dizer "Repository **sobre Eloquent**": query builder
     * estende o Eloquent, repository o esconde.
     */
    public function test_nenhuma_classe_repository_sobre_eloquent(): void
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(base_path('app')) as $arquivo) {
            $local = str_replace(base_path().'/', '', $arquivo);

            if (str_contains($local, '/QueryBuilders/')) {
                continue;
            }

            if (str_ends_with(basename($arquivo, '.php'), 'Repository')) {
                $encontrados[] = $local;
            }
        }

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            [
                'Lei §5.1 (ADR-02): DDD-lite, sem Repository sobre Eloquent.',
                'List/show/destroy sem regra vao direto ao Eloquent; regra de escrita mora em Action;',
                'consulta reaproveitada mora em QueryBuilders/. Classes encontradas:',
            ],
            $encontrados,
        )));
    }

    /**
     * §5.2 — auditoria só na aplicação, nunca em trigger de banco (ADR-08).
     *
     * Trigger não enxerga o usuário autenticado: vê a conexão, não quem agiu
     * (lição 2). Duas formas cobertas, porque em Laravel um trigger entra por
     * SQL cru, não pelo schema builder — `DB::unprepared` é a porta real, e
     * `CREATE TRIGGER` pega quem a abrir por outro caminho (`DB::statement`,
     * `Schema::connection(...)->getConnection()->unprepared`).
     */
    public function test_nenhum_trigger_de_banco(): void
    {
        $encontrados = [];

        foreach ($this->arquivosPhp(base_path('database')) as $arquivo) {
            $codigo = $this->codigoSemComentarios($arquivo);
            $local = str_replace(base_path().'/', '', $arquivo);

            if (preg_match('/CREATE\s+TRIGGER/i', $codigo) === 1) {
                $encontrados[] = "{$local}: CREATE TRIGGER";
            }

            if (preg_match('/->\s*unprepared\s*\(/', $codigo) === 1) {
                $encontrados[] = "{$local}: unprepared()";
            }
        }

        $this->assertSame([], $encontrados, implode("\n", array_merge(
            [
                'Lei §5.2 (ADR-08): auditoria so na camada de aplicacao, nunca em trigger.',
                'Trigger ve a conexao, nao quem agiu — owen-it/laravel-auditing e o unico caminho.',
                'Ocorrencias:',
            ],
            $encontrados,
        )));
    }
}
```

- [ ] **Step 3: Rodar e ver PASSAR (as duas nascem verdes)**

```bash
docker compose exec -T app php artisan test --filter=PersistenceLawsTest
```

Esperado: `Tests: 2 passed`. Falhou → a superfície não estava limpa; **PARE** e reporte o que apareceu.

- [ ] **Step 4: Sonda da §5.1 — ver VERMELHO**

```bash
docker compose exec -T app sh -c 'printf "<?php\n\nnamespace App\\\\Domains\\\\Catalog\\\\Repositories;\n\nclass CourseRepository {}\n" > /var/www/app/Domains/Catalog/CourseRepository.php'
docker compose exec -T app php artisan test --filter=test_nenhuma_classe_repository_sobre_eloquent
```

Esperado: FAIL nomeando `app/Domains/Catalog/CourseRepository.php` e citando a §5.1. Copie a linha para o corpo do commit.

- [ ] **Step 5: Sonda da §5.1 — conferir que QueryBuilders NÃO reprova**

```bash
docker compose exec -T app sh -c 'rm /var/www/app/Domains/Catalog/CourseRepository.php; mkdir -p /var/www/app/Domains/Catalog/QueryBuilders && printf "<?php\n\nnamespace App\\\\Domains\\\\Catalog\\\\QueryBuilders;\n\nclass SondaRepository {}\n" > /var/www/app/Domains/Catalog/QueryBuilders/SondaRepository.php'
docker compose exec -T app php artisan test --filter=test_nenhuma_classe_repository_sobre_eloquent
```

Esperado: **PASS** — a exceção de `QueryBuilders/` é deliberada e precisa ser provada, não afirmada. Limpe:

```bash
docker compose exec -T app rm /var/www/app/Domains/Catalog/QueryBuilders/SondaRepository.php
docker compose exec -T app rmdir /var/www/app/Domains/Catalog/QueryBuilders
```

- [ ] **Step 6: Sonda da §5.2 — ver VERMELHO, e provar que comentário não reprova**

Primeiro o comentário (não pode reprovar):

```bash
docker compose exec -T app sh -c 'printf "<?php\n\n// Nunca use CREATE TRIGGER aqui, nem DB::unprepared.\n" > /var/www/database/sonda.php'
docker compose exec -T app php artisan test --filter=test_nenhum_trigger_de_banco
```

Esperado: **PASS**. Agora o código de verdade:

```bash
docker compose exec -T app sh -c 'printf "<?php\n\nuse Illuminate\\\\Support\\\\Facades\\\\DB;\n\nDB::unprepared(\"CREATE TRIGGER t BEFORE INSERT ON users FOR EACH ROW SET NEW.x = 1;\");\n" > /var/www/database/sonda.php'
docker compose exec -T app php artisan test --filter=test_nenhum_trigger_de_banco
```

Esperado: FAIL com **duas** linhas para `database/sonda.php` — `CREATE TRIGGER` e `unprepared()`. Limpe:

```bash
docker compose exec -T app rm /var/www/database/sonda.php
```

- [ ] **Step 7: Migrar o `DomainDependencyTest` para o trait**

Em `backend/tests/Feature/Shared/DomainDependencyTest.php`: acrescente `use Tests\Support\ScansPhpSource;` ao topo, `use ScansPhpSource;` dentro da classe, e **apague** o método privado `codigoSemComentarios` inteiro (linhas 254-278, incluindo o docblock). O `arquivosDeDominio()` fica como está — ele agrupa por domínio, o que o trait não faz.

- [ ] **Step 8: Suíte inteira, para provar que a migração não quebrou a guarda existente**

```bash
docker compose exec -T app php artisan test
```

Esperado: `Tests: 1 skipped, 524 passed` — 522 da base mais os 2 novos.

- [ ] **Step 9: Pint e commit**

```bash
cd backend && ./vendor/bin/pint tests/Support/ScansPhpSource.php tests/Feature/Shared/PersistenceLawsTest.php tests/Feature/Shared/DomainDependencyTest.php
cd .. && git add backend/tests/Support/ScansPhpSource.php backend/tests/Feature/Shared/PersistenceLawsTest.php backend/tests/Feature/Shared/DomainDependencyTest.php
git commit -m "$(cat <<'EOF'
test(shared): leis 5.1 e 5.2 viram guarda, P-04

Sem Repository sobre Eloquent e sem trigger de banco eram paragrafo no
CLAUDE.md. Viram teste com as duas nascendo verdes: zero classe
Repository em app/ e zero trigger em database/, medido em 2026-08-10.

QueryBuilders/ fica fora de proposito e a excecao foi provada, nao
afirmada: uma sonda SondaRepository dentro de QueryBuilders/ passa, e a
mesma classe fora dela reprova.

Sondas vistas vermelhas antes de passar. Comentario citando CREATE
TRIGGER nao reprova -- token_get_all descarta comentario, mesmo defeito
do review de 2026-08-04 (Q-4).

codigoSemComentarios saiu do DomainDependencyTest para o trait
Tests\Support\ScansPhpSource, consumido pelos dois.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `NestedRouteOwnershipTest` deixa de ter escape

**Files:**
- Modify: `backend/tests/Feature/Shared/NestedRouteOwnershipTest.php:27-55`

**Interfaces:**
- Consumes: nada da Task 1.
- Produces: nada para tasks seguintes.

**Contexto que o implementador precisa ter:** hoje o universo do teste é `signatureParameters(['subClass' => Model::class])` com `count < 2` fazendo `continue`. Uma rota nested cujo binding **não foi tipado** com um Model sai do universo em silêncio — é o achado Q-2. O docblock atual argumenta contra regex de URI, e está certo pela metade: `{file}` não diz que é model. A saída é contar segmentos `{}` **e manter a válvula que o teste já usa** — a rota que tem parâmetro não-model declara `->withoutScopedBindings()` com o motivo ao lado, exatamente como as duas rotas N:N de redator já fazem. Medido em 2026-08-10: 8 rotas com ≥2 segmentos, todas já declarando; **0** reprovam.

- [ ] **Step 1: Trocar o universo e o docblock**

Substitua o docblock (linhas 9-24) e o corpo do método por:

```php
/**
 * Posse em rota nested era instrução espalhada: duas rotas usavam
 * `->scopeBindings()`, três checavam `abort_unless` no controller, e nada
 * impedia a próxima de nascer sem nenhum dos dois. Este teste é a fonte única.
 *
 * A assertiva é sobre a DECLARAÇÃO, não sobre o texto do controller: toda rota
 * com dois ou mais segmentos de parâmetro declara `scopeBindings()` **ou**
 * `withoutScopedBindings()`. Silêncio reprova — que é o ponto. Uma allowlist
 * dentro do teste envelheceria longe da rota; a declaração é lida por quem
 * edita a rota.
 *
 * O universo é a URI, não a assinatura. Até 2026-08-10 era
 * `signatureParameters(['subClass' => Model::class])`, e quem esquecesse de
 * TIPAR o binding saía do universo em silêncio — guarda com escape conhecido
 * é pior que nenhuma (Q-2 do review de 2026-08-05). A objeção que este arquivo
 * carregava contra ler a URI ("`{file}` não diz que é model") continua válida e
 * é respondida pela própria válvula do teste: rota cujo segundo parâmetro não é
 * model declara `withoutScopedBindings()` com o motivo ao lado, como as duas
 * rotas N:N de redator já fazem. Nenhuma rota reprovava quando isto entrou.
 */
class NestedRouteOwnershipTest extends TestCase
{
    public function test_toda_rota_com_dois_parametros_declara_escopo(): void
    {
        $indefinidas = [];

        foreach (Route::getRoutes() as $route) {
            if (preg_match_all('/\{[^}]+\}/', $route->uri()) < 2) {
                continue;
            }

            if ($route->enforcesScopedBindings() || $route->preventsScopedBindings()) {
                continue;
            }

            $indefinidas[] = implode('|', $route->methods()).' '.$route->uri();
        }

        sort($indefinidas);

        $this->assertSame(
            [],
            $indefinidas,
            "Rota com dois ou mais parametros sem declarar escopo de posse.\n".
            "Declare `->scopeBindings()` quando o filho pertence ao pai, ou\n".
            "`->withoutScopedBindings()` com o motivo em comentario quando nao pertence\n".
            "(inclusive quando o segundo parametro nao e model).\n".
            'Rotas: '.implode(', ', $indefinidas),
        );
    }
}
```

O import `use Illuminate\Database\Eloquent\Model;` fica **sem uso** — apague a linha 5.

- [ ] **Step 2: Rodar e ver PASSAR**

```bash
docker compose exec -T app php artisan test --filter=NestedRouteOwnershipTest
```

Esperado: `Tests: 1 passed`.

- [ ] **Step 3: Sonda — a rota que o teste antigo deixava escapar**

Acrescente ao fim de `backend/app/Domains/Catalog/routes.php`, antes do fechamento do último grupo, uma rota com dois parâmetros **sem tipar** e sem declaração:

```php
Route::get('sonda/{course}/modules/{module}', fn ($course, $module) => [$course, $module]);
```

```bash
docker compose exec -T app php artisan test --filter=NestedRouteOwnershipTest
```

Esperado: FAIL nomeando `GET api/sonda/{course}/modules/{module}`. **Esta é a prova do bloco:** rode o teste antigo (via `git stash` do arquivo de teste) contra a mesma sonda e confirme que ele **passa** — é o escape que a task fecha.

- [ ] **Step 4: Provar a válvula, e desfazer a sonda**

Acrescente `->withoutScopedBindings()` à rota de sonda e rode de novo: esperado **PASS**. Depois remova a rota inteira de `routes.php` e confirme:

```bash
git diff --stat backend/app/Domains/Catalog/routes.php
```

Esperado: saída vazia.

- [ ] **Step 5: Suíte e commit**

```bash
docker compose exec -T app php artisan test
```

Esperado: `Tests: 1 skipped, 524 passed`.

```bash
cd backend && ./vendor/bin/pint tests/Feature/Shared/NestedRouteOwnershipTest.php
cd .. && git add backend/tests/Feature/Shared/NestedRouteOwnershipTest.php
git commit -m "$(cat <<'EOF'
test(shared): ownership de rota nested deixa de depender de binding tipado

O universo do teste era signatureParameters(subClass: Model), entao rota
com dois segmentos e binding NAO tipado saia dele em silencio -- guarda
com escape conhecido e pior que nenhuma (Q-2 do review de 2026-08-05).

Passa a contar os parametros da URI. A objecao que o arquivo carregava
contra ler a URI ({file} nao diz que e model) e respondida pela valvula
que o teste ja usa: withoutScopedBindings() com o motivo ao lado.

Medido antes: 8 rotas com >=2 parametros, todas ja declarando, zero
reprovando. Sonda vista vermelha e o teste antigo visto passando contra
a mesma sonda.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: A instância real do axios não fixa `Content-Type`

**Files:**
- Create: `frontend/src/shared/api/axios.test.ts`

**Interfaces:**
- Consumes: `api` de `frontend/src/shared/api/axios.ts`.
- Produces: nada.

**Contexto:** `postMultipart.test.ts` abre com `vi.mock('./axios', …)`, que é *hoisted* e vale para o arquivo inteiro — não existe "caso sem mock" ali dentro. A guarda precisa de arquivo próprio, e o alvo dela é a instância, não o helper. Medido em 2026-08-10 com `node -e`: `api.defaults.headers.post` está `{}`, e o único header presente é `Accept`.

- [ ] **Step 1: Escrever o teste**

Create `frontend/src/shared/api/axios.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { api } from './axios'

/**
 * A lição 6 na instância REAL, sem mock. `postMultipart.test.ts` mocka
 * `./axios` no topo do arquivo (hoisted, vale para o arquivo inteiro), então
 * nada lá exercita o objeto que roda em produção — e o bug da lição 6 nasce
 * exatamente na instância: um `Content-Type: application/json` no
 * `axios.create` faz o `transformRequest` serializar o FormData, cada File
 * vira `{}` e o upload chega VAZIO com 201 silencioso, em caminho de documento
 * com peso legal.
 *
 * Case-insensitive de propósito: header HTTP não distingue caixa, e
 * `content-type` minúsculo quebraria a app do mesmo jeito.
 */
describe('instância do axios', () => {
  const escopos = ['common', 'delete', 'get', 'head', 'post', 'put', 'patch'] as const

  it.each(escopos)('não fixa Content-Type em `%s`', (escopo) => {
    const headers = (api.defaults.headers as unknown as Record<string, unknown>)[escopo]
    const chaves = Object.keys((headers ?? {}) as Record<string, unknown>).map((k) => k.toLowerCase())

    expect(chaves).not.toContain('content-type')
  })

  it('não fixa Content-Type na raiz de `defaults.headers`', () => {
    // O que se passa a `axios.create({ headers: … })` pousa AQUI, não em
    // `common` — foi assim que `Accept` chegou. É a porta mais provável do bug.
    const chaves = Object.keys(api.defaults.headers as unknown as Record<string, unknown>)
      .filter((k) => !escopos.includes(k as (typeof escopos)[number]))
      .map((k) => k.toLowerCase())

    expect(chaves).not.toContain('content-type')
  })

  it('fixa Accept, que é o header que a app depende', () => {
    // Guarda de porta múltipla: sem esta asserção, um `defaults.headers`
    // vazio (instância trocada, import quebrado) passaria nas duas de cima
    // sem provar nada.
    expect(JSON.stringify(api.defaults.headers)).toContain('application/json')
  })
})
```

- [ ] **Step 2: Rodar e ver PASSAR**

```bash
cd frontend && pnpm test -- axios.test
```

Esperado: `Tests 9 passed` — 7 do `it.each` dos escopos, mais o caso da raiz, mais o do `Accept`.

- [ ] **Step 3: Sonda — ver VERMELHO**

Em `frontend/src/shared/api/axios.ts`, acrescente ao objeto `headers` do `axios.create`:

```ts
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
```

```bash
cd frontend && pnpm test -- axios.test
```

Esperado: FAIL em "não fixa Content-Type na raiz de `defaults.headers`". Registre a linha e **desfaça**:

```bash
git checkout -- src/shared/api/axios.ts && git diff --stat src/shared/api/axios.ts
```

Esperado: saída vazia.

- [ ] **Step 4: Commit**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
cd .. && git add frontend/src/shared/api/axios.test.ts
git commit -m "$(cat <<'EOF'
test(shared): licao 6 assertada na instancia real do axios, Q-4

postMultipart.test.ts mocka ./axios no topo do arquivo, entao nada
exercitava o objeto que roda em producao -- e o bug da licao 6 nasce na
instancia, nao no helper.

Arquivo proprio porque vi.mock e hoisted: caso sem mock nao cabe no
arquivo existente.

Sonda vista vermelha: Content-Type no axios.create reprova.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `mapped` e `summaryOnly` deixam de aceitar declaração contraditória

**Files:**
- Modify: `frontend/src/shared/hooks/useCrudForm.ts:24-37` e `:79-95`
- Modify: `frontend/src/shared/hooks/useCrudForm.test.ts`

**Interfaces:**
- Produces: `classificationConflicts(mapped: string[], summaryOnly: string[]): string[]`, exportada de `useCrudForm.ts`, consumida só pelo próprio teste (a Task 5 tira do barrel o que não é público).

**Contexto:** hoje `unclassifiedPayloadKeys` só testa **ausência** nas duas listas. Chave declarada nas duas é contraditória — o campo mostra o próprio erro *e* o resumo mostra também — e passa. Medido: 5 hooks usam `useCrudForm`, nenhum com interseção.

- [ ] **Step 1: Escrever os testes primeiro**

Em `frontend/src/shared/hooks/useCrudForm.test.ts`, importe a função nova na linha 3 e acrescente o bloco após o `describe('unclassifiedPayloadKeys', …)`:

```ts
import { useCrudForm, unclassifiedPayloadKeys, classificationConflicts } from './useCrudForm'
```

```ts
describe('classificationConflicts', () => {
  it('não acusa nada quando as listas são disjuntas', () => {
    expect(classificationConflicts(['name'], ['phone'])).toEqual([])
  })

  it('acusa a chave declarada nas duas caixas', () => {
    // Declarar nas duas é contradição, não redundância: `mapped` diz que o
    // campo mostra o próprio erro, e o resumo mostra exatamente o que NÃO
    // está em `mapped`. A chave nas duas some do resumo por causa da
    // primeira lista e continua prometida pela segunda.
    expect(classificationConflicts(['name', 'phone'], ['phone'])).toEqual(['phone'])
  })

  it('devolve as duas em ordem estável', () => {
    expect(classificationConflicts(['b', 'a'], ['a', 'b'])).toEqual(['a', 'b'])
  })
})
```

E, no `describe('useCrudForm', …)`, o caso de integração:

```ts
  it('reprova config em que uma chave está em `mapped` e em `summaryOnly`', () => {
    expect(() =>
      renderHook(() =>
        useCrudForm(fakeResource(), {
          ...base,
          entity: null,
          mode: 'create',
          mapped: ['name', 'secret'],
          summaryOnly: ['secret'],
        }),
      ),
    ).toThrow(/secret/)
  })
```

- [ ] **Step 2: Rodar e ver FALHAR**

```bash
cd frontend && pnpm test -- useCrudForm
```

Esperado: erro de import (`classificationConflicts` não existe) e o caso de integração passando **sem** lançar. Este é o vermelho da task.

- [ ] **Step 3: Implementar**

Em `frontend/src/shared/hooks/useCrudForm.ts`, depois de `unclassifiedPayloadKeys`:

```ts
/** Chaves classificadas nas DUAS caixas. Ver `useCrudForm` para o porquê. */
export function classificationConflicts(mapped: string[], summaryOnly: string[]): string[] {
  return [...new Set(mapped.filter((k) => summaryOnly.includes(k)))].sort()
}
```

E dentro do bloco `if (import.meta.env.DEV) { … }`, antes do `if (leaked.length > 0)`:

```ts
    const conflicting = classificationConflicts(mapped, summaryOnly)

    if (conflicting.length > 0) {
      throw new Error(
        `useCrudForm: chave classificada em \`mapped\` E em \`summaryOnly\`: ${conflicting.join(', ')}. ` +
          'As duas se contradizem — o resumo mostra exatamente o que NÃO está em ' +
          '`mapped`, então a chave some do resumo e continua prometida por ele. ' +
          'Escolha uma.',
      )
    }
```

- [ ] **Step 4: Rodar e ver PASSAR**

```bash
cd frontend && pnpm test -- useCrudForm
```

Esperado: todos passam.

- [ ] **Step 5: Provar que os 5 hooks reais continuam limpos**

```bash
cd frontend && pnpm test
```

Esperado: tudo verde, com 4 testes a mais que a rodada anterior (a base é 47 mais os 9 da Task 3). O que importa neste passo não é o número: os 8 testes de hook de feature renderizam a config REAL de cada diálogo, então a suíte verde aqui é a prova de que nenhum dos 5 hooks tinha a contradição.

- [ ] **Step 6: Commit**

```bash
cd frontend && pnpm lint && pnpm build
cd .. && git add frontend/src/shared/hooks/useCrudForm.ts frontend/src/shared/hooks/useCrudForm.test.ts
git commit -m "$(cat <<'EOF'
feat(shared): useCrudForm reprova chave em mapped e summaryOnly, Q-3

A guarda de classificacao so testava ausencia nas duas listas. Chave
declarada nas DUAS e contraditoria -- o resumo mostra exatamente o que
nao esta em mapped, entao a chave some do resumo e continua prometida
por ele -- e passava.

Reprovacao no import.meta.env.DEV que ja existia, no mesmo idioma da
que ja estava la. Zero efeito no bundle de producao.

Os 5 hooks reais continuam limpos: os 8 testes de hook de feature
renderizam a config de cada dialogo e seguem verdes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Barrel de `shared/hooks` perde o que é interno

**Files:**
- Modify: `frontend/src/shared/hooks/index.ts:3-4`

**Interfaces:**
- Consumes: `classificationConflicts` da Task 4 — que **não** entra no barrel, pelo mesmo critério.

**Contexto:** medido em 2026-08-10, o único consumidor de `unclassifiedPayloadKeys`, `MutableResource` e `CrudFormOptions` é `useCrudForm.test.ts`, por caminho relativo (`./useCrudForm`). Barrel é fronteira pública; símbolo interno exposto ali é acoplamento que ninguém pediu.

- [ ] **Step 1: Editar o barrel**

Substitua as linhas 3-4 de `frontend/src/shared/hooks/index.ts` por:

```ts
// `unclassifiedPayloadKeys`, `classificationConflicts`, `MutableResource` e
// `CrudFormOptions` NÃO saem daqui: são o mecanismo interno da guarda de
// classificação, e o único consumidor é o teste ao lado, por caminho relativo
// (Q-2 do review de 2026-08-05). Barrel é fronteira pública.
export { useCrudForm } from './useCrudForm'
```

- [ ] **Step 2: Provar que nada quebrou**

```bash
cd frontend && pnpm build && pnpm test
```

Esperado: build verde (o `tsc -b` é quem reprovaria um import órfão) e testes passando.

- [ ] **Step 3: Sonda — ver VERMELHO**

Acrescente a `frontend/src/features/commercial/hooks/useBudgetForm.ts` um import do símbolo removido:

```ts
import { unclassifiedPayloadKeys } from '@shared/hooks'
```

```bash
cd frontend && pnpm build
```

Esperado: FAIL do `tsc` com `has no exported member 'unclassifiedPayloadKeys'`. Desfaça:

```bash
git checkout -- src/features/commercial/hooks/useBudgetForm.ts
```

- [ ] **Step 4: Commit**

```bash
cd .. && git add frontend/src/shared/hooks/index.ts
git commit -m "$(cat <<'EOF'
refactor(shared): barrel de hooks para de exportar mecanismo interno

unclassifiedPayloadKeys, MutableResource e CrudFormOptions sao o
mecanismo interno da guarda de classificacao do useCrudForm. O unico
consumidor e o teste ao lado, por caminho relativo -- medido antes de
remover (Q-2 do review de 2026-08-05).

classificationConflicts, nascido na task anterior, nao entra pelo mesmo
criterio.

Sonda vista vermelha: import do simbolo removido reprova no tsc -b.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `useEntityPhoto` ganha teste

**Files:**
- Create: `frontend/src/shared/hooks/useEntityPhoto.test.tsx`

**Interfaces:**
- Consumes: `useEntityPhoto` de `./useEntityPhoto`; mocka `@shared/api/photoResource`.
- Produces: nada.

**Contexto:** 161 linhas, o module de maior fan-out de `shared/hooks`, sem nenhum teste. Extensão `.tsx` porque o wrapper do `QueryClientProvider` é JSX — mesmo molde dos 8 testes de hook de feature. jsdom **não implementa** `URL.createObjectURL`: sem stub, o primeiro `onSelect` estoura.

- [ ] **Step 1: Escrever os seis casos**

Create `frontend/src/shared/hooks/useEntityPhoto.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEntityPhoto } from './useEntityPhoto'

const upload = vi.fn<(id: number, file: File) => Promise<void>>()
const remove = vi.fn<(id: number) => Promise<void>>()

// Estáveis entre renders de propósito: o hook chama `photoResource(resource)`
// a cada render, e spies novos a cada chamada perderiam o histórico.
vi.mock('@shared/api/photoResource', () => ({
  photoResource: () => ({ upload, remove }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const arquivo = () => new File(['x'], 'foto.png', { type: 'image/png' })

function montar(id: number | null, mode: 'create' | 'edit' | 'view' = 'create') {
  return renderHook(
    () => useEntityPhoto({ resource: 'users', id, mode, invalidateKey: ['users'] }),
    { wrapper },
  )
}

beforeEach(() => {
  upload.mockReset()
  remove.mockReset()
  upload.mockResolvedValue(undefined)
  remove.mockResolvedValue(undefined)
  // jsdom não implementa nenhuma das duas.
  URL.createObjectURL = vi.fn(() => 'blob:lotus')
  URL.revokeObjectURL = vi.fn()
})

describe('useEntityPhoto', () => {
  it('em create, bufferiza sem nenhuma requisição', () => {
    // Não há id para pendurar a foto: sair da tela agora não pode ter
    // criado nada no S3.
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))

    expect(upload).not.toHaveBeenCalled()
    expect(result.current.url).toBe('blob:lotus')
  })

  it('`flush` sobe o arquivo bufferizado para o id recém-criado', async () => {
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    await act(async () => {
      await result.current.flush(42)
    })

    expect(upload).toHaveBeenCalledTimes(1)
    expect(upload.mock.calls[0][0]).toBe(42)
  })

  it('`flush` que falha NÃO lança e liga `hasBufferedFailure`', async () => {
    // A entidade já existe: propagar o erro faria o diálogo fechar como se
    // tudo tivesse dado certo, e o usuário sairia achando que subiu foto.
    upload.mockRejectedValueOnce(new Error('S3 fora'))
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    await act(async () => {
      await expect(result.current.flush(42)).resolves.toBeUndefined()
    })

    expect(result.current.hasBufferedFailure).toBe(true)
  })

  it('`onRetry` reenvia para o id da TENTATIVA, não para a prop', async () => {
    // O `flush` falhou com createdId=42 e a prop `id` continua null (a
    // transição para edit ainda não propagou). Retry com a prop mandaria o
    // upload para lugar nenhum.
    upload.mockRejectedValueOnce(new Error('S3 fora'))
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    await act(async () => {
      await result.current.flush(42)
    })

    expect(result.current.onRetry).toBeTypeOf('function')
    act(() => result.current.onRetry?.())

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2))
    expect(upload.mock.calls[1][0]).toBe(42)
  })

  it('`sizeError` apaga o `onRetry`', async () => {
    // O erro exibido passa a ser o de TAMANHO, mas `buffered`/`retryId` ainda
    // guardam a tentativa ANTERIOR — o botão mentiria sobre o próprio efeito.
    upload.mockRejectedValueOnce(new Error('S3 fora'))
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    await act(async () => {
      await result.current.flush(42)
    })
    expect(result.current.onRetry).toBeTypeOf('function')

    act(() => result.current.onSizeReject('arquivo grande demais'))

    expect(result.current.onRetry).toBeUndefined()
    expect(result.current.error).toBe('arquivo grande demais')
  })

  it('em create, `onRemove` limpa sem chamar a API', () => {
    const { result } = montar(null)

    act(() => result.current.onSelect(arquivo()))
    act(() => result.current.onRemove())

    expect(remove).not.toHaveBeenCalled()
    expect(result.current.url).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver PASSAR**

```bash
cd frontend && pnpm test -- useEntityPhoto
```

Esperado: `Tests 6 passed`.

- [ ] **Step 3: Sonda — quebrar o hook e ver cada caso reprovar**

Em `frontend/src/shared/hooks/useEntityPhoto.ts:115`, troque `setRetryId(createdId)` por `setRetryId(id)`:

```bash
cd frontend && pnpm test -- useEntityPhoto
```

Esperado: FAIL só em "`onRetry` reenvia para o id da TENTATIVA" — o caso nomeia a armadilha que o comentário do hook descreve. Desfaça. Repita para a precedência do `sizeError` (linha 147: remova `sizeError === null &&`) e confirme que só o quinto caso reprova.

```bash
git checkout -- src/shared/hooks/useEntityPhoto.ts && git diff --stat src/shared/hooks/useEntityPhoto.ts
```

Esperado: saída vazia.

- [ ] **Step 4: Commit**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
cd .. && git add frontend/src/shared/hooks/useEntityPhoto.test.tsx
git commit -m "$(cat <<'EOF'
test(shared): useEntityPhoto ganha os seis casos que faltavam

161 linhas e o maior fan-out de shared/hooks, sem nenhum teste. Os seis
casos sao os que correspondem aos comentarios de armadilha que o proprio
hook carrega: buffer sem request no create, flush, flush que falha sem
lancar, onRetry no id da tentativa, precedencia do sizeError e onRemove
local.

Sondas vistas vermelhas uma a uma: setRetryId(id) no lugar de
setRetryId(createdId) reprova so o quarto caso; remover a guarda de
sizeError reprova so o quinto.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Referência de path em doc normativo tem de existir

**Files:**
- Create: `frontend/tests/repo-docs-refs.test.ts`
- Modify: `frontend/vite.config.ts:23`
- Modify: `frontend/tsconfig.node.json` (`include`)

**Interfaces:**
- Consumes: `fs`/`path` do Node — por isso o arquivo pertence ao projeto `tsconfig.node.json`, que é o que tem `types: ["node"]`.
- Produces: nada.

**Contexto medido em 2026-08-10:** 87 referências conferíveis em 10 docs normativos; **3** não resolvem, e as três são negação deliberada. `docs/superpowers/**` e `docs/pendencias.md` ficam fora — registram o que não existe por natureza.

- [ ] **Step 1: Ampliar o `include` do vitest**

Em `frontend/vite.config.ts`, linha 23:

```ts
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
```

- [ ] **Step 2: Pôr `tests/` no type-check**

Em `frontend/tsconfig.node.json`, última linha:

```json
  "include": ["vite.config.ts", "tests"]
```

`tsconfig.app.json` **não** muda: ele tem `lib: DOM` e `include: ["src"]`, e este teste é Node puro.

- [ ] **Step 3: Escrever a guarda**

Create `frontend/tests/repo-docs-refs.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Lição 13 em forma de mecanismo: doc que descreve intenção não-construída é
 * pior que doc ausente. Três reincidências pagas — o ADR-15 mandando por uma
 * arquitetura que nunca existiu, as leis mandando por DTO em `app/Data` (pasta
 * que nunca existiu) e a nota do ADR-12 citando `LibreOfficeConverter` (classe
 * que nunca existiu, Q-5 de 2026-08-10). Nenhuma delas foi erro de comando: as
 * três foram um path ou uma classe citada que não estava lá.
 *
 * Mora em `frontend/tests/` por um motivo medido, não por gosto: o container
 * `app` monta só `./backend` e `./frontend`, então PHPUnit não enxerga
 * `CLAUDE.md`, `.claude/rules/` nem `docs/`. O vitest roda nativo no WSL e é o
 * único runner do projeto com acesso à raiz.
 */
const RAIZ = resolve(__dirname, '..', '..')

/** Doc NORMATIVO: afirma o que É. Histórico fica fora. */
const DOCS = [
  'CLAUDE.md',
  'INSTRUÇÕES-DO-PROJETO.md',
  '.claude/rules/backend-ddd.md',
  '.claude/rules/frontend-fsliced.md',
  '.claude/rules/generated-types.md',
  '.claude/rules/migrations.md',
  'docs/README.md',
  'docs/adrs.md',
  'docs/der-fisico.md',
  'docs/estrutura-monolito.md',
]

/**
 * `docs/superpowers/**` (progress, state, plans, specs) e `docs/pendencias.md`
 * ficam FORA de propósito: o primeiro é histórico e congela referência morta
 * por design — `ManualPdfService` morreu em 2026-08-10 e a linha que o cita
 * continua correta como registro —, e o segundo REGISTRA divergência, então
 * citar o que não existe é a função dele.
 */

/** Bases tentadas: a doc cita path relativo ao projeto de que fala. */
const BASES = ['', 'backend/', 'frontend/', 'frontend/src/', 'backend/app/', 'docs/', 'frontend/src/shared/ui/']

const EXTENSOES = ['.php', '.ts', '.tsx', '.md', '.json', '.png', '.pdf', '.sh', '.yml', '.yaml', '.js', '.css']

const PREFIXOS = ['backend/', 'frontend/', 'src/', 'app/', 'docs/', '.claude/', 'tests/', 'database/', 'config/', 'resources/', 'bootstrap/']

/**
 * Citações deliberadas de coisa que NÃO existe. Lista que só encolhe; ampliar
 * é uma linha mais a justificativa no commit — mesmo contrato do `ALLOWED` do
 * `DomainDependencyTest`. Detectar isso por vizinhança de texto ("não existe",
 * "nunca existiu") foi considerado e recusado: guarda frágil é pior que
 * nenhuma.
 */
const CITACOES_DELIBERADAS: Record<string, string> = {
  '.claude/rules/generated-types.md::app/Data': 'a rule escreve "Não existe `app/Data`" — a negação é o conteúdo',
  'docs/README.md::app/Data': 'a lição 13 cita a pasta justamente por ela nunca ter existido',
  'docs/estrutura-monolito.md::src/Domains/': 'alternativa em aberto na lista [A CONFIRMAR FASE 2], não afirmação',
}

/** Glob, placeholder e alternativa não são path conferível. */
const ehPadrao = (token: string) => /[*<>|]/.test(token)

/** O Drive é fonte externa ao repositório (CLAUDE.md §3). */
const foraDoRepo = (token: string) => token.startsWith('Drive/')

function pareceCaminho(token: string): boolean {
  if (token.includes(' ') || token.startsWith('http')) return false
  if (PREFIXOS.some((p) => token.startsWith(p))) return true
  return token.includes('/') && EXTENSOES.some((e) => token.endsWith(e))
}

function resolvePath(token: string): boolean {
  const limpo = token.replace(/[.,;:]+$/, '')
  return BASES.some((base) => existsSync(join(RAIZ, base + limpo)))
}

type Referencia = { doc: string; linha: number; token: string }

function referencias(doc: string): Referencia[] {
  const conteudo = readFileSync(join(RAIZ, doc), 'utf8')
  const achados: Referencia[] = []

  conteudo.split('\n').forEach((linha, i) => {
    for (const match of linha.matchAll(/`([^`\n]+)`/g)) {
      const token = match[1]
      if (!pareceCaminho(token) || ehPadrao(token) || foraDoRepo(token)) continue
      achados.push({ doc, linha: i + 1, token })
    }
  })

  return achados
}

describe('referência de path em doc normativo', () => {
  it.each(DOCS)('%s existe', (doc) => {
    // Sem isto, apagar um doc da lista deixaria a guarda passando com zero
    // referências conferidas — silêncio verde é o pior resultado possível.
    expect(existsSync(join(RAIZ, doc))).toBe(true)
  })

  it('todo path citado aponta para algo que existe', () => {
    const quebrados = DOCS.flatMap(referencias)
      .filter((ref) => !(`${ref.doc}::${ref.token}` in CITACOES_DELIBERADAS))
      .filter((ref) => !resolvePath(ref.token))
      .map((ref) => `${ref.doc}:${ref.linha}  ${ref.token}`)

    expect(quebrados).toEqual([])
  })

  it('confere um volume de referências compatível com o medido', () => {
    // Guarda da guarda: se o extrator parar de casar (uma mudança de formato
    // de doc, uma regex quebrada), o teste acima passaria com zero achados e
    // ninguém saberia. Medido em 2026-08-10: 87 conferíveis.
    const total = DOCS.flatMap(referencias).length

    expect(total).toBeGreaterThan(60)
  })

  it('toda citação deliberada ainda está no doc que a declara', () => {
    // Exceção que sobrevive ao texto que a justificava vira permissão órfã.
    for (const chave of Object.keys(CITACOES_DELIBERADAS)) {
      const [doc, token] = chave.split('::')
      expect(readFileSync(join(RAIZ, doc), 'utf8')).toContain(`\`${token}\``)
    }
  })
})
```

- [ ] **Step 4: Rodar e ver PASSAR**

```bash
cd frontend && pnpm test -- repo-docs-refs
```

Esperado: `Tests 13 passed` (10 docs + 3 casos). Se "todo path citado aponta para algo que existe" reprovar, **não** acrescente exceção sem ler o contexto da linha: ou a doc está errada e o certo é corrigir a doc, ou é citação deliberada e entra em `CITACOES_DELIBERADAS` com o motivo.

- [ ] **Step 5: Sonda — ver VERMELHO**

```bash
cd /home/jvbat/projetos/lotus && printf '\n> Sonda: `backend/app/Domains/Inexistente/Models/Nada.php` nao existe.\n' >> docs/adrs.md
cd frontend && pnpm test -- repo-docs-refs
```

Esperado: FAIL nomeando `docs/adrs.md:<n>  backend/app/Domains/Inexistente/Models/Nada.php`. Desfaça:

```bash
cd /home/jvbat/projetos/lotus && git checkout -- docs/adrs.md && git diff --stat docs/adrs.md
```

Esperado: saída vazia.

- [ ] **Step 6: Sonda da guarda da guarda**

Comente a linha do `push` dentro de `referencias()` e confirme que o caso "confere um volume compatível" reprova com `0`. Desfaça.

- [ ] **Step 7: Commit**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
cd .. && git add frontend/tests/repo-docs-refs.test.ts frontend/vite.config.ts frontend/tsconfig.node.json
git commit -m "$(cat <<'EOF'
test(docs): licao 13 vira mecanismo, path citado em doc tem de existir

As tres reincidencias pagas da licao 13 nao foram comando errado: foram
path ou classe citada que nunca existiu (app/Data, LibreOfficeConverter,
a arquitetura do ADR-15). A guarda confere referencia de codigo em doc
NORMATIVO -- superpowers/ e pendencias.md ficam fora, porque registram o
que nao existe por natureza.

Mora em frontend/tests/ por medicao: o container monta so ./backend e
./frontend, entao PHPUnit nao le a raiz do repo. O vitest e o unico
runner com acesso.

87 referencias conferiveis em 10 docs; as 3 que nao resolvem sao negacao
deliberada e viram lista declarada com motivo, no contrato do ALLOWED do
DomainDependencyTest.

Duas guardas da guarda: volume minimo de referencias e citacao
deliberada que sobreviveu ao texto que a justificava.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: A rule diz a verdade sobre si mesma

**Files:**
- Modify: `.claude/rules/frontend-fsliced.md` (seção de hooks, para a P-25; `:161-167`, para o corte do runner)

- [ ] **Step 1: Escrever a linha da P-25**

Na seção que trata de hooks de `shared/`, acrescente:

```markdown
- **Hook genérico não importa tipo de `shared/ui`.** `shared/hooks/` é lógica; `shared/ui/` é
  apresentação, e a seta aponta de `ui` para `hooks`, nunca ao contrário. Dois casos medidos:
  `useFilePreview` (que serve o `AppPhotoField` sem conhecê-lo) e `SearchableTableFrame` (que
  consome `useTableFilter` sem que o hook saiba da moldura). Hook que precisa do tipo de um
  componente está desenhado ao contrário — quem depende é o componente. (P-25)
```

- [ ] **Step 2: Corrigir a frase vencida do corte do runner**

Substitua o parágrafo de `:161-167` por:

```markdown
**O runner existe desde 2026-08-03** (bloco `hardening-estrutural-pre-sprint-4`) e o corte cresceu:
cobre os hooks de `shared/hooks/` — os de maior fan-out do projeto — **e** hooks de feature, por
`renderHook` + `QueryClientProvider`, com o teste morando na própria feature (teste em `shared/`
importando `features/` quebraria a lei §5.6). Teste de componente com PrimeReact no jsdom segue
**fora** do corte. Sem `globals`: cada teste importa `describe`/`it`/`expect` de `vitest`, para os
arquivos de teste seguirem type-checados pelo `tsc -b`. Este parágrafo dizia "sem test runner ainda"
por um bloco inteiro depois de o runner existir (review de 2026-08-04, Q-3), e depois afirmou por
mais quatro dias que o corte era só `shared/` quando já havia oito testes de hook de feature —
a mesma lição 13, no mesmo arquivo, duas vezes.
```

- [ ] **Step 3: A guarda da Task 7 confere a edição**

```bash
cd frontend && pnpm test -- repo-docs-refs
```

Esperado: PASS. Se reprovar, um path que você acabou de escrever não existe — corrija o texto, não a lista de exceções.

- [ ] **Step 4: Commit**

```bash
cd .. && git add .claude/rules/frontend-fsliced.md
git commit -m "$(cat <<'EOF'
docs(rules): P-25 e a frase vencida sobre o corte do runner

P-25: hook generico nao importa tipo de shared/ui, com os dois casos
medidos (useFilePreview, SearchableTableFrame).

O paragrafo do runner afirmava que o corte era so shared/hooks/, e ha
oito testes de hook de feature no repositorio desde 2026-08-05. Segunda
ocorrencia de licao 13 no mesmo paragrafo -- a primeira foi a Q-3 do
review de 2026-08-04, quando ele dizia "sem test runner ainda".

A linha da P-25 nao fecha a pendencia: ela fecha no /fechar-sprint.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Gate do bloco

- [ ] **Step 1: Ferramentas**

```bash
docker compose exec -T app php artisan test
cd backend && ./vendor/bin/pint --test tests/Support/ScansPhpSource.php tests/Feature/Shared/PersistenceLawsTest.php tests/Feature/Shared/NestedRouteOwnershipTest.php tests/Feature/Shared/DomainDependencyTest.php
cd ../frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: backend `524 passed, 1 skipped`; Pint `PASS`; frontend **16 arquivos** — 13 da base mais `axios.test.ts`, `useEntityPhoto.test.tsx` e `repo-docs-refs.test.ts`.

- [ ] **Step 2: Zero schema, zero DTO**

```bash
git diff main...HEAD -- backend/database/
docker compose exec -T app php artisan typescript:transform
git status --porcelain
```

Esperado: primeiro comando sem saída; `git status` vazio depois do transform.

- [ ] **Step 3: Zero mudança de comportamento**

```bash
git diff main...HEAD --stat -- backend/app/ frontend/src/features/
```

Esperado: **saída vazia**. Nenhum arquivo de `app/` nem de `features/` é tocado pelo bloco. Se algo aparecer aqui, uma sonda não foi desfeita.

- [ ] **Step 4: As oito sondas registradas**

Confira que os commits das Tasks 1-8 registram, cada um, o texto da reprovação que a sonda produziu. Guarda sem sonda registrada é cobertura fantasma (lição 10) e reprova o gate.

- [ ] **Step 5: Estado**

Atualize `docs/superpowers/state.md` para `ready_for_review` e commite. O review **não** roda automaticamente.

---

## Desvios do plano

Nove medições feitas ao escrever este plano mudaram o que a spec dizia. Registradas em vez de silenciadas:

**D-P1 — a guarda 2 conta segmentos e exige declaração, não binding tipado.** A spec §3.1 dizia "≥2 segmentos com <2 models tipados vira reprovação, com a instrução de tipar o binding". Lendo o docblock do teste, a objeção que ele já carregava contra ler a URI (`{file}` não diz que é model) produziria falso positivo em rota com parâmetro não-model. A saída usa a válvula que o teste já tem: `withoutScopedBindings()` com o motivo ao lado. Medido: 8 rotas com ≥2 segmentos, todas já declarando, **0** reprovando — a variante nasce verde igual e não tem o falso positivo.

**D-P2 — a guarda 3 é arquivo novo, não caso no arquivo existente.** `postMultipart.test.ts` abre com `vi.mock('./axios')`, que é hoisted e vale para o arquivo inteiro; "caso sem mock" ali dentro não existe. Vai para `axios.test.ts`, que é onde a asserção pertence: o alvo é a instância, não o helper. **Consequência no DoD:** o item 3 da §5 da spec projeta 15 arquivos de frontend; com este desvio são **16**, porque a guarda 3 deixa de ser caso em arquivo existente e passa a ser o terceiro arquivo novo.

**D-P3 — `useEntityPhoto.test.tsx`, não `.test.ts`.** O wrapper do `QueryClientProvider` é JSX. É o mesmo molde dos oito testes de hook de feature.

**D-P4 — jsdom não implementa `URL.createObjectURL`.** Sem stub no `beforeEach`, o primeiro `onSelect` estoura. Não é detalhe de execução: sem isso a Task 6 inteira não roda.

**D-P5 — `codigoSemComentarios` vira trait compartilhado.** A guarda §5.2 precisa da mesma varredura sem comentário que o `DomainDependencyTest` já tinha em método privado. Duplicar reintroduziria o defeito da Q-4 de 2026-08-04 em dois lugares em vez de um. O `DomainDependencyTest` migra no mesmo commit, e a suíte prova que a guarda existente sobreviveu.

**D-P6 — a guarda §5.1 exclui `QueryBuilders/` e a exclusão é provada.** `TurmaQueryBuilder` e `EnrollmentQueryBuilder` são o padrão aprovado pelo ADR-02; varredura por sufixo de nome os reprovaria. O Step 5 da Task 1 prova a exceção com sonda em vez de afirmá-la em comentário.

**D-P7 — a guarda 4 precisa de `tests/` no `tsconfig.node.json`.** `tsconfig.app.json` tem `include: ["src"]` e `types: ["vite/client"]`; o teste usa `node:fs`. Sem isso o arquivo fica fora do `tsc -b` e contraria o princípio que o próprio `vite.config.ts` declara — teste type-checado, não zona sem tipo.

**D-P8 — a guarda 4 ganha duas guardas de si mesma.** Um extrator que pare de casar deixaria o teste verde com zero referências conferidas, que é o pior resultado possível. Entram o piso de volume (>60, contra as 87 medidas) e a conferência de que cada citação deliberada ainda está no doc que a declara.

**D-P9 — a Task 7 vem antes da Task 8 na ordem de arquivo, mas a 8 é conferida pela 7.** A spec §4 pede doc por último; o Step 3 da Task 8 roda a guarda da Task 7 contra o texto recém-escrito, que é o único jeito de a rule editada não nascer com path quebrado.

## Handoff de execução

**`executor: claude`**

Critério: a metade mecânica do bloco (Tasks 2, 3, 4, 5 e 8) seria delegável, mas as Tasks 1, 6 e 7 não são. As três fecham por **laço de ajuste contra medição** — a Task 7 confere 87 referências e cada falso positivo só aparece rodando; as sondas da Task 1 e da Task 6 exigem ler o texto da reprovação e julgar se ela nomeia o problema certo, e não apenas se o teste ficou vermelho. O risco declarado na §7 da spec é exatamente esse — guarda que promete cobrir e não cobre —, e ele não é detectável por execução linear de passos.
