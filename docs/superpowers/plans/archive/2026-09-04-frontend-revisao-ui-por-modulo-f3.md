# Revisão de UI por módulo — fatia 3 (item 16) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** passar `/cursos`, `/personas` e `/administracion` pela rubrica de revisão de UI com
relatório datado por superfície e zero achado `C` aberto; medir as duas réguas de aba que sobraram e
ligar `scrollable` só onde transbordar; fechar a `D-59` com medição; e resolver a herança da fatia 1
em uma ficha nova e um veredito escrito. Fecha o item 16.

**Architecture:** o bloco é **intercalado**: run, passe de correção, run, passe, run, passe. Cada
passe roda com o contexto daquela tela carregado, e a run seguinte já mede o wrapper corrigido — acha
coisa nova em vez de repetir a anterior. Depois das três, três tasks que não são runs: as réguas de
aba (medição + `scrollable` condicional + emenda da ficha), a `D-59` (medição cirúrgica de UM card
numa tela já revisada) e a herança da fatia 1. O gate fecha comparando contra a baseline da Task 1.

**Tech Stack:** React 19 + TS (Vite), PrimeReact via `shared/ui`, Tailwind v4, Vitest + Testing
Library, Playwright CLI (pela skill `/lotus-ui-review`), Docker Compose para a API.

## Global Constraints

- **Fence de escrita: `frontend/src/**`** e os artefatos de doc que este plano nomeia. **Zero
  `backend/`, zero `generated.ts`.** Achado cuja raiz é do servidor vira ficha, nunca código — a
  árvore é worktree e toque em backend assume main tree (P-03).
- **Lei §5.6 — features não importam PrimeReact direto** (só via `shared/ui`) **nem outra feature**.
- **Achado de wrapper corrige-se no wrapper**, nunca no call site, e **o alcance da correção é medido
  nas outras telas** — não só na que a encontrou. A ficha do item 16 mediu que 6 dos 8 achados da
  terceira passada no Dashboard moravam em `shared/ui`.
- **Quem classifica achado é `references/review-rubric.md`** da skill `/lotus-ui-review`.
  `frontend-design` é lente complementar; em conflito com uma rule de `.claude/rules/`, **a rule
  vence e o conflito é avisado ao João**.
- **Critério de destino, mecânico** (spec §6): `C` corrige aqui sempre; `B` cujo remédio mora em
  `shared/ui` corrige aqui; `B` de composição de UMA tela vira ficha `D-*`, **salvo** quando a forma
  já está provada num irmão, e aí corrige aqui.
- **Toda correção carrega teste visto reprovar ANTES.** Lei §5.8: DoD é critério de aceite provado.
- **Papel único: superadmin** (`admin@lotus.cl`, `senha123`). O redator não alcança nenhuma das três
  rotas. O estado admin-comum de `/administracion` fica declarado como não testado.
- **Quatro fichas já abertas moram nestas telas e NÃO viram achado novo:** `P-16` (aba `Alumnos`
  primeiro, `/personas`), `P-10` (coluna CLIENTE, `/personas`), `P-74` (severidade reprova AA no
  claro, qualquer tela com botão de severidade) e `P-44` (usuários de sonda na lista de
  `/administracion`). Entram no relatório como conhecidas, com o ID.
- **Esta árvore usa offset +2:** Vite em `http://localhost:5175`, API em `http://localhost:8082`.
- **Playwright CLI com chromium empacotado** (`--browser=chromium`). O canal `chrome` **não existe
  nesta máquina** — o default do CLI falha com `Chromium distribution 'chrome' is not found`. É
  limitação de ambiente, não da run; nenhuma evidência depende do canal.
- **Idioma es-CL**, a referência de rótulo do cliente chileno, trocado pelo `localStorage`
  (`lotus-lang`): o popup do menu de idioma não aparece no snapshot do CLI, porque o menu do
  PrimeReact fecha ao perder foco. É preferência de interface no perfil efêmero da sessão de
  revisão, não dado de negócio.
- **Read-only:** nenhuma mutação além do login. `git status --short` vazio antes e depois de cada
  run, mesmo branch, mesmo commit.
- **O que esta lane escreve em `docs/superpowers/**`:** ficha `D-*` na seção *Débitos técnicos* do
  `backlog.md`, a emenda da ficha do próprio item 16, os três relatórios em `audits/`, a spec e este
  plano, e o bloco dela em `lanes:` do `state.md`. **Nunca** promove, reordena ou acrescenta item na
  fila, e **nunca** toca o bloco de outra lane nem os campos singulares do topo do `state.md`.
- **Viewports:** `1440x900`, `1024x768` e `390x844` no tema **claro**, mais **uma** captura por
  superfície no tema **escuro** em `1440x900`.
