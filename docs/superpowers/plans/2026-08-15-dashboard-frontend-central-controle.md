# Dashboard · central de controle (B1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** substituir o placeholder de 22 linhas do Dashboard por uma central operacional read-only
com KPIs, pendências, alertas, agenda e pipeline, consumindo `GET /api/dashboard/metricas`.

**Architecture:** composição na camada `app` (`app/pages/Dashboard/`), sem `features/dashboard` —
a página lê de Commercial, Operation e Certification ao mesmo tempo, e feature não importa feature
(lei §5.6). Um hook (`useDashboard`) concentra query e política de estado; os componentes de seção
são declarativos e recebem só o dado já tipado. Nada de mutação, nada de `can()`: o payload chega
filtrado pelo backend, com seção nula onde a permissão falta.

**Tech Stack:** React 19 + TS, TanStack Query v5, PrimeReact via `@shared/ui`, Tailwind v4 (layout),
i18n em 3 locales, vitest + `@testing-library/react` (`renderHook`).

**Spec:** [`specs/2026-08-15-dashboard-frontend-central-controle-design.md`](../specs/2026-08-15-dashboard-frontend-central-controle-design.md)
**Context Packet:** [`context-packets/2026-08-15-dashboard-frontend-central-controle.md`](../context-packets/2026-08-15-dashboard-frontend-central-controle.md)

## Global Constraints

- **Baseline medido na branch em 2026-08-15:** `pnpm lint` exit 0, `pnpm build` verde,
  `pnpm test` **36 arquivos / 186 testes**. Ao fim: **38 arquivos / 204 testes**.
  A spec §6 conta **6 cenários** de teste; o vitest conta **casos**, e cada `it.each` da Task 4
  rende um caso por linha da tabela — 13 casos em `navigation.test.ts` e 5 em
  `useDashboard.test.tsx`, 186 + 18 = 204. Os dois números descrevem a mesma coisa; use o do runner
  para conferir o gate.
- **Zero backend.** `git diff main...HEAD -- backend/` e `-- frontend/src/shared/types/generated.ts`
  devem sair **vazios**. Não rodar `typescript:transform`, não editar `generated.ts` (lei §5.3).
- **Zero mutação.** Nenhum `useMutation`, nenhum `api.post/put/delete` neste bloco.
- **Cor vem do tema (ADR-16).** Tailwind é layout. Nenhuma classe de paleta
  (`text-slate-400`, `bg-blue-500`…) em arquivo novo — a partir da Task 2 isso é lint, não conselho.
- **Feature não importa feature, e `app/` não importa `features/`** neste bloco: tudo que a página
  precisa vem de `@shared/*`. É por isso que a Task 1 promove `uf.ts` antes de tudo.
- **i18n:** 3 locales (`pt-BR`, `es-CL`, `en`) com chaves **idênticas**; `es-CL` é a referência de
  rótulo. `parity.test.ts` reprova a locale que divergir.
- **Sem `globals` no vitest:** todo arquivo de teste importa `describe`/`it`/`expect` de `vitest`.
- Comandos rodam de `frontend/` (Node 22 / pnpm, nativo no WSL — **não** no container).
- Commits em português, com escopo: `refactor(shared)`, `chore(lint)`, `feat(dashboard)`.

## Estrutura de arquivos

```
frontend/src/app/pages/Dashboard/
├── DashboardPage.tsx        compõe as seções; sem query, sem derivação (Task 10)
├── useDashboard.ts          useQuery + política de estado (Task 5)
├── useDashboard.test.tsx    5 testes (Task 5)
├── navigation.ts            item → rota do módulo dono (Task 4)
├── navigation.test.ts       1 teste (Task 4)
├── KpiRow.tsx               AdminKpisData → cards; campo nulo não renderiza (Task 6)
├── DashboardItemRow.tsx     linha comum de pendência e alerta (Task 7)
├── PendingList.tsx          PendingItemData[] (Task 7)
├── AlertList.tsx            AlertData[] (Task 7)
├── AgendaPanel.tsx          AgendaData: 4 listas (Task 8)
├── PipelineFunnel.tsx       PipelineStageCountData[] → barras CSS (Task 9)
└── index.ts                 barrel: só `DashboardPage` sai (Task 10)

frontend/src/shared/lib/uf.ts          movido de features/commercial/lib/ (Task 1)
frontend/src/shared/styles/brand-theme.css   2 tokens de tinta do shell (Task 2)
frontend/eslint.config.js              catraca de cor em src/app/** (Task 2)
frontend/src/app/layouts/Sidebar/*     3 sítios de cor convertidos (Task 2)
frontend/src/shared/config/locales/*   chaves do dashboard, 3 locales (Task 3)
frontend/src/app/router/AppRouter.tsx  import da pasta nova (Task 10)
```

**Uma adição de plano à estrutura da spec §3:** `DashboardItemRow.tsx`. Medido em
`generated.ts:36-43` e `:260-268`, `AlertData` e `PendingItemData` têm a **mesma forma de linha**
(`severity`, `description`, `date`, `navigation`); `PendingItemData` só acrescenta `module`.
Escrever a mesma linha duas vezes é a duplicação que o `max-lines`/extração do projeto existe para
evitar. A linha é um componente; as duas listas o compõem.

---

### Task 1: `formatUf` sobe para `shared/lib` (D13)

**Files:**
- Move: `frontend/src/features/commercial/lib/uf.ts` → `frontend/src/shared/lib/uf.ts`
- Modify: `frontend/src/shared/lib/index.ts`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetStatCard.tsx:3`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx:11`
- Modify: `frontend/src/features/commercial/components/Budget/QuoteRow.tsx:5`
- Modify: `frontend/src/features/commercial/components/Budget/DataStep.tsx:4`
- Modify: `frontend/src/features/commercial/hooks/useQuoteForm.ts:5`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: `formatUf(value: string): string` e `parseUfInput(raw: string): string`, exportados por
  `@shared/lib`. A Task 6 (`KpiRow`) importa `formatUf` daqui — é o que permite ao `app/` formatar
  UF sem importar de uma feature.

> **Por que primeiro:** a Task 6 precisa de `formatUf` e `app/pages/Dashboard/` não pode importar
> de `features/commercial/`. Mover depois faria a Task 6 nascer com um import que ela teria de
> desfazer.

- [ ] **Step 1: Medir os sítios de import antes de mexer**

```bash
cd frontend && grep -rn "lib/uf'" src/
```

Esperado: exatamente 5 linhas (`BudgetStatCard.tsx:3`, `DataStep.tsx:4`, `QuoteRow.tsx:5`,
`BudgetsTable.tsx:11`, `useQuoteForm.ts:5`). **Se o número não for 5, pare e reconte** — a spec já
errou essa contagem uma vez (dizia 4, `DataStep.tsx` estava fora).

- [ ] **Step 2: Mover o arquivo preservando histórico**

```bash
cd frontend && git mv src/features/commercial/lib/uf.ts src/shared/lib/uf.ts
```

`git mv`, não `cp` + `rm`: o arquivo tem comentário longo explicando por que `parseUfInput` nunca
passa por `Number()` (dinheiro com peso legal), e o `git log --follow` desse raciocínio é o que
sobrevive à próxima pessoa que o achar "verboso demais".

- [ ] **Step 3: Exportar pelo barrel de `shared/lib`**

Em `frontend/src/shared/lib/index.ts`, acrescentar a linha na lista de `export *`:

```ts
export * from './datetime'
export * from './enrollmentStatus'
export * from './redatorStatus'
export * from './roles'
export * from './name'
export * from './uf'
export * from './upload'
export { CHILE_REGIONS } from './chileRegions'
export type { DialogMode } from './dialogMode'
```

- [ ] **Step 4: Reapontar os 5 imports**

`BudgetStatCard.tsx:3`, `BudgetsTable.tsx:11`, `QuoteRow.tsx:5` — trocar

```ts
import { formatUf } from '../../lib/uf'
```

por

```ts
import { formatUf } from '@shared/lib'
```

`DataStep.tsx:4` — trocar

```ts
import { parseUfInput } from '../../lib/uf'
```

por

```ts
import { parseUfInput } from '@shared/lib'
```

`useQuoteForm.ts:5` — trocar

```ts
import { formatUf, parseUfInput } from '../lib/uf'
```

por

```ts
import { formatUf, parseUfInput } from '@shared/lib'
```

- [ ] **Step 5: Provar que não sobrou referência ao caminho antigo**

```bash
cd frontend && grep -rn "lib/uf'" src/ ; echo "exit=$?"
```

Esperado: nenhuma saída, `exit=1` (grep sem match). `src/features/commercial/lib/` continua
existindo com `quoteStatus.ts` — a pasta não fica órfã.

- [ ] **Step 6: Rodar o gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: `tsc -b` sem erro, eslint exit 0, **36 arquivos / 186 testes** (a task não acrescenta
teste; ela move função pura e o `tsc` é quem prova que os 5 consumidores continuam ligados).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/lib/uf.ts frontend/src/shared/lib/index.ts \
        frontend/src/features/commercial/components/Budget/BudgetStatCard.tsx \
        frontend/src/features/commercial/components/Budget/BudgetsTable.tsx \
        frontend/src/features/commercial/components/Budget/QuoteRow.tsx \
        frontend/src/features/commercial/components/Budget/DataStep.tsx \
        frontend/src/features/commercial/hooks/useQuoteForm.ts
