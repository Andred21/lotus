# Bloco 46 — Ajustes de interface, lote 1 — Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: `superpowers:subagent-driven-development` (recomendada)
> ou `superpowers:executing-plans`, task a task. Passos em checkbox (`- [ ]`).

**Goal:** aplicar as quatro mudanças de interface da ficha 46 (sete tickets) pela fonte
compartilhada, sem tocar backend.

**Architecture:** quase tudo muda em `shared/ui` (moldura do diálogo, faixa de seção, campo de
formulário, ações de linha, xadrez da assinatura) e em dois tokens novos do `brand-theme.css`; as
features só acompanham: o Curso troca de tamanho, os adaptadores de ações perdem `tooltip` e trocam
`leading` por `extra`, Presupuestos ganha ordenação, e a aba Configuración ganha padding.

**Tech Stack:** React 19 + TS, PrimeReact 10 (via `shared/ui`), Tailwind v4, Vitest + Testing
Library (jsdom).

**Spec:** `docs/superpowers/blocos/46-frontend-ajustes-de-interface-lote-1/spec.md` (D1–D9).
Tickets: `docs/superpowers/blocos/46-frontend-ajustes-de-interface-lote-1/tickets/01..07`.

## Global Constraints

- Comandos de `frontend/`: `pnpm build`, `pnpm lint`, `pnpm test` (gate de cada task e do bloco).
- Feature não importa PrimeReact nem outra feature (lei 6); cor só por `style={{ …: 'var(--…)' }}`
  (ADR-16); `COR_LITERAL_EM_STYLE` só aceita valor que comece por `var(` — nenhuma exceção nova em
  `eslint.config.js`.
- `ACAO_SEM_ANCORA` e `ACAO_SEM_COLAPSO` seguem verdes: nenhuma coluna de ação perde
  `stickyActionsColumn(colunaDeAcoes.width)`.
- i18n: rótulos já chegam traduzidos; chave nova, se houver, entra nos três locales (`es-CL`, `en`,
  `pt-BR`) com chaves idênticas.
- Docblocks e comentários em português, no tom dos vizinhos; a reversão da D1/P-36 é contada nos
  docblocks com data (2026-11-01) e autor (João).
- Valores da spec: respiro `pt-6 pb-6` (1.5rem); `lg` = `w-[95vw] sm:w-[85vw] lg:w-[70vw]
  max-w-[84rem]`; `sm` `max-w-[32rem]`, `md` `max-w-[48rem]`; título de seção
  `var(--primary-color)`; `--section-rule: color-mix(in srgb, var(--primary-color) 35%,
  transparent)`; xadrez da assinatura no escuro `--primary-300`/`--primary-200`, no claro
  `--surface-border`/`--surface-card`; Configuración `p-6`.

## Review Focus

1. **Dica de botão desabilitado na borda direita da tabela** — tem de abrir à esquerda e não criar
   rolagem horizontal (Task 4 trava `p-tooltip-left` também no desabilitado sem `tooltip`).
2. **Código de Presupuestos com três e quatro dígitos** — "Scap 1000" depois de "Scap 999" na
   ordem crescente, também com busca ou filtro de estado ativos (Task 5).
3. **Orçamento sem `status`** — vai para o fim nos dois sentidos da ordenação de Estado (Task 5).
4. **`lg` maximizado e restaurado** — o maximizado solta o teto e o restaurado volta à largura nova
   (Task 1 trava a classe `[&.p-dialog-maximized]:max-w-none` junto com as novas).
5. **`FormField` em leitura e com erro** — a label mais pesada não muda nome acessível, `htmlFor`
   nem o par label/valor em leitura (Task 2).

---

### Task 1: Moldura do `AppDialog` — respiro simétrico, `lg` mais largo, Curso em `lg`

Tickets 01 e 05. Spec D5 e D8.