- **Um commit por entrega.** Correção de achado de run = um commit, com o identificador do achado no
  assunto e a medida antes/depois no corpo.
- **Baseline medida antes de qualquer mudança** (Task 1): guarde os números; a Task 11 compara.

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `docs/superpowers/audits/2026-09-04-lotus-ui-review-cursos.md` | relatório datado da run 1 | 2, 3 |
| `docs/superpowers/audits/2026-09-04-lotus-ui-review-personas.md` | relatório datado da run 2 | 4, 5 |
| `docs/superpowers/audits/2026-09-04-lotus-ui-review-administracion.md` | relatório datado da run 3 | 6, 7 |
| `frontend/src/shared/ui/**` | correções de wrapper (achado que mora no wrapper) | 3, 5, 7 |
| `frontend/src/features/**` | correções de composição de tela | 3, 5, 7 |
| `frontend/src/features/identity/components/PeoplePage.tsx` | `scrollable` da régua, **se** transbordar | 8 |
| `frontend/src/features/identity/components/AdministracionPage.tsx` | idem | 8 |
| `frontend/src/features/commercial/components/Budget/QuotesList.tsx` | perde o `cabecalho` e a prop `onModeChange` | 9 |
| `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx` | o `ArchiveSwitch` sobe para `actions` do `AppCardHeader` | 9 |
| `docs/superpowers/backlog.md` | ficha da janela da agenda; emenda da ficha do item 16 | 8, 10 |

---

### Task 1: Stack no ar em offset +2, e a baseline medida

**Files:**
- Ler: `.env` da raiz (já existe, offset +2)
- Nenhum arquivo criado ou modificado

**Interfaces:**
- Produces: os quatro números de baseline (arquivos de teste, testes, lint, build) que a Task 11
  compara.

- [ ] **Step 1: Confirmar o offset da árvore**

```bash
grep -E 'HTTP_PORT|VITE_PORT' .env
```

Esperado, exatamente:

```
LOTUS_DEV_HTTP_PORT=8082
LOTUS_DEV_VITE_PORT=5175
```

Se divergir, PARE: as portas deste plano estão erradas e todo comando que fala com a API falha em
silêncio contra a árvore de outra lane.

- [ ] **Step 2: Subir o stack**

```bash
cd /home/jvbat/projetos/fix-frontend && docker compose up -d
```

- [ ] **Step 3: Provar que a API responde**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/up
```

Esperado: `200`. Qualquer outra coisa: PARE e conserte o stack antes de seguir — uma run contra API
morta produz relatório de tela vazia, não de defeito.

- [ ] **Step 4: Subir o Vite**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm dev
```

Deixe rodando em segundo plano. Esperado na saída: `Local: http://localhost:5175/`.

- [ ] **Step 5: Medir a baseline da suíte**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test 2>&1 | tail -5
```

Anote os dois números — `Test Files N passed` e `Tests M passed`. A `main` de `9c038cca` mede
**129 arquivos / 771 testes**; se a sua medição divergir, anote a sua, porque é contra ela que a
Task 11 compara.

- [ ] **Step 6: Medir lint e build**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm lint && pnpm build
```

Esperado: lint com **0** problemas, build verde.

- [ ] **Step 7: Confirmar a árvore limpa**

```bash
cd /home/jvbat/projetos/fix-frontend && git status --short && git rev-parse --abbrev-ref HEAD
```

Esperado: saída vazia do `status`, e `refactor/frontend-revisao-ui-f3`.

Sem commit nesta task — ela não produz arquivo.

---

### Task 2: Run 1 — Cursos

**Files:**
- Create: `docs/superpowers/audits/2026-09-04-lotus-ui-review-cursos.md`
- Evidência bruta: `.artifacts/ui-review/` (coberta pelo `.gitignore:36`)

**Interfaces:**
- Consumes: o stack no ar da Task 1.
- Produces: o `report.txt` da run 1 e o relatório datado, cuja §3 a Task 3 preenche.