git commit -m "refactor(shared): promove uf.ts de commercial para shared/lib"
```

---

### Task 2: catraca de cor em `src/app/**` (D11, fecha a P-34)

**Files:**
- Modify: `frontend/src/shared/styles/brand-theme.css:11` (dois tokens novos)
- Modify: `frontend/src/app/layouts/Sidebar/Sidebar.tsx:60,71`
- Modify: `frontend/src/app/layouts/Sidebar/SidebarItem.tsx:24`
- Modify: `frontend/eslint.config.js:339-349` (comentário obsoleto + bloco novo)

**Interfaces:**
- Consumes: nada.
- Produces: as variáveis CSS `--shell-ink` e `--shell-ink-muted`, e a regra `COR_HARDCODED` valendo
  em `src/app/**/*.tsx`. Tasks 6–10 escrevem 8 arquivos sob essa regra — é ela que impede a página
  nova de nascer com cor hardcoded.

> **Por que agora, e não no fim:** a regra tem de existir **antes** dos arquivos que ela guarda.
> Ligada depois, ela vira uma rodada de conserto em vez de um guardrail.

- [ ] **Step 1: Medir a população com o SELETOR, não com grep**

```bash
cd frontend && npx eslint 'src/app/**/*.tsx' --rule '{"no-restricted-syntax":["error",{"selector":"JSXAttribute[name.name=\"className\"] Literal[value=/\\b(text|bg|border|ring|divide)-(slate|gray|zinc|neutral|stone|red|green|blue|amber|yellow|emerald|sky|indigo|violet|rose|orange|teal|cyan|lime|fuchsia|purple|pink)-[0-9]{2,3}\\b/]","message":"COR_HARDCODED"}]}'
```

Esperado (medido em 2026-08-15 no planejamento):

```
src/app/layouts/Sidebar/Sidebar.tsx
  60:22  error  COR_HARDCODED  no-restricted-syntax
  71:37  error  COR_HARDCODED  no-restricted-syntax

src/app/layouts/Sidebar/SidebarItem.tsx
  24:15  error  COR_HARDCODED  no-restricted-syntax

✖ 3 problems (3 errors, 0 warnings)
```

**Se o número não for 3, pare.** A regra do projeto é explícita: catraca nova mede a própria
população com o seletor dela — grep acha a grafia, o seletor acha o defeito.

- [ ] **Step 2: Criar os dois tokens de tinta do shell**

Em `frontend/src/shared/styles/brand-theme.css`, logo após a linha `--brand-navy`:

```css
  --brand-navy: #0f2b3d; /* azul-poste — sidebar, texto do botão primário (D6) */

  /* Tinta sobre as superfícies navy FIXAS do shell (sidebar, header). NÃO pode
   * sair de `--text-color`: essas superfícies não acompanham o swap de tema
   * (spec §6/UI-04), e a tinta do tema claro seria texto escuro sobre navy —
   * o mesmo raciocínio que já obriga o `--focus-stroke` a ser redeclarado ali.
   *
   * Os dois valores são exatamente os que `text-slate-300` e `text-slate-400`
   * rendiam (`node_modules/tailwindcss/theme.css:217-218`), copiados literais em
   * vez de referenciados: assim a entrada da catraca de cor (D11 de
   * `dashboard-frontend-central-controle`) não mexe um pixel, e o contraste
   * medido do shell não depende de o Tailwind continuar emitindo
   * `--color-slate-*` no `:root` depois do `optimize`. */
  --shell-ink: oklch(86.9% 0.022 252.894);
  --shell-ink-muted: oklch(70.4% 0.04 256.788);
```

- [ ] **Step 3: Converter os 3 sítios**

`Sidebar.tsx:60` — trocar `text-slate-400` por `text-(--shell-ink-muted)`:

```tsx
        <p className="px-4 pb-2 text-xs font-semibold tracking-wider text-(--shell-ink-muted)">
```

`Sidebar.tsx:71` — mesma troca:

```tsx
      {!collapsed && <div className="px-4 py-3 text-sm text-(--shell-ink-muted) text-center">{APP_VERSION}</div>}
```

`SidebarItem.tsx:24` — trocar `text-slate-300` por `text-(--shell-ink)`:

```tsx
            : 'border-transparent text-(--shell-ink) hover:bg-white/10',
```

A sintaxe `text-(--var)` é a do Tailwind v4 e já é o idioma dos dois arquivos
(`bg-(--brand-navy)`, `text-(--brand)`, `border-(--brand)`). `bg-white/10` e `border-transparent`
ficam como estão: o seletor exige `-<paleta>-<número>` e `white`/`transparent` não são paleta.

- [ ] **Step 4: Ligar a regra e corrigir o comentário que ela torna falso**

Em `frontend/eslint.config.js`, o comentário do bloco de `src/shared/**/*.tsx` (linhas 339-343) diz
hoje que `src/app/**` fica de fora **de propósito**. Isso deixa de ser verdade nesta task —
substituir esse parágrafo por:

```js
// `src/app/**` ficou fora desta regra até 2026-08-15 por exceção aprovada pelo
// João em 2026-07-26 ("Fora: o shell", backlog.md): o shell tinha 3 classes de
// paleta vivas e pôr a regra sem convertê-las só produziria um `ignores` do
// tamanho da pasta. A exceção acabou — o bloco logo abaixo liga a regra lá, e
// os 3 sítios foram convertidos para `--shell-ink`/`--shell-ink-muted`.
```

E acrescentar, **depois** do bloco `files: ['src/shared/**/*.tsx']` (que hoje fecha o arquivo, na
linha 349), um bloco novo:

```js
  // A catraca de cor entra em `src/app/**` (D11 de
  // `dashboard-frontend-central-controle`). Era a P-34: a regra já rodava em
  // `src/features/*/components/**`, `src/features/**` e `src/shared/**`, e o
  // shell era a ÚNICA camada sem ela. O que mudou é que o Dashboard escreve 8
  // arquivos novos em `src/app/pages/Dashboard/`, que nasceriam sem guarda de
  // cor numa camada inteira sem guarda nenhuma.
  //
  // Nasce SEM `ignores`: os 3 sítios do shell (Sidebar.tsx:60/71,
  // SidebarItem.tsx:24) foram convertidos na mesma task. A população foi medida
  // com o PRÓPRIO seletor — `npx eslint 'src/app/**/*.tsx' --rule '{...}'`
  // acusava exatamente 3 e passa a acusar 0 —, não com o grep que originou o
  // débito (frontend-fsliced.md: grep acha a grafia, o seletor acha o defeito).
  //
  // Só `COR_HARDCODED`, e não o array inteiro: `DISABLED_READONLY` é sobre campo
  // de formulário e o shell não tem nenhum — regra que nasce sem população não
  // guarda nada. Os 3 bans de query também não entram: `app/` é justamente onde
  // a composição cruzada é legítima (o AppRouter importa 5 features).
  //
  // Bloco próprio, sem risco do merge raso (Q-2, 2026-08-04): nenhum outro bloco
  // deste arquivo casa `no-restricted-syntax` em `src/app/**`.
  {
    files: ['src/app/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', COR_HARDCODED],
    },
  },
```

- [ ] **Step 5: Provar a catraca no sentido "passa"**

```bash
cd frontend && pnpm lint
```

Esperado: exit 0, sem saída.

- [ ] **Step 6: Provar a catraca no sentido "reprova" (sonda)**

Reintroduzir a cor num arquivo do shell, temporariamente — em `Sidebar.tsx:71`, trocar
`text-(--shell-ink-muted)` por `text-slate-400` — e rodar:

```bash
cd frontend && pnpm lint
```

Esperado: reprova nomeando arquivo e linha, com a mensagem do `COR_HARDCODED`
(`Cor Tailwind hardcoded: Tailwind é layout, cor vem de variável do tema (ADR-16)…`).

**Reverter a sonda em seguida** e rodar `pnpm lint` de novo, esperando exit 0. Uma catraca só
provada no sentido verde é uma catraca que ninguém viu funcionar.

- [ ] **Step 7: Conferir na tela que a cor não mudou**

```bash
cd frontend && pnpm dev
```

Abrir http://localhost:5173, olhar a sidebar nos dois temas: o rótulo do papel, a versão no rodapé
e os itens inativos do menu devem estar **idênticos** ao antes. Os valores são os mesmos hexes que
o Tailwind rendia — qualquer diferença visível significa que o token errado foi aplicado.

- [ ] **Step 8: Commit**

```bash
git add frontend/eslint.config.js frontend/src/shared/styles/brand-theme.css \
        frontend/src/app/layouts/Sidebar/Sidebar.tsx frontend/src/app/layouts/Sidebar/SidebarItem.tsx
git commit -m "chore(lint): liga a catraca de cor em src/app e converte os 3 sitios do shell"
```

---

### Task 3: chaves i18n do Dashboard nas 3 locales (D14, D17)

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json:175-178`
- Modify: `frontend/src/shared/config/locales/pt-BR.json:175-178`
- Modify: `frontend/src/shared/config/locales/en.json:175-178`

**Interfaces:**
- Consumes: nada.
- Produces: a sub-árvore `dashboard.*` completa. Tasks 6–10 chamam `t('dashboard.…')`; nenhuma
  delas inventa chave.

> **Por que antes dos componentes:** componente escrito primeiro renderiza a chave crua na tela e
> o `parity.test.ts` não pega — ele compara locales entre si, não contra o código. Escrever as
> chaves antes torna o rótulo faltante um erro de leitura óbvio na revisão visual.

O bloco `dashboard` de hoje tem só `welcome` e `subtitle`, e o `subtitle` diz "Panel en
construcción" — deixa de ser verdade neste bloco.

- [ ] **Step 1: Substituir o bloco `dashboard` de `es-CL.json` (a referência de rótulo)**

