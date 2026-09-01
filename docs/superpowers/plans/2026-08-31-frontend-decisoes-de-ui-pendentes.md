# Decisões de UI pendentes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** as seis fichas de desenho travadas em decisão do João (`D-63`, `D-64`, `D-66`, `D-67`, `D-68`, `D-32`) saem com veredito escrito **e** código aplicado com prova, e a `P-67` fecha atrás de uma catraca.

**Architecture:** o bloco é frontend puro. O eixo é a `D-66`: dois tokens de raio nascem no `@theme` de `index.css`, `shared/ui` e depois `features/`+`app/` passam a consumi-los, e só então a catraca `RAIO_LITERAL` liga — verde, com sonda. A `D-68` é uma passada de FORMA nova no gerador de tema, isolada. As quatro restantes são edições pontuais de sítio, cada uma com uma medição de navegador que pode devolver a ficha ao João em vez de fechá-la.

**Tech Stack:** React 19 + TS · Tailwind v4 (`@theme`) · PrimeReact (tema gerado por `scripts/generate-brand-theme.mjs`) · ESLint flat config (`no-restricted-syntax`) · vitest (jsdom) · playwright-cli (medições).

**Spec:** `docs/superpowers/specs/2026-08-31-frontend-decisoes-de-ui-pendentes-design.md`
**Context packet:** nenhum (`Contexto: não`; as fontes são as fichas e os audits locais)

## Global Constraints

Valores medidos em 2026-08-31 nesta árvore (main tree, branch `refactor/frontend-decisoes-de-ui-pendentes`, aberta de `main@a73e83e6`). Copiados exatos; **não re-derivar**.

- **Refs:** branch `refactor/frontend-decisoes-de-ui-pendentes`, três commits à frente de `origin/main@a304f317` (`a73e83e6`, `0049c83a`, `dad689cc`). Lane `lane-a`, `state.md` em `planning`.
- **Todo comando de frontend roda de `/home/jvbat/projetos/lotus/frontend`.** O `cd` do Bash persiste entre chamadas; prefixe com `cd /home/jvbat/projetos/lotus/frontend` sempre que houver dúvida.
- **Backend não é tocado.** `docker compose` não é necessário para nenhuma task exceto a medição de navegador (Tasks 2, 5, 7, 8), que precisa da API de pé. `generated.ts` sai com **diff vazio** — se aparecer diff ali, algo saiu do escopo.
- **`git stash` é proibido** nesta máquina: a pilha é compartilhada entre árvores de trabalho. Para provar catraca, copie o arquivo para o scratchpad com `cp` e restaure com `cp` de volta.
- **Nunca `git push origin main`** — o hook `pre-push` recusa; `main` entra por `gh pr merge --merge`.
- **`--border-radius: 4px` está declarado em `:root`** nos dois temas gerados (`lara-light-lotus.css:42` e o par escuro). É o que `--radius-control` referencia.
- **`transform(css, map, tinta)`** em `scripts/generate-brand-theme.mjs` recebe o terceiro argumento **só no claro** (`gerar('lara-light-blue', LIGHT_MAP, 'lara-light-lotus', TINTA_CLARA)`). É o gancho de "só o claro".
- **Medição de `#cbd5e1` no claro gerado, feita nesta sessão:** 27 declarações. Com o regex `(?<![-\w])(border(?:-(?:top|right|bottom|left|color|block|inline)[-\w]*)?)(\s*:\s*[^;{}]*?)#cbd5e1` → **21 casam** (bordas de controle) e **6 não casam**: `--surface-300`, `--gray-300`, e quatro `background`/`background-color`. Esta é a partição exata da spec §3.2.
- **`#64748b` (slate-500) mede 4,76:1 sobre branco.** `#cbd5e1` mede 1,48:1; `#94a3b8` mede 2,36:1. O slate-500 já é degrau vivo da rampa (`NEUTROS_LIGHT`, 117× na tinta secundária) — **nenhuma cor nova entra**.
- **`esquery` 1.7.0 aceita lookbehind em seletor de atributo** — verificado nesta sessão com `esquery.parse` sobre o seletor da Task 3. Não é preciso re-verificar.
- **O regex de raio pega o que deve e passa no que deve** — verificado nesta sessão: pega `rounded`, `rounded-lg`, `rounded-md`; passa em `rounded-full`, `p-button-rounded`, `rounded-surface`, `rounded-control`.
- **`rounded` também é PROP booleana do `AppButton`** (11 sítios: `EnrollmentTable:103,111`, `ContactCard:54`, `QuoteRow:89,92`, `RedatorCard:31`, `RolesTable:56`, `RedatoresTable:115`, `SlotBody:87`, `StudentsTable:70`, `ArchiveRowActions:66,73`, `AppFileActions:49,59`, `AppDownloadButton:41`). O seletor casa `className` apenas — a prop não é alcançada. **Não mexa nelas.**
- **Comentários no frontend levam acento** (é como `eslint.config.js`, `typography.ts` e os sítios já são). Só `ci.yml` e os scripts de shell são ASCII.
- **A ordem das tasks é a D7 da spec:** `D-66` (Tasks 1–3) antes de tudo, `D-68` (Task 4) em seguida, as quatro restantes (Tasks 5–8) em qualquer ordem entre si.
- **`CATRACA_COR` (`eslint.config.js:401-405`) é a lista de isenção de `COR_HARDCODED`, e ela tem exatamente TRÊS arquivos:** `CourseStep.tsx`, `QuoteWizard.tsx`, `ManualButton.tsx` — os mesmos três da `D-69`. Isto é o que impede o lint de já estar vermelho nos cinco sítios de utility de paleta. **O item 21 não tira nenhum deles da lista:** `CourseStep.tsx` continua isento porque a linha 102 (`text-slate-500`) fica. O DoD da `D-69` é `CATRACA_COR` chegar a `[]`.
- **`--surface-hover` existe nos DOIS temas gerados** (`lara-light-lotus.css:48` = `#f6f9fc`; o par escuro = `rgba(255, 255, 255, 0.03)`) — verificado nesta sessão.
- **Nenhuma ficha sai como "decidida mas não aplicada"** (DoD §7). Se uma medição contradizer a premissa da spec, **PARE e leve ao João** — não feche por inércia.

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `frontend/src/index.css` | os dois tokens de raio no `@theme` | 1 |
| `frontend/src/shared/ui/AppCard/AppCard.tsx` | superfície do card → token; `h3` passa a consumir `cardTitleClass` | 1, 5 |
| `frontend/src/shared/ui/AppFileRow/AppFileRow.tsx` | tile de ícone → token | 1 |
| `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.tsx` | linha selecionável → token | 1 |
| `frontend/src/shared/ui/FormField/FormField.tsx` | os dois banners → `rounded-control` | 1 |
| 15 sítios de `frontend/src/features/**` e `frontend/src/app/**` | consomem os tokens; `CourseStep:93` perde a utility de paleta | 2 |
| `frontend/eslint.config.js` | catraca `RAIO_LITERAL`, nas duas camadas, `shared/ui` fora | 3 |
| `.claude/rules/frontend-estilizacao.md` | escala de raio reescrita; os dois registros tipográficos declarados | 3, 5 |
| `frontend/scripts/generate-brand-theme.mjs` | passada de FORMA `BORDA_DE_CONTROLE`, só no claro | 4 |
| `frontend/tests/brand-theme.test.ts` | asserção: 21 bordas viram slate-500; os 6 não-bordas intactos | 4 |
| `frontend/src/shared/styles/themes/lara-light-lotus.css` | regerado por `pnpm brand-theme` | 4 |
| `frontend/src/shared/ui/typography.ts` + `typography.test.ts` | `cardTitleClass` nasce | 5 |
| `frontend/src/features/certification/components/Validation/ValidationPage.tsx` | `h1` sobe; ramo `notFound` ganha eco + orientação | 5, 7 |
| `frontend/src/app/pages/Dashboard/KpiRow.tsx` | separador `·` na mesma linha | 6 |
| `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json` | a linha de orientação, nos três locales | 7 |
| `frontend/src/features/identity/components/Profile/ProfilePage.tsx` | DOM na ordem de baixo de `xl`; `order-*` só em `xl` | 8 |
| `docs/superpowers/backlog.md` | item 23 nasce; `D-65` reescrita; `D-69` aberta; `P-67` fecha | 9 |
| `docs/superpowers/audits/2026-08-31-decisoes-de-ui.md` | evidência datada das medições | 2, 5, 7, 8, 10 |

**Uma PR só.** O bloco não tem fatia externa: tudo é código e docs desta árvore. A PR de fechamento (`audits/`, `progress.md`, `state.md`) nasce no `finishing-a-development-branch`, fora deste plano.

---

### Task 1: os dois tokens de raio nascem, e `shared/ui` os consome

`shared/ui` primeiro porque é onde a grafia se define — mesmo critério pelo qual ele fica FORA da catraca da Task 3.

**Files:**
- Modify: `frontend/src/index.css` (bloco `@theme`, linhas 20–24)
- Modify: `frontend/src/shared/ui/AppCard/AppCard.tsx:90`
- Modify: `frontend/src/shared/ui/AppFileRow/AppFileRow.tsx:74`
- Modify: `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.tsx:49`
- Modify: `frontend/src/shared/ui/FormField/FormField.tsx:144,181`

**Interfaces:**
- Consumes: nada.
- Produces: as utilities `rounded-surface` (0.5rem, fixo) e `rounded-control` (`var(--border-radius)`, = 4px em tempo de execução). Tasks 2 e 3 dependem das duas existirem.

- [ ] **Step 1: Medir o ponto de partida**

