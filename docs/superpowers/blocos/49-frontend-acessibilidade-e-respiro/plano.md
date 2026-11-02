# Bloco 49 — Acessibilidade e respiro do frontend — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar P-74, P-105, P-109, P-101, P-108 e D-71 com régua de teste que impeça cada uma de voltar.

**Architecture:** O contraste do botão filled se corrige no gerador do tema (`generate-brand-theme.mjs`), e o CSS do claro sai regerado. O `tone-ink.test.ts` mede e amarra o resultado. Paginador, rótulos e RUT são mudanças locais em `shared/ui`, nas locales e em duas tabelas de `operation`. O P-108 é diagnóstico no navegador.

**Tech Stack:** React 19 + TS, PrimeReact 10 (Lara), Tailwind v4, vitest (jsdom), i18next.

**Spec:** `docs/superpowers/blocos/49-frontend-acessibilidade-e-respiro/spec.md`

## Global Constraints

- Rampas da Lotus no claro (`lara-light-lotus.css`): green 100 `#caf1d8`, 200 `#a0e6ba`, 300 `#76db9b`, 900 `#0e4f26` · blue 100 `#e3f3fb`, 200 `#c2e6f7`, 300 `#96d4f2`, 900 `#0c3549` · red 100 `#ffd0ce`, 200 `#ffaca7`, 300 `#ff8780`, 900 `#661814` · purple 100 `#ead6fd`, 200 `#dab6fc`, 300 `#c996fa`, 900 `#432263`.
- Severidade → hue: success `green`, info `blue`, danger `red`, help `purple`. O `warning` não muda.
- Filled no claro: base 300, hover 200, active 100, tinta 900; anel de foco 900 nas duas regras de `:focus`. O tema escuro não muda.
- Régua: texto ≥ 4,5:1; anel ≥ 3:1 contra a superfície onde pousa.
- i18n: chaves idênticas nas três locales (`es-CL`, `pt-BR`, `en`); es-CL é a referência.
- Features usam só `shared/ui`; cor via variável de tema; `identifierClass` para RUT (rules `frontend-fsliced.md` e `frontend-estilizacao.md`).
- Gate de verificação, de `frontend/`: `pnpm build`, `pnpm lint` e `pnpm test`.

## Review Focus

1. **Gate do gerador alcançando bloco que não é botão filled.** O `#ef4444` também pinta `p-error`, input inválido, tag, badge e mensagem. Um gate por hex mudaria tudo isso. Teste na Task 1: o diff do CSS regerado contra o atual só toca blocos cujo seletor passa no gate.
2. **Anel do `:enabled:focus` esquecido.** O Lara declara duas regras de foco, e a de baixo é quem pinta (lição da Q-5). Teste na Task 1: as duas regras, por severidade.
3. **Tradução que não acompanha a troca de idioma.** O `PageLinks` em template precisa reler `t` a cada render. Teste na Task 3: depois de `i18n.changeLanguage('en')`, o nome passa a ser "Page 2".
4. **Varredura do `perm.*` que não alcança chave aninhada ou locale nova.** Teste na Task 4: o teste lê as três locales do disco e falha se o objeto `perm` estiver vazio.
5. **RUT que deixa de quebrar mas transborda a célula sem rolagem.** Prova no navegador na Task 6: a 390 o wrapper rola e nenhuma coluna se sobrepõe.

---

### Task 1: Botão filled das quatro severidades no claro (P-74) e a régua das cinco

**Files:**
- Modify: `frontend/scripts/generate-brand-theme.mjs` (receita nova, irmã da `WARNING_CLARO`, aplicada só com `tinta`)
- Modify: `frontend/src/shared/styles/themes/lara-light-lotus.css` (regerado, nunca à mão)
- Modify: `frontend/tests/tone-ink.test.ts`
- Modify: `frontend/tests/brand-theme.test.ts` (só se uma asserção existente fixar o filled de stock)