- [ ] **Step 1: Confirmar stack e papel**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/up
```

Esperado: `200`. O papel é **superadmin** — `admin@lotus.cl` / `senha123`, que o `DatabaseSeeder`
cria com `syncRoles(['superadmin'])`.

- [ ] **Step 2: Rodar a skill**

```
/lotus-ui-review /cursos (papel superadmin, jornada: lista de cursos, busca, alternador Activos/Archivados, abrir um curso em modo view, fechar)
```

A skill é read-only: nenhuma mutação além do login. Ela produz `report.txt` na pasta da run.

**`/cursos` NÃO tem `ModuleTabs`** — `CatalogPage` é um `AppCard` com `CoursesTable` dentro. Não há
régua de aba a medir nesta run; a medição de régua é a Task 8, e só alcança Personas e
Administración.

- [ ] **Step 3: Amostrar o tema escuro**

Além dos três viewports no claro, tire **uma** captura em `1440x900` no tema **escuro**. É a classe
de defeito que só o tema oposto expõe (contraste), e ela não depende de largura — foi assim que o
trilho branco-sobre-branco da UI-03 de Operação apareceu.

- [ ] **Step 4: Escrever o relatório no molde vigente**

`docs/superpowers/audits/2026-09-04-lotus-ui-review-cursos.md`, três seções, como
`2026-08-25-lotus-ui-review-comercial.md`:

- **§1 — escopo e limites da run:** rotas percorridas, viewports, temas, idioma, papel, **estados
  não testados** e **falsos positivos com o motivo do descarte** (para não voltarem na passada
  seguinte);
- **§2 — `report.txt` VERBATIM**, sem edição;
- **§3 — o que foi feito com ele:** tabela achado → classe → destino, preenchida na Task 3.

Na §1, declare explicitamente: *"`/cursos` não usa `ModuleTabs`; não há régua de aba nesta
superfície"*, e a lista das fichas conhecidas que aparecem na tela (se `P-74` aparecer, cite o ID e
siga).

- [ ] **Step 5: Commit do relatório**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-09-04-lotus-ui-review-cursos.md
git commit -m "docs(audit): run de UI review em Cursos

Relatorio datado com escopo, report.txt verbatim e a triagem em
aberto. As correcoes vao na task seguinte, um commit cada.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Passe de correção — Cursos

**Files:** determinados pela triagem. O destino de cada classe é fixo (Global Constraints).

**Interfaces:**
- Consumes: o `report.txt` da Task 2.
- Produces: a §3 do relatório de Cursos preenchida, com zero `C` aberto.

- [ ] **Step 1: Triar cada achado pela rubrica**

Para cada item do `report.txt`, aplique o critério mecânico:

| Classe | Onde mora o remédio | Destino |
|---|---|---|
| `C` | qualquer lugar | corrige aqui |
| `B` | `shared/ui` | corrige aqui |
| `B` | composição de UMA tela | ficha `D-*` (Task 10 escreve) |
| `B` | composição de tela, **forma já provada num irmão** | corrige aqui |
| `A` / falso positivo | — | §1 do relatório, com o motivo; sem commit |

Achado cuja raiz é do servidor: **ficha, nunca código** — o fence proíbe `backend/`.

- [ ] **Step 2: Para cada achado a corrigir, escrever o teste que reprova**

Um teste por achado, em `frontend/src/**/*.test.tsx`, ao lado do componente. O teste afirma o
comportamento CORRIGIDO. Exemplo do molde, do achado UI-02 da fatia 2 (dropdown sem nome
acessível):

```tsx
it('o filtro expõe nome acessível', () => {
  renderWithProviders(<BudgetStatusFilter value="all" onChange={() => {}} />)
  expect(screen.getByLabelText('budget.status')).toBeInTheDocument()
})
```

- [ ] **Step 3: Rodar o teste e vê-lo reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test -- <caminho do teste>
```

Esperado: **FAIL**, com a mensagem que descreve a ausência (ex.:
`Unable to find a label with the text of: budget.status`). Teste que já passa antes da correção não
prova nada — reescreva-o.

- [ ] **Step 4: Corrigir, um commit por achado**

Se o remédio mora em `shared/ui`, corrija **no wrapper**, e meça o alcance: abra as outras telas que
usam o mesmo wrapper e registre no corpo do commit quantas mudaram junto.

```bash
cd /home/jvbat/projetos/fix-frontend
git add <arquivos do achado> <teste>
git commit -m "fix(ui): UI-NN — <o que a tela passa a fazer>

<a medida antes e depois, na tela, no viewport onde foi vista>
<se for wrapper: o alcance medido nas outras telas>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Rodar a suíte a cada correção**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test && pnpm lint
```

Esperado: verde, lint **0**. Correção de UI que quebra teste ou é regressão ou é catraca
desatualizada — decida qual **antes** de mexer no teste.

- [ ] **Step 6: Preencher a §3 do relatório e commitar**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-09-04-lotus-ui-review-cursos.md
git commit -m "docs(audit): fecha a triagem da run de Cursos

Cada achado com classe e destino; nenhum C aberto.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Run 2 — Pessoas

**Files:**
- Create: `docs/superpowers/audits/2026-09-04-lotus-ui-review-personas.md`
- Evidência bruta: `.artifacts/ui-review/` (gitignored)

**Interfaces:**
- Consumes: o wrapper já corrigido pela Task 3.
- Produces: o relatório datado da run 2 **e a medição da régua de aba de Personas**, que a Task 8
  consome.