```json
  "dashboard": {
    "welcome": "Bienvenido, {{name}}",
    "subtitle": "Estado operativo actual: qué requiere acción hoy.",
    "noAccess": {
      "title": "Sin módulos visibles",
      "description": "Tu perfil no tiene permiso de lectura sobre ningún módulo del panel. Solicita acceso a un administrador."
    },
    "open": "Abrir",
    "kpi": {
      "turmasEmAndamento": "Clases en curso",
      "turmasEncerrandoEmBreve": "Clases por terminar",
      "turmasAtrasadas": "Clases atrasadas",
      "conclusoesPorConfirmar": "Conclusiones por confirmar",
      "cotacoesPendentes": "Cotizaciones pendientes",
      "cotacoesValor": "{{value}} UF pendientes",
      "certificadosAEmitir": "Certificados por emitir"
    },
    "module": {
      "commercial": "Comercial",
      "operation": "Operación",
      "certification": "Certificación"
    },
    "severity": {
      "high": "Alta",
      "medium": "Media",
      "normal": "Normal"
    },
    "pending": {
      "title": "Pendientes",
      "empty": "Sin pendientes",
      "emptyHint": "No hay acciones pendientes en los módulos que puedes ver.",
      "type": {
        "quote_awaiting_approval": "Cotización por aprobar",
        "quote_approved_without_turma": "Cotización aprobada sin clase",
        "turma_without_redator": "Clase sin relator",
        "turma_docs_incomplete": "Documentación incompleta",
        "turma_awaiting_conclusion": "Clase por confirmar conclusión",
        "enrollment_awaiting_certificate": "Matrícula por certificar"
      }
    },
    "alerts": {
      "title": "Alertas",
      "empty": "Sin alertas",
      "emptyHint": "Nada vencido ni por vencer en los módulos que puedes ver.",
      "type": {
        "turma_overdue": "Clase vencida",
        "certificate_expiring_soon": "Certificado por vencer",
        "certificate_expired": "Certificado vencido",
        "redator_document_expired": "Documento de relator vencido",
        "redator_document_expiring_soon": "Documento de relator por vencer"
      }
    },
    "agenda": {
      "title": "Agenda",
      "startingSoon": "Comienzan pronto",
      "endingSoon": "Terminan pronto",
      "inProgress": "En curso",
      "overdue": "Atrasadas",
      "empty": "Sin clases en la agenda",
      "range": "{{start}} — {{end}}"
    },
    "pipeline": {
      "title": "Flujo comercial y operativo",
      "empty": "Sin registros en el flujo",
      "stage": {
        "quote_pending": "Cotización pendiente",
        "quote_approved_without_turma": "Aprobada sin clase",
        "turma_in_progress": "Clase en curso",
        "turma_ready_for_conclusion": "Lista para concluir",
        "concluded_pending_issuance": "Concluida, por emitir",
        "fully_issued": "Totalmente emitida"
      }
    }
  },
```

- [ ] **Step 2: O mesmo bloco em `pt-BR.json`**

```json
  "dashboard": {
    "welcome": "Bem-vindo, {{name}}",
    "subtitle": "Estado operacional atual: o que precisa de ação hoje.",
    "noAccess": {
      "title": "Nenhum módulo visível",
      "description": "Seu perfil não tem permissão de leitura sobre nenhum módulo do painel. Solicite acesso a um administrador."
    },
    "open": "Abrir",
    "kpi": {
      "turmasEmAndamento": "Turmas em andamento",
      "turmasEncerrandoEmBreve": "Turmas encerrando",
      "turmasAtrasadas": "Turmas atrasadas",
      "conclusoesPorConfirmar": "Conclusões a confirmar",
      "cotacoesPendentes": "Cotações pendentes",
      "cotacoesValor": "{{value}} UF pendentes",
      "certificadosAEmitir": "Certificados a emitir"
    },
    "module": {
      "commercial": "Comercial",
      "operation": "Operação",
      "certification": "Certificação"
    },
    "severity": {
      "high": "Alta",
      "medium": "Média",
      "normal": "Normal"
    },
    "pending": {
      "title": "Pendências",
      "empty": "Sem pendências",
      "emptyHint": "Não há ações pendentes nos módulos que você pode ver.",
      "type": {
        "quote_awaiting_approval": "Cotação a aprovar",
        "quote_approved_without_turma": "Cotação aprovada sem turma",
        "turma_without_redator": "Turma sem relator",
        "turma_docs_incomplete": "Documentação incompleta",
        "turma_awaiting_conclusion": "Turma a confirmar conclusão",
        "enrollment_awaiting_certificate": "Matrícula a certificar"
      }
    },
    "alerts": {
      "title": "Alertas",
      "empty": "Sem alertas",
      "emptyHint": "Nada vencido nem a vencer nos módulos que você pode ver.",
      "type": {
        "turma_overdue": "Turma vencida",
        "certificate_expiring_soon": "Certificado a vencer",
        "certificate_expired": "Certificado vencido",
        "redator_document_expired": "Documento de relator vencido",
        "redator_document_expiring_soon": "Documento de relator a vencer"
      }
    },
    "agenda": {
      "title": "Agenda",
      "startingSoon": "Começam em breve",
      "endingSoon": "Encerram em breve",
      "inProgress": "Em andamento",
      "overdue": "Atrasadas",
      "empty": "Sem turmas na agenda",
      "range": "{{start}} — {{end}}"
    },
    "pipeline": {
      "title": "Fluxo comercial e operacional",
      "empty": "Sem registros no fluxo",
      "stage": {
        "quote_pending": "Cotação pendente",
        "quote_approved_without_turma": "Aprovada sem turma",
        "turma_in_progress": "Turma em andamento",
        "turma_ready_for_conclusion": "Pronta para concluir",
        "concluded_pending_issuance": "Concluída, a emitir",
        "fully_issued": "Totalmente emitida"
      }
    }
  },
```

- [ ] **Step 3: O mesmo bloco em `en.json`**

```json
  "dashboard": {
    "welcome": "Welcome, {{name}}",
    "subtitle": "Current operating status: what needs action today.",
    "noAccess": {
      "title": "No modules visible",
      "description": "Your profile has no read permission on any dashboard module. Ask an administrator for access."
    },
    "open": "Open",
    "kpi": {
      "turmasEmAndamento": "Classes in progress",
      "turmasEncerrandoEmBreve": "Classes ending soon",
      "turmasAtrasadas": "Overdue classes",
      "conclusoesPorConfirmar": "Conclusions to confirm",
      "cotacoesPendentes": "Pending quotes",
      "cotacoesValor": "{{value}} UF pending",
      "certificadosAEmitir": "Certificates to issue"
    },
    "module": {
      "commercial": "Commercial",
      "operation": "Operations",
      "certification": "Certification"
    },
    "severity": {
      "high": "High",
      "medium": "Medium",
      "normal": "Normal"
    },
    "pending": {
      "title": "Pending",
      "empty": "Nothing pending",
      "emptyHint": "No pending actions in the modules you can see.",
      "type": {
        "quote_awaiting_approval": "Quote awaiting approval",
        "quote_approved_without_turma": "Approved quote without a class",
        "turma_without_redator": "Class without an instructor",
        "turma_docs_incomplete": "Incomplete documentation",
        "turma_awaiting_conclusion": "Class awaiting conclusion",
        "enrollment_awaiting_certificate": "Enrolment awaiting certificate"
      }
    },
    "alerts": {
      "title": "Alerts",
      "empty": "No alerts",
      "emptyHint": "Nothing expired or expiring in the modules you can see.",
      "type": {
        "turma_overdue": "Overdue class",
        "certificate_expiring_soon": "Certificate expiring soon",
        "certificate_expired": "Expired certificate",
        "redator_document_expired": "Expired instructor document",
        "redator_document_expiring_soon": "Instructor document expiring soon"
      }
    },
    "agenda": {
      "title": "Agenda",
      "startingSoon": "Starting soon",
      "endingSoon": "Ending soon",
      "inProgress": "In progress",
      "overdue": "Overdue",
      "empty": "No classes in the agenda",
      "range": "{{start}} — {{end}}"
    },
    "pipeline": {
      "title": "Commercial and operating funnel",
      "empty": "Nothing in the funnel",
      "stage": {
        "quote_pending": "Quote pending",
        "quote_approved_without_turma": "Approved without a class",
        "turma_in_progress": "Class in progress",
        "turma_ready_for_conclusion": "Ready to conclude",
        "concluded_pending_issuance": "Concluded, to issue",
        "fully_issued": "Fully issued"
      }
    }
  },
```

- [ ] **Step 4: Rodar o teste de paridade**

```bash
cd frontend && pnpm test src/shared/config/locales/parity.test.ts
```