```bash
cd /home/jvbat/projetos/lotus/frontend
git status --short                                  # limpo
grep -n "border-radius" src/shared/styles/themes/lara-light-lotus.css | head -2
grep -rn "rounded" src/shared --include=*.tsx --include=*.ts | grep -v "p-button-rounded" | grep -v "rounded-full"
```

Esperado: `--border-radius: 4px;` na linha 42; e exatamente seis sítios de `className` — `AppCard.tsx:90`, `AppFileRow.tsx:74`, `AppSelectableCard.tsx:49`, `FormField.tsx:144`, `FormField.tsx:181`, mais os `rounded` booleanos do `AppButton` (que **não** entram).

- [ ] **Step 2: Os dois tokens entram no `@theme`**

Em `frontend/src/index.css`, substituir o bloco `@theme` inteiro (o comentário acima dele inclusive) por:

```css
/* Papéis tipográficos da marca (spec §5): sans = corpo, display = títulos,
 * mono = dado técnico (folio, RUT, datas). Sobrescreve os tokens default do
 * Tailwind v4 — `font-mono` existente passa a render IBM Plex Mono.
 *
 * Raio por PAPEL (D-66, 2026-08-31). Dois degraus, um knob cada:
 *
 * - `--radius-surface` é fixo, porque superfície é decisão de layout: card,
 *   diálogo e bloco com padding de card não seguem o raio do controle.
 * - `--radius-control` REFERENCIA `--border-radius`, o token que o tema
 *   PrimeReact declara em `:root` (`themes/lara-light-lotus.css:42`, hoje 4px,
 *   posto ali pela D7 do item 18). Resolve em tempo de execução: mudar o raio
 *   da marca passa a ser uma linha em `scripts/generate-brand-theme.mjs`, e as
 *   duas camadas seguem juntas.
 *
 * Até 2026-08-31 a rule mandava `rounded-md` (6px) para controle enquanto o
 * tema pintava 4px — todo botão, input e tag do produto desobedecia a rule por
 * construção, e é por isso que os 10 sítios da P-67 escreveram `rounded` solto.
 * Mecanismo contra a recaída: `RAIO_LITERAL` em `frontend/eslint.config.js`. */
@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Archivo', 'Inter', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --radius-surface: 0.5rem;
  --radius-control: var(--border-radius);
}
```

- [ ] **Step 3: Provar que o Tailwind emite as duas utilities**