**Interfaces:**
- Consumes: —
- Produces: `export const SEVERIDADES_CLARAS` em `generate-brand-theme.mjs`, um objeto por severidade `{ hue, fundo: { [hexStock]: hexRampa }, tintaLara: '#ffffff', tinta, anel: { [hexStock]: hexRampa } }`. Também produz os helpers de módulo `regra`, `corDe`, `fundoDe`, `anelDe` e `solido` no topo do `tone-ink.test.ts`, que a Task 2 reaproveita.

- [ ] **Step 1: Subir os helpers e escrever a régua que falha.** Em `tone-ink.test.ts`, os helpers `regra`, `corDe`, `fundoDe`, `anelDe`, `nucleo` e `solido`, hoje dentro do `describe` da P-30, sobem para o escopo de módulo sem mudar de corpo. Nasce `describe('botão filled das cinco severidades (P-74)')`:
  - `describe.each` sobre os temas (`claro`, com superfícies `#ffffff` e `--surface-ground` do `blocoClaro`; `escuro`, com `--surface-ground` e `--surface-card` da folha) × `it.each` sobre `success`, `info`, `warning`, `danger` e `help` × os estados `base` (`.p-button.p-button-<sev>,`), `hover` (`…:not(:disabled):hover,`) e `active` (`…:not(:disabled):active,`): `expect(contraste(corDe(corpo), fundoDe(corpo))).toBeGreaterThanOrEqual(4.5)`;
  - anel, nas duas regras (`.p-button.p-button-<sev>:not(:disabled):focus,` e `.p-button.p-button-<sev>:enabled:focus`): `expect(anelDe(corpo)).not.toBe('')` e, para cada superfície do tema, `contraste(solido(anel, sup), sup) >= 3`;
  - amarração no claro, para as quatro do P-74 (não para `warning`): o fundo de base, hover e active `toBe(hex(temaClaro, '--<hue>-300'|'-200'|'-100'))`; a tinta `toBe(hex(temaClaro, '--<hue>-900'))`; o `nucleo` dos dois anéis `toBe(hex(temaClaro, '--<hue>-900'))`;
  - controle negativo: `contraste('#ffffff', x) < 4.5` para `#22c55e`, `#0ea5e9`, `#ef4444` e `#a855f7` (os fundos de stock do claro).

- [ ] **Step 2: Rodar e ver falhar.** `cd frontend && pnpm vitest run tests/tone-ink.test.ts`. Esperado: FAIL no claro, em success, info, danger e help (razão e amarração). O escuro e o `warning` passam.

- [ ] **Step 3: Implementar a receita no gerador.** `SEVERIDADES_CLARAS` mapeia, por severidade, os fundos de stock da folha clara para a rampa: success `#22c55e`/`#16a34a`/`#15803d` → 300/200/100; info `#0ea5e9`/`#0284c7`/`#0369a1`; danger `#ef4444`/`#dc2626`/`#b91c1c`; help `#a855f7`/`#9333ea`/`#7e22ce`. Também mapeia `color: #ffffff` → 900 e os anéis de stock → 900: `:not(:disabled):focus` `#bbf7d0`/`#b2dff5`/`#fecaca`/`#e9d5ff`; `:enabled:focus` `#88eaac`/`#83d3f8`/`#f7a2a2`/`#d4aafb`. Confira cada hex na saída atual antes de usá-lo; o que divergir manda. Para cada bloco CSS, a função de passada (molde do `warningAmarelo`) separa a lista de seletores por vírgula:
  - todos contêm `p-button-<sev>` e nenhum contém `p-button-outlined|p-button-text|p-button-link` → aplica o mapa daquela severidade, `color:` primeiro com lookbehind, depois fundo, borda e anel numa passada só;
  - nenhum contém → devolve o bloco intacto;
  - lista mista (um seletor filled e outro outlined/text/link da mesma severidade) → `throw new Error` com o seletor.

  A passada entra em `transform`, só quando `tinta` (claro), ao lado de `warningAmarelo`. Depois, `pnpm brand-theme`.