Esperado: 2 testes passando. Se reprovar, a mensagem nomeia a chave `faltando`/`excedente` — é
erro de digitação, não de decisão.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/config/locales/
git commit -m "feat(dashboard): chaves i18n da central de controle nas 3 locales"
```

---

### Task 4: `navigation.ts` — item → rota do módulo dono (D7, D8)

**Files:**
- Create: `frontend/src/app/pages/Dashboard/navigation.ts`
- Test: `frontend/src/app/pages/Dashboard/navigation.test.ts`

**Interfaces:**
- Consumes: `PendingItemType`, `DashboardAlertType` de `@shared/types/generated`.
- Produces:
  - `pendingItemRoute(type: PendingItemType, navigation: Record<string, number>): string | null`
  - `alertRoute(type: DashboardAlertType, navigation: Record<string, number>): string | null`
  Tasks 7 e 8 consomem as duas. `null` = item sem link (nunca rota quebrada).

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/app/pages/Dashboard/navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { alertRoute, pendingItemRoute } from './navigation'
import type { DashboardAlertType, PendingItemType } from '@shared/types/generated'

describe('pendingItemRoute', () => {
  it.each([
    ['turma_without_redator', { turma_id: 7 }, '/operacion/turmas/7'],
    ['turma_docs_incomplete', { turma_id: 7 }, '/operacion/turmas/7'],
    ['turma_awaiting_conclusion', { turma_id: 7 }, '/operacion/turmas/7'],
    ['enrollment_awaiting_certificate', { turma_id: 7 }, '/operacion/turmas/7'],
  ] as [PendingItemType, Record<string, number>, string][])(
    '%s ancora na turma',
    (type, navigation, esperado) => {
      expect(pendingItemRoute(type, navigation)).toBe(esperado)
    },
  )

  // D7: o backend manda budget_id E quote_id; o CTA leva ao ORÇAMENTO, que é a
  // tela dona, e não ao formulário de criar turma — o Dashboard não executa
  // mutação nem cola o operador no botão que resolve.
  it.each([
    ['quote_awaiting_approval'],
    ['quote_approved_without_turma'],
  ] as [PendingItemType][])('%s leva ao orçamento, não à cotação', (type) => {
    expect(pendingItemRoute(type, { budget_id: 12, quote_id: 34 })).toBe('/comercial/presupuestos/12')
  })

  // Chave ausente = item sem link. Uma rota montada com `undefined` viraria
  // "/operacion/turmas/undefined" e daria 404 no clique.
  it('devolve null quando a chave esperada não veio', () => {
    expect(pendingItemRoute('turma_without_redator', {})).toBeNull()
    expect(pendingItemRoute('quote_awaiting_approval', { quote_id: 34 })).toBeNull()
  })
})

describe('alertRoute', () => {
  it('turma vencida ancora na turma', () => {
    expect(alertRoute('turma_overdue', { turma_id: 9 })).toBe('/operacion/turmas/9')
  })

  // D8: /certificados e /personas são listagem com diálogo, sem rota de
  // detalhe. Ancorar na entidade é o FUT-2 do backlog, que depende de decisão
  // do João — este bloco leva à listagem, sem seleção, e o certificate_id /
  // redator_id do payload fica sem uso de propósito.
  it.each([
    ['certificate_expiring_soon', { certificate_id: 3 }, '/certificados'],
    ['certificate_expired', { certificate_id: 3 }, '/certificados'],
    ['redator_document_expired', { redator_id: 5 }, '/personas'],
    ['redator_document_expiring_soon', { redator_id: 5 }, '/personas'],
  ] as [DashboardAlertType, Record<string, number>, string][])(
    '%s leva à listagem do módulo, sem seleção',
    (type, navigation, esperado) => {
      expect(alertRoute(type, navigation)).toBe(esperado)
    },
  )

  it('devolve null quando a turma não veio no payload', () => {
    expect(alertRoute('turma_overdue', {})).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/app/pages/Dashboard/navigation.test.ts
```

Esperado: FAIL — `Failed to resolve import "./navigation"`. É o vermelho que autoriza o verde.

- [ ] **Step 3: Escrever `navigation.ts`**

```ts
import type { DashboardAlertType, PendingItemType } from '@shared/types/generated'

/**
 * Para onde cada item do Dashboard navega. Nada aqui é regra de negócio: é o
 * mapa entre o `navigation` que o backend já produz e as rotas que o
 * `AppRouter` já expõe.
 *
 * Homônimo de `shared/config/navigation.ts` de propósito — aquele é o MENU
 * (NAV_MODULES), este é o destino de um ITEM. O nome vem do campo do contrato
 * (`PendingItemData.navigation`), e renomeá-lo aqui só faria a tela e o DTO
 * falarem línguas diferentes.
 *
 * `key: null` = a rota não aceita entidade. `/certificados` e `/personas` são
 * listagem com diálogo, sem rota de detalhe: o alerta leva ao módulo dono, sem
 * seleção (D8). Ancorar na entidade é o FUT-2 do backlog e depende de decisão
 * do João — resolvê-lo aqui decidiria um futuro dentro de um bloco que não é
 * dele.
 */
type Destino = {
  path: string
  /** Chave de `navigation` que vira o parâmetro da rota. `null` = sem parâmetro. */
  key: string | null
}

/**
 * As chaves são as que o backend MANDA, medidas em
 * `app/Domains/Dashboard/Services/` — não supostas:
 * `CommercialMetricsQuery.php:87` produz `budget_id` e `quote_id`;
 * `OperationMetricsQuery.php:195` e `CertificationMetricsQuery.php:42`
 * produzem `turma_id`.
 *
 * D7: as duas pendências de cotação usam `budget_id`. O Dashboard não executa
 * mutação e o CTA só direciona ao módulo dono; levar direto ao formulário de
 * criar turma chegaria colado no botão que resolve.
 */
const PENDENCIA: Record<PendingItemType, Destino> = {
  quote_awaiting_approval: { path: '/comercial/presupuestos', key: 'budget_id' },
  quote_approved_without_turma: { path: '/comercial/presupuestos', key: 'budget_id' },
  turma_without_redator: { path: '/operacion/turmas', key: 'turma_id' },
  turma_docs_incomplete: { path: '/operacion/turmas', key: 'turma_id' },
  turma_awaiting_conclusion: { path: '/operacion/turmas', key: 'turma_id' },
  enrollment_awaiting_certificate: { path: '/operacion/turmas', key: 'turma_id' },
}

const ALERTA: Record<DashboardAlertType, Destino> = {
  turma_overdue: { path: '/operacion/turmas', key: 'turma_id' },
  certificate_expiring_soon: { path: '/certificados', key: null },
  certificate_expired: { path: '/certificados', key: null },
  redator_document_expired: { path: '/personas', key: null },
  redator_document_expiring_soon: { path: '/personas', key: null },
}

/**
 * Resolve o destino. Chave declarada mas ausente no payload devolve `null` —
 * item sem link, nunca rota quebrada: `/operacion/turmas/undefined` responderia
 * 404 no clique, e um link que só falha depois do clique é pior que link nenhum.
 */
function resolver(destino: Destino, navigation: Record<string, number>): string | null {
  if (destino.key === null) return destino.path

  const id = navigation[destino.key]
  return id === undefined ? null : `${destino.path}/${id}`
}

export function pendingItemRoute(
  type: PendingItemType,
  navigation: Record<string, number>,
): string | null {
  return resolver(PENDENCIA[type], navigation)
}

export function alertRoute(
  type: DashboardAlertType,
  navigation: Record<string, number>,
): string | null {
  return resolver(ALERTA[type], navigation)
}
```

Os dois `Record<Tipo, Destino>` são **exaustivos por tipo**: acrescentar um `PendingItemType` no
backend e regenerar `generated.ts` quebra o `tsc` aqui, em vez de produzir `undefined` em runtime.

- [ ] **Step 4: Rodar e ver passar**

```bash
cd frontend && pnpm test src/app/pages/Dashboard/navigation.test.ts
```

Esperado: PASS — 1 arquivo, **13 casos** (`pendingItemRoute` 4 + 2 + 1, `alertRoute` 1 + 4 + 1;
cada linha de `it.each` conta como um caso).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/Dashboard/navigation.ts frontend/src/app/pages/Dashboard/navigation.test.ts
git commit -m "feat(dashboard): mapa de navegacao dos itens para as rotas dos modulos"
```

---

### Task 5: `useDashboard` — query e política de estado (D5, D9, D12)

**Files:**
- Create: `frontend/src/app/pages/Dashboard/useDashboard.ts`
- Test: `frontend/src/app/pages/Dashboard/useDashboard.test.tsx`

**Interfaces:**
- Consumes: `api`/`ProblemDetails` de `@shared/api/axios`; `AdminDashboardData`,
  `RedatorDashboardData` de `@shared/types/generated`.
- Produces:
  - `type DashboardPeriod = { start: string; end: string }`
  - `dashboardKeys.metrics(period?: DashboardPeriod)` — query key
  - `type DashboardState` (união discriminada por `kind`)
  - `useDashboard(period?: DashboardPeriod): DashboardState`
  A Task 10 (`DashboardPage`) é a única consumidora.

> **A união discriminada por `kind` é o idioma do projeto**, não invenção: `useValidationPage`
> (`features/certification/hooks/`) já resolve exatamente isso — página inteira cujo ramo depende
> do dado, com o teste asserindo `result.current.kind`.
>
> **Por que não `useLoadState`** (D9): a assinatura dele é `UseQueryResult<T[]>`, de **lista**, e o
> dashboard é objeto único com seções anuláveis. A tese da rule é preservada verbatim — o que
> ramifica a tela é o DADO que falta, não o `status` da query.

- [ ] **Step 1: Escrever o teste que falha**

Criar `frontend/src/app/pages/Dashboard/useDashboard.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useDashboard } from './useDashboard'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { AdminDashboardData } from '@shared/types/generated'

vi.mock('@shared/api/axios', () => ({
  api: { get: vi.fn() },
}))