O `@theme` do Tailwind v4 só emite o token que alguém usa, então a prova precisa de um consumidor. Use o `AppCard`, que é o primeiro da Step 4 — faça a Step 4 e volte aqui, ou aplique só a linha do `AppCard` antes de rodar:

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm build
grep -ho "\.rounded-surface{[^}]*}\|\.rounded-control{[^}]*}" dist/assets/*.css | sort -u
```

Esperado, as duas linhas:

```
.rounded-control{border-radius:var(--radius-control)}
.rounded-surface{border-radius:var(--radius-surface)}
```

e, na declaração de tokens do mesmo bundle:

```bash
grep -ho -- "--radius-control:[^;]*;\|--radius-surface:[^;]*;" dist/assets/*.css | sort -u
```

Esperado: `--radius-control:var(--border-radius);` e `--radius-surface:.5rem;`.

**Se `--radius-control` sair resolvido para um literal em vez de `var(--border-radius)`, PARE.** A D1 inteira depende de a referência sobreviver ao build; um literal reintroduz o 4px escrito duas vezes, que é exatamente o que a spec recusou.

- [ ] **Step 4: Os seis sítios de `shared/ui` migram**

`AppCard.tsx:90` — a superfície do card:

```tsx
        'rounded-surface border overflow-hidden',
```

`AppFileRow.tsx:74` — o tile de 36px que carrega o ícone do arquivo. Não é superfície: não tem padding de card, não contém blocos, é um quadrado decorativo ao lado de um texto. Fica no degrau do controle:

```tsx
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control"
```

`AppSelectableCard.tsx:49` — `px-3 py-2` é padding de CONTROLE, e a rule é explícita que o degrau segue a escala do bloco e não o nome dele. O componente se chama "card" e mede como controle; a medição manda:

```tsx
    'flex items-center gap-2 rounded-control border px-3 py-2 transition-colors',
```

`FormField.tsx:144` e `FormField.tsx:181` — os dois banners. É a divergência que o review de 2026-08-29 (Q-5) resolveu a favor do código; ela continua resolvida a favor do código, agora com o degrau nomeado em vez de literal:

```tsx
      className="mb-4 list-inside list-disc rounded-control px-3 py-2 text-sm"
```

```tsx
      className="mb-4 rounded-control px-3 py-2 text-sm"
```

- [ ] **Step 5: Verificar que `shared/ui` não tem mais raio literal**

```bash
cd /home/jvbat/projetos/lotus/frontend
grep -rn "rounded" src/shared --include=*.tsx --include=*.ts | grep -v "p-button-rounded" | grep -v "rounded-full" | grep -v "rounded-surface" | grep -v "rounded-control" | grep -v "^\S*:[0-9]*: *rounded$"
pnpm lint
pnpm build
```

Esperado: do `grep`, só as linhas em que `rounded` é prop booleana do `AppButton` (`ArchiveRowActions:66,73`, `AppFileActions:49,59`, `AppDownloadButton:41`); `pnpm lint` sai **0**; `pnpm build` verde.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/index.css frontend/src/shared/ui/AppCard/AppCard.tsx frontend/src/shared/ui/AppFileRow/AppFileRow.tsx frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.tsx frontend/src/shared/ui/FormField/FormField.tsx
git commit -m "feat(ui): raio ganha dois tokens no @theme e shared/ui os consome

D-66: --radius-surface fixo em 0.5rem e --radius-control referenciando
--border-radius do tema PrimeReact (4px). A rule mandava rounded-md (6px)
enquanto o tema pintava 4px -- todo controle desobedecia por construcao.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: os 15 sítios de `features/` e `app/` migram para os tokens

A spec §4/D1 enumera os **10 sítios da P-67** (os `rounded` soltos). A varredura desta sessão achou **mais cinco** que já escreviam `rounded-lg`/`rounded-md` — cumpriam a rule velha, e a catraca da Task 3 os alcança do mesmo jeito. Os 15 migram juntos, senão a catraca nasce vermelha.

**Files:**
- Modify: `frontend/src/features/catalog/components/Course/ModuleCard.tsx:26`
- Modify: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx:50`
- Modify: `frontend/src/features/identity/components/Student/StudentLinkRow.tsx:14`
- Modify: `frontend/src/features/operation/components/Turma/RedatorDesignation.tsx:39,82`
- Modify: `frontend/src/features/certification/components/Emission/IssuedDialog.tsx:77`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDialog.tsx:49`
- Modify: `frontend/src/features/catalog/components/Course/ModuleFields.tsx:67`
- Modify: `frontend/src/app/layouts/AppLayout.tsx:24`
- Modify: `frontend/src/app/layouts/Sidebar/SidebarItem.tsx:30`
- Modify: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx:41,43`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDocumentSlot.tsx:21`
- Modify: `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.tsx:76`
- Modify: `frontend/src/features/commercial/components/Budget/CourseStep.tsx:93`
- Create: `docs/superpowers/audits/2026-08-31-decisoes-de-ui.md`

**Interfaces:**
- Consumes: `rounded-surface` e `rounded-control` da Task 1.
- Produces: zero raio literal em `src/features/**` e `src/app/**`. A Task 3 depende disso para a catraca nascer verde.

- [ ] **Step 1: Medir os 15 sítios**

```bash
cd /home/jvbat/projetos/lotus/frontend
grep -rnE "className=[\"'\`][^\"'\`]*(^|[^-a-zA-Z0-9])rounded(-(sm|md|lg|xl))?([^-a-zA-Z0-9]|[\"'\`])" src/features src/app --include=*.tsx --include=*.ts
```

Esperado: 15 linhas — `ModuleCard:26`, `DocumentTypeCard:50`, `StudentLinkRow:14`, `RedatorDesignation:39`, `RedatorDesignation:82`, `IssuedDialog:77`, `BudgetDialog:49`, `ModuleFields:67`, `AppLayout:24`, `SidebarItem:30`, `TurmaDocuments:41`, `TurmaDocuments:43`, `RedatorDocumentSlot:21`, `ProfileDocumentSlot:76`, `CourseStep:93`.

- [ ] **Step 2: Medir os três sítios de `p-2` no navegador (spec §6, item 3)**

Três sítios têm `p-2`, que fica entre o padding de superfície (`p-3`/`p-4`) e o de controle (`px-3 py-2`), e a spec deixou o degrau para a medição. Suba a stack e meça a 1024px:

```bash
cd /home/jvbat/projetos/lotus
docker compose up -d
cd frontend && pnpm dev &
playwright-cli open http://localhost:5173
playwright-cli resize 1024 768
```

Autentique como admin, navegue até `/perfil` (`ProfileDocumentSlot`), até o detalhe de um redator (`RedatorDocumentSlot`) e até o passo de curso do wizard de presupuesto (`CourseStep`), e capture cada bloco:

```bash
playwright-cli screenshot --filename=/tmp/p2-profile-slot.png
playwright-cli screenshot --filename=/tmp/p2-redator-slot.png
playwright-cli screenshot --filename=/tmp/p2-course-step.png
```

**O critério de decisão, escrito antes de olhar:** o bloco é superfície se CONTÉM outros blocos e empilha com irmãos do mesmo tipo; é controle se é uma LINHA acionável dentro de uma lista rolável.

Pela leitura do código, a resposta esperada é:

| Sítio | O que é | Degrau esperado |
|---|---|---|
| `RedatorDocumentSlot:21` | `<div>` com borda própria, contém cabeçalho + `SlotBody` com upload | `rounded-surface` |
| `ProfileDocumentSlot:76` | idem — é o mesmo bloco, e os dois decidem juntos | `rounded-surface` |
| `CourseStep:93` | `<label>` numa lista `max-h-80 overflow-y-auto`, contém um radio | `rounded-control` |

**A medição confirma ou derruba.** Se a tela contradisser a leitura do código, vale a tela — e registre o desvio no audit. Anote a decisão em `docs/superpowers/audits/2026-08-31-decisoes-de-ui.md` com os três PNGs citados por caminho.

- [ ] **Step 3: Os sítios de SUPERFÍCIE migram**

`ModuleCard.tsx:26` (`p-3`, bloco de módulo com borda):

```tsx
    <div className="space-y-3 rounded-surface border p-3" style={{ borderColor: 'var(--surface-border)' }}>
```

`DocumentTypeCard.tsx:50` (`p-4`):

```tsx
    <section className="rounded-surface border p-4" style={{ borderColor: 'var(--surface-border)' }}>
```

`StudentLinkRow.tsx:14` (`p-3`):

```tsx
      className="flex items-center justify-between rounded-surface border p-3 "
```

`RedatorDesignation.tsx:39` (`p-3`, já era `rounded-lg`):

```tsx
        <li key={r.id} className="flex items-center justify-between gap-4 rounded-surface border p-3" style={{ borderColor: 'var(--surface-border)' }}>
```

`RedatorDesignation.tsx:82` (`p-3`, já era `rounded-lg`):

```tsx
            className="flex items-center justify-between rounded-surface border p-3"
```

`IssuedDialog.tsx:77` (`p-6`, já era `rounded-lg` — é o contra-caso que a rule cita: aninhado num diálogo e ainda assim superfície):

```tsx
          <div className="rounded-surface border p-6" style={{ borderColor: 'var(--surface-border)' }}>
```

`RedatorDocumentSlot.tsx:21` e `ProfileDocumentSlot.tsx:76`, **se a Step 2 confirmar superfície**:

```tsx
    <div className="rounded-surface border p-2" style={{ borderColor: 'var(--surface-border)' }}>
```

- [ ] **Step 4: Os sítios de CONTROLE migram**

`BudgetDialog.tsx:49` (`px-3 py-2`):

```tsx
            className="rounded-control px-3 py-2 text-sm"
```

`ModuleFields.tsx:67` (`px-3 py-2`):

```tsx
          className="rounded-control px-3 py-2 text-sm"
```

`AppLayout.tsx:24` — o link de pular para o conteúdo, `px-3 py-2`, item de navegação:

```tsx
        className="sr-only rounded-control border px-3 py-2 text-sm font-medium no-underline focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
```

`SidebarItem.tsx:30` — item de navegação, que a tabela da rule nomeia explicitamente:

```tsx
          'flex items-center rounded-control font-medium transition-colors no-underline border-l-2',
```

- [ ] **Step 5: Os dois sítios de CÁPSULA migram**

`TurmaDocuments.tsx:41,43` é barra de progresso `h-2` — cápsula, não superfície. Cápsula não escolhe degrau: vira `rounded-full`, e sai da catraca pela porta da frente.

```tsx
          <div className="mt-2 h-2 w-64 rounded-full" style={{ background: 'var(--surface-300)' }}>
```

```tsx
              className="h-2 rounded-full transition-[width]"
```

- [ ] **Step 6: `CourseStep.tsx:93` — o raio E a utility de paleta, na mesma linha**

A linha carrega `hover:bg-slate-50 dark:hover:bg-slate-800`, que a rule proíbe: *"Cor vem de variável do tema, escrita por `style`. Utility de paleta Tailwind (`bg-slate-50`, `text-red-600`) é o defeito, nos dois temas."* Entra no escopo **só** porque o bloco já está com a mão nesta linha (spec §6.1); os outros quatro sítios do mesmo defeito viram a `D-69` na Task 9.

O hover não tem variável de tema direta para `background` de hover de linha; use a superfície de seção, que é o que o produto já usa para faixa recuada, por `style` com uma custom property e uma pseudo-classe do Tailwind sobre ela:

```tsx
            <label
              key={c.id}
              className="flex items-center gap-2 rounded-control p-2 transition-colors hover:[background:var(--surface-hover)]"
            >
```

`--surface-hover` está declarado nos dois temas — `lara-light-lotus.css:48` (`#f6f9fc`) e o par escuro (`rgba(255, 255, 255, 0.03)`), medido nesta sessão. Confirme depois da Task 4, que reescreve o claro:

```bash
cd /home/jvbat/projetos/lotus/frontend
grep -n -- "--surface-hover:" src/shared/styles/themes/lara-light-lotus.css src/shared/styles/themes/lara-dark-lotus.css
```

Esperado: uma linha em cada. É a variável certa por PAPEL — é a que o próprio tema usa para hover de linha de tabela e de item de menu, então o hover da lista de cursos passa a herdar o comportamento do produto em vez de inventar um.

**`CourseStep.tsx:102` (`text-slate-500`) NÃO é tocado** — é `D-69`. E por isso **`CourseStep.tsx` continua em `CATRACA_COR`** (`eslint.config.js:402`): tirar o arquivo da isenção agora deixaria o lint vermelho na linha 102. Não mexa naquela lista nesta task.

- [ ] **Step 7: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend
grep -rnE "className=[\"'\`][^\"'\`]*(^|[^-a-zA-Z0-9])rounded(-(sm|md|lg|xl))?([^-a-zA-Z0-9]|[\"'\`])" src/features src/app --include=*.tsx --include=*.ts
pnpm lint
pnpm build
pnpm test
```

Esperado: o `grep` sai **vazio**; `pnpm lint` **0**; `pnpm build` verde; suíte verde.

- [ ] **Step 8: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features frontend/src/app docs/superpowers/audits/2026-08-31-decisoes-de-ui.md
git commit -m "feat(ui): os 15 sitios de features e app consomem os tokens de raio

P-67 fecha os 10 sitios de rounded solto; mais 5 que ja escreviam
rounded-lg/rounded-md migram junto, senao a catraca nasceria vermelha.
Os tres blocos de p-2 tiveram o degrau medido a 1024px.

CourseStep:93 tambem perde hover:bg-slate-50 dark:hover:bg-slate-800 --
utility de paleta na MESMA linha que o token de raio reescreve. Os outros
quatro sitios do mesmo defeito viram a D-69.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: a catraca `RAIO_LITERAL` nasce verde, e a rule passa a descrever a escala

**Files:**
- Modify: `frontend/eslint.config.js` (após o bloco `MONO_LITERAL`, linhas 294–302; e as três listas de `no-restricted-syntax` das linhas 448, 461, 482)
- Modify: `.claude/rules/frontend-estilizacao.md` (seção `## Escala de raio`, linhas 76–95)

**Interfaces:**
- Consumes: as Tasks 1 e 2 completas — a catraca **não pode nascer vermelha**.
- Produces: `RAIO_LITERAL`, um array de quatro entradas no mesmo formato de `MONO_LITERAL`, espalhado pelas mesmas três camadas. Fecha a `D-66` e a `P-67`.

- [ ] **Step 1: Guardar a sonda ANTES de mexer no lint**

A prova de que a catraca reprova precisa de um sítio que a viole. Copie o arquivo para o scratchpad — **nunca `git stash`**, a pilha é compartilhada entre árvores:

```bash
mkdir -p /tmp/claude-1000/-home-jvbat-projetos-lotus/77dca3c3-0406-44b3-bc89-27c3ee4c2ec8/scratchpad
cp /home/jvbat/projetos/lotus/frontend/src/features/catalog/components/Course/ModuleCard.tsx \
   /tmp/claude-1000/-home-jvbat-projetos-lotus/77dca3c3-0406-44b3-bc89-27c3ee4c2ec8/scratchpad/ModuleCard.tsx.original
```

- [ ] **Step 2: A catraca entra em `eslint.config.js`**

Logo depois do array `MONO_LITERAL` (que termina na linha 302), acrescentar:

```js
// D-66/P-67 (2026-08-31): raio escrito literal no sítio, em vez de vir dos
// tokens `--radius-surface`/`--radius-control` do `@theme` (`src/index.css`).
//
// A rule mandava `rounded-md` (6px) para controle enquanto o tema pintava 4px
// (`generate-brand-theme.mjs`, `border-radius: 6px` → `4px`, D7 do item 18):
// todo botão, input e tag do produto desobedecia a rule POR CONSTRUÇÃO, e foi
// por isso que os 10 sítios da P-67 escreveram `rounded` solto — estavam certos
// contra o tema e errados contra a rule. A P-67 ficou aberta esperando esta
// catraca, e a catraca esperava o décimo sítio: regra ligada antes deixaria o
// lint vermelho durante duas tasks.
//
// `rounded-full` fica de FORA: cápsula não escolhe degrau — é a barra de
// progresso do `TurmaDocuments` e o pill de contagem do `AppCard`.
//
// O lookbehind e o lookahead são o que separa a UTILITY do resto: sem eles
// `p-button-rounded` (classe do PrimeReact, em `QuoteRow:102` e `SlotBody:9`)
// cairia aqui, e `rounded-surface`/`rounded-control` também. `esquery` 1.7.0
// aceita os dois — medido antes de escrever.
//
// `rounded` também é PROP booleana do `AppButton` em 15 sítios; o seletor casa
// `className` apenas, e a prop passa ao largo por construção.
//
// `shared/ui` fica fora, pelo mesmo critério do `MONO_LITERAL`: é onde a grafia
// é DEFINIDA.
const RAIO_UTILITY = '(?<![-\\w])rounded(-(sm|md|lg|xl|2xl|3xl|none))?(?![-\\w])'
const MSG_RAIO_LITERAL =
  'Raio literal no sítio: use rounded-surface (card, diálogo, bloco com padding de card) ou rounded-control (controle, item de navegação, faixa de px-3 py-2). ' +
  'rounded-full segue livre para cápsula. O degrau segue a ESCALA do bloco, não o aninhamento (.claude/rules/frontend-estilizacao.md §Escala de raio).'
const RAIO_LITERAL = [
  { selector: `JSXAttribute[name.name="className"] Literal[value=/${RAIO_UTILITY}/]`, message: MSG_RAIO_LITERAL },
  { selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=/${RAIO_UTILITY}/]`, message: MSG_RAIO_LITERAL },
  { selector: `Property[key.name="className"] Literal[value=/${RAIO_UTILITY}/]`, message: MSG_RAIO_LITERAL },
  { selector: `Property[key.name="className"] TemplateElement[value.raw=/${RAIO_UTILITY}/]`, message: MSG_RAIO_LITERAL },
]
```

**Atenção ao escape.** O seletor é uma string JS que carrega um regex; `\w` precisa chegar ao `esquery` como `\\w` dentro do literal de template. Se o `pnpm lint` da Step 4 acusar erro de parse de seletor, é aqui.

- [ ] **Step 3: A catraca entra nas três camadas**

Nas linhas 448, 461 e 482 (as três listas de `no-restricted-syntax`: `features/*/components/**`, `features/**` e `app/**`), acrescentar `...RAIO_LITERAL` no fim de cada array, depois de `...MONO_LITERAL`. Confira que são exatamente três e que **nenhuma delas é a de `shared/ui`**:

```bash
cd /home/jvbat/projetos/lotus/frontend
grep -n "MONO_LITERAL\]" eslint.config.js
```

Esperado: três linhas. Cada uma passa de `...MONO_LITERAL]` para `...MONO_LITERAL, ...RAIO_LITERAL]`.

- [ ] **Step 4: Rodar o lint — a catraca nasce VERDE**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm lint
```

Esperado: **0 problemas.** Se der vermelho, a Task 2 não terminou — não silencie a catraca, feche o sítio.

- [ ] **Step 5: Sondar — a catraca precisa ser VISTA reprovar**

```bash
cd /home/jvbat/projetos/lotus/frontend
sed -i 's/rounded-surface border p-3/rounded-lg border p-3/' src/features/catalog/components/Course/ModuleCard.tsx
pnpm lint 2>&1 | grep -A2 "ModuleCard"
```

Esperado: um `error` na linha 26 do `ModuleCard.tsx` com a `MSG_RAIO_LITERAL`.

Sonde também o falso positivo que o lookahead existe para impedir:

```bash
cd /home/jvbat/projetos/lotus/frontend
sed -i 's/rounded-lg border p-3/rounded-full border p-3/' src/features/catalog/components/Course/ModuleCard.tsx
pnpm lint 2>&1 | grep -c "ModuleCard" || true
```

Esperado: **0** — `rounded-full` passa.

- [ ] **Step 6: Restaurar do scratchpad**

```bash
cp /tmp/claude-1000/-home-jvbat-projetos-lotus/77dca3c3-0406-44b3-bc89-27c3ee4c2ec8/scratchpad/ModuleCard.tsx.original \
   /home/jvbat/projetos/lotus/frontend/src/features/catalog/components/Course/ModuleCard.tsx
cd /home/jvbat/projetos/lotus
git diff --stat frontend/src/features/catalog/components/Course/ModuleCard.tsx
```

Esperado: **vazio** — o arquivo voltou byte a byte. Aplique de novo a edição da Task 2 Step 3 (`rounded-surface`) se o `git diff` mostrar que a cópia era anterior a ela.

```bash
pnpm lint
```

Esperado: **0**.

- [ ] **Step 7: A rule passa a descrever a escala que existe**

Em `.claude/rules/frontend-estilizacao.md`, substituir a seção `## Escala de raio` inteira (da linha 76 até a linha 95, isto é, até o parágrafo que termina em "a catraca nasce depois do último sítio, não antes.") por:

```markdown
## Escala de raio

O degrau segue a ESCALA do bloco, não o aninhamento nem o nome do componente: o que tem padding de
superfície (`p-3`, `p-4`, `p-6`) é superfície mesmo dentro de um diálogo; o que tem padding de
controle (`px-3 py-2`) fica no degrau do controle, entre os quais ele pousa. O `AppSelectableCard`
se chama card e mede `px-3 py-2` — a medição manda, e ele é controle.

| Papel | Raio |
|---|---|
| Superfície — card, diálogo, bloco de destaque com padding de card | `rounded-surface` |
| Controle, item de navegação e faixa fina de aviso (`px-3 py-2`) | `rounded-control` |
| Cápsula — pill, tag, contador, barra de progresso | `rounded-full` |

Os dois primeiros são tokens do `@theme` em `frontend/src/index.css` (D-66, 2026-08-31), e não
utilities de fábrica do Tailwind. `--radius-surface` é fixo em `0.5rem`; **`--radius-control`
REFERENCIA `--border-radius`**, o token que o tema PrimeReact declara em `:root` — hoje 4px, posto
ali pela D7 do item 18. Mudar o raio da marca é uma linha em `scripts/generate-brand-theme.mjs`, e
as duas camadas seguem juntas.

Até 2026-08-31 esta tabela dizia `rounded-lg`/`rounded-md`, e o `rounded-md` (6px) contradizia o
tema (4px) em TODO controle do produto. Os 10 sítios da P-67 que escreviam `rounded` solto estavam
certos contra o tema e errados contra a rule; não havia sítio a consertar, havia régua a corrigir.
Os banners de erro do `FormField` seguem no degrau do controle — a divergência que o review de
2026-08-29 (Q-5) resolveu a favor do código continua resolvida a favor do código, agora com o
degrau nomeado. O bloco do folio no `IssuedDialog` é o contra-caso que fecha a régua: aninhado, com
`p-6`, e superfície.

`rounded` solto é raio sem degrau declarado. Mecanismo: `RAIO_LITERAL` em
`frontend/eslint.config.js`, nas três camadas de `features/` e `app/`; `shared/ui` fica de fora
porque é onde a grafia é definida. `rounded-full` fica livre: cápsula não escolhe degrau.
```

- [ ] **Step 8: Verificar que a rule não descreve estado que o código não tem**

```bash
cd /home/jvbat/projetos/lotus
grep -n "rounded-lg\|rounded-md\|P-67\|D-66" .claude/rules/frontend-estilizacao.md
```

Esperado: só as menções históricas do parágrafo novo ("Até 2026-08-31 esta tabela dizia…"), nenhuma linha prescritiva.

- [ ] **Step 9: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/eslint.config.js .claude/rules/frontend-estilizacao.md
git commit -m "feat(lint): RAIO_LITERAL nasce verde e a rule descreve a escala real

D-66 fecha e P-67 fecha atras dela. A catraca foi vista reprovar por sonda
(rounded-lg no ModuleCard) e vista passar em rounded-full, antes de valer.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `D-68` — a borda de controle do claro vai para slate-500, por regra de FORMA

**Files:**
- Modify: `frontend/scripts/generate-brand-theme.mjs` (ao lado de `CELESTE_PRIMEIRO_PLANO`, ~linha 283, e dentro de `transform`)
- Modify: `frontend/tests/brand-theme.test.ts`
- Modify (gerado): `frontend/src/shared/styles/themes/lara-light-lotus.css`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `export const CINZA_BORDA = '#64748b'` de `generate-brand-theme.mjs` — é o único símbolo novo que sai do módulo; o `RegExp` `BORDA_DE_CONTROLE` fica privado, como o `CELESTE_PRIMEIRO_PLANO` ao lado dele. O teste importa `CINZA_BORDA`.

- [ ] **Step 1: Medir o ponto de partida**

```bash
cd /home/jvbat/projetos/lotus/frontend
node -e "
import('./scripts/generate-brand-theme.mjs').then(async (m) => {
  const fs = await import('node:fs')
  const src = fs.readFileSync('node_modules/primereact/resources/themes/lara-light-blue/theme.css', 'utf8')
  const out = m.transform(src, m.LIGHT_MAP, m.TINTA_CLARA)
  console.log('cbd5e1 total:', [...out.matchAll(/#cbd5e1/gi)].length)
})
"
```

Esperado: `cbd5e1 total: 27`.

- [ ] **Step 2: Escrever a asserção que FALHA**

Em `frontend/tests/brand-theme.test.ts`, importar `CINZA_BORDA` do gerador (junto de `TINTA_CLARA`) e acrescentar, no fim do arquivo:

```ts
// ── D-68: a borda de controle do claro mede 3:1 ─────────────────────────────
// `#cbd5e1` sobre branco mede 1,48:1 e reprova a WCAG 1.4.11 (3:1 no limite do
// controle quando ele é o único indicador). O escuro tem poço de fundo e não
// depende do traço, por isso a passada é só do claro — mesma condição da tinta.
//
// A partição é a razão de a regra ser de FORMA e não troca de entrada no mapa:
// `#cbd5e1` aparece 27× no claro gerado, e só 21 são borda. As outras 6 —
// `--surface-300`, `--gray-300` e quatro `background`/`background-color`
// decorativos (hoje do datepicker, do inputswitch, do carousel e da galleria) —
// NÃO são traço de controle, e trocá-las mexeria na rampa de neutros.
const DECLARACOES_COM = (css: string, hex: string) =>
  [...css.matchAll(new RegExp(`[-\\w]*\\s*:\\s*[^;{}]*${hex}[^;{}]*`, 'gi'))].map((m) => m[0].trim())

describe('D-68 — borda de controle do tema claro', () => {
  it('as 21 bordas de controle saem em slate-500, e nenhuma sobra em slate-300', () => {
    const css = light()
    const bordas = DECLARACOES_COM(css, CINZA_BORDA).filter((d) => /^border/.test(d))
    expect(bordas.length).toBe(21)
    expect(DECLARACOES_COM(css, '#cbd5e1').filter((d) => /^border/.test(d))).toEqual([])
  })

  it('os 4 preenchimentos decorativos e as 2 declarações de rampa ficam intactos', () => {
    const sobrou = DECLARACOES_COM(light(), '#cbd5e1')
    expect(sobrou.length).toBe(6)
    expect(sobrou.filter((d) => /^--/.test(d)).sort()).toEqual(['--gray-300: #cbd5e1', '--surface-300: #cbd5e1'])
    expect(sobrou.filter((d) => /^background/.test(d)).length).toBe(4)
  })

  it('o escuro não recebe a passada — lá o traço não é o único indicador', () => {
    expect(DECLARACOES_COM(dark(), CINZA_BORDA).filter((d) => /^border/.test(d)).length).toBe(0)
  })
})
```

- [ ] **Step 3: Rodar o teste e ver falhar**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm test -- tests/brand-theme.test.ts
```

Esperado: FAIL — o import de `CINZA_BORDA` não resolve (`SyntaxError` ou `undefined`), e o primeiro caso mede 0 bordas em slate-500 e 21 sobrando em `#cbd5e1`.

- [ ] **Step 4: A passada de FORMA entra no gerador**

Em `frontend/scripts/generate-brand-theme.mjs`, logo abaixo da declaração de `CELESTE_PRIMEIRO_PLANO` (~linha 283):

```js
// ── D-68: a borda de controle do claro mede 3:1 ─────────────────────────────
// `#cbd5e1` (o slate-300 que sai do gray-300 nos neutros) sobre branco mede
// 1,48:1 — reprova a WCAG 1.4.11, que pede 3:1 no limite do controle quando ele
// é o ÚNICO indicador, e no claro é: o input não tem poço de fundo. `#64748b`
// (slate-500) mede 4,76:1 e já é degrau vivo da rampa — é o texto secundário,
// 117× no tema. Nenhuma cor nova entra (D-P3, "uma família só"). O slate-400
// (`#94a3b8`) mede 2,36:1 e também reprovaria.
//
// Regra de FORMA, pelo mesmo argumento do `CELESTE_PRIMEIRO_PLANO`: lista de
// seletores envelheceria no próximo upgrade do primereact. `#cbd5e1` aparece
// 27× no claro gerado; a forma separa as 21 que são traço de controle das 6 que
// não são — `--surface-300` e `--gray-300` (a rampa, que não se mexe) e quatro
// `background`/`background-color` decorativos. Trocar a entrada do MAPA
// alcançaria as 27; por isso a passada vem depois dele, sobre a saída.
//
// Só o claro: no escuro o controle pousa em poço de fundo e o traço não carrega
// o contraste sozinho. Mesma condição da tinta.
export const CINZA_BORDA = '#64748b'
const BORDA_DE_CONTROLE =
  /(?<![-\w])(border(?:-(?:top|right|bottom|left|color|block|inline)[-\w]*)?)(\s*:\s*[^;{}]*?)#cbd5e1/gi
```

E dentro de `transform`, no `return`, encadear a passada nova **depois** do mapa e ao lado da tinta:

```js
  // Depois do mapa, não antes: é o mapa que transforma o azul do Lara em
  // celeste, e é o celeste que esta passada procura. Só o claro recebe tinta —
  // no escuro o celeste pousa em superfície escura e mede 6,76:1. A borda de
  // controle (D-68) tem a MESMA condição e pelo mesmo motivo: é o claro que não
  // tem poço de fundo, e é lá que o traço é o único indicador.
  if (!tinta) return CABECALHO + out
  return (
    CABECALHO +
    out
      .replace(CELESTE_PRIMEIRO_PLANO, `color:$1${tinta}`)
      .replace(BORDA_DE_CONTROLE, `$1$2${CINZA_BORDA}`)
  )
```

- [ ] **Step 5: Rodar o teste e ver passar**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm test -- tests/brand-theme.test.ts
```

Esperado: PASS, os três casos.

- [ ] **Step 6: Regerar o tema e conferir o diff**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm brand-theme
cd /home/jvbat/projetos/lotus
git diff --stat frontend/src/shared/styles/themes/
git diff frontend/src/shared/styles/themes/lara-dark-lotus.css | head
git diff frontend/src/shared/styles/themes/lara-light-lotus.css | grep -c "^+.*#64748b"
```

Esperado: só `lara-light-lotus.css` muda; o diff do escuro é **vazio**; 21 linhas adicionadas com `#64748b`.

- [ ] **Step 7: Conferir em tela, nos dois temas**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm dev &
playwright-cli goto http://localhost:5173
playwright-cli resize 1440 900
```

Abra um formulário (`/perfil` → Datos personales serve), capture claro e escuro:

```bash
playwright-cli screenshot --filename=/tmp/d68-claro.png
# alternar o tema pelo toggle do header, e:
playwright-cli screenshot --filename=/tmp/d68-escuro.png
```

**O que se confere:** o input do claro tem traço legível; o escuro **não mudou**. Registre os dois PNGs em `docs/superpowers/audits/2026-08-31-decisoes-de-ui.md`.

- [ ] **Step 8: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/scripts/generate-brand-theme.mjs frontend/tests/brand-theme.test.ts frontend/src/shared/styles/themes/lara-light-lotus.css docs/superpowers/audits/2026-08-31-decisoes-de-ui.md
git commit -m "fix(tema): a borda de controle do claro vai para slate-500 (WCAG 1.4.11)

D-68. #cbd5e1 sobre branco mede 1,48:1 e o input do claro nao tem poco de
fundo -- o traco e o unico indicador. #64748b mede 4,76:1 e ja e degrau da
rampa; nenhuma cor nova entra.

Regra de FORMA, como o CELESTE_PRIMEIRO_PLANO: das 27 ocorrencias de
#cbd5e1 no claro, so as 21 que sao declaracao de border mudam. As 2 da
rampa e os 4 preenchimentos decorativos ficam, com asercao no teste.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `D-63` — `cardTitleClass` nasce, e o `h1` de `/validar` sobe

**Files:**
- Modify: `frontend/src/shared/ui/typography.ts`
- Modify: `frontend/src/shared/ui/typography.test.ts`
- Modify: `frontend/src/shared/ui/AppCard/AppCard.tsx:147`
- Modify: `frontend/src/features/certification/components/Validation/ValidationPage.tsx:15`
- Modify: `.claude/rules/frontend-estilizacao.md` (seção de tipografia)

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `export const cardTitleClass: string` em `shared/ui/typography.ts`, exportado pelo barrel via o `export * from './typography'` que já existe em `src/shared/ui/index.ts:58`.

- [ ] **Step 1: Escrever a asserção que FALHA**

Em `frontend/src/shared/ui/typography.test.ts`, acrescentar `cardTitleClass` ao import e, dentro do `describe`:

```ts
  /** Título de CARD e faixa de seção são dois REGISTROS, não dois degraus de
   * uma escala (D-63): eyebrow codifica profundidade por caixa e posição, título
   * por corpo. Monotonizar apagaria o registro eyebrow em toda tela que o usa —
   * e o `SectionLabel` acabou de ser unificado a partir de 5 grafias. A prova de
   * que são registros diferentes é esta: um tem caixa alta e o outro não. */
  it('o título de card é corpo, e não a faixa de caixa alta', () => {
    expect(cardTitleClass).toBe('text-base font-semibold')
    expect(cardTitleClass).not.toContain('uppercase')
    expect(sectionLabelClass).toContain('uppercase')
  })