- [ ] **Step 1: Confirmar stack**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/up
```

Esperado: `200`.

- [ ] **Step 2: Rodar a skill**

```
/lotus-ui-review /personas (papel superadmin, jornada: aba Redactores, aba Alumnos, busca em cada uma, alternador Activos/Archivados, abrir um registro em modo view, fechar)
```

`PeoplePage` monta `ModuleTabs` com duas abas — `redator.tabRedatores` e `redator.tabStudents` — e
**nenhum hook de dado na casca**: o dado desceu para `RedatoresTab`/`StudentsTab` na D-04, e o
`renderActiveOnly` do TabView faz a segunda aba só buscar quando aberta. Percorra as duas.

- [ ] **Step 3: Medir a régua de aba, nos dois viewports**

Com a página aberta, no console do browser:

```js
(() => {
  const nav = document.querySelector('.p-tabview-nav-container .p-tabview-nav')
  return [nav.scrollWidth, nav.clientWidth, nav.scrollWidth > nav.clientWidth]
})()
```

Rode em `1440x900` **e** em `390x844`. Anote os dois pares — a Task 8 decide o `scrollable` com
eles, e o número entra no relatório. Não ligue nada aqui.

- [ ] **Step 4: Amostrar o tema escuro**

Uma captura em `1440x900` no tema escuro, como na Task 2.

- [ ] **Step 5: Escrever o relatório**

`docs/superpowers/audits/2026-09-04-lotus-ui-review-personas.md`, mesmas três seções da Task 2.

Na §1, registre a medição da régua no formato `[scrollWidth, clientWidth, transborda]` nos dois
viewports, e declare as duas fichas conhecidas desta tela: **`P-16`** (o Figma põe `Alumnos` como
primeira aba, implementado mantém `Redactores` — decisão da Lotus) e **`P-10`** (coluna CLIENTE
omitida na tabela de alunos — decisão da Lotus). Nenhuma das duas vira achado.

- [ ] **Step 6: Commit do relatório**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-09-04-lotus-ui-review-personas.md
git commit -m "docs(audit): run de UI review em Pessoas

Relatorio datado com escopo, report.txt verbatim e a medicao da
regua de abas. P-16 e P-10 declaradas como conhecidas, sem virar
achado novo.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Passe de correção — Pessoas

**Files:** determinados pela triagem.

**Interfaces:**
- Consumes: o `report.txt` da Task 4.
- Produces: a §3 do relatório de Pessoas preenchida, com zero `C` aberto.

- [ ] **Step 1: Triar cada achado pela rubrica**

Mesma tabela de destino da Task 3, Step 1. Repetida aqui de propósito — as tasks podem ser lidas
fora de ordem:

| Classe | Onde mora o remédio | Destino |
|---|---|---|
| `C` | qualquer lugar | corrige aqui |
| `B` | `shared/ui` | corrige aqui |
| `B` | composição de UMA tela | ficha `D-*` (Task 10 escreve) |
| `B` | composição de tela, **forma já provada num irmão** | corrige aqui |
| `A` / falso positivo | — | §1 do relatório, com o motivo; sem commit |

- [ ] **Step 2: Para cada achado a corrigir, escrever o teste que reprova**

Um teste por achado, ao lado do componente, afirmando o comportamento corrigido.

- [ ] **Step 3: Rodar o teste e vê-lo reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test -- <caminho do teste>
```

Esperado: **FAIL**.

- [ ] **Step 4: Corrigir, um commit por achado**

```bash
cd /home/jvbat/projetos/fix-frontend
git add <arquivos do achado> <teste>
git commit -m "fix(ui): UI-NN — <o que a tela passa a fazer>

<a medida antes e depois, na tela, no viewport onde foi vista>
<se for wrapper: o alcance medido nas outras telas>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Rodar a suíte a cada correção**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test && pnpm lint
```

Esperado: verde, lint **0**.

- [ ] **Step 6: Preencher a §3 do relatório e commitar**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-09-04-lotus-ui-review-personas.md
git commit -m "docs(audit): fecha a triagem da run de Pessoas

Cada achado com classe e destino; nenhum C aberto.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Run 3 — Administración

**Files:**
- Create: `docs/superpowers/audits/2026-09-04-lotus-ui-review-administracion.md`
- Evidência bruta: `.artifacts/ui-review/` (gitignored)

**Interfaces:**
- Consumes: os wrappers já corrigidos pelas Tasks 3 e 5.
- Produces: o relatório datado da run 3 **e a medição da régua de aba de Administración**.