**Files:**
- Modify: `frontend/src/shared/ui/AppDialog/style.ts`
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.test.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx:31`

**Interfaces:**
- Consumes: nada.
- Produces: `appDialogPt(size)` com o mesmo tipo; `TETO.lg` novo; conteúdo `pt-6 pb-6`.

- [ ] **Passo 1: testes que falham** em `AppDialog.test.tsx`, no `describe('AppDialog — tamanho')`:
  - trocar a linha `['lg', 'max-w-[64rem]']` por `['lg', 'max-w-[84rem]']`;
  - `it('lg cresce em degraus: 95vw, 85vw a partir de sm, 70vw a partir de lg')`: raiz contém
    `w-[95vw]`, `sm:w-[85vw]`, `lg:w-[70vw]`, `max-w-[84rem]`;
  - `it.each(['sm', 'md'])('%s não ganha os degraus do lg')`: raiz não contém `sm:w-[85vw]` nem
    `lg:w-[70vw]`;
  - `it('o corpo tem o mesmo respiro em cima e embaixo')`: `.p-dialog-content` contém `pt-6` e
    `pb-6`, e não contém `pt-2`.
  - O teste existente do maximizado (`[&.p-dialog-maximized]:max-w-none`) fica como está.
- [ ] **Passo 2:** `pnpm test src/shared/ui/AppDialog` — esperado: FAIL nos quatro casos novos.
- [ ] **Passo 3: implementar** em `style.ts`: `TETO.lg = 'sm:w-[85vw] lg:w-[70vw] max-w-[84rem]
  [&.p-dialog-maximized]:max-w-none'` (o `w-[95vw]` do root continua valendo para os três);
  `content: { className: 'bg-[var(--surface-card)] pt-6 pb-6' }`. Reescrever o docblock do `TETO`
  (o teto do `lg` deixou de ser 64rem: 84rem = 70vw de 1920px, para não virar faixa em ultrawide) e
  o do `appDialogPt` (respiro simétrico de 1.5rem, igual ao lateral do Lara). Em `CourseDialog.tsx`,
  `size="md"` vira `size="lg"`.
- [ ] **Passo 4:** `pnpm test src/shared/ui/AppDialog src/shared/ui/CrudDialog
  src/features/catalog` — esperado: PASS.
- [ ] **Passo 5:** `pnpm build && pnpm lint` — esperado: sem erro.
- [ ] **Passo 6: commit** `feat(46): dialogo com respiro simetrico e lg mais largo; Curso em lg`.

---

### Task 2: Hierarquia seção × label × valor (reverte a D1/P-36)

Ticket 02. Spec D1–D4.

