# Releases, versionamento e licença — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** versão SemVer automática do merge à promoção, exibida no sistema a partir de uma fonte
única, histórico reconstruído desde o go-live e licença proprietária nos dois repositórios.

**Architecture:** `version.txt` é a fonte; o release-please (só no Andred21) mantém a PR de release,
o `CHANGELOG.md` e propaga a versão ao `frontend/package.json` e a uma linha marcada de
`backend/config/app.php`. O `deploy.yml` (só no Gatika-CL) publica tag e Release depois do deploy
OK, por um script que nunca reprova o deploy. Um script de backfill, fora do espelho, gera as 13
versões históricas e o `CHANGELOG.md` inicial.

**Tech Stack:** release-please (`googleapis/release-please-action@v4`), Bash + `gh`, Vite `define`,
Laravel config + rota `auth.active` + spatie/laravel-data, Vitest (projeto `repo`), PHPUnit.

**Spec:** `docs/superpowers/blocos/45-cicd-releases-versionamento-e-licenca/spec.md` (com as
emendas E1 e E2 do §9, que vencem o §4.1 e os DoD 1 e 3).

## Global Constraints

- Versão inicial: `1.9.1` em `version.txt`, `.release-please-manifest.json` (`{".": "1.9.1"}`),
  `frontend/package.json` `$.version` e `backend/config/app.php`.
- Linha do backend, exata: `'version' => '1.9.1', // x-release-please-version` (E1). O
  `backend/composer.json` **não** ganha `version`.
- Caminhos de produto (D2/E2): `backend/`, `frontend/`, `docker/`, `deploy/`, `.github/`. Tudo o
  mais na raiz vai para `exclude-paths`, inclusive `docker-compose.prod.yml` e
  `docker-compose.prod-tls.yml`.
- Bump: `fix`/`perf` → PATCH, `feat` → MINOR, `!`/`BREAKING CHANGE` → MAJOR; demais tipos nunca.
- `bootstrap-sha`: `5fba081d7bff45e4ad4b930d49957f6c91f47978`.
- Seções do CHANGELOG (pt-BR): `feat` → `Funcionalidades`, `fix` → `Correções`, `perf` →
  `Desempenho`; demais tipos ocultos.
- Formato de seção do `CHANGELOG.md` (o do release-please, consumido pelas Tasks 5 e 6):
  `## [X.Y.Z](https://github.com/Andred21/lotus/compare/vA.B.C...vX.Y.Z) (AAAA-MM-DD)`, seguido de
  `### <Seção>` e itens `* <descrição> (<sha7>)`. Cabeçalho do arquivo: `# Changelog`.
- Tag: `vX.Y.Z`, anotada. Secret do release-please: `RELEASE_PLEASE_TOKEN`.
- Guardas: `release-please.yml` só com `github.repository == 'Andred21/lotus'`; passo de release
  só no `deploy.yml` (já guardado em `Gatika-CL/lotus`).
- Licença: `LICENSE` em pt-BR + es, `Copyright © 2025-2026 João Victor Andreoli`, todos os
  direitos reservados, nenhuma permissão a terceiros. `backend/composer.json` `"license":
  "proprietary"`; `frontend/package.json` `"license": "UNLICENSED"` e `"private": true`.
- Push direto em `main` proibido; escrita remota (tags, releases, secrets, branches de teste) é
  do João.

## Review Focus

1. **Seção ausente no `CHANGELOG.md` na promoção** (alguém promove um SHA cuja versão não tem
   seção): a Release sai com nota padrão e aviso, o deploy segue verde. Teste na Task 5.
2. **Falha da API do GitHub no passo de release** (rede, permissão): aviso `::warning::` e exit 0,
   nunca reprova. Teste na Task 5.
3. **Tag existente apontando para objeto de tag anotada** (a API devolve `type: tag`, não
   `commit`): o script desreferencia antes de comparar SHA, senão toda repromoção vira "outro
   SHA". Teste na Task 5.
4. **Clone raso** no backfill (CI e sessões clonam com profundidade 50): recusa com mensagem, em
   vez de calcular bump errado. Teste na Task 6.
5. **Bump calculado diverge da tabela §4.4**: o backfill para e reporta a linha, nunca escreve
   tag com versão que D2 não sustenta. Teste na Task 6.

---

### Task 1: Licença proprietária e rascunho do termo