- [ ] **Step 1: Confirmar stack**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/up
```

Esperado: `200`.

- [ ] **Step 2: Rodar a skill**

```
/lotus-ui-review /administracion (papel superadmin, jornada: aba Usuarios, busca, alternador Activos/Archivados, abrir um usuário em modo view, aba Roles, abrir um role em modo view, fechar)
```

O papel importa aqui: a aba Roles e os dois botões de criação são gated por
`identity.access.manage`, que o `adminPermissions()` remove — **só o superadmin tem**. A run vê as
duas abas.

- [ ] **Step 3: Medir a régua de aba, nos dois viewports**

```js
(() => {
  const nav = document.querySelector('.p-tabview-nav-container .p-tabview-nav')
  return [nav.scrollWidth, nav.clientWidth, nav.scrollWidth > nav.clientWidth]
})()
```

Rode em `1440x900` **e** em `390x844`. Anote os dois pares. Não ligue nada aqui — a Task 8 decide.

- [ ] **Step 4: Amostrar o tema escuro**

Uma captura em `1440x900` no tema escuro.

- [ ] **Step 5: Escrever o relatório**

`docs/superpowers/audits/2026-09-04-lotus-ui-review-administracion.md`, mesmas três seções.

Na §1, registre **três** coisas além do padrão:

1. a medição da régua nos dois viewports, no formato `[scrollWidth, clientWidth, transborda]`;
2. o **estado admin-comum como não testado**, com o motivo escrito: cobri-lo exigiria criar um
   usuário sem `identity.access.manage`, o que é mutação e sai da janela read-only da skill; o
   superadmin é o pior caso da régua (2 abas contra 1); e o item 9 pode redesenhar a tela;
3. a ficha **`P-44`** como conhecida — onze usuários de sonda de gates antigos vivem no banco de dev
   e aparecem nesta lista. Não vira achado.

- [ ] **Step 6: Commit do relatório**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-09-04-lotus-ui-review-administracion.md
git commit -m "docs(audit): run de UI review em Administracion

Relatorio datado com escopo, report.txt verbatim e a medicao da
regua de abas. Papel superadmin; o estado admin-comum fica
declarado como nao testado, com o motivo. P-44 declarada como
conhecida.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Passe de correção — Administración

**Files:** determinados pela triagem.

**Interfaces:**
- Consumes: o `report.txt` da Task 6.
- Produces: a §3 do relatório de Administración preenchida, com zero `C` aberto.

- [ ] **Step 1: Triar cada achado pela rubrica**

Mesma tabela de destino das Tasks 3 e 5:

| Classe | Onde mora o remédio | Destino |
|---|---|---|
| `C` | qualquer lugar | corrige aqui |
| `B` | `shared/ui` | corrige aqui |
| `B` | composição de UMA tela | ficha `D-*` (Task 10 escreve) |
| `B` | composição de tela, **forma já provada num irmão** | corrige aqui |
| `A` / falso positivo | — | §1 do relatório, com o motivo; sem commit |

- [ ] **Step 2: Para cada achado a corrigir, escrever o teste que reprova**

Um teste por achado, ao lado do componente.

- [ ] **Step 3: Rodar o teste e vê-lo reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test -- <caminho do teste>
```

Esperado: **FAIL**.

- [ ] **Step 4: Corrigir, um commit por achado**

```bash
cd /home/jvbat/projetos/fix-frontend
git add <arquivos do achado> <teste>
git commit -m "fix(ui): UI-NN — <o que a tela passa a fazer>

<a medida antes e depois, na tela, no viewport onde foi vista>
<se for wrapper: o alcance medido nas outras telas>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Rodar a suíte a cada correção**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test && pnpm lint
```

Esperado: verde, lint **0**.

- [ ] **Step 6: Preencher a §3 do relatório e commitar**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/audits/2026-09-04-lotus-ui-review-administracion.md
git commit -m "docs(audit): fecha a triagem da run de Administracion

Cada achado com classe e destino; nenhum C aberto.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: As duas réguas de aba, e a emenda da ficha do item 16

**Files:**
- Modify (condicional): `frontend/src/features/identity/components/PeoplePage.tsx`
- Modify (condicional): `frontend/src/features/identity/components/AdministracionPage.tsx`
- Modify: `docs/superpowers/backlog.md` (ficha do item 16)

**Interfaces:**
- Consumes: as medições das Tasks 4 (Step 3) e 6 (Step 3).
- Produces: nada que outra task consuma.

- [ ] **Step 1: Decidir pelo número, não pela impressão**

Para cada régua, `scrollable` liga **somente** se `scrollWidth > clientWidth` em `1440x900` **ou** em
`390x844`. Se não transborda em nenhum dos dois, **não ligue** — `p-tabview-scrollable` troca a nav
por um contêiner com `overflow: hidden`, e o efeito disso em tela não medida é suposição. Foi
exatamente isso que o review da fatia 1 desfez (Q-3 de 2026-08-24).

Precedente medido, para calibrar: as réguas de Comercial e Certificados deram `[1134, 1134, false]`
em 1440x900 e `[276, 276, false]` em 390x844 — nenhuma transbordou, e nenhuma recebeu a prop.

- [ ] **Step 2: Se — e só se — alguma transbordar, escrever o teste que reprova**