- [ ] **Step 4: Provar o alcance do gate.** `git diff --stat src/shared/styles/themes/` mostra só `lara-light-lotus.css`. `git diff -U0 src/shared/styles/themes/lara-light-lotus.css | grep '^@@'` lista os hunks; cada linha alterada pertence a um bloco cujo seletor contém `p-button-(success|info|danger|help)` sem `outlined|text|link`. Escreva essa conferência como teste em `brand-theme.test.ts`: para todo bloco de `transform(stock('lara-light-blue'), …)` que difere do bloco equivalente sem a receita nova, o seletor passa no gate. Uma alternativa mais simples que prove o mesmo também serve.

- [ ] **Step 5: Rodar e ver passar.** `pnpm vitest run tests/tone-ink.test.ts tests/brand-theme.test.ts`. Esperado: PASS, com as razões de §4.1 da spec (danger base 5,29).

- [ ] **Step 6: Commit.** `git add frontend/scripts/generate-brand-theme.mjs frontend/src/shared/styles/themes/lara-light-lotus.css frontend/tests/tone-ink.test.ts frontend/tests/brand-theme.test.ts && git commit -m "fix(49): botao filled das severidades no claro passa AA (P-74)"`

### Task 2: Tinta `danger` do escuro (P-105)

**Files:**
- Modify: `frontend/src/shared/styles/brand-theme.css` (`--tone-danger-ink` do bloco `:root`, e o docblock que cita o degrau)
- Modify: `frontend/tests/tone-ink.test.ts` (o `it.each` do fundo de 15%)

**Interfaces:**
- Consumes: os helpers de módulo do `tone-ink.test.ts` (Task 1).
- Produces: —

- [ ] **Step 1: Tirar o filtro.** No `it.each` "passa AA sobre o fundo de 15% do `severityTone`", o filtro vira só `tom !== 'accent'`, e o docblock que cita a P-105 sai.
- [ ] **Step 2: Ver falhar.** `pnpm vitest run tests/tone-ink.test.ts`. Esperado: FAIL em `danger` escuro, 4,36 < 4,5.
- [ ] **Step 3: Trocar o degrau.** No `:root` de `brand-theme.css`, `--tone-danger-ink: var(--red-300);`. Comentário vizinho que cite `--red-400` ou um número medido com ele se atualiza com a medida nova.
- [ ] **Step 4: Ver passar.** `pnpm vitest run tests/tone-ink.test.ts`. Esperado: PASS, inclusive "tinta do botão `danger` text/outlined (UI-02)" no escuro.
- [ ] **Step 5: Commit.** `git commit -m "fix(49): tinta danger do escuro sobe para red-300 (P-105)"`

### Task 3: Paginador em es-CL (P-109)

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json`, `en.json` (bloco `common`)

**Interfaces:**
- Consumes: —
- Produces: as chaves `common.paginatorPrev`, `common.paginatorNext` e `common.paginatorPage` (com `{{page}}`).

O `pt` não basta para o número: o contexto do `pageButton` traz só `active`, não o número da página (`primereact/paginator/paginator.cjs.js:789-795`). Por isso os três controles saem do template objeto do PrimeReact, um mecanismo só. Cada renderizador devolve `cloneElement(options.element, { 'aria-label': … })`, o que preserva classe, `pt` e handler.

- [ ] **Step 1: Teste que falha.** Em `AppDataTable.test.tsx`, monte com 25 linhas, `rows={10}` e `footerCount` (o paginador só aparece com ele). Asserções em es-CL: `screen.getByRole('button', { name: 'Página anterior' })`, `getByRole('button', { name: 'Página siguiente' })`, `getByRole('button', { name: 'Página 2' })`, e `queryByRole('button', { name: /Previous Page|Next Page|^Page 2$/ })` nulo. Depois de `act(() => i18n.changeLanguage('en'))`, `getByRole('button', { name: 'Page 2' })`, voltando o idioma no `afterAll` como o arquivo já faz.
- [ ] **Step 2: Ver falhar.** `pnpm vitest run src/shared/ui/AppDataTable`. Esperado: FAIL, nome "Previous Page".
- [ ] **Step 3: Implementar.** As chaves nas três locales, logo após `tabsScrollNext`:
  - `paginatorPrev`: "Página anterior" / "Página anterior" / "Previous page";
  - `paginatorNext`: "Página siguiente" / "Próxima página" / "Next page";
  - `paginatorPage`: "Página {{page}}" / "Página {{page}}" / "Page {{page}}".

  Em `AppDataTable.tsx`, com `paginated`, o `paginatorTemplate` vira `{ layout: 'PrevPageLink PageLinks NextPageLink', PrevPageLink, PageLinks, NextPageLink }`, com os renderizadores fechando sobre `t`. O `PageLinks` usa `t('common.paginatorPage', { page: options.page + 1 })`. Sem `paginated`, continua `''`. Um comentário, no tom do `AppTabView`, explica por que o template e não o `pt`, e por que não `locale()`.
- [ ] **Step 4: Ver passar.** `pnpm vitest run src/shared/ui/AppDataTable tests/` (inclui a paridade de locales). Esperado: PASS.
- [ ] **Step 5: Commit.** `git commit -m "fix(49): paginador anuncia em es-CL (P-109)"`

### Task 4: Rótulos `perm.*` sem jargão (D-71)

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json`, `en.json` (bloco `perm`, nove chaves cada)
- Create: `frontend/tests/perm-labels.test.ts`