**Files:**
- Create: `LICENSE`
- Create: `docs/superpowers/blocos/45-cicd-releases-versionamento-e-licenca/termo-licenca-rascunho.md`
- Modify: `backend/composer.json:7` (campo license)
- Modify: `frontend/package.json` (campo license)
- Test: `frontend/tests/licenca.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `LICENSE` na raiz (entrada nova de primeiro nível, classificada pela Task 4).

- [ ] **Step 1: Teste que falha** — `frontend/tests/licenca.test.ts` (projeto `repo`):
  - `LICENSE` existe, contém `Todos os direitos reservados`, `Todos los derechos reservados` e
    `João Victor Andreoli`, e não contém `Permission is hereby granted` nem `MIT`;
  - `JSON.parse(backend/composer.json).license === 'proprietary'` e não há chave `version`;
  - `JSON.parse(frontend/package.json)`: `license === 'UNLICENSED'`, `private === true`;
  - nenhum `package.json`/`composer.json` versionado (`git ls-files`, fora de `vendor/` e
    `node_modules/`) com `"license": "MIT"`.
- [ ] **Step 2:** `cd frontend && pnpm vitest run tests/licenca.test.ts` → FAIL (LICENSE ausente).
- [ ] **Step 3:** escrever `LICENSE` (pt-BR, depois `---`, depois es): titular, todos os direitos
  reservados, uso só por quem tem licença escrita do titular, sem garantia. Ajustar os dois
  manifests. Escrever o termo-rascunho (pt-BR + es) cobrindo D5 inteira e a ressalva de §4.3
  (portfólio sem dados da Lotus, sem marca como endosso, screenshots fictícios, Lei 19.628), com
  aviso no topo: "Rascunho para validação jurídica. Não é parecer."
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** commit `chore(45): licença proprietária e rascunho do termo de uso`.

### Task 2: Fonte única da versão e frontend sem literal

**Files:**
- Create: `version.txt`, `.release-please-manifest.json` (os dois com 1.9.1)
- Create: `frontend/src/vite-env.d.ts`
- Modify: `frontend/package.json` (version para 1.9.1)
- Modify: `frontend/vite.config.ts` (define)
- Modify: `frontend/src/shared/config/brand.ts:7`
- Modify: `backend/config/app.php` (linha version logo após name)
- Test: `frontend/src/shared/config/brand.test.ts`, `frontend/tests/versao-fonte-unica.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `config('app.version'): string`; global de build `__APP_VERSION__: string`;
  `APP_VERSION = \`v${__APP_VERSION__}\`` em `@shared/config/brand`.