const get = vi.mocked(api.get)

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function admin(overrides: Partial<AdminDashboardData> = {}): AdminDashboardData {
  return {
    view: 'admin',
    kpis: {
      turmas_em_andamento: 4,
      turmas_encerrando_em_breve: 1,
      turmas_atrasadas: 0,
      conclusoes_por_confirmar: 2,
      cotacoes: { pending_count: 3, pending_value_uf: '450.0000' },
      certificados_a_emitir: 5,
    },
    pendencias: [],
    alertas: [],
    pipeline: [{ stage: 'quote_pending', count: 3 }],
    agenda: { starting_soon: [], ending_soon: [], in_progress: [], overdue: [] },
    compliance_turmas: null,
    redatores: null,
    series: null,
    rankings: null,
    period_start: '2025-08-15',
    period_end: '2026-08-15',
    ...overrides,
  }
}

/** Payload de quem não tem permissão de módulo nenhum: todo KPI nulo, as duas
 * seções anuláveis do B1 nulas, e as duas listas não-anuláveis vazias. */
function semNenhumaSecao(): AdminDashboardData {
  return admin({
    kpis: {
      turmas_em_andamento: null,
      turmas_encerrando_em_breve: null,
      turmas_atrasadas: null,
      conclusoes_por_confirmar: null,
      cotacoes: null,
      certificados_a_emitir: null,
    },
    pipeline: null,
    agenda: null,
  })
}

function problem(detail: string): ProblemDetails {
  return {
    type: 'https://lotus.cl/errors/x',
    title: 'Error',
    status: 500,
    detail,
    instance: '',
  }
}

describe('useDashboard', () => {
  it('sucesso devolve o payload admin tipado', async () => {
    get.mockResolvedValue({ data: admin() })

    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('ready'))
    if (result.current.kind !== 'ready') throw new Error('esperava kind ready')
    expect(result.current.data.kpis.turmas_em_andamento).toBe(4)
    expect(result.current.staleError).toBeNull()
  })

  // Falhou E não há nada em cache: é o que autoriza SUBSTITUIR a tela pelo erro.
  it('falha sem cache vira kind error', async () => {
    get.mockRejectedValue(problem('sin conexión'))

    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('error'))
    if (result.current.kind !== 'error') throw new Error('esperava kind error')
    expect(result.current.error.detail).toBe('sin conexión')
  })

  // Lição do BD-6 aplicada a objeto único: um refetch falho mantém `data`
  // populado enquanto `status` vira `error`. Substituir a tela aí apaga
  // informação utilizável — a falha vira aviso AO LADO do que já veio.
  it('falha COM cache mantém os dados e avisa ao lado', async () => {
    get.mockResolvedValueOnce({ data: admin() })

    const { result } = renderHook(() => useDashboard(), { wrapper })
    await waitFor(() => expect(result.current.kind).toBe('ready'))

    get.mockRejectedValue(problem('caiu no refetch'))
    if (result.current.kind !== 'ready') throw new Error('esperava kind ready')
    act(() => result.current.retry())

    await waitFor(() => {
      if (result.current.kind !== 'ready') throw new Error('a tela não pode virar erro com cache em mão')
      expect(result.current.staleError).toBe('caiu no refetch')
    })
    if (result.current.kind !== 'ready') throw new Error('esperava kind ready')
    expect(result.current.data.kpis.turmas_em_andamento).toBe(4)
  })

  // D5: a fronteira do filtro nasce pronta, sem UI. É o que garante que o B2
  // ligue o seletor de período sem mexer no cache.
  it('a query key varia por período', async () => {
    get.mockResolvedValue({ data: admin() })

    const { rerender } = renderHook(({ p }: { p?: { start: string; end: string } }) => useDashboard(p), {
      wrapper,
      initialProps: { p: { start: '2026-01-01', end: '2026-06-30' } },
    })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))

    rerender({ p: { start: '2026-07-01', end: '2026-12-31' } })

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(get.mock.calls[0][1]).toEqual({ params: { period_start: '2026-01-01', period_end: '2026-06-30' } })
    expect(get.mock.calls[1][1]).toEqual({ params: { period_start: '2026-07-01', period_end: '2026-12-31' } })
  })

  // O caso-limite do §4 da spec: esconder cada seção nula, uma a uma, deixaria
  // uma página em branco indistinguível de falha silenciosa.
  it('nenhuma seção legível tem estado próprio, distinto de vazio e de falha', async () => {
    get.mockResolvedValue({ data: semNenhumaSecao() })

    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.kind).toBe('unauthorized'))
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd frontend && pnpm test src/app/pages/Dashboard/useDashboard.test.tsx
```

Esperado: FAIL — `Failed to resolve import "./useDashboard"`.

- [ ] **Step 3: Escrever `useDashboard.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { AdminDashboardData, RedatorDashboardData } from '@shared/types/generated'

/** Janela histórica. Só séries e rankings a respeitam (D3 do bloco A), e as duas
 * são do B2 — por isso o parâmetro existe e a UI dele não (D5). */
export type DashboardPeriod = { start: string; end: string }

export const dashboardKeys = {
  all: ['dashboard'] as const,
  /** A key varia pelo período para o B2 ligar o seletor sem mexer no cache. */
  metrics: (period?: DashboardPeriod) =>
    ['dashboard', 'metricas', period?.start ?? null, period?.end ?? null] as const,
}

type DashboardPayload = AdminDashboardData | RedatorDashboardData

/**
 * O que a tela pode ser. Cada `kind` tem um ramo de render próprio e nenhum se
 * confunde com outro — falha, vazio de verdade e "sem permissão" dizem coisas
 * diferentes sobre o banco, e trocar um pelo outro faz a tela mentir.
 *
 * `unauthorized` não é `empty`: a tela não está vazia, ela está fechada.
 * `unsupported` é o ramo do Redator (D12): o contrato é união discriminada por
 * `view`, o B1 renderiza só `admin`, e hoje nenhum redator autentica.
 */
export type DashboardState =
  | { kind: 'loading' }
  | { kind: 'error'; error: ProblemDetails; retry: () => void }
  | { kind: 'unauthorized' }
  | { kind: 'unsupported' }
  | { kind: 'ready'; data: AdminDashboardData; staleError: string | null; retry: () => void }

/**
 * Nenhuma seção do B1 legível: todo KPI nulo E as duas seções anuláveis nulas.
 *
 * `pendencias` e `alertas` ficam de fora da conta de propósito — são listas
 * NÃO-anuláveis, então quem não tem permissão nenhuma recebe `[]`, exatamente
 * como quem tem permissão e não tem pendência. Elas não distinguem os dois
 * casos; os KPIs e as seções anuláveis distinguem.
 */
function nenhumaSecaoLegivel(d: AdminDashboardData): boolean {
  const k = d.kpis
  const algumKpi =
    k.turmas_em_andamento !== null ||
    k.turmas_encerrando_em_breve !== null ||
    k.turmas_atrasadas !== null ||
    k.conclusoes_por_confirmar !== null ||
    k.cotacoes !== null ||
    k.certificados_a_emitir !== null

  return !algumKpi && d.pipeline === null && d.agenda === null
}

/**
 * A política de estado da tela do Dashboard, num lugar só (D9).
 *
 * Não usa `useLoadState`: a assinatura dele é `UseQueryResult<T[]>`, de LISTA, e
 * aqui o dado é objeto único com seções anuláveis. A tese é a mesma — o que
 * ramifica a tela é o DADO que falta, não o `status` da query —, mas o formato
 * não serve, e um `useResourceState` genérico agora seria abstrair contra um
 * consumidor só.
 */