```

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm test -- src/shared/ui/typography.test.ts
```

Esperado: FAIL — `cardTitleClass` não existe.

- [ ] **Step 2: A constante nasce**

Em `frontend/src/shared/ui/typography.ts`, depois de `sectionLabelClass`:

```ts
/**
 * Título de CARD. Estava literal em `AppCard.tsx`, e a `D-63` perguntou se ele
 * e a faixa de seção não seriam dois degraus da mesma escala. Não são: são dois
 * REGISTROS — a faixa codifica profundidade por CAIXA e posição (12px, caixa
 * alta, tracking aberto), o título por CORPO (16px, caixa mista). Monotonizar
 * os dois apagaria o registro eyebrow em toda tela que o usa, e reabriria a
 * grafia do `SectionLabel`, que o item 18 acabou de unificar a partir de cinco.
 *
 * A constante existe para o degrau poder mudar DEPOIS sem varrer sítios — que
 * é o que faltava quando ele morava literal num `h3`.
 */
export const cardTitleClass = 'text-base font-semibold'
```

Em `frontend/src/shared/ui/AppCard/AppCard.tsx`, importar `cardTitleClass` de `../typography` (o arquivo já importa `technicalDataClass` de lá — junte no mesmo import) e trocar a linha 147:

```tsx
        <h3
          className={cardTitleClass}
          style={{ color: 'var(--app-card-tone-text, var(--text-color))' }}
        >
```

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm test -- src/shared/ui/typography.test.ts
```

Esperado: PASS.

**Deliberadamente NÃO feito:** `text-base font-semibold` não entra no `GRAFIA_TIPOGRAFICA` do `eslint.config.js`. A assinatura de lá é escolhida para ser específica de um papel; `text-base font-semibold` é genérico e pegaria qualquer texto de corpo em negrito, transformando a catraca em ruído. A constante é o mecanismo aqui; a catraca não é.

- [ ] **Step 3: Medir o `h1` de `/validar` contra o folio**

Suba a stack, emita ou pegue um certificado válido e meça nas três viewports:

Pegue um `uuid` de certificado válido do banco de dev — a rota é pública e não precisa de sessão:

```bash
cd /home/jvbat/projetos/lotus
docker compose up -d
UUID=$(docker compose exec -T mysql mysql -uroot -proot lotus -N -e \
  "select uuid from certificados where revoked_at is null limit 1")