**Interfaces:**
- Consumes: — (roda depois da Task 3, porque as duas tocam as locales).
- Produces: —

- [ ] **Step 1: Teste que falha.** `perm-labels.test.ts` lê as três locales do disco, como o `tone-ink.test.ts` lê CSS, e para cada uma faz `expect(Object.keys(perm).length).toBeGreaterThan(30)`. Para cada `[chave, rótulo]` de `perm`, `expect(rótulo).not.toMatch(/Flujo|Fluxo|Flow|RN-\d|soft delete/)`. Um docblock cita a D-71 e o UI-04 de `audits/2026-09-04-lotus-ui-review-administracion.md`.
- [ ] **Step 2: Ver falhar.** `pnpm vitest run tests/perm-labels.test.ts`. Esperado: FAIL, 9 rótulos por locale.
- [ ] **Step 3: Reescrever as 27 strings.** Para es-CL, exatamente a tabela da §4.5 da spec. Em pt-BR e en, a mesma operação sobre o texto atual: `identity_user_delete` vira "Arquivar usuários" / "Archive users"; nos outros oito sai só a referência ("Fluxo N —", "Flow N —", "RN-02 —" e o parêntese que fica vazio), e o resto do parêntese continua. Nenhuma chave muda.
- [ ] **Step 4: Ver passar.** `pnpm vitest run tests/`. Esperado: PASS, paridade inclusa.
- [ ] **Step 5: Commit.** `git commit -m "fix(49): rotulos perm sem referencia interna (D-71)"`

### Task 5: RUT a 390 px (P-101)

**Files:**
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx:87`
- Modify: `frontend/src/features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx:80-84`
- Modify: `frontend/src/features/operation/components/Enrollment/enrollmentColumns.ts` (só se a largura não couber)
- Test: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.test.tsx` (criar ou estender o existente)

**Interfaces:**
- Consumes: `identifierClass` de `@shared/ui`.
- Produces: —

- [ ] **Step 1: Teste que falha.** Com uma linha de RUT `16.200.021-7`, a célula RUT das duas tabelas contém um `span` cuja `className` inclui `whitespace-nowrap` e `font-mono`, e o texto é o RUT inteiro. Siga o molde de render das tabelas vizinhas que já têm teste (`StudentsTable` ou o mais próximo em `Enrollment/`).
- [ ] **Step 2: Ver falhar.**
- [ ] **Step 3: Implementar.** A coluna troca `field="rut"` por `body={(r) => <span className={identifierClass}>{r.rut}</span>}`. O `field` fica se alguma ordenação ou filtro depender dele; confira no arquivo. A largura só cresce se a medição no navegador (Task 6) mostrar a coluna cortando o RUT.
- [ ] **Step 4: Ver passar.** `pnpm vitest run src/features/operation/components/Enrollment`.
- [ ] **Step 5: Commit.** `git commit -m "fix(49): RUT das matriculas nao quebra no hifen (P-101)"`