export function useDashboard(period?: DashboardPeriod): DashboardState {
  const query = useQuery<DashboardPayload, ProblemDetails>({
    queryKey: dashboardKeys.metrics(period),
    queryFn: () =>
      api
        .get<DashboardPayload>('/api/dashboard/metricas', {
          params: { period_start: period?.start, period_end: period?.end },
        })
        .then((r) => r.data),
  })

  const retry = () => {
    void query.refetch()
  }

  const data = query.data

  // Sem nada em cache. É AQUI que a falha pode substituir a tela.
  if (data === undefined) {
    if (query.isError) {
      // `{}` quando o interceptor não populou o corpo: `isError` sem `error`
      // ainda é falha, e devolver `loading` a esconderia. Mesmo tratamento do
      // `useLoadState`.
      return { kind: 'error', error: query.error ?? ({} as ProblemDetails), retry }
    }
    return { kind: 'loading' }
  }

  if (data.view !== 'admin') return { kind: 'unsupported' }
  if (nenhumaSecaoLegivel(data)) return { kind: 'unauthorized' }

  // Com cache em mão, a falha do refetch é aviso AO LADO — a tela continua
  // utilizável (lição do BD-6).
  return {
    kind: 'ready',
    data,
    staleError: query.isError ? (query.error?.detail ?? null) : null,
    retry,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd frontend && pnpm test src/app/pages/Dashboard/useDashboard.test.tsx
```

Esperado: PASS — 1 arquivo, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/Dashboard/useDashboard.ts frontend/src/app/pages/Dashboard/useDashboard.test.tsx
git commit -m "feat(dashboard): hook com query por periodo e politica de estado"
```

---

### Task 6: `KpiRow` — a fileira de indicadores (D6, D13, D16)

**Files:**
- Create: `frontend/src/app/pages/Dashboard/KpiRow.tsx`

**Interfaces:**
- Consumes: `AdminKpisData` de `@shared/types/generated`; `formatUf` de `@shared/lib` (Task 1);
  `AppCard`/`AppCardTone` de `@shared/ui`; chaves `dashboard.kpi.*` (Task 3).
- Produces: `<KpiRow kpis={AdminKpisData} />`. Consumido pela Task 10.

> Sem teste automatizado: componente PrimeReact no jsdom está **fora** do corte do runner. A prova
> é a revisão visual e o papel-sonda do DoD (Task 11).

- [ ] **Step 1: Escrever `KpiRow.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppCard } from '@shared/ui'
import type { AppCardTone } from '@shared/ui'
import { formatUf } from '@shared/lib'
import type { AdminKpisData } from '@shared/types/generated'

type Kpi = {
  /** Sufixo da chave `dashboard.kpi.*`. */
  key: string
  value: string
  /** Segunda linha. Hoje só as cotações têm (o valor em UF). */
  hint?: string
  tone: AppCardTone
}

/**
 * Campo `null` NÃO vira card (D6). Nada de zero no lugar do que não pode ser
 * lido — essa é a lei do bloco A, e o backend passou a mandar `null` justamente
 * para a tela não ter como mentir — e nada de rótulo "sem acesso", que poluiria
 * a tela de quem nunca terá o módulo. É o mesmo padrão que o Sidebar já aplica
 * ao filtrar item por permissão.
 *
 * Derivação pura, no módulo e não no corpo do componente: o componente fica
 * declarativo, do mesmo jeito que o lint exige em `features/*​/components/**` e
 * que aqui vale por disciplina — o seletor não alcança `app/`.
 */
function cards(k: AdminKpisData): Kpi[] {
  const lista: Kpi[] = []

  if (k.turmas_em_andamento !== null) {
    lista.push({ key: 'turmasEmAndamento', value: String(k.turmas_em_andamento), tone: 'info' })
  }
  if (k.turmas_encerrando_em_breve !== null) {
    lista.push({ key: 'turmasEncerrandoEmBreve', value: String(k.turmas_encerrando_em_breve), tone: 'warning' })
  }
  if (k.turmas_atrasadas !== null) {
    lista.push({ key: 'turmasAtrasadas', value: String(k.turmas_atrasadas), tone: 'danger' })
  }
  if (k.conclusoes_por_confirmar !== null) {
    lista.push({ key: 'conclusoesPorConfirmar', value: String(k.conclusoes_por_confirmar), tone: 'warning' })
  }
  if (k.cotacoes !== null) {
    lista.push({ key: 'cotacoesPendentes', value: String(k.cotacoes.pending_count), tone: 'neutral' })
  }
  if (k.certificados_a_emitir !== null) {
    lista.push({ key: 'certificadosAEmitir', value: String(k.certificados_a_emitir), tone: 'info' })
  }

  return lista
}

export function KpiRow({ kpis }: { kpis: AdminKpisData }) {
  const { t } = useTranslation()
  const lista = cards(kpis)

  if (lista.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lista.map((kpi) => (
        <AppCard key={kpi.key} variant="stat" tone={kpi.tone}>
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t(`dashboard.kpi.${kpi.key}`)}
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums">{kpi.value}</p>
          {kpi.key === 'cotacoesPendentes' && kpis.cotacoes !== null && (
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('dashboard.kpi.cotacoesValor', { value: formatUf(kpis.cotacoes.pending_value_uf) })}
            </p>
          )}
        </AppCard>
      ))}
    </div>
  )
}
```

`formatUf`, e não `Number()`: o backend manda `decimal(12,4)` como string (`"450.0000"`), e
converter para `Number` reintroduz o erro de representação que o decimal existe para evitar. É
dinheiro na tela.

- [ ] **Step 2: Rodar o gate**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: `tsc -b` sem erro, eslint exit 0 — inclusive a catraca de cor da Task 2, que agora roda
neste arquivo.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/Dashboard/KpiRow.tsx
git commit -m "feat(dashboard): fileira de KPIs com ocultacao por gate nulo"
```

---

### Task 7: linha do item, pendências e alertas (D8, D15, D17)

**Files:**
- Create: `frontend/src/app/pages/Dashboard/DashboardItemRow.tsx`
- Create: `frontend/src/app/pages/Dashboard/PendingList.tsx`
- Create: `frontend/src/app/pages/Dashboard/AlertList.tsx`

**Interfaces:**
- Consumes: `pendingItemRoute`/`alertRoute` (Task 4); `PendingItemData`, `AlertData`,
  `DashboardSeverity` de `@shared/types/generated`; `AppCard`, `AppCardHeader`, `AppTag`,
  `AppEmptyState` de `@shared/ui`; `formatDate` de `@shared/lib`; chaves `dashboard.pending.*`,
  `dashboard.alerts.*`, `dashboard.module.*`, `dashboard.severity.*` (Task 3).
- Produces: `<PendingList items={PendingItemData[]} />`, `<AlertList items={AlertData[]} />` e
  `severityTagProps(s)`. Consumidos pelas Tasks 8 e 10.

> **Uma única linha para os dois:** medido, `AlertData` e `PendingItemData` têm a mesma forma
> (`severity`, `description`, `date`, `navigation`); só `module` distingue. Escrever a linha duas
> vezes é a duplicação que a régua de extração do projeto existe para evitar.
>
> **D17:** a linha principal é o rótulo do tipo, traduzido nas 3 locales. A `description` do
> backend é frase pronta em espanhol (medido em `CommercialMetricsQuery.php:48` e irmãos) e entra
> como linha secundária, porque em `turma_docs_incomplete` ela carrega a lista de documentos
> faltantes — informação que o front não tem como derivar.

- [ ] **Step 1: Escrever `DashboardItemRow.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { AppTag } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { DashboardSeverity } from '@shared/types/generated'

/** D15: a escala do contrato mapeia para a severidade do `AppTag` que já existe.
 * Sem componente novo em `shared/ui` — um átomo promovido sem segundo consumidor
 * medido é especulação. */
export function severityTagProps(severity: DashboardSeverity): { severity: 'danger' | 'warning' | 'info' } {
  if (severity === 'high') return { severity: 'danger' }
  if (severity === 'medium') return { severity: 'warning' }
  return { severity: 'info' }
}

export interface DashboardItemRowProps {
  /** Texto do tag. Pendência mostra o módulo; alerta mostra a severidade. */
  tagLabel: string
  severity: DashboardSeverity
  /** Rótulo do tipo, traduzido (D17). */
  label: string
  /** Frase do backend, em es-CL (D17). */
  detail: string
  /** Data ISO (`YYYY-MM-DD`) ou null. */
  date: string | null
  /** Rota do módulo dono, ou `null` para item sem link. */
  to: string | null
  openLabel: string
}

export function DashboardItemRow({
  tagLabel,
  severity,
  label,
  detail,
  date,
  to,
  openLabel,
}: DashboardItemRowProps) {
  const corpo = (
    <>
      <AppTag value={tagLabel} {...severityTagProps(severity)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {detail}
        </span>
      </span>
      {date && (
        // Ancorado ao meio-dia: `new Date('2026-03-01')` é lido como UTC e, num
        // fuso a oeste, volta um dia — a data exibida trocaria na virada. Mesma
        // razão do `formatMonthYear` em shared/lib/datetime.ts.
        <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {formatDate(new Date(`${date}T12:00:00`))}
        </span>
      )}
    </>
  )

  // A borda mora SÓ no <li> e o layout SÓ no filho. Pôr `border-b` no <li> e
  // `border-b-0` no <a> pareceria resolver e não resolve: com duas utilities da
  // mesma propriedade, quem vence é a ordem no CSS gerado, não a ordem na
  // string de classes.
  const layout = 'flex items-center gap-3 px-4 py-3'

  return (
    <li className="border-b last:border-b-0" style={{ borderColor: 'var(--surface-border)' }}>
      {/* Item sem link não vira link inerte: `navigation` sem a chave esperada
        * significa que não há para onde ir, e um link que só falha depois do
        * clique é pior que link nenhum. */}
      {to === null ? (
        <div className={layout}>{corpo}</div>
      ) : (
        <Link
          to={to}
          title={openLabel}
          className={`${layout} no-underline hover:bg-(--surface-section)`}
          style={{ color: 'var(--text-color)' }}
        >
          {corpo}
          <i className="pi pi-angle-right shrink-0" aria-hidden="true" />
        </Link>
      )}
    </li>
  )
}
```

- [ ] **Step 2: Escrever `PendingList.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import type { PendingItemData } from '@shared/types/generated'
import { DashboardItemRow } from './DashboardItemRow'
import { pendingItemRoute } from './navigation'

/** `pendencias` é lista NÃO-anulável: chega `[]` tanto para quem não tem
 * permissão quanto para quem tem e não tem pendência. Por isso a seção sempre
 * renderiza — quem some por gate são os KPIs, o pipeline e a agenda (D6). */
export function PendingList({ items }: { items: PendingItemData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.pending.title')} count={items.length} />
      {items.length === 0 ? (
        <AppEmptyState
          icon="pi pi-check-circle"
          title={t('dashboard.pending.empty')}
          description={t('dashboard.pending.emptyHint')}
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <DashboardItemRow
              key={`${item.type}-${item.entity_id}`}
              tagLabel={t(`dashboard.module.${item.module}`)}
              severity={item.severity}
              label={t(`dashboard.pending.type.${item.type}`)}
              detail={item.description}
              date={item.date}
              to={pendingItemRoute(item.type, item.navigation)}
              openLabel={t('dashboard.open')}
            />
          ))}
        </ul>
      )}
    </AppCard>
  )
}
```

A `key` é `type-entity_id`, e não `entity_id`: a mesma turma aparece em mais de uma pendência
(medido em `OperationMetricsQuery.php:120-150` — `turma_docs_incomplete` e
`turma_awaiting_conclusion` saem da mesma turma), então `entity_id` sozinho colide.