echo "$UUID"
```

Se vier vazio, rode o seed (`docker compose exec -T app php artisan db:seed`) ou emita um certificado pela UI antes de continuar.

```bash
pnpm dev &
playwright-cli open "http://localhost:5173/validar/$UUID"
for w in 390 1024 1440; do
  playwright-cli resize $w 900
  playwright-cli --raw eval "JSON.stringify({
    h1: getComputedStyle(document.querySelector('h1')).fontSize,
    folio: getComputedStyle(document.querySelector('[class*=tabular-nums]')).fontSize,
    quebra: document.querySelector('h1').getClientRects().length
  })"
  playwright-cli screenshot --filename=/tmp/d63-$w.png
done
```

Esperado ANTES: `h1: "18px"`, `folio: "30px"` nas três. É o defeito — numa página pública de peso legal o veredito sai um degrau abaixo do identificador.

- [ ] **Step 4: O `h1` sobe, e a medição escolhe o degrau**

**O alvo é `h1` ≥ folio, sem quebrar "Certificado válido" em 390px.** Comece por `text-2xl` (24px) — um degrau abaixo do folio ainda; se a medição da Step 3 já mostrar folga em 390px, suba para `text-3xl` (30px), que é o alvo declarado da spec (`o h1 ficar no mínimo no mesmo degrau do folio`).

Em `ValidationPage.tsx:15`:

```tsx
      <h1 className="font-display text-3xl font-semibold" style={{ color }}>{text}</h1>