- [ ] **Step 1: Testes que falham**
  - `brand.test.ts` (unit): `expect(APP_VERSION).toBe(\`v${pkg.version}\`)`, com `pkg` importado
    de `../../../package.json`.
  - `versao-fonte-unica.test.ts` (repo): lê `version.txt` (trim), `.release-please-manifest.json`
    (`["."]`), `frontend/package.json` (`version`) e extrai de `backend/config/app.php` a regex
    `/'version' => '([^']+)', \/\/ x-release-please-version/`; os quatro iguais e casando
    `/^\d+\.\d+\.\d+$/`. Segundo `it`: `brand.ts` não casa `/['"`]v?\d+\.\d+\.\d+['"`]/`.
- [ ] **Step 2:** `pnpm vitest run src/shared/config/brand.test.ts tests/versao-fonte-unica.test.ts`
  → FAIL.
- [ ] **Step 3:** criar os arquivos de versão; no `vite.config.ts`, ler a versão do
  `package.json` e emitir `define: { __APP_VERSION__: JSON.stringify(versao) }` **sempre** (serve,
  build e test), fundido com o `define` condicional de `VITE_API_URL` que já existe no `serve`
  num objeto só; `vite-env.d.ts` com `/// <reference types="vite/client" />` e
  `declare const __APP_VERSION__: string`; `brand.ts` exporta a constante derivada; linha exata
  dos Global Constraints no `config/app.php`.
- [ ] **Step 4:** mesmo comando → PASS. Depois trocar à mão `version.txt` para `1.9.2`, rodar o
  teste repo e ver FAIL citando a divergência (DoD 1); reverter e ver PASS.
- [ ] **Step 5:** `pnpm lint && pnpm build` → verdes (o `tsc -b` cobre a declaração).
- [ ] **Step 6:** commit `feat(45): versão do sistema a partir de fonte única`.

### Task 3: Versão no backend, só autenticada, e no contexto de log

**Files:**
- Create: `backend/app/Domains/Identity/Http/Controllers/VersaoController.php`
- Create: `backend/app/Domains/Identity/Data/VersaoData.php`
- Modify: `backend/app/Domains/Identity/routes.php` (grupo auth.active)
- Modify: `backend/app/Providers/AppServiceProvider.php` (boot)
- Modify: `frontend/src/shared/types/generated.ts` (só regenerado)
- Test: `backend/tests/Feature/Identity/VersaoTest.php`

**Interfaces:**
- Consumes: `config('app.version')` (Task 2).
- Produces: `GET /api/versao` → `{"versao": "<X.Y.Z>"}`; `VersaoData { versao: string }`.

- [ ] **Step 1: Teste que falha** — `VersaoTest`:
  - `test_sem_sessao_responde_401`: `getJson('/api/versao')->assertUnauthorized()`;
  - `test_com_sessao_devolve_a_versao_da_config`: `actingAs(User::factory()->create())`,
    `assertOk()->assertExactJson(['versao' => config('app.version')])`;
  - `test_versao_da_config_e_semver`: `assertMatchesRegularExpression('/^\d+\.\d+\.\d+$/', config('app.version'))`;
  - `test_versao_vai_no_contexto_de_log`: `Log::sharedContext()['versao'] === config('app.version')`.
- [ ] **Step 2:** `docker compose exec -T app php artisan test --filter=VersaoTest` → FAIL (404).
- [ ] **Step 3:** `VersaoData` (`#[TypeScript]`, uma propriedade `string $versao`, factory
  `fromConfig()`); `VersaoController` invokable devolvendo `VersaoData`; rota `GET versao` dentro
  do grupo `auth.active` (não entra em `ANONIMAS`); `Log::shareContext(['versao' =>
  config('app.version')])` no `boot`.
- [ ] **Step 4:** mesmo filtro → PASS; depois `--filter=AuthenticatedRouteMiddlewareTest` → PASS.
- [ ] **Step 5:** `docker compose exec -T app php artisan typescript:transform` e
  `./vendor/bin/pint` nos arquivos PHP tocados (de `backend/`).
- [ ] **Step 6:** commit `feat(45): versão exposta a usuário autenticado e no log`.

### Task 4: release-please e catraca da raiz

**Files:**
- Create: `release-please-config.json`
- Create: `.github/workflows/release-please.yml`
- Test: `frontend/tests/release-please.test.ts`

**Interfaces:**
- Consumes: caminhos `version.txt`, `frontend/package.json`, `backend/config/app.php` e o marcador
  `x-release-please-version` (Task 2).
- Produces: PR de release no Andred21; secret esperado `RELEASE_PLEASE_TOKEN`.

- [ ] **Step 1: Teste que falha** — `release-please.test.ts` (repo):
  - config: `bootstrap-sha` exato; pacote `"."` com `release-type: simple`, `include-v-in-tag`
    não `false`, `changelog-sections` com exatamente `feat/Funcionalidades`, `fix/Correções`,
    `perf/Desempenho` visíveis e os demais `hidden: true`; `extra-files` contém
    `{type: json, path: frontend/package.json, jsonpath: $.version}` e
    `{type: generic, path: backend/config/app.php}`;
  - **catraca da raiz**: `PRODUTO = ['backend', 'frontend', 'docker', 'deploy', '.github']`; toda
    entrada de primeiro nível de `git ls-files` (mais `LICENSE`, `CHANGELOG.md`, `version.txt`,
    `.release-please-manifest.json`, `release-please-config.json`, que podem nascer em tasks
    paralelas) está em `PRODUTO` ou em `exclude-paths` (comparando sem barra final); nenhuma
    entrada de `PRODUTO` está em `exclude-paths`; um terceiro `it` injeta `naoClassificado/` na
    lista e espera a função de classificação reprovar (DoD 4);
  - workflow: contém `github.repository == 'Andred21/lotus'`, `secrets.RELEASE_PLEASE_TOKEN`,
    `googleapis/release-please-action@v4`, gatilho só `push` em `main`, e não referencia
    `GITHUB_TOKEN` como token da action.
- [ ] **Step 2:** `pnpm vitest run tests/release-please.test.ts` → FAIL.
- [ ] **Step 3:** escrever a config (com `$schema` do release-please) e o workflow
  (`permissions: contents: write, pull-requests: write`; inputs `config-file`/`manifest-file`).
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5: dry-run (DoD 4).** Com o branch da lane publicado e um token de leitura:
  `npx release-please@16 release-pr --dry-run --repo-url=Andred21/lotus --target-branch=cicd/45-cicd-releases-versionamento-e-licenca --config-file=release-please-config.json --manifest-file=.release-please-manifest.json --token=$GH_TOKEN`
  → propõe `1.10.0` (há `feat` em `frontend/`). Para `fix`→PATCH e só-`docs`→nada, o mesmo
  dry-run sobre dois branches descartáveis a partir deste (`tmp/45-rp-fix`, `tmp/45-rp-docs`),
  **só com autorização explícita do João** para o push e apagados em seguida. Sem token ou sem
  autorização: registrar a lacuna no `revisao.md` e no handoff, sem marcar o DoD 4 como provado.
- [ ] **Step 6:** commit `cicd(45): release-please com bump só por caminho de produto`.

### Task 5: Release no Gatika-CL depois da promoção

**Files:**
- Create: `.github/scripts/publicar-release.sh`
- Create: `frontend/tests/fixtures/publicar-release/gh` (executável)
- Modify: `.github/workflows/deploy.yml` (permissions.contents e passo novo no fim)
- Modify: `frontend/tests/workflow-deploy.test.ts`
- Test: `frontend/tests/publicar-release.test.ts`

**Interfaces:**
- Consumes: formato de seção do `CHANGELOG.md` (Global Constraints).
- Produces: `publicar-release.sh <dir-alvo>`; env `SHA`, `GITHUB_REPOSITORY`, `GH_TOKEN`; sai
  **sempre** 0; última linha do stdout é uma de `release: criada vX.Y.Z`,
  `release: ja publicada vX.Y.Z`, `release: pulada` (precedida de `::warning::<motivo>`).

- [ ] **Step 1: Testes que falham** — por execução, molde `podar-imagens.test.ts`: o `gh` falso
  lê o estado do caso em env (tag existente? SHA dela? tipo `tag`/`commit`? falhar em qual
  chamada?) e grava as chamadas num arquivo. Casos:
  - tag nova → chama `api .../git/tags` (objeto `SHA`, `type=commit`), `api .../git/refs` e
    `release create vX.Y.Z --verify-tag` com as notas = corpo da seção `X.Y.Z` do CHANGELOG;
    termina `release: criada`;
  - repromoção (ref aponta para objeto de tag cujo commit é `SHA`) → nenhuma escrita,
    `release: ja publicada`;
  - tag em outro SHA → `::warning::` com os dois SHAs, nenhuma escrita, `release: pulada`;
  - `gh` falha na criação → `::warning::`, exit 0;
  - `version.txt` ausente no alvo → `::warning::`, exit 0, nenhuma chamada ao `gh`;
  - seção ausente no CHANGELOG → release criada com nota `Notas em CHANGELOG.md.` e `::warning::`.
  - Em `workflow-deploy.test.ts`: passo `Release da versao promovida` existe **depois** de
    `deploy.sh no host, por SSM`, chama `main/.github/scripts/publicar-release.sh alvo`, tem
    `continue-on-error: true`, e `permissions` tem `contents: write`.
- [ ] **Step 2:** `pnpm vitest run tests/publicar-release.test.ts tests/workflow-deploy.test.ts`
  → FAIL.
- [ ] **Step 3:** implementar o script (`set -u`, sem `set -e` no corpo: cada falha vira aviso;
  desreferenciar `type: tag` com `api .../git/tags/<sha>` antes de comparar) e o passo
  (`env: GH_TOKEN: ${{ github.token }}`, `SHA` já vem do job).
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5:** commit `cicd(45): deploy publica tag e release da versão promovida`.

### Task 6: Backfill das 13 versões e CHANGELOG inicial

**Files:**
- Create: `scripts/backfill-releases.sh`, `scripts/backfill-releases.tsv`
- Create: `CHANGELOG.md` (gerado pelo script, Step 5)
- Create: `frontend/tests/fixtures/backfill-releases/gh` (executável)
- Modify: `.espelho-exclusoes` (+ `scripts/backfill-releases.sh`, `scripts/backfill-releases.tsv`)
- Test: `frontend/tests/backfill-releases.test.ts`

**Interfaces:**
- Consumes: formato de seção do `CHANGELOG.md` (Global Constraints).
- Produces: `scripts/backfill-releases.sh [--simular] [--changelog <arquivo>]`; env
  `LOTUS_BACKFILL_TABELA` (default `scripts/backfill-releases.tsv`), `LOTUS_BACKFILL_ORIGEM`
  (`Andred21/lotus`), `LOTUS_BACKFILL_ESPELHO` (`Gatika-CL/lotus`). TSV: `versao  data  origem
  espelho`, as 13 linhas do §4.4 da spec, SHAs de 40 hex.

- [ ] **Step 1: Testes que falham** — o teste monta um repositório git temporário com commits
  sintéticos (`feat: x` em `frontend/`, `fix: y` em `backend/`, `docs: z` em `docs/`,
  `refactor: w` em `backend/`) e uma TSV própria:
  - `--simular` imprime uma linha `vX.Y.Z  AAAA-MM-DD  <origem7>  <espelho7>` por versão e as
    notas agrupadas; `1.0.0` traz só `Primeira versão em produção (go-live).`;
  - só `docs`/`refactor` entre duas linhas com bump na TSV → exit 1 citando a linha (Review 5);
  - repositório raso (`git clone --depth 1` do sintético) → exit 1 com `clone raso` (Review 4);
  - `--changelog <arq>` grava no formato dos Global Constraints, mais nova primeiro;
  - sem `--simular`: confere `Source-Commit` do espelho (commit sintético com o trailer num
    remote local `upstream`) e o `SHA` do log das execuções (`gh run list`/`gh run view --log`
    falsos); divergência → exit 1 sem nenhuma escrita; caminho feliz → tag anotada com
    `tagger[date]` da promoção e `release create` nos dois repos; tag existente no mesmo SHA é
    pulada.
- [ ] **Step 2:** `pnpm vitest run tests/backfill-releases.test.ts` → FAIL.
- [ ] **Step 3:** implementar. Commits de produto por versão: `git log <anterior>..<atual>
  --no-merges -- backend frontend docker deploy .github`, classificados por D2; bump calculado
  comparado com a TSV.
- [ ] **Step 4:** mesmo comando → PASS.
- [ ] **Step 5 (precisa de histórico completo):** `git fetch --unshallow origin` se raso; rodar
  `scripts/backfill-releases.sh --simular --changelog CHANGELOG.md` no repo real → 13 linhas
  (DoD 6), `CHANGELOG.md` gravado. Bump divergente da tabela → **pare** e leve a linha ao João:
  a tabela da spec é autoritativa e só ele a corrige.
- [ ] **Step 6:** commit `chore(45): backfill das releases desde o go-live e CHANGELOG inicial`.

### Task 7: Documentação do fluxo

**Files:**
- Modify: `CONTRIBUINDO.md` (seção nova Releases)

**Interfaces:**
- Consumes: nomes das Tasks 4–6 (`RELEASE_PLEASE_TOKEN`, `publicar-release.sh`,
  `backfill-releases.sh`).
- Produces: nada.

- [ ] **Step 1:** escrever `## Releases`: o que é versão (D1), regra de bump (D2/E2), o caminho
  merge → PR de release → espelho → promoção, o token escolhido (PAT fine-grained com
  `contents: write` e `pull-requests: write` só no `Andred21/lotus`; o motivo: PR com
  `GITHUB_TOKEN` não dispara CI), a **ordem** das ações externas (secret antes do merge deste
  bloco; backfill depois do merge, rodado pelo João sem `--simular`), e o que o passo do
  `deploy.yml` faz em repromoção, rollback e tag em outro SHA.
- [ ] **Step 2:** `cd frontend && pnpm vitest run tests/repo-docs-refs.test.ts` → PASS (todo path
  citado existe).
- [ ] **Step 3:** commit `docs(45): fluxo de releases no CONTRIBUINDO`.

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 3, 4, 5, 6 | sim | nenhuma entre elas (3 e 4 consomem a Task 2, fora do grupo; 5 e 6 compartilham só o formato fixado nos Global Constraints) |

Ordem: 1 → 2 → G1 → 7. As Tasks 1 e 2 tocam `frontend/package.json` e não paralelizam. Task fora
de grupo executa e revisa uma a uma.

## Handoff de execução

- `executor: claude` — a Task 3 toca a lei 3 (DTO + `generated.ts`) e a lei 4 (rota sob
  `auth.active`), a Task 5 mexe no único caminho para produção, e as Tasks 4 e 6 dependem de
  julgamento (dry-run, divergência de tabela) que não cabe em paths fechados.
- Sessão: `opus`, esforço `high`.
- Papéis (`.claude/papeis.md`): `implementador-mecanico` (Tasks 1 e 7), `implementador-integracao`
  (Tasks 2–6), `revisor-task`, `re-revisor`, `corretor-tardio` se uma rodada não fechar,
  `revisor-branch` ao fim.
- Ações do João durante a execução: autorizar (ou não) os branches descartáveis da Task 4 Step 5.