- [ ] **Step 3: Escrever `AlertList.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import type { AlertData } from '@shared/types/generated'
import { DashboardItemRow } from './DashboardItemRow'
import { alertRoute } from './navigation'

/** O tag do alerta mostra a SEVERIDADE, não o módulo: `AlertData` não tem campo
 * `module` (o gate age na origem de cada grupo, no backend), e a severidade
 * aqui varia de verdade — vencido é `high`, a vencer é `medium`. */
export function AlertList({ items }: { items: AlertData[] }) {
  const { t } = useTranslation()

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.alerts.title')} count={items.length} />
      {items.length === 0 ? (
        <AppEmptyState
          icon="pi pi-shield"
          title={t('dashboard.alerts.empty')}
          description={t('dashboard.alerts.emptyHint')}
        />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <DashboardItemRow
              key={`${item.type}-${item.entity_id}`}
              tagLabel={t(`dashboard.severity.${item.severity}`)}
              severity={item.severity}
              label={t(`dashboard.alerts.type.${item.type}`)}
              detail={item.description}
              date={item.date}
              to={alertRoute(item.type, item.navigation)}
              openLabel={t('dashboard.open')}
            />
          ))}
        </ul>
      )}
    </AppCard>
  )
}
```

- [ ] **Step 4: Rodar o gate**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: `tsc -b` sem erro, eslint exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/Dashboard/DashboardItemRow.tsx \
        frontend/src/app/pages/Dashboard/PendingList.tsx \
        frontend/src/app/pages/Dashboard/AlertList.tsx
git commit -m "feat(dashboard): listas de pendencias e alertas com CTA para o modulo dono"
```

---

### Task 8: `AgendaPanel` — as 4 janelas de turma

**Files:**
- Create: `frontend/src/app/pages/Dashboard/AgendaPanel.tsx`

**Interfaces:**
- Consumes: `AgendaData`, `AgendaTurmaData` de `@shared/types/generated`; `AppCard`,
  `AppCardHeader`, `AppEmptyState` de `@shared/ui`; `formatDate` de `@shared/lib`; chaves
  `dashboard.agenda.*` (Task 3).
- Produces: `<AgendaPanel agenda={AgendaData} />`. Consumido pela Task 10.

- [ ] **Step 1: Escrever `AgendaPanel.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { AgendaData, AgendaTurmaData } from '@shared/types/generated'

/** As 4 janelas na ordem em que a operação as lê: o que está atrasado primeiro,
 * o que termina em seguida, e só então o que está em curso e o que começa. */
const JANELAS: { key: keyof AgendaData; labelKey: string }[] = [
  { key: 'overdue', labelKey: 'dashboard.agenda.overdue' },
  { key: 'ending_soon', labelKey: 'dashboard.agenda.endingSoon' },
  { key: 'in_progress', labelKey: 'dashboard.agenda.inProgress' },
  { key: 'starting_soon', labelKey: 'dashboard.agenda.startingSoon' },
]

/** Ancorado ao meio-dia: data ISO pura é lida como UTC e volta um dia num fuso
 * a oeste (mesma razão do `formatMonthYear`). */
function dia(iso: string): string {
  return formatDate(new Date(`${iso}T12:00:00`))
}

function TurmaLinha({ turma }: { turma: AgendaTurmaData }) {
  const { t } = useTranslation()

  return (
    <li className="border-b px-4 py-2 last:border-b-0" style={{ borderColor: 'var(--surface-border)' }}>
      <Link
        to={`/operacion/turmas/${turma.turma_id}`}
        className="flex items-center gap-3 no-underline"
        style={{ color: 'var(--text-color)' }}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{turma.course_name}</span>
          {turma.client_name && (
            <span className="block truncate text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {turma.client_name}
            </span>
          )}
        </span>
        <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('dashboard.agenda.range', { start: dia(turma.start_date), end: dia(turma.end_date) })}
        </span>
      </Link>
    </li>
  )
}