```

**O `CertificateFolio` fica como está** — a run 5 já o mediu nas três viewports e o manteve.

Remeça:

```bash
for w in 390 1024 1440; do
  playwright-cli resize $w 900
  playwright-cli --raw eval "JSON.stringify({
    h1: getComputedStyle(document.querySelector('h1')).fontSize,
    quebra: document.querySelector('h1').getClientRects().length,
    overflow: document.documentElement.scrollWidth > window.innerWidth
  })"
  playwright-cli screenshot --filename=/tmp/d63-depois-$w.png
done
```

Esperado DEPOIS: `h1: "30px"` nas três, `overflow: false` nas três. **Se em 390px o `h1` quebrar de forma que empurre o folio para fora da dobra, desça para `text-2xl` e registre o desvio no audit** — o alvo é o veredito não perder do identificador, e 24px contra 30px já corrige a inversão que a ficha aponta.

Registre os seis PNGs e os números em `docs/superpowers/audits/2026-08-31-decisoes-de-ui.md`.

- [ ] **Step 5: A rule declara os dois registros**

Em `.claude/rules/frontend-estilizacao.md`, na seção de tipografia, acrescentar depois da tabela de papéis:

```markdown
**Faixa de seção e título de card são dois REGISTROS, não dois degraus de uma escala** (D-63,
2026-08-31). A faixa (`sectionLabelClass`, 12px) codifica profundidade por CAIXA e posição; o
título (`cardTitleClass`, 16px) por CORPO. Comparar os dois por tamanho e "monotonizar" apagaria o
registro eyebrow em toda tela que o usa. O próximo audit que estranhar os 12px contra os 16px lê
esta linha em vez de reabrir a ficha.
```

- [ ] **Step 6: Verificar e commitar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm lint && pnpm build && pnpm test
cd /home/jvbat/projetos/lotus
git add frontend/src/shared/ui/typography.ts frontend/src/shared/ui/typography.test.ts frontend/src/shared/ui/AppCard/AppCard.tsx frontend/src/features/certification/components/Validation/ValidationPage.tsx .claude/rules/frontend-estilizacao.md docs/superpowers/audits/2026-08-31-decisoes-de-ui.md
git commit -m "fix(ui): cardTitleClass nasce e o h1 de /validar deixa de perder do folio

D-63. Faixa de secao e titulo de card sao dois REGISTROS, nao dois degraus
-- a recomendacao da ficha se sustenta e a rule passa a declara-la.

O que nao se sustentava era o h1 de /validar: 18px ao lado de um folio de
30px. Numa pagina publica de peso legal o veredito saia um degrau abaixo do
identificador. Medido nas tres viewports.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `D-64` — separador visível entre a contagem e a grandeza

**Files:**
- Modify: `frontend/src/app/pages/Dashboard/KpiRow.tsx` (o `<p>` das linhas 102–115)

**Interfaces:**
- Consumes: nada.
- Produces: nada que outra task use.

- [ ] **Step 1: O separador entra no mesmo `<p>`**

Em `KpiRow.tsx`, dentro do `{kpi.hint && (…)}`, antes do `<span>` da grandeza:

```tsx
              {kpi.hint && (
                <>
                  {/* Separador VISÍVEL, não vão (D-64). Em es-CL o espaço é
                    * separador de milhar válido: "1250 UF" com `gap-2` lê como
                    * um número só, e aumentar o vão não resolve — vão maior
                    * continua sendo espaço em branco, que é exatamente o que
                    * pode ser lido como milhar. `aria-hidden` porque o leitor de
                    * tela já separa os dois nós; o ponto seria ruído lido.
                    *
                    * Rótulo antes do valor foi recusado: mudaria a frase em três
                    * locales e competiria com o título do card, que já diz do
                    * que se trata. */}
                  <span aria-hidden="true" style={{ color: 'var(--text-color-secondary)' }}>
                    ·
                  </span>
                  <span className={`${technicalDataClass} text-xs`} style={{ color: 'var(--text-color-secondary)' }}>
                    {t(kpi.hint.i18nKey, { value: kpi.hint.value })}
                  </span>
                </>
              )}
```

O comentário que já existe acima do `{kpi.hint && …}` ("Grandeza secundária na MESMA linha do número, nunca numa terceira…") **fica** — é a razão de a grandeza não virar linha própria, e ela continua valendo.

- [ ] **Step 2: Medir — a grandeza segue na mesma linha, e a grade não ganha altura**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm dev &
playwright-cli goto http://localhost:5173/
for w in 390 1024 1440; do
  playwright-cli resize $w 900
  playwright-cli --raw eval "JSON.stringify(
    [...document.querySelectorAll('[class*=items-baseline]')].map(p => ({
      linhas: p.getClientRects().length, altura: p.getBoundingClientRect().height
    }))
  )"
  playwright-cli screenshot --filename=/tmp/d64-$w.png
done
```

Esperado: `linhas: 1` em todo card que tem `hint`, nas três larguras; alturas iguais entre os seis cards (a grandeza **não** virou terceira linha, que é o defeito de ~95px de vazio que o comentário do arquivo registra). Se em 390px algum card quebrar em duas linhas, **PARE** — o separador não pode custar a altura que a decisão original evitou.

Registre os três PNGs no audit.

- [ ] **Step 3: Verificar e commitar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm lint && pnpm build && pnpm test
cd /home/jvbat/projetos/lotus
git add frontend/src/app/pages/Dashboard/KpiRow.tsx docs/superpowers/audits/2026-08-31-decisoes-de-ui.md
git commit -m "fix(dashboard): separador visivel entre a contagem e a grandeza do KPI

D-64. Em es-CL o espaco e separador de milhar valido -- '1250 UF' com gap-2
le como um numero so. O ponto medio, aria-hidden, na MESMA linha: como linha
propria a grandeza definia a altura da grade e os outros cinco cards
herdavam ~95px de vazio.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `D-67` — o ramo `notFound` ganha o eco do código e uma linha de orientação

**Files:**
- Modify: `frontend/src/features/certification/components/Validation/ValidationPage.tsx:114-118`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `identifierClass` e `fieldLabelClass` de `@shared/ui` (o arquivo já importa `fieldLabelClass`).
- Produces: as chaves `certificate.validation.notFoundHint` e `certificate.validation.searchedCode` nos três locales.

- [ ] **Step 1: As chaves entram nos três locales**

`es-CL.json`, em `certificate.validation`:

```json
    "searchedCode": "Código consultado",
    "notFoundHint": "Verifica el código impreso en el documento o contacta a Lotus.",
```

`pt-BR.json`:

```json
    "searchedCode": "Código consultado",
    "notFoundHint": "Verifique o código impresso no documento ou entre em contato com a Lotus.",
```

`en.json`:

```json
    "searchedCode": "Code checked",
    "notFoundHint": "Check the code printed on the document or contact Lotus.",
```

**Sem canal de contato.** "Contacta a Lotus" sem endereço nem telefone é beco sem saída, mas publicar um numa página aberta é decisão da Lotus, não do João sozinho — vira ficha nova na Task 9. Travar o bloco nisso seria trocar uma trava por outra.

- [ ] **Step 2: Rodar a paridade e ver passar**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm test -- src/shared/config/locales/
```

Esperado: PASS. O `parity.test.ts` compara ESTRUTURA — se uma das três chaves faltar, ele reprova; é a catraca que já existe para isto.

- [ ] **Step 3: O ramo `notFound` passa a mostrar o eco**

Em `ValidationPage.tsx`, trocar o import da linha 3 para incluir `identifierClass`, e substituir o bloco das linhas 114–118 por:

```tsx
        {state.kind === 'notFound' && (
          <AppCard>
            <StatusHeading icon="pi-question-circle" text={t('certificate.validation.notFound')} />
            {/* O ECO do código é o que distingue "digitei errado" de
              * "certificado não existe" — quem escaneia o QR está com o papel na
              * mão para conferir contra ele (D-67). Sem link e sem dado nenhum
              * do certificado: não há certificado.
              *
              * O valor vem de param de ROTA, isto é, entrada de fora. React o
              * renderiza como texto (não há `dangerouslySetInnerHTML` aqui),
              * então não existe vetor de injeção — mas ele leva TETO de
              * comprimento mesmo assim, para que um param longo não deforme uma
              * página pública. `break-all` porque `identifierClass` carrega
              * `whitespace-nowrap`: identificador não quebra, e um uuid de 36
              * caracteres em 390px precisa de uma porta de saída. */}
            <dl className="flex flex-col gap-0.5 px-6 pb-4">
              <dt className={fieldLabelClass} style={{ color: 'var(--text-color-secondary)' }}>
                {t('certificate.validation.searchedCode')}
              </dt>
              <dd className={`${identifierClass} text-sm break-all`} style={{ color: 'var(--text-color)' }}>
                {(uuid ?? '').slice(0, 64)}
              </dd>
            </dl>
            <p className="px-6 pb-6 text-sm" style={{ color: 'var(--text-color-secondary)' }}>
              {t('certificate.validation.notFoundHint')}
            </p>
          </AppCard>
        )}