```tsx
it('a régua de abas rola quando transborda', () => {
  const { container } = renderWithProviders(<PeoplePage />)
  expect(container.querySelector('.p-tabview-scrollable')).not.toBeNull()
})
```

- [ ] **Step 3: Rodar o teste e vê-lo reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test -- src/features/identity/components/PeoplePage.test.tsx
```

Esperado: **FAIL** — `expected null not to be null`.

- [ ] **Step 4: Ligar a prop na tela que transbordou**

```tsx
<ModuleTabs scrollable>
```

Em `AdministracionPage.tsx` a `ModuleTabs` já recebe `activeIndex`/`onTabChange`; acrescente
`scrollable` ao lado, sem mexer nos outros dois.

- [ ] **Step 5: Rodar o teste e vê-lo passar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test -- src/features/identity/components/PeoplePage.test.tsx
```

Esperado: **PASS**.

- [ ] **Step 6: Emendar a ficha do item 16 no `backlog.md`**

O bullet do Escopo da ficha diz que **quatro** `ModuleTabs` seguem sem medição (Comercial,
Administración, Personas, Certificados). Isso contradiz o parágrafo *Fatias fechadas* da mesma ficha,
que registra Comercial e Certificados **já medidas**. Substitua o bullet por uma emenda datada que
diga:

- Comercial e Certificados foram medidas na fatia 2 — `[1134, 1134, false]` e `[276, 276, false]` —
  e não receberam a prop;
- `/cursos` **não usa `ModuleTabs`**: `CatalogPage` é um `AppCard` com `CoursesTable`, sem régua;
- Personas e Administración foram medidas nesta fatia, com os números que as Tasks 4 e 6 anotaram, e
  a prop foi ligada em **\<nenhuma | as que transbordaram\>**.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/backlog.md frontend/src/features/identity/components/
git commit -m "fix(ui): as duas reguas de aba que faltavam sao medidas

A ficha do item 16 dizia quatro reguas sem medicao; o proprio
paragrafo das fatias fechadas registra Comercial e Certificados ja
medidas, e /cursos nao usa ModuleTabs. Restavam duas.

<os numeros medidos em Personas e Administracion, nos dois
viewports, e o que a prop scrollable recebeu ou nao>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: `D-59` — o alternador sobe para o cabeçalho do card

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx` (o `cabecalho` sai; a
  prop `onModeChange` sai)
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx:114` (o
  `AppCardHeader` ganha `actions`)
- Test: `frontend/src/features/commercial/components/Budget/QuotesList.test.tsx`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: a `D-59` fechada, que a Task 11 confere no gate.

- [ ] **Step 1: Medir a linha ANTES, nos três viewports**

Com `/comercial/presupuestos/1` aberto, no console do browser, em `1440x900`, `1024x768` e
`390x844`:

```js
(() => {
  const linha = document.querySelector('.flex.justify-end.px-4.pt-4')
  const r = linha.getBoundingClientRect()
  const f = linha.firstElementChild.getBoundingClientRect()
  return { largura: r.width, altura: r.height, filho: f.width, vazio: r.width - f.width }
})()
```

Esperado em `1440x900`, conforme a ficha: largura `1134`, altura `56`, filho `228`, vazio `~943`.
Anote os três.

- [ ] **Step 2: Escrever o teste que reprova**

O contrato novo: o alternador vive no cabeçalho do card, e a lista não desenha régua própria.

```tsx
it('a lista de cotações não desenha régua própria para o alternador', () => {
  const { container } = render(<QuotesList quotes={[COTACAO]} {...PROPS_ARQUIVADOS} />)
  expect(container.querySelector('.justify-end.px-4.pt-4')).toBeNull()
})
```

`COTACAO` e `PROPS_ARQUIVADOS` já existem no arquivo (`QuotesList.test.tsx:39` e `:52`) — reuse os
que as montagens vigentes usam. O nome `PROPS_ARQUIVADOS` engana: ele monta `mode: 'active'`, e o
comentário acima dele explica que todas as montagens do arquivo testam o modo ativo.