export function AgendaPanel({ agenda }: { agenda: AgendaData }) {
  const { t } = useTranslation()
  const total = JANELAS.reduce((soma, janela) => soma + agenda[janela.key].length, 0)

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.agenda.title')} count={total} />
      {total === 0 ? (
        <AppEmptyState icon="pi pi-calendar" title={t('dashboard.agenda.empty')} />
      ) : (
        <div className="grid gap-0 sm:grid-cols-2">
          {JANELAS.filter((janela) => agenda[janela.key].length > 0).map((janela) => (
            <section key={janela.key}>
              <h4
                className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wider uppercase"
                style={{ color: 'var(--text-color-secondary)' }}
              >
                {t(janela.labelKey)}
              </h4>
              <ul className="m-0 list-none p-0">
                {agenda[janela.key].map((turma) => (
                  <TurmaLinha key={turma.turma_id} turma={turma} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AppCard>
  )
}
```

Janela vazia não vira cabeçalho órfão: `filter` antes do `map`. Uma coluna "Atrasadas" com zero
item embaixo lê-se como falha de carregamento, não como boa notícia.

- [ ] **Step 2: Rodar o gate**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: `tsc -b` sem erro, eslint exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/Dashboard/AgendaPanel.tsx
git commit -m "feat(dashboard): painel de agenda com as 4 janelas de turma"
```

---

### Task 9: `PipelineFunnel` — barras CSS (D10)

**Files:**
- Create: `frontend/src/app/pages/Dashboard/PipelineFunnel.tsx`

**Interfaces:**
- Consumes: `PipelineStageCountData` de `@shared/types/generated`; `AppCard`, `AppCardHeader`,
  `AppEmptyState` de `@shared/ui`; chaves `dashboard.pipeline.*` (Task 3).
- Produces: `<PipelineFunnel stages={PipelineStageCountData[]} />`. Consumido pela Task 10.

> **Barra CSS, não gráfico (D10).** O projeto **não tem biblioteca de gráficos** — medido em
> `package.json`: não há `chart.js`, que é o peer que o `Chart` do PrimeReact exige. Escolher uma
> é decisão do B2, com as 5 séries mensais; seis etapas com contagem são layout Tailwind.

- [ ] **Step 1: Escrever `PipelineFunnel.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppCard, AppCardHeader, AppEmptyState } from '@shared/ui'
import type { PipelineStageCountData } from '@shared/types/generated'

export function PipelineFunnel({ stages }: { stages: PipelineStageCountData[] }) {
  const { t } = useTranslation()
  const maior = stages.reduce((max, etapa) => Math.max(max, etapa.count), 0)

  return (
    <AppCard>
      <AppCardHeader title={t('dashboard.pipeline.title')} />
      {maior === 0 ? (
        // Todas as etapas em zero é funil VAZIO, não funil quebrado: seis barras
        // de largura nula seriam indistinguíveis de um erro de render.
        <AppEmptyState icon="pi pi-filter" title={t('dashboard.pipeline.empty')} />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-4">
          {stages.map((etapa) => (
            <li key={etapa.stage} className="flex items-center gap-3">
              <span className="w-48 shrink-0 truncate text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {t(`dashboard.pipeline.stage.${etapa.stage}`)}
              </span>
              <span
                className="h-2 min-w-1 rounded-full"
                // Largura proporcional ao MAIOR valor, não ao total: o funil
                // compara etapas entre si, e normalizar pelo total achataria
                // todas quando uma domina.
                style={{
                  width: `${(etapa.count / maior) * 100}%`,
                  background: 'var(--primary-color)',
                }}
                aria-hidden="true"
              />
              <span className="shrink-0 font-mono text-sm tabular-nums">{etapa.count}</span>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  )
}
```

`min-w-1` para a etapa com contagem 1 sobre um máximo grande continuar visível: barra de 0,3% de
largura arredonda para invisível, e etapa presente que não aparece é dado perdido.

- [ ] **Step 2: Rodar o gate**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: `tsc -b` sem erro, eslint exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/Dashboard/PipelineFunnel.tsx
git commit -m "feat(dashboard): funil do pipeline em barras CSS"
```

---

### Task 10: `DashboardPage` — composição, estados e rota (D16, §4)

**Files:**
- Create: `frontend/src/app/pages/Dashboard/DashboardPage.tsx`
- Create: `frontend/src/app/pages/Dashboard/index.ts`
- Delete: `frontend/src/app/pages/DashboardPage.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx:7`

**Interfaces:**
- Consumes: tudo das Tasks 5–9; `PageHeader`, `AppErrorState`, `AppSkeleton`, `AppEmptyState`,
  `InlineLoadState` de `@shared/ui`; `useSessionStore` de `@shared/stores/sessionStore`.
- Produces: `DashboardPage`, exportado por `@app/pages/Dashboard`.

- [ ] **Step 1: Escrever `DashboardPage.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { PageHeader, AppErrorState, AppSkeleton, AppEmptyState, InlineLoadState } from '@shared/ui'
import { useSessionStore } from '@shared/stores/sessionStore'
import { useDashboard } from './useDashboard'
import { KpiRow } from './KpiRow'
import { PendingList } from './PendingList'
import { AlertList } from './AlertList'
import { AgendaPanel } from './AgendaPanel'
import { PipelineFunnel } from './PipelineFunnel'

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <AppSkeleton key={i} width="100%" height="6rem" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AppSkeleton width="100%" height="16rem" />
        <AppSkeleton width="100%" height="16rem" />
      </div>
      <AppSkeleton width="100%" height="12rem" />
    </div>
  )
}

/**
 * Central operacional do administrador. Declarativa: a query e a política de
 * estado moram em `useDashboard` (D9); aqui só se decide o ramo e se distribui
 * o dado já tipado.
 *
 * Layout "torre" (D16): fileira de KPIs; abaixo, pendências e alertas LADO A
 * LADO — as duas listas que respondem "o que faço agora", na primeira tela;
 * abaixo, agenda; abaixo, pipeline, que são leitura de contexto. Em telas
 * estreitas as duas colunas empilham.
 */
export function DashboardPage() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.user)
  const state = useDashboard()

  const header = (
    <PageHeader title={t('dashboard.welcome', { name: user?.name })} description={t('dashboard.subtitle')} />
  )

  if (state.kind === 'loading') {
    return (
      <div>
        {header}
        <DashboardSkeleton />
      </div>
    )
  }

  // Falhou E não há nada em cache: é o único caso em que o erro SUBSTITUI a tela.
  if (state.kind === 'error') {
    return (
      <div>
        {header}
        <AppErrorState
          title={t('common.loadError')}
          detail={state.error.detail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={state.retry}
        />
      </div>
    )
  }

  // D12: a view do Redator é do B2, e hoje nenhum redator autentica. Sem
  // placeholder e sem tela de transição — só o cabeçalho.
  if (state.kind === 'unsupported') return <div>{header}</div>

  // O caso-limite do §4: esconder cada seção nula, uma a uma, deixaria a página
  // em branco para quem não tem módulo nenhum — indistinguível de falha
  // silenciosa. A tela diz o que está acontecendo em vez de não dizer nada.
  if (state.kind === 'unauthorized') {
    return (
      <div>
        {header}
        <AppEmptyState
          icon="pi pi-lock"
          title={t('dashboard.noAccess.title')}
          description={t('dashboard.noAccess.description')}
        />
      </div>
    )
  }

  const { data } = state

  return (
    <div>
      {header}

      {/* Falha COM cache: aviso ao lado, a tela permanece utilizável (BD-6). */}
      <InlineLoadState error={state.staleError} retryLabel={t('common.retry')} onRetry={state.retry} />

      <div className="space-y-4">
        <KpiRow kpis={data.kpis} />

        <div className="grid gap-4 lg:grid-cols-2">
          <PendingList items={data.pendencias} />
          <AlertList items={data.alertas} />
        </div>

        {/* Seção nula por gate não renderiza (D6). */}
        {data.agenda !== null && <AgendaPanel agenda={data.agenda} />}
        {data.pipeline !== null && <PipelineFunnel stages={data.pipeline} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Escrever o barrel**

`frontend/src/app/pages/Dashboard/index.ts`:

```ts
// Só a página sai. `useDashboard`, `navigation` e os componentes de seção são
// mecanismo interno desta pasta — quem os quiser de fora está compondo errado.
export { DashboardPage } from './DashboardPage'
```

- [ ] **Step 3: Apagar o placeholder e reapontar a rota**

```bash
cd frontend && git rm src/app/pages/DashboardPage.tsx
```

Em `frontend/src/app/router/AppRouter.tsx:7`, trocar

```tsx
import { DashboardPage } from '@app/pages/DashboardPage'
```

por

```tsx
import { DashboardPage } from '@app/pages/Dashboard'
```

- [ ] **Step 4: Provar que não sobrou referência ao arquivo antigo**

```bash
cd frontend && grep -rn "pages/DashboardPage" src/ ; echo "exit=$?"
```

Esperado: nenhuma saída, `exit=1`.

- [ ] **Step 5: Rodar o gate completo**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

Esperado: `tsc -b` sem erro, eslint exit 0, **38 arquivos / 204 testes** (baseline 36/186 + os 13
casos da Task 4 e os 5 da Task 5).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/pages/Dashboard/ frontend/src/app/router/AppRouter.tsx
git add -u frontend/src/app/pages/
git commit -m "feat(dashboard): compoe a central de controle e substitui o placeholder"
```

---

### Task 11: prova do Definition of Done

**Files:** nenhum de produção. Esta task **mede** e registra; o que ela mudar em código é conserto
do que ela reprovar.

> As 5 seções renderizadas não têm teste automatizado (componente PrimeReact fora do corte do
> runner). Esta task é a prova que substitui isso, e é ela que fecha o DoD da spec §7.

- [ ] **Step 1: Subir o ambiente e olhar com dado real**

```bash
docker compose up -d
cd frontend && pnpm dev
```

Abrir http://localhost:5173 como admin. Conferir, na ordem: os 6 KPIs, pendências, alertas, agenda
e pipeline aparecem com dado do seed; nenhum rótulo aparece como chave crua
(`dashboard.pending.type.…` na tela = chave faltando).

- [ ] **Step 2: 3 locales × 2 temas**

Trocar idioma pelo `LanguageMenu` (es-CL, pt-BR, en) e tema pelo `AppearanceControls`, nas 6
combinações. Conferir: rótulo traduzido em todas; nenhuma cor ilegível no tema oposto; o detalhe
de cada item **em espanhol** nas outras duas locales é o esperado (D17), não achado.

- [ ] **Step 3: Provar o gate `null` com papel-sonda — não deduzir**

Mesmo mecanismo do fechamento do bloco A (`POST /api/roles` + `POST /api/users`). Criar dois papéis
de sonda e um usuário para cada:

1. **sem `commercial.*`** — esperado: o card de cotações **não** aparece, e a etapa comercial some
   do pipeline;
2. **sem `operation.turma.view`** — esperado: os 4 KPIs de turma **não** aparecem, a agenda **não**
   renderiza e o pipeline **não** renderiza (ele exige operação E certificação);
3. **sem nenhuma das três permissões de módulo** — esperado: a tela de `dashboard.noAccess`, não
   uma página em branco.

Remover as sondas ao fim.

- [ ] **Step 4: Provar os 5 sítios de UF do Comercial (D13) — é dinheiro na tela**

Abrir `/comercial`: `BudgetsTable` (coluna de valor total) e `BudgetStatCard`. Abrir um orçamento:
`QuoteRow` (valor da cotação). Abrir o wizard de cotação: o campo de valor (`DataStep`, que usa
`parseUfInput`) **aceita** "1.250,75" e o `useQuoteForm` o **repõe** formatado ao reabrir em
edição. O caminho de escrita é o que importa aqui: `tsc` verde não prova que o valor gravado está
certo.

- [ ] **Step 5: Provar a catraca de cor nos dois sentidos (D11)**

```bash
cd frontend && pnpm lint
```

Esperado: exit 0. Depois, reintroduzir `text-slate-400` em qualquer arquivo de
`src/app/pages/Dashboard/` e rodar de novo: esperado reprovar **nomeando arquivo e linha**.
Reverter a sonda.

- [ ] **Step 6: Provar zero mutação**

Contar as linhas das tabelas tocadas pelo Dashboard antes e depois de uma rodada da tela
(navegando por todos os CTAs e voltando):

```bash
docker compose exec -T app php artisan tinker --execute="foreach (['turmas','quotes','budgets','certificates','enrollments','files'] as \$t) { echo \$t.'='.DB::table(\$t)->count().PHP_EOL; }"
```

Esperado: números idênticos nas duas leituras, com as sondas de RBAC do Step 3 já removidas.

- [ ] **Step 7: Provar que o backend não foi tocado**

```bash
cd /home/jvbat/projetos/lotus
git diff main...HEAD -- backend/ ; echo "backend exit=$?"
git diff main...HEAD -- frontend/src/shared/types/generated.ts ; echo "generated exit=$?"
```

Esperado: as duas saídas **vazias**. Pint e `typescript:transform` são N/A por escopo — medido,
não suposto.

- [ ] **Step 8: Gate final**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

Esperado: exit 0, build verde, **38 arquivos / 204 testes**.

- [ ] **Step 9: `/lotus-ui-review`**

A revisão visual é passo do João (`disable-model-invocation: true`). O que ela deve olhar, como
lista fechada:

- **Desktop (≥1280px):** a torre lê de cima para baixo; pendências e alertas lado a lado cabem na
  primeira tela junto dos KPIs.
- **Tablet (768–1023px):** a sidebar colapsa (imposição de viewport) e as duas colunas ainda
  convivem ou empilham sem overflow horizontal.
- **Mobile (≤480px):** tudo empilha; nenhuma linha de item corta texto sem `truncate`; a data não
  colide com o rótulo.
- **Hierarquia:** um único `h1` (o `PageHeader`); os títulos de card são `h3` e os das janelas da
  agenda, `h4` — sem salto de nível.
- **Estados:** skeleton no primeiro load; `AppErrorState` com a rede desligada; `InlineLoadState`
  no topo quando o refetch falha **com** cache (a tela não pode sumir).
- **Vazios:** cada seção com o vazio dela, distinto de falha.

- [ ] **Step 10: Commit (se algum step exigiu conserto)**

```bash
git add -A frontend/
git commit -m "fix(dashboard): ajustes da revisao visual e da prova do DoD"
```

---

## Handoff de execução

**executor: claude**

O bloco é frontend puro, no **main tree** (P-03: task que toca backend assume main tree; esta não
toca backend, e a branch `feat/dashboard-frontend-central-controle` já está criada e com 3 commits
de estado). Fica com o Claude porque três das onze tasks são de **fronteira do repositório**, não de
escrita de tela: a Task 1 move um utilitário de dinheiro entre camadas, a Task 2 liga uma catraca de
lint numa camada inteira e reescreve um comentário normativo que a decisão torna falso, e a Task 11
é prova de DoD com papel-sonda de RBAC e contagem de tabela. Delegar isso pediria um Context Packet
de execução mais caro que o próprio trabalho.

**A Task 11 tem um passo que não é do executor:** o `/lotus-ui-review` (Step 9) é do João —
`disable-model-invocation: true`. O bloco não fecha sem ele.