### Task 6: Cabeçalho do orçamento em 1024 (P-108) e a prova no navegador

Roda na sessão, com o stack da lane (`docker compose up -d` na raiz da worktree; front em `:5175`, backend em `:8082`), pela skill `playwright-cli` ou `lotus-ui-review`.

**Files:**
- Modify: `frontend/src/shared/ui/DetailHeader/DetailHeader.tsx` **ou** `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`, conforme a causa
- Test: `DetailHeader.test.tsx` ou `BudgetDetailPage.test.tsx`, uma asserção de classe que prenda a correção
- Create: `docs/superpowers/blocos/49-frontend-acessibilidade-e-respiro/prova.md`

**Interfaces:**
- Consumes: Tasks 1–5 já commitadas.
- Produces: `prova.md` com medidas e capturas (em `/tmp`, citadas por descrição e número, não commitadas).

- [ ] **Step 1: Reproduzir.** Detalhe de orçamento com cliente com RUT, em 1024×768: meça os retângulos do RUT e do "Agregar cotización" e registre a sobreposição.
- [ ] **Step 2: Diagnosticar.** Ache a causa pelo seletor completo do markup, sem chute. Se ela está no `DetailHeader`, a correção mora lá, e os outros consumidores (`TurmaDetailHeader`, `TurmaCreatePage`) se medem em 1024 e 390 antes e depois. Se é do orçamento, corrija lá.
- [ ] **Step 3: Teste que prende, implementar e ver passar.** Uma asserção de classe ou de estrutura que falhe sem a correção. `pnpm vitest run` do arquivo.
- [ ] **Step 4: Provar no navegador e registrar em `prova.md`:**
  - 1024×768, detalhe do orçamento: o RUT sem interseção com nenhum botão;
  - 390×844, `EnrollmentTable` e arquivados: o RUT numa linha, sem quebrar, com o wrapper rolando e sem sobreposição;
  - tema claro, diálogo de eliminar: o botão no degrau 300 com tinta 900, e o anel visível ao tabular;
  - tema escuro: `AppTag` danger com a tinta nova;
  - leitor de tela/árvore de acessibilidade do paginador: "Página anterior", "Página siguiente", "Página N".
- [ ] **Step 5: Gate completo.** `cd frontend && pnpm build && pnpm lint && pnpm test`. Esperado: tudo verde.
- [ ] **Step 6: Commit.** `git commit -m "fix(49): cabecalho do orcamento nao cobre o RUT em 1024 (P-108)"` e, separado, `docs(49): prova do bloco no navegador`.

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 3, 5 | sim | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma. A 2 vem depois da 1, porque as duas tocam `tone-ink.test.ts` e a 2 consome os helpers que a 1 sobe. A 4 vem depois da 3, porque as duas tocam as três locales. A 6 vem por último, porque consome todas.

Conferência por par do G1. A Task 1 toca `scripts/generate-brand-theme.mjs`, `themes/lara-light-lotus.css`, `tests/tone-ink.test.ts` e `tests/brand-theme.test.ts`. A 3 toca `shared/ui/AppDataTable/*` e as três locales. A 5 toca `features/operation/components/Enrollment/*`. Nenhuma interseção, e nenhuma consome o que outra do grupo produz.

## Handoff de execução

- **executor:** `claude`. A Task 1 é decisão de padrão no gerador (gate por seletor, com falha alta para lista mista) sobre o CSS que pinta todo o produto. A 6 é diagnóstico e julgamento visual no navegador. Nenhuma das duas é mecânica com caminhos fechados.
- **Sessão:** `opus`, no esforço da sessão do `/executar-bloco`.
- **Papéis (`.claude/papeis.md`):**
  - `implementador-integracao`: Tasks 1 e 3;
  - `implementador-mecanico`: Tasks 2, 4 e 5;
  - `revisor-task`: cada task;
  - `re-revisor`: rodadas de correção;
  - `corretor-tardio`: rodadas 4–5, se houver;
  - `revisor-branch`: fim da SDD.

  A Task 6 roda na sessão.
- **paths_autorizados:** não se aplica (`executor: claude`).