```

- [ ] **Step 4: Medir em tela, com código inexistente e com código absurdo**

```bash
cd /home/jvbat/projetos/lotus && docker compose up -d
cd frontend && pnpm dev &
playwright-cli open "http://localhost:5173/validar/nao-existe-1234"
playwright-cli resize 390 844
playwright-cli screenshot --filename=/tmp/d67-390.png
playwright-cli resize 1440 900
playwright-cli screenshot --filename=/tmp/d67-1440.png
playwright-cli goto "http://localhost:5173/validar/$(python3 -c 'print("x"*300)')"
playwright-cli resize 390 844
playwright-cli --raw eval "JSON.stringify({ overflow: document.documentElement.scrollWidth > window.innerWidth })"
playwright-cli screenshot --filename=/tmp/d67-teto.png
```

Esperado: o card mostra veredito, eco e orientação; com o param de 300 caracteres o eco corta em 64 e `overflow: false` — a página pública não deforma. Registre os três PNGs no audit.

- [ ] **Step 5: Verificar e commitar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm lint && pnpm build && pnpm test
cd /home/jvbat/projetos/lotus
git add frontend/src/features/certification/components/Validation/ValidationPage.tsx frontend/src/shared/config/locales/ docs/superpowers/audits/2026-08-31-decisoes-de-ui.md
git commit -m "feat(validacao): o ramo notFound ecoa o codigo consultado e orienta

D-67. O eco distingue codigo digitado errado de certificado inexistente --
quem escaneia o QR esta com o papel na mao para conferir. Sem link e sem
dado nenhum do certificado.

Teto de 64 caracteres: o valor vem de param de rota. Nao ha vetor de
injecao (React renderiza como texto), mas param longo deformaria uma pagina
publica.

O canal de contato fica de fora -- publicar endereco ou telefone numa pagina
aberta e decisao da Lotus, e vira ficha nova.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `D-32` — o `order-*` muda de breakpoint

**Files:**
- Modify: `frontend/src/features/identity/components/Profile/ProfilePage.tsx:70-105` (o comentário longo e o grid)

**Interfaces:**
- Consumes: nada.
- Produces: nada que outra task use.

- [ ] **Step 1: Medir o defeito ANTES, para ter par de comparação**

O `playwright-cli` não tem laço próprio: a série sai de alternar `press Tab` e `eval`, um passo por vez, num laço de shell.

```bash
cd /home/jvbat/projetos/lotus && docker compose up -d
cd frontend && pnpm dev &
playwright-cli open http://localhost:5173/perfil    # autenticado como REDATOR — é o caso de 3,7 dobras
playwright-cli resize 390 844

for i in $(seq 1 25); do
  playwright-cli press Tab
  playwright-cli --raw eval "JSON.stringify({
    passo: $i,
    scrollTop: Math.round(document.querySelector('main').scrollTop),
    y: Math.round(document.activeElement.getBoundingClientRect().top),
    foco: document.activeElement.textContent.trim().slice(0, 40)
  })"
done | tee /tmp/d32-antes-390.json
```

Repita a 1024x768 para `/tmp/d32-antes-1024.json`. O defeito medido em 2026-08-18 é `scrollTop` `0 → 1862 → 2230 → 0` em 390px e `y` do elemento focado `1875 → 2383 → 323` em 1024px — a assinatura é o **retorno**: o foco desce a página inteira e volta ao topo no meio da varredura.

- [ ] **Step 2: O DOM passa a nascer na ordem de baixo de `xl`**

Substituir o grid das linhas 98–105 por:

```tsx
      <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 xl:order-2">
          <ProfilePersonalSection profile={profile} />
          <ProfileSecuritySection email={profile.email} />
          {profile.redator && <ProfileDocumentsSection documentos={profile.redator.documentos} />}
        </div>
        <div className="flex flex-col gap-4 xl:order-1">
          <ProfileIdentityCard profile={profile} />
          {profile.redator && <ProfileSummaryCard redator={profile.redator} />}
        </div>
      </div>
```

O DOM nasce **self-service → identidade**, que é a ordem que a D-27 pede abaixo de `xl`; o `order-*` existe **só em `xl`**, invertendo de volta para identidade à esquerda. Abaixo de `xl`, DOM e pintura passam a concordar e não há `order` nenhum a aplicar.

- [ ] **Step 3: O comentário passa a descrever o que o código faz**

Substituir o parágrafo que começa em "**O custo do `order-*` está medido e aceito (decisão do João, 2026-08-18).**" (linhas ~87–98) por:

```tsx
          **O `order-*` mudou de breakpoint em 2026-08-31 (D-32).** Até então o
          DOM nascia `identidade → self-service` e a pintura abaixo de `xl` era o
          inverso — `order` reordena a PINTURA, não a árvore de acessibilidade, e
          o Tab percorria a coluna de leitura antes da de self-service: o foco
          saltava `main.scrollTop` 0 → 1862 → 2230 → 0 em 390px, e em 1024px o
          `y` do elemento focado ia 1875 → 2383 e voltava para 323 (UI-01 do
          review de 2026-08-18, WCAG 1.3.2 e 2.4.3). Agora o DOM nasce na ordem
          de BAIXO de `xl` e o `order-*` só existe em `xl`: onde a violação foi
          medida em 3,7 dobras, DOM e pintura concordam. Em `xl` sobra uma
          divergência menor, porque as duas colunas dividem a mesma dobra.

          Isto NÃO reverte a D1 nem a D-27: a identidade segue à esquerda no
          desktop e o self-service segue vindo primeiro abaixo de `xl`. Só mudou
          qual breakpoint paga a diferença entre pintura e árvore.

          Recusadas: virar as colunas em `xl` (é a correção que existiu e que o
          João reverteu em 2026-08-18, porque tirava a identidade da esquerda no
          desktop); `tabIndex` positivo (trocaria um defeito de ordem por outro);
          e a propriedade CSS `reading-flow`, que resolveria o caso na origem mas
          só existe no Chrome — apoiar acessibilidade num recurso de um motor só
          é regressão silenciosa nos outros.
```

- [ ] **Step 4: Medir DEPOIS — abaixo de `xl` o salto some**

Repita a série de `Tab` a 390px e a 1024px. Esperado: `main.scrollTop` **monotônico** (nunca volta para um valor menor no meio da varredura) e sem salto de milhares de pixels.

- [ ] **Step 5: Medir o salto em `xl` — a premissa da spec**

A spec §6 declara que este ponto é **premissa, não fato**: a decisão foi tomada supondo que o salto em `xl` é pequeno.

```bash
playwright-cli resize 1440 900
```

Percorra a página inteira com `Tab` e registre a série de `y` do elemento focado e de `main.scrollTop`.

**Critério:** o salto em `xl` é aceitável se o foco nunca sai da dobra visível — isto é, se `main.scrollTop` não varia mais que a altura da viewport (900px) entre dois passos consecutivos, e se as duas colunas cabem numa dobra e meia.

**Se a medição mostrar salto comparável ao de 390px, PARE e leve a `D-32` ao João** — a spec é explícita: *"se a medição mostrar o contrário, a ficha volta ao João em vez de fechar por inércia."*

Registre as séries ANTES/DEPOIS e os PNGs de 390/1024/1440 no audit.

- [ ] **Step 6: Verificar e commitar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm lint && pnpm build && pnpm test
cd /home/jvbat/projetos/lotus
git add frontend/src/features/identity/components/Profile/ProfilePage.tsx docs/superpowers/audits/2026-08-31-decisoes-de-ui.md
git commit -m "fix(perfil): o order-* muda de breakpoint e o salto de foco some abaixo de xl

D-32. O DOM passa a nascer na ordem de baixo de xl (self-service primeiro) e
o order-* passa a existir so em xl. Onde a violacao foi medida em 3,7 dobras,
DOM e pintura passam a concordar; em xl sobra divergencia menor, porque as
duas colunas dividem a mesma dobra -- medido a 1440x900 antes de fechar.

Nao reverte a D1 nem a D-27: identidade segue a esquerda no desktop,
self-service segue primeiro abaixo de xl.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: as fichas saem do backlog na forma que a spec §8 e §6.1 decidiram

Estas mudanças **não** foram feitas durante o planejamento de propósito: `/planejar-bloco` proíbe remover ou promover item do backlog durante planejamento. São tasks.

**Files:**
- Modify: `docs/superpowers/backlog.md`

**Interfaces:**
- Consumes: as Tasks 1–8 concluídas — nenhuma ficha sai antes de o código existir.
- Produces: item 23 na fila; ficha `D-65` corrigida; fichas `D-69` e a do canal de contato abertas.

- [ ] **Step 1: Ler o estado atual das fichas**

```bash
cd /home/jvbat/projetos/lotus
grep -n "D-63\|D-64\|D-65\|D-66\|D-67\|D-68\|D-32\|P-67\|item 23\|D-69" docs/superpowers/backlog.md
```

- [ ] **Step 2: O item 23 nasce no fim da fila**

Acrescentar, na posição correspondente ao fim da fila (depois do último item numerado):

```markdown
### 23. `frontend-tabelas-reserva-e-rolagem` — P2 · Frontend · Contexto: não