- [ ] **Step 3: Rodar o teste e vê-lo reprovar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test -- src/features/commercial/components/Budget/QuotesList.test.tsx
```

Esperado: **FAIL** — `expected <div class="flex justify-end px-4 pt-4"> to be null`.

- [ ] **Step 4: Tirar o `cabecalho` do `QuotesList`**

Remova a constante e os **três** sítios que a renderizam (o ramo `arquivados`, o ramo de lista vazia
e o ramo normal):

```tsx
// APAGAR:
const cabecalho = (
  <div className="flex justify-end px-4 pt-4">
    <ArchiveSwitch value={mode} onChange={onModeChange} />
  </div>
)
```

E os três `{cabecalho}`. Com isso `ArchiveSwitch` deixa de ser importado aqui, e a prop
`onModeChange` deixa de ser usada — remova-a da desestruturação e do tipo de props. **A prop `mode`
FICA:** é ela que decide qual lista o componente desenha.

O fixture `PROPS_ARQUIVADOS` do teste (`QuotesList.test.tsx:52-57`) carrega `onModeChange: () => {}`
por causa da assinatura antiga; remova essa linha do fixture no mesmo commit, senão o `tsc -b` do
`pnpm build` reprova por propriedade que o tipo já não aceita.

- [ ] **Step 5: Subir o alternador para o cabeçalho do card**

Em `BudgetDetailPage.tsx`, o `AppCardHeader` da linha 114 ganha `actions`, e o `QuotesList` perde
`onModeChange`:

```tsx
<AppCard>
  <AppCardHeader
    title={t('budget.quotes')}
    count={budget.quotes.length}
    actions={<ArchiveSwitch value={quotesArchived.mode} onChange={quotesArchived.setMode} />}
  />
  <QuotesList
    quotes={budget.quotes}
    ...
    mode={quotesArchived.mode}
    ...
  />
</AppCard>
```

Acrescente `ArchiveSwitch` ao import de `@shared/ui` deste arquivo.

- [ ] **Step 6: Rodar o teste e vê-lo passar**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test -- src/features/commercial/components/Budget/ && pnpm lint
```

Esperado: **PASS**, lint **0**. Se algum teste de `BudgetDetailPage` afirmava o alternador dentro da
lista, ele muda de sítio, não de comportamento — e essa mudança é a prova, não uma regressão.

- [ ] **Step 7: Remedir a tela DEPOIS, nos três viewports**

Reabra `/comercial/presupuestos/1` e confirme, nos três viewports: a linha
`div.flex.justify-end.px-4.pt-4` **não existe mais**, e o alternador aparece na linha do cabeçalho,
à direita de "Cotizaciones 3". Meça a altura do card do cabeçalho até a primeira cotação e compare
com o antes.

O slot `actions` do `AppCardHeader` é `flex shrink-0 items-center gap-2` dentro de um contêiner
`flex-wrap` — em `390x844` confira que o alternador desce uma linha em vez de estourar a viewport.

- [ ] **Step 8: Commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add frontend/src/features/commercial/components/Budget/
git commit -m "fix(ui): D-59 — o alternador de cotacoes sobe para o cabecalho

A regua propria do card Cotizaciones media 1134x56 para carregar um
filho de 228, com ~943px de faixa vazia entre o cabecalho e a
primeira cotacao. O alternador foi para o slot actions do
AppCardHeader, que ja existia.

<a medida dos tres viewports, antes e depois>

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: A herança da fatia 1 — uma ficha e um veredito

**Files:**
- Modify: `docs/superpowers/backlog.md` (seção *Débitos técnicos*)
- Modify: os três relatórios de `audits/` **não** entram aqui; o veredito vai no `backlog.md`

**Interfaces:**
- Consumes: as fichas `D-*` que as Tasks 3, 5 e 7 mandaram escrever.
- Produces: o `backlog.md` com toda ficha aberta pelo bloco.

- [ ] **Step 1: Reconferir as duas heranças contra o código**

A ficha do item 16 herda duas pendências que a Task 12 da fatia 1 prometeu e nunca escreveu. As duas
foram medidas em 2026-09-04; reconfirme antes de escrever:

```bash
cd /home/jvbat/projetos/fix-frontend
grep -n "concluded_locked" backend/app/Domains/Operation/Models/Turma.php
grep -n "TURMA_WINDOW_DAYS" backend/app/Domains/Dashboard/Services/DashboardWindows.php
sed -n '55,90p' backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php
```

Esperado: a recusa do `Turma.php` sai por `__('operation.turma.concluded_locked')`;
`TURMA_WINDOW_DAYS = 7`; `resumo()` conta `proximas_turmas` com `start_date->isAfter($today)` **sem
teto**, enquanto `agenda()` filtra `starting_soon` por `start_date <= turmaHorizon()`.

- [ ] **Step 2: Escrever o veredito da herança morta**

A recusa em espanhol fixo de `Turma.php:200` **já foi paga** pelo item 7
(`hardening-i18n-e-erros-api`, 2026-08-30): virou `__('operation.turma.concluded_locked')`, nos três
locales. **Nenhuma ficha nasce.** Registre uma linha na tabela de *fichas que saíram desta fila* do
`backlog.md`, no molde das que já estão lá, para ninguém reabrir na leitura seguinte.

- [ ] **Step 3: Escrever a ficha da herança viva**

Na seção *Débitos técnicos* do `backlog.md`, no molde das fichas vizinhas (diagnóstico, sítios
nomeados, quem decide, gatilho):