**Files:**
- Modify: `frontend/src/shared/styles/brand-theme.css` (token `--section-rule` no `:root`)
- Modify: `frontend/src/shared/ui/SectionLabel/SectionLabel.tsx`
- Modify: `frontend/src/shared/ui/SectionLabel/SectionLabel.test.tsx`
- Modify: `frontend/src/shared/ui/FormSection/FormSection.tsx`
- Modify: `frontend/src/shared/ui/FormSection/FormSection.test.tsx`
- Modify: `frontend/src/shared/ui/FormField/FormField.tsx:5-15,70-76`
- Modify: `frontend/src/shared/ui/FormField/FormField.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `SectionLabelProps.tone?: 'body' | 'brand'` (default `'body'`); token CSS
  `--section-rule`.

- [ ] **Passo 1: testes que falham.**
  - `SectionLabel.test.tsx`: o caso "pinta com a tinta de corpo" fica (é o default `body`); novo
    `it('tone="brand" pinta o título de --primary-color e a linha de --section-rule')`: heading com
    `style` contendo `var(--primary-color)`, `span[aria-hidden="true"]` com `style` contendo
    `var(--section-rule)`; novo `it('tone body mantém a linha em --surface-border')`. Reescrever o
    docblock do caso de tinta: a P-36 não trava mais o `SectionLabel` inteiro, só o default.
  - `FormSection.test.tsx`: trocar "pinta o título com a tinta de CORPO" por
    `it('pinta o título de --primary-color (reversão da D1/P-36, João, 2026-11-01)')`; novo
    `it('traz a linha contínua até a borda')`: existe `span[aria-hidden="true"]` com `style`
    contendo `var(--section-rule)`; o caso de grafia (`sectionLabelClass`) e os de `spaced` e
    `as="h2"` ficam. Reescrever o docblock do topo contando a reversão e o contraste aceito no claro.
  - `FormField.test.tsx`: `it('a label sai em 14px peso 500 na tinta de corpo')`: o `<label>` tem
    `className` contendo `text-sm` e `font-medium`, `style` contendo `var(--text-color)` e não
    `--text-color-secondary`; `it('o valor de leitura sai em 14px regular na tinta de corpo')`: o
    valor tem `text-sm` e não `font-medium`; `it('em leitura a label segue sem htmlFor e com erro o
    nome acessível do controle não muda')` — `getByLabelText(label)` acha o controle em edição, e em
    `readOnly` o `<label>` não tem `for`.
- [ ] **Passo 2:** `pnpm test src/shared/ui/SectionLabel src/shared/ui/FormSection
  src/shared/ui/FormField` — esperado: FAIL nos casos novos.
- [ ] **Passo 3: implementar.**
  - `brand-theme.css`, no `:root` (vale nos dois temas), com comentário curto do porquê
    (transparência, não degrau da rampa, para a linha ficar abaixo do título nos dois temas):
    `--section-rule: color-mix(in srgb, var(--primary-color) 35%, transparent);`.
  - `SectionLabel`: prop `tone`; `brand` → heading `color: 'var(--primary-color)'` e linha
    `background: 'var(--section-rule)'`; `body` → como hoje. Docblock da prop diz que `brand` é do
    `FormSection` e que as faixas de Dashboard, Sidebar e cartões ficam em `body` (spec D2).
  - `FormSection`: `<SectionLabel as={as} tone="brand" className={…}>` sem `rule={false}`;
    docblock reescrito (o bloco "A tinta de marca saiu daqui, e não volta" vira o registro da
    reversão: motivo, contraste 2,77:1 aceito no claro, data e autor).
  - `FormField`: label `className="mb-1 block text-sm font-medium"`, `style={{ color:
    'var(--text-color)' }}`. `ReadOnlyValue` não muda.
- [ ] **Passo 4:** `pnpm test` — esperado: PASS na suíte inteira (outros testes podem medir a
  label secundária; corrigir só os que medem a regra antiga, sem afrouxar o resto).
- [ ] **Passo 5:** `pnpm build && pnpm lint` — esperado: sem erro.
- [ ] **Passo 6: commit** `feat(46): secao no celeste com linha e label com peso; reverte D1/P-36`.

---

### Task 3: Fundo da assinatura sempre claro

Ticket 07. Spec D9.

**Files:**
- Modify: `frontend/src/shared/styles/brand-theme.css` (tokens no `:root` e no `html:not(.dark)`)
- Modify: `frontend/src/shared/ui/AppSignatureUpload/checkerboard.ts`
- Modify: `frontend/src/shared/ui/AppSignatureUpload/AppSignatureUpload.test.tsx`

**Interfaces:**
- Consumes: `brand-theme.css` já com o `--section-rule` da Task 2 (mesmo arquivo; só ordem).
- Produces: tokens `--signature-bg-a`, `--signature-bg-b`; `signatureCheckerboard` com a mesma
  forma (`{ backgroundImage, backgroundSize }`).

- [ ] **Passo 1: teste que falha** em `AppSignatureUpload.test.tsx`:
  `it('o xadrez lê os tokens da assinatura, não as superfícies do tema')`: importar
  `signatureCheckerboard` de `./checkerboard` e esperar `backgroundImage` contendo
  `var(--signature-bg-a)` e `var(--signature-bg-b)` e não contendo `--surface-card`.
- [ ] **Passo 2:** `pnpm test src/shared/ui/AppSignatureUpload` — esperado: FAIL.
- [ ] **Passo 3: implementar.**
  - `checkerboard.ts`: `repeating-conic-gradient(var(--signature-bg-a) 0% 25%,
    var(--signature-bg-b) 0% 50%)`; comentário: assinatura é traço escuro, então o fundo é claro nos
    dois temas.
  - `brand-theme.css`: no `:root` (o escuro), `--signature-bg-a: var(--primary-300);
    --signature-bg-b: var(--primary-200);`; no `html:not(.dark)`, `--signature-bg-a:
    var(--surface-border); --signature-bg-b: var(--surface-card);` (o xadrez de hoje).
- [ ] **Passo 4:** `pnpm test src/shared/ui/AppSignatureUpload
  src/features/certification/components/Settings` — esperado: PASS.
- [ ] **Passo 5:** `pnpm build && pnpm lint` — esperado: sem erro.
- [ ] **Passo 6: commit** `feat(46): fundo da assinatura sempre claro`.

---

### Task 4: Ações de linha — ver primeiro, centralizadas, dica em todo botão

Ticket 03. Spec D6.

**Files:**
- Modify: `frontend/src/shared/ui/RowActions/RowActions.tsx`
- Modify: `frontend/src/shared/ui/ArchiveRowActions/ArchiveRowActions.tsx`
- Modify: `frontend/src/shared/ui/RowActions/RowActions.test.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CourseRowActions.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorRowActions.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx:119-131`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentRowActions.tsx`
- Modify: `frontend/src/features/certification/components/Emission/EmissionRowActions.tsx`
- Modify: `frontend/src/features/certification/components/Historial/HistorialRowActions.tsx`
- Modify (só se medirem a ordem antiga): `features/identity/components/Redator/RedatorRowActions.test.tsx`,
  `features/identity/components/Admin/UserRowActions.test.tsx`,
  `features/operation/components/Turma/TurmaRowActions.test.tsx`,
  `features/catalog/components/Course/CourseRowActions.test.tsx`,
  `features/catalog/components/Course/CoursesTable.test.tsx`,
  `features/commercial/components/Client/ClientsTable.test.tsx`,
  `features/identity/components/Admin/UsersTable.test.tsx`,
  `features/operation/components/Turma/TurmasTable.test.tsx` (todos sob `frontend/src/`)

**Interfaces:**
- Consumes: nada.
- Produces: `RowAction` **sem** `tooltip`; `ArchiveRowActions` com `extra?: RowAction[]` no lugar
  de `leading`.

- [ ] **Passo 1: testes que falham** em `RowActions.test.tsx`:
  - `it('os botões soltos ficam centralizados na coluna')`: o contêiner dos botões tem
    `justify-center` e não `justify-end`; idem o do gatilho colapsado.
  - `it('todo botão mostra o rótulo como dica, sem precisar pedir')`: `acao('Ver')` sem `tooltip`,
    `mouseEnter` no botão, `.p-tooltip` com o texto `Ver` e classe `p-tooltip-left`.
  - `it('o botão desabilitado também mostra a dica, à esquerda')`: `acao('Emitir', { disabled:
    true })` sem `tooltip`; hover no `span` envolvente; `.p-tooltip` com `Emitir` e
    `p-tooltip-left`.
  - Os dois casos atuais com `{ tooltip: true }` perdem a opção (o tipo não a tem mais).
  - Em `describe('ArchiveRowActions colapsada')`: renomear `leading` para `extra` e trocar a ordem
    esperada para `['common.view', 'redator.resendInvitation', 'archive.archiveAction']`, no menu e
    fora dele; `it('o restaurar só-ícone mostra a dica')`: colapsado em arquivados, hover, `.p-tooltip`
    com `archive.restoreAction`; `it('o restaurar fica centralizado na célula')`.
- [ ] **Passo 2:** `pnpm test src/shared/ui/RowActions` — esperado: FAIL nos casos novos.
- [ ] **Passo 3: implementar.**
  - `RowActions.tsx`: tirar `tooltip` do tipo `RowAction`; `RowActionButton` usa
    `tooltip={!acao.disabled ? acao.label : undefined}` e o envoltório com `Tooltip` sempre que
    `acao.disabled`; `justify-end` vira `justify-center` nos dois contêineres. Atualizar o docblock
    (a dica deixou de ser opcional: era opt-in e cinco tabelas ficavam sem).
  - `ArchiveRowActions.tsx`: prop `extra` (docblock: ações próprias da feature, entre ver e
    arquivar); `actions` montado como ver → `...extra` → arquivar; o restaurar dentro de
    `<div className="flex justify-center">`, e o só-ícone com `tooltip={label}` e
    `tooltipOptions={{ position: 'left' }}`.
  - Adaptadores: `CourseRowActions` e `RedatorRowActions` passam `extra`; `RedatoresTable` passa
    `extra` e perde `tooltip: true`; `EnrollmentRowActions`, `EmissionRowActions` e
    `HistorialRowActions` perdem `tooltip: true` (a ordem deles já é ver → próprias → destrutiva;
    em Historial revogar e reemitir são exclusivos pelo status).
- [ ] **Passo 4:** `pnpm test` — esperado: PASS; ajustar os testes de feature listados que medem a
  ordem antiga para a nova (ver → próprias → arquivar), sem mudar o que mais medem.
- [ ] **Passo 5:** `pnpm build && pnpm lint` — esperado: sem erro (o `tsc` acusa todo
  `tooltip: true` e `leading` esquecido).
- [ ] **Passo 6: commit** `feat(46): acoes de linha com ver primeiro, centro e dica em todo botao`.

---

### Task 5: Presupuestos — mais novo primeiro e ordenação por Código, Estado e Cotizaciones

Ticket 04. Spec D7.

**Files:**
- Create: `frontend/src/features/commercial/lib/budgetOrder.ts`
- Create: `frontend/src/features/commercial/lib/budgetOrder.test.ts`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.test.tsx`

**Interfaces:**
- Consumes: `BudgetData`, `QuoteStatus` de `@shared/types/generated`.
- Produces, em `budgetOrder.ts`:
  - `newestFirst<T extends { id?: number }>(rows: readonly T[]): T[]` — cópia por `id`
    decrescente, `id` ausente no fim;
  - `sortBudgetsBy<T extends Pick<BudgetData, 'status' | 'quotes'>>(rows: readonly T[], key:
    'status' | 'quoteCount', order: 1 | -1): T[]` — cópia; `status` pela posição `pending` <
    `approved` < `rejected`, sem estado no fim nos dois sentidos; `quoteCount` por
    `quotes.length`.

- [ ] **Passo 1: testes que falham.**
  - `budgetOrder.test.ts`: `newestFirst` com ids `[5, 1000, 999]` devolve `[1000, 999, 5]` e não
    muta a entrada; `sortBudgetsBy(…, 'status', 1)` com `['rejected', undefined, 'pending',
    'approved']` devolve `['pending', 'approved', 'rejected', undefined]`; com `-1` devolve
    `['rejected', 'approved', 'pending', undefined]`; `'quoteCount'` com 2, 0, 1 cotações ordena
    `[0, 1, 2]` em `1` e `[2, 1, 0]` em `-1`.
  - `BudgetsTable.test.tsx`: `it('abre com o Scap mais novo no topo')` — linhas com ids 999, 1000 e
    5 (códigos `Scap 999`, `Scap 1000`, `Scap 5`) entregues em ordem crescente; a primeira linha do
    corpo mostra `Scap 1000`. `it('Código ordena pelo número, não pelo texto')` — um clique no
    cabeçalho `budget.code` dá `Scap 5`, `Scap 999`, `Scap 1000`. `it('Estado ordena
    Pendiente → Aprobada → Rechazada')` — um clique no cabeçalho `budget.status`.
    `it('Código, Estado e Cotizaciones mostram a seta de ordenação')` — os três `th` têm
    `aria-sort` (ou o ícone de sort do Prime). `it('a visão de arquivados segue ordenando')` — mesmo
    clique em Código com `mode="archived"`.
- [ ] **Passo 2:** `pnpm test src/features/commercial` — esperado: FAIL nos casos novos.
- [ ] **Passo 3: implementar.**
  - `budgetOrder.ts` com as duas funções e um docblock curto (o `id` é o número do Scap; estado
    pela ordem do negócio, não pelo texto traduzido — decisão do João, 2026-11-01).
  - `BudgetsTable.tsx`: `useTableFilter(newestFirst(budgets), …)` (memo por `budgets`); coluna
    Código com `field="id" sortable`; Cotizaciones e Estado com `sortable` e
    `sortFunction={(e) => sortBudgetsBy(e.data, 'quoteCount' | 'status', e.order === -1 ? -1 : 1)}`.
    O `removableSort` do `AppDataTable` devolve a ordem padrão no terceiro clique.
- [ ] **Passo 4:** `pnpm test src/features/commercial` — esperado: PASS.
- [ ] **Passo 5:** `pnpm build && pnpm lint` — esperado: sem erro.
- [ ] **Passo 6: commit** `feat(46): Presupuestos do mais novo e ordenacao por codigo, estado e cotizaciones`.

---

### Task 6: Respiro da aba Configuración › Certificados

Ticket 06. Spec D5 (segundo parágrafo).

**Files:**
- Modify: `frontend/src/app/pages/Administracion/ConfiguracionTab.tsx`
- Create: `frontend/src/app/pages/Administracion/ConfiguracionTab.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Passo 1: teste que falha** em `ConfiguracionTab.test.tsx`, com `vi.mock` do
  `CertificateSettingsPanel` devolvendo um marcador e o `mockUseTranslation` de `@shared/testing/i18n`:
  `it('o corpo da aba tem o mesmo respiro do diálogo em todo o contorno')` — o grid raiz contém
  `p-6` e segue com `md:grid-cols-[14rem_minmax(0,1fr)]`.
- [ ] **Passo 2:** `pnpm test src/app/pages/Administracion` — esperado: FAIL.
- [ ] **Passo 3: implementar:** `className="grid gap-6 p-6 md:grid-cols-[14rem_minmax(0,1fr)]"` e
  uma linha no docblock (o `panelContainer` do `AppTabView` é `p-0` para as tabelas de borda a
  borda; o respiro desta aba é dela).
- [ ] **Passo 4:** `pnpm test src/app/pages/Administracion` — esperado: PASS.
- [ ] **Passo 5:** `pnpm build && pnpm lint` — esperado: sem erro.
- [ ] **Passo 6: commit** `feat(46): respiro na aba Configuracion`.

---

### Task 7: Prova na tela, no stack da lane

DoD da ficha: cada mudança provada no navegador, no stack da lane (offset +3). Executada pela
sessão, não por subagente.

**Files:**
- Create: `docs/superpowers/blocos/46-frontend-ajustes-de-interface-lote-1/prova.md`

**Interfaces:**
- Consumes: Tasks 1–6 commitadas.
- Produces: `prova.md`, uma linha por critério dos tickets 01–07, com o número medido.

- [ ] **Passo 1:** subir o stack conforme a saída do `lane.sh abrir` (offset +3) e `pnpm dev`.
- [ ] **Passo 2: medir e registrar**, nos temas claro e escuro onde o ticket pede:
  - respiro: em cima = embaixo no diálogo de Cliente, num de certificação e em Configuración ›
    Certificados (se o `pb-6` perder para o Lara na cascata, usar `pb-6!`, rodar a Task 1 de novo e
    registrar);
  - contraste do título de seção sobre `--surface-card` nos dois temas, com a razão (o claro fica
    abaixo do AA por decisão do João — o número vai para o registro);
  - label × valor × seção no Cliente (leitura e edição), no Perfil e no login;
  - ações: ordem, centro e dica em Clientes, Presupuestos, Cursos, Usuarios, Redactores, Clases e
    matrículas arquivadas, inclusive desabilitado e no menu em 390px, sem rolagem horizontal;
  - Presupuestos: abre no Scap mais novo; Código, Estado e Cotizaciones ordenam;
  - `lg` em 1440 (~1008px), 1920 (1344px), 2560 (1344px) e 390 (95vw); maximizar e restaurar;
    Curso em `lg` com maximizar, em leitura e edição;
  - assinatura legível no escuro em Configuración › Certificados, Perfil e Redactor; o claro igual
    a antes. Se o xadrez ficar forte demais, descer para `--primary-100`/`--primary-200` (D9) e
    registrar.
- [ ] **Passo 3:** `pnpm build && pnpm lint && pnpm test` — esperado: tudo verde.
- [ ] **Passo 4: commit** `docs(46): prova na tela das quatro mudancas`.

---

## Grupos paralelos

| Grupo | Tasks | Files: disjuntos | Aresta Consumes/Produces |
|---|---|---|---|
| G1 | 1, 4, 5, 6 | sim | nenhuma entre elas |

Task fora de grupo executa e revisa uma a uma. As Tasks 2 e 3 dividem o `brand-theme.css` e
correm em sequência (2 antes de 3); a Task 7 depende de todas e fecha o bloco.

Conferência por par do G1: a Task 1 toca `AppDialog/*` e `CourseDialog.tsx`; a 4, `RowActions`,
`ArchiveRowActions`, os seis adaptadores e os testes de feature listados (nenhum de `Budget/` nem
`CourseDialog`); a 5, `features/commercial/lib/budgetOrder*` e `Budget/BudgetsTable*`; a 6,
`app/pages/Administracion/ConfiguracionTab*`. Nenhuma consome o que outra produz.

## Handoff de execução

- **executor:** `claude`. A Task 2 reverte uma decisão registrada (D1/P-36) e reescreve docblocks
  e testes que a sustentavam; a Task 7 é julgamento visual no navegador. Nenhuma das duas é
  mecânica com caminhos fechados.
- **Sessão:** `opus`, esforço da sessão do `/executar-bloco`.
- **Papéis (`.claude/papeis.md`):** `implementador-mecanico` (Tasks 1, 3, 6),
  `implementador-integracao` (Tasks 2, 4, 5), `revisor-task` (cada task), `re-revisor` (rodadas
  de correção), `corretor-tardio` (rodadas 4–5, se houver), `revisor-branch` (fim da SDD). A Task 7
  roda na sessão.
- **paths_autorizados:** não se aplica (`executor: claude`).