Paga a **`D-65`**. A reserva da coluna presa é em `rem` contra `tableWidths` em %, sobre
`min-w-[48rem]`: em 1024px a coluna presa come largura que as outras colunas já reservaram, e o
efeito muda de tabela para tabela porque **a reserva não é uma constante**.

Duas direções a medir nas 12 tabelas, a 1024px: (a) sinal de rolagem no wrapper, para que a
rolagem horizontal deixe de ser descoberta por acidente; (b) `min-width` menor onde a reserva não
cabe. As duas reabrem 12 medições em navegador, e é por isso que a ficha não coube no item 21.
```

- [ ] **Step 3: A ficha `D-65` é reescrita com a medição correta**

A ficha diz `stickyActionsColumn('8rem')` **fixo** nas 12 tabelas. São **sete valores**. Substituir o corpo da `D-65` por:

```markdown
| `D-65` | Reserva da coluna presa vs. `tableWidths` | A reserva de `stickyActionsColumn` é em `rem` e as colunas são em %, sobre `min-w-[48rem]`: em 1024px a soma estoura e a coluna presa come largura alheia. **A ficha dizia `8rem` fixo nas 12 tabelas; remedido em 2026-08-31, são SETE valores**, vários condicionais ao ramo `archived` — `6rem` (`RolesTable`, `StudentsTable`, `BudgetsTable` ativo), `8rem` (`EmissionStudentsTable`, o único), `9rem` (`EnrollmentTable` + os ramos ativos de `TurmasTable`, `CoursesTable`, `UsersTable`, `ClientsTable`), `10rem` (`ArchivedEnrollmentsList` + os ramos `archived` de seis tabelas), `12rem` (`RedatoresTable` ativo), `16rem` (`HistorialTable`). Não se corrige numa constante: são 12 decisões. | **item 23** |
```

- [ ] **Step 4: A ficha `D-69` nasce, com a medição do self-review**

```markdown
| `D-69` | Utility de paleta Tailwind em 4 sítios de `features/` | A rule é explícita: *"Cor vem de variável do tema, escrita por `style`. Utility de paleta Tailwind (`bg-slate-50`, `text-red-600`) é o defeito, nos dois temas."* Medido em 2026-08-31 (self-review da spec do item 21): 5 sítios em 3 arquivos. O item 21 pagou **só** `CourseStep.tsx:93`, porque a D1 já reescrevia aquela linha. Sobram: `CourseStep.tsx:102` (`text-slate-500`), `QuoteWizard.tsx:47` (`text-slate-500`), `QuoteWizard.tsx:64` (`text-red-600`), `ManualButton.tsx:28` (`text-red-600`). **Dois são tinta de ERRO** — decidir qual variável de perigo o tema expõe é desenho, não conserto de passagem, e é o que trava a ficha. **DoD mecanizado:** `CATRACA_COR` em `frontend/eslint.config.js:401` chega a `[]` — a lista de isenção de `COR_HARDCODED` tem exatamente estes três arquivos, e zerá-la é a prova de que os quatro sítios morreram. | sem hospedeiro |
```

- [ ] **Step 5: A ficha do canal de contato da página pública nasce**

```markdown
| `D-70` | `/validar` diz "contacta a Lotus" sem canal | O item 21 (D-67) pôs a linha de orientação no ramo `notFound` dos três locales, **sem canal**: publicar endereço ou telefone numa página aberta é decisão da Lotus, não do João sozinho. Enquanto não houver canal, a orientação termina num beco. Precisa da Lotus antes de virar código. | **decisão da Lotus** |
```

- [ ] **Step 6: As seis fichas pagas e a `P-67` saem**

Remover as linhas de `D-63`, `D-64`, `D-66`, `D-67`, `D-68` e `D-32` da tabela de decisões, e a `P-67` de `docs/superpowers/pendencias/abertas.md`, movendo-a para `encerradas.md` com a evidência (Tasks 1–3, catraca `RAIO_LITERAL`).

Remover o item 21 da fila e a nota acima da tabela de "Decisões não promovíveis isoladamente" que dizia que onze fichas ganharam hospedeiro — as sete de desenho fecharam aqui; as quatro de domínio seguem no item 22.

**A `D-34` continua sem hospedeiro** e fora deste bloco — é backend e contrato, e escolher o hospedeiro dela segue sendo do João.

- [ ] **Step 7: Verificar que nada ficou descrito e não feito**

```bash
cd /home/jvbat/projetos/lotus
grep -n "D-63\|D-64\|D-66\|D-67\|D-68\|D-32\|P-67" docs/superpowers/backlog.md docs/superpowers/pendencias/abertas.md
```

Esperado: **nenhuma linha viva** — só as menções históricas na `D-65` reescrita, na `D-69` e na `D-70`.

- [ ] **Step 8: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add docs/superpowers/backlog.md docs/superpowers/pendencias/
git commit -m "docs(backlog): as seis fichas do item 21 saem, e tres nascem

Saem: D-63, D-64, D-66, D-67, D-68, D-32 e a P-67, todas com codigo aplicado.

Nascem: item 23 (frontend-tabelas-reserva-e-rolagem), hospedeiro da D-65,
que sai reescrita com os SETE valores de reserva medidos -- a ficha dizia
8rem fixo; D-69 (4 sitios de utility de paleta que o item 21 nao varreu);
D-70 (canal de contato da pagina publica, decisao da Lotus).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: DoD end-to-end

**Files:**
- Modify: `docs/superpowers/audits/2026-08-31-decisoes-de-ui.md`

**Interfaces:**
- Consumes: tudo.
- Produces: a evidência que o `/revisar-sprint` e o `/fechar-sprint` leem.

- [ ] **Step 1: A suíte inteira, o lint e o build**

```bash
cd /home/jvbat/projetos/lotus/frontend
pnpm lint && pnpm build && pnpm test
```

Esperado: lint **0**; build verde; suíte verde, incluindo `tests/brand-theme.test.ts` e `src/shared/ui/typography.test.ts`.

- [ ] **Step 2: `generated.ts` sai com diff vazio**

```bash
cd /home/jvbat/projetos/lotus
docker compose exec -T app php artisan typescript:transform
git diff --stat frontend/src/shared/types/generated.ts
```

Esperado: **vazio**. O bloco não toca contrato; qualquer diff aqui significa que algo saiu do escopo.

- [ ] **Step 3: A catraca é vista reprovar uma segunda vez, no estado final**

```bash
cd /home/jvbat/projetos/lotus/frontend
cp src/app/layouts/Sidebar/SidebarItem.tsx /tmp/claude-1000/-home-jvbat-projetos-lotus/77dca3c3-0406-44b3-bc89-27c3ee4c2ec8/scratchpad/SidebarItem.tsx.original
sed -i 's/rounded-control/rounded-md/' src/app/layouts/Sidebar/SidebarItem.tsx
pnpm lint 2>&1 | grep "SidebarItem" ; echo "---"
cp /tmp/claude-1000/-home-jvbat-projetos-lotus/77dca3c3-0406-44b3-bc89-27c3ee4c2ec8/scratchpad/SidebarItem.tsx.original src/app/layouts/Sidebar/SidebarItem.tsx
cd /home/jvbat/projetos/lotus && git diff --stat frontend/src/app/layouts/Sidebar/SidebarItem.tsx
cd frontend && pnpm lint
```

Esperado: um `error` com a `MSG_RAIO_LITERAL`; depois da restauração, `git diff --stat` **vazio** e `pnpm lint` **0**.

- [ ] **Step 4: O audit fecha com a tabela de DoD contra evidência**

Em `docs/superpowers/audits/2026-08-31-decisoes-de-ui.md`, uma tabela: cada item do §7 da spec numa linha, com o comando ou o PNG que o prova. Nenhuma linha com "verificado" sem apontar para uma medição.

Confirme item a item, contra a spec §7:

- as seis fichas com veredito escrito **e** código aplicado;
- `P-67` fechada, catraca vista reprovar por sonda **antes** de entrar (Task 3 Step 5) e de novo no estado final (Step 3 acima);
- borda de controle do claro ≥ 3:1, nos dois temas; os 4 `background` e as 2 declarações de rampa sem diff;
- `h1` de `/validar` não é mais o texto menor que o folio, nas três viewports;
- foco de `/perfil` abaixo de `xl` sem o salto de 2026-08-18;
- `pnpm lint` 0, `pnpm build` verde, suíte verde;
- `generated.ts` com diff vazio;
- a rule reflete a escala e os dois registros, e nenhuma linha dela descreve estado que o código não tem;
- a `D-69` existe no `backlog.md`.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add docs/superpowers/audits/2026-08-31-decisoes-de-ui.md
git commit -m "docs(audit): evidencia datada do item 21

Cada item do DoD contra o comando ou o PNG que o prova.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Handoff de execução

**`executor: claude`.**

O bloco é decisão de desenho aplicada a sítio, e três das seis fichas (§6 da spec) só fecham contra uma **medição de navegador cujo resultado pode devolver a ficha ao João**: o degrau do `h1` de `/validar`, o salto de foco em `xl` no `/perfil`, e o degrau dos três blocos de `p-2`. Delegar a execução separaria quem tomou a decisão de quem vê a medição contradizê-la — e a spec é explícita que, nos três casos, o certo é PARAR e levar ao João, não escolher o degrau seguinte.

O `state.md` da `lane-a` passa a `ready_for_execution` / `execute_active_plan` no mesmo commit que registra este plano.