- **o quê:** o KPI "Próximas clases" e a agenda do dashboard do redator contam conjuntos diferentes;
- **os sítios:** `RedatorScopeQuery::resumo()` conta `proximas_turmas` com `start_date > hoje` sem
  teto; `RedatorScopeQuery::agenda()` recorta `starting_soon` por `DashboardWindows::turmaHorizon()`,
  que é `TURMA_WINDOW_DAYS = 7`;
- **o efeito medido:** turma que começa em 10 dias entra no KPI e não aparece em janela nenhuma — foi
  a turma 6 na run de 2026-08-22, e o payload confirmou `starting_soon`, `ending_soon` e
  `in_progress` vazios;
- **por que não se corrige aqui:** é backend, e o fence desta fatia proíbe `backend/` (P-03);
- **origem:** UI-04 da run `ready-redator` de 2026-08-22, classe `B`, herança que a Task 12 da fatia
  1 nunca escreveu.

- [ ] **Step 4: Escrever as fichas dos `B` de composição de tela**

Toda ficha que as Tasks 3, 5 e 7 mandaram escrever entra aqui, no mesmo molde: sítio nomeado com
arquivo e linha, medida do defeito, remédio provável, e **DoD próprio** — o que precisa ser medido
para a ficha fechar.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/fix-frontend
git add docs/superpowers/backlog.md
git commit -m "docs(backlog): a heranca da fatia 1 vira uma ficha e um veredito

A recusa em espanhol fixo de Turma.php:200 esta MORTA — o item 7 a
traduziu para operation.turma.concluded_locked nos tres locales.
Sai veredito, nao ficha.

A janela da agenda esta viva e medida: resumo() conta
proximas_turmas sem teto, agenda() recorta starting_soon em
TURMA_WINDOW_DAYS = 7. Turma que comeca em 10 dias entra no KPI e
some da agenda. E backend — vira ficha, nao codigo.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Gate completo

**Files:** nenhum modificado — a task mede.

**Interfaces:**
- Consumes: a baseline da Task 1 e tudo que as Tasks 2–10 entregaram.

- [ ] **Step 1: Suíte, lint e build**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm test 2>&1 | tail -5 && pnpm lint && pnpm build
```

Esperado: testes verdes com contagem **≥** a baseline da Task 1 (cada correção acrescentou pelo menos
um teste), lint **0**, build verde.

- [ ] **Step 2: Provar que `pint` e `typescript:transform` são N/A por escopo**

```bash
cd /home/jvbat/projetos/fix-frontend && git diff main...HEAD --stat -- backend/ frontend/src/shared/types/generated.ts
```

Esperado: **saída vazia**. Se houver qualquer linha, o fence foi quebrado — PARE e reverta antes de
seguir. N/A por escopo é medição, não alegação.

- [ ] **Step 3: Conferir o DoD item a item**

| # | DoD | Como se prova |
|---|---|---|
| 1 | três relatórios datados em `audits/` | `ls docs/superpowers/audits/2026-09-04-*` devolve três arquivos |
| 2 | zero achado `C` aberto | a §3 de cada relatório, com destino para todo `C` |
| 3 | as duas réguas com número escrito | a §1 de `personas` e de `administracion`, e a emenda da ficha do item 16 |
| 4 | `D-59` fechada com medição | o commit da Task 9, com antes e depois nos três viewports |
| 5 | herança resolvida | o commit da Task 10: uma ficha nova, um veredito escrito |
| 6 | toda correção com teste visto reprovar | cada commit de `fix(ui)` acompanhado do teste no mesmo commit |
| 7 | gate verde e fence provado | Steps 1 e 2 acima |

- [ ] **Step 4: Confirmar a árvore limpa e a branch certa**

```bash
cd /home/jvbat/projetos/fix-frontend && git status --short && git rev-parse --abbrev-ref HEAD && git log --oneline main..HEAD | wc -l
```

Esperado: `status` vazio, branch `refactor/frontend-revisao-ui-f3`, e a contagem de commits do bloco.

- [ ] **Step 5: Parar e pedir o review**

O bloco termina em `ready_for_review`. **Não faça merge, não abra PR, não feche a sprint** — isso é
`/revisar-sprint` e depois `/fechar-sprint`, e cada um é instrução própria do João.

---

## Handoff de execução

**executor: `claude`**

As sete primeiras tasks são runs de navegador com classificação por rubrica: julgamento visual,
leitura de console e rede, e decisão de classe `A`/`B`/`C` que muda o destino do achado. Não são
tasks mecânicas de path fechado com verificação executável, que é o critério para delegar ao Codex.
As Tasks 8 a 11 dependem das medições que as runs produzem e da triagem que elas decidem — separá-las
para outro executor cortaria o contexto no meio.

Nenhuma lista `paths_autorizados` acompanha este handoff, porque ela só se aplica a `executor: codex`.
