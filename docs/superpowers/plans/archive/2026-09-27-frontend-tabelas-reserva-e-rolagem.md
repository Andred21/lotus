# `frontend-tabelas-reserva-e-rolagem` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pagar a `D-65`: nenhuma tabela rola nem tem dado coberto pela coluna presa em 1024x768, e em 390x844 a coluna identificadora nunca fica sob a presa e a linha carrega um controle só — mais o `Timestamp` (hora + data com ícones) no relógio do cabeçalho e no "Último acceso".

**Architecture:** O piso default do `AppDataTable` cai para 42rem (cabe em toda moldura de 1024); as oito tabelas restantes ligam `useCollapsibleActionsColumn` e montam as ações por `RowActions`/`ArchiveRowActions`, com uma catraca de ESLint que reprova coluna presa sem o hook; o piso estreito por modo (`sm:` volta ao default) só nasce onde a medição de 390 reprovar. O `Timestamp` é um componente de `shared/ui` sobre os formatadores de `shared/lib/datetime.ts`.

**Tech Stack:** React 19 + TS, PrimeReact 10.9.8 via `shared/ui`, Tailwind v4, vitest + jsdom + Testing Library, ESLint `no-restricted-syntax` (esquery), Playwright-core (medição read-only).

**Spec:** `docs/superpowers/specs/archive/2026-09-27-frontend-tabelas-reserva-e-rolagem-design.md` (aprovada pelo João em 2026-09-27, com os refinamentos do §3 e do §4.2).

## Global Constraints

- Escopo de escrita: `frontend/**` e `docs/superpowers/audits/2026-09-27-item23-medicoes.md`. **Zero `backend/`**, zero `frontend/src/shared/types/generated.ts`.
- Piso default: `min-w-[42rem]` composto com `TABLE_LAYOUT` (`table-fixed`). Feature nunca escreve a string do piso: `mergePt` SUBSTITUI a folha `table.className`.
- Toda coluna presa: `style={stickyActionsColumn(<retorno de useCollapsibleActionsColumn>.width)}`.
- Ação de linha só por `RowActions`/`ArchiveRowActions` (`shared/ui`). Feature não importa PrimeReact nem outra feature (CLAUDE.md §5.6).
- `Timestamp` só onde já há data e hora juntas: `Clock` e "Último acceso" de `UsersTable` e `RedatoresTable`. Máscara = `formatTime`/`formatDate` do idioma ativo; ano com 4 dígitos; fuso do navegador.
- Ícones do `Timestamp`: `pi-clock` e `pi-calendar`, `var(--primary-color)` (`#25a5e4`, `rgb(37, 165, 228)`), `aria-hidden`.
- Catraca provada por sonda restaurada com `cp` do scratchpad — **nunca `git stash`** (a pilha é compartilhada entre árvores).
- Medição: offset +2 (SPA `http://localhost:5175`, API `http://localhost:8082`), es-CL, tema claro, `admin@lotus.cl` / `senha123`, viewports `1024x768`, `390x844`, `1440x900`.
- Régua (spec §3): 1024 → `scrollWidth == clientWidth`, sobreposição 0, nenhum cabeçalho truncado (Dashboard: tabela ≤ moldura; o transbordo de 25px está fora). 390 → caixa de conteúdo da 1ª célula ≤ borda esquerda da presa em toda linha; um controle por linha com 2+ ações; em arquivados a 1ª coluna ≥ a da visão ativa. 1440 → sem regressão.
- Comandos de frontend rodam em `frontend/`: `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm exec vitest run <arquivo>`, `pnpm exec eslint <arquivo>`.
- Todo commit termina com a linha de coautoria que a sessão de execução recebe no system-reminder.
- `$SCRATCH` abaixo = o scratchpad da sessão de execução (o system prompt dá o caminho). Os scripts de medição vivem lá e entram no audit como apêndice.

---

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `$SCRATCH/medir.cjs` | medição read-only das 15 consumidoras | 1 |
| `$SCRATCH/fixture.cjs` | arquiva 1 registro por visão de arquivados e restaura | 1 |
| `$SCRATCH/timestamp.cjs` | máscara e cor do `Timestamp` no navegador | 10 |
| `docs/superpowers/audits/2026-09-27-item23-medicoes.md` | registro antes/depois, X do §4.2, vereditos, apêndices | 1, 8, 9, 10 |
| `frontend/src/shared/ui/Timestamp/{Timestamp.tsx,Timestamp.test.tsx,index.ts}` | instante em duas linhas com ícones | 2 |
| `frontend/src/shared/ui/Clock/{Clock.tsx,Clock.test.tsx}` | relógio = `useClock` + `Timestamp` | 2 |
| `frontend/src/shared/lib/{datetime.ts,datetime.test.ts}` | sai `formatDateTime` | 3 |
| `frontend/src/features/identity/components/Admin/{UsersTable.tsx,UsersTable.test.tsx}` | "Último acceso" no `Timestamp`; sai o piso reduzido | 3, 4 |
| `frontend/src/features/identity/components/Redator/{RedatoresTable.tsx,RedatoresTable.test.tsx,redatorColumns.ts}` | idem | 3, 4 |
| `frontend/src/shared/ui/AppDataTable/{style.ts,index.ts,AppDataTable.test.tsx}` | piso default 42rem; `narrowFloorTablePt` se nascer | 4, 9 |
| `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx` | docblock do `pt` | 4 |
| `frontend/src/features/identity/components/Admin/{RolesTable.tsx,RolesTable.test.tsx}` | sai o piso reduzido | 4 |
| `frontend/src/shared/ui/RowActions/{RowActions.tsx,RowActions.test.tsx,useCollapsibleActionsColumn.ts}` | `severity` e `describedBy`; docblock | 5, 6 |
| `frontend/src/features/certification/components/Historial/{HistorialRowActions.tsx,HistorialTable.tsx,HistorialTable.test.tsx}` | ações por ícone + colapso | 5 |
| `frontend/src/features/certification/components/Emission/{EmissionRowActions.tsx,EmissionStudentsTable.tsx,EmissionStudentsTable.test.tsx}` | idem | 5 |
| `frontend/src/features/operation/components/Enrollment/{EnrollmentRowActions.tsx,EnrollmentTable.tsx,EnrollmentTable.test.tsx,ArchivedEnrollmentsList.tsx,ArchivedEnrollmentsList.test.tsx}` | idem | 5 |
| `frontend/src/shared/ui/ArchiveRowActions/ArchiveRowActions.tsx` | docblock | 6 |
| `frontend/src/features/operation/components/Turma/{TurmaRowActions.tsx,TurmasTable.tsx,TurmasTable.test.tsx}` | colapso | 6 |
| `frontend/src/features/commercial/components/Client/{ClientRowActions.tsx,ClientsTable.tsx,ClientsTable.test.tsx}` | colapso | 6 |
| `frontend/src/features/commercial/components/Budget/{BudgetRowActions.tsx,BudgetsTable.tsx,BudgetsTable.test.tsx}` | colapso | 6 |
| `frontend/src/features/catalog/components/Course/{CourseRowActions.tsx,CoursesTable.tsx,CoursesTable.test.tsx}` | colapso | 6 |
| `frontend/eslint.config.js` | catraca `ACAO_SEM_COLAPSO` | 7 |

**Desvio consciente da spec §4.3, registrado aqui:** a Matrícula arquivada passa a `ArchiveRowActions` (e não a `RowActions` cru). É o componente de `shared/ui` construído sobre `RowActions` que as outras seis visões de arquivados já usam: rótulo "Restaurar" de `sm` para cima, ícone com nome acessível abaixo. Com `RowActions` cru ela seria a única visão de arquivados com restaurar só-ícone no desktop. O objetivo do §4.3 (um controle, colapsável) se mantém.

---

### Task 1: Instrumento, fixture e baseline

**Files:**
- Create: `$SCRATCH/medir.cjs`
- Create: `$SCRATCH/fixture.cjs`
- Create: `docs/superpowers/audits/2026-09-27-item23-medicoes.md`

**Interfaces:**
- Produces: `node medir.cjs` (env `VPS`, `PAGES`, `OUT`), `node fixture.cjs archive|restore` (grava/lê `$SCRATCH/fixture-ids.json`). As Tasks 8 e 10 rodam os dois.

- [ ] **Step 1: Subir o ambiente e conferir**

```bash
cd /home/jvbat/projetos/fix-frontend && docker compose ps --format '{{.Service}} {{.State}}'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082/sanctum/csrf-cookie
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5175/
```

Expected: `app`, `nginx`, `mysql` em `running`; `204` e `200`. Se o `:5175` não responder, rode `pnpm dev` em `frontend/` em background (a porta vem do `.env` da raiz). Se o compose não estiver de pé: `docker compose up -d` na raiz da árvore.

- [ ] **Step 2: Escrever `$SCRATCH/medir.cjs`**

```js
// medir.cjs — medição read-only das tabelas do item 23 (D-65).
// Uso: VPS=1024x768,390x844 PAGES=/,/comercial OUT=saida.json node medir.cjs
const fs = require('fs')
const { chromium } = require(
  process.env.PW ||
    '/home/jvbat/.nvm/versions/node/v22.23.1/lib/node_modules/@playwright/cli/node_modules/playwright-core',
)

const BASE = process.env.BASE || 'http://localhost:5175'
const VIEWPORTS = (process.env.VPS || '1024x768,390x844,1440x900').split(',').map((v) => v.split('x').map(Number))
const PAGES = (
  process.env.PAGES || '/,/comercial,/operacion,/operacion/turmas/1,/cursos,/certificados,/personas,/administracion'
).split(',')

function measure() {
  const out = []
  document.querySelectorAll('.p-datatable-wrapper').forEach((w) => {
    if (!w.offsetParent) return
    const table = w.querySelector('table')
    const ths = [...table.querySelectorAll('thead th')]
    // Só linhas de dado: a linha de "sem resultados" tem uma célula com colspan.
    const bodyRows = [...table.querySelectorAll('tbody tr')].filter((tr) => tr.children.length === ths.length)
    const cells = bodyRows.length ? [...bodyRows[0].children] : ths
    const sticky = cells.find((c) => getComputedStyle(c).position === 'sticky')
    const stickyLeft = sticky ? sticky.getBoundingClientRect().left : null
    let overlap = 0
    let coveredCol = null
    if (sticky) {
      cells.forEach((c, i) => {
        if (c === sticky) return
        const r = c.getBoundingClientRect()
        const o = Math.min(r.right, sticky.getBoundingClientRect().right) - Math.max(r.left, stickyLeft)
        if (o > overlap) {
          overlap = Math.round(o)
          coveredCol = (ths[i]?.innerText || '').trim()
        }
      })
    }
    // Régua de 390 (spec §3): a CAIXA de conteúdo da 1ª célula contra a presa,
    // pior linha. O texto coberto sai junto só como referência (a leitura da D-65).
    let firstBoxCovered = 0
    let firstTextCovered = 0
    let firstColW = null
    let free = null
    if (sticky && bodyRows.length) {
      bodyRows.forEach((tr) => {
        const td = tr.children[0]
        const r = td.getBoundingClientRect()
        firstColW = Math.round(r.width)
        free = Math.round(stickyLeft - r.left)
        const contentRight = r.right - parseFloat(getComputedStyle(td).paddingRight)
        firstBoxCovered = Math.max(firstBoxCovered, Math.round(contentRight - stickyLeft))
        const range = document.createRange()
        range.selectNodeContents(td)
        const rects = [...range.getClientRects()].filter((x) => x.width > 0)
        if (rects.length) {
          const textRight = Math.min(Math.max(...rects.map((x) => x.right)), contentRight)
          firstTextCovered = Math.max(firstTextCovered, Math.round(textRight - stickyLeft))
        }
      })
    }
    const truncHeaders = ths
      .filter((th) => {
        const t = th.querySelector('.p-column-title') || th
        return t.scrollWidth > t.clientWidth + 1
      })
      .map((th) => th.innerText.trim())
    out.push({
      inDialog: !!w.closest('.p-dialog'),
      headers: ths.map((th) => `${th.innerText.trim() || '·'}:${Math.round(th.getBoundingClientRect().width)}`).join(' | '),
      frame: w.clientWidth,
      scrollW: w.scrollWidth,
      table: Math.round(table.getBoundingClientRect().width),
      tableMinW: getComputedStyle(table).minWidth,
      stickyW: sticky ? Math.round(sticky.getBoundingClientRect().width) : null,
      overlap,
      coveredCol,
      firstColW,
      free,
      firstBoxCovered: Math.max(0, firstBoxCovered),
      firstTextCovered: Math.max(0, firstTextCovered),
      truncHeaders,
      rows: bodyRows.length,
    })
  })
  return out
}

async function snap(page, label, results, onlyDialog = false) {
  await page.waitForTimeout(1800)
  const r = await page.evaluate(measure)
  r.filter((t) => !onlyDialog || t.inDialog).forEach((t) => results.push({ label, ...t }))
}

;(async () => {
  const browser = await chromium.launch()
  const results = []
  for (const [w, h] of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'es-CL' })
    await ctx.addInitScript(() => localStorage.setItem('lotus-lang', 'es-CL'))
    const page = await ctx.newPage()
    await page.goto(`${BASE}/login`)
    await page.fill('input[type=email], input[name=email]', 'admin@lotus.cl')
    await page.fill('input[type=password]', 'senha123')
    await page.keyboard.press('Enter')
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
    for (const path of PAGES) {
      await page.goto(`${BASE}${path}`)
      await page.waitForLoadState('networkidle')
      const tabs = await page.locator('[role=tab]').all()
      const tabNames = tabs.length ? await Promise.all(tabs.map((t) => t.innerText())) : ['']
      for (let i = 0; i < tabNames.length; i++) {
        if (tabs.length) {
          await tabs[i].click()
          await page.waitForLoadState('networkidle')
        }
        const label = `${w}x${h} ${path} [${tabNames[i].trim()}]`
        if (path === '/certificados' && /Emisi/i.test(tabNames[i])) {
          const dd = page.locator('.p-dropdown').first()
          if (await dd.count()) {
            await dd.click()
            const opt = page.locator('.p-dropdown-item').first()
            if (await opt.count()) await opt.click()
            await page.waitForLoadState('networkidle')
          }
        }
        await snap(page, label, results)
        // Diálogo do Alumno (consumidora 15): só se alcança abrindo a linha.
        if (path === '/personas' && /Alumnos/i.test(tabNames[i])) {
          const ver = page.locator('tbody').getByRole('button', { name: /^Ver$/ }).first()
          if (await ver.count()) {
            await ver.click()
            await page.waitForLoadState('networkidle')
            await snap(page, `${label} DIALOGO`, results, true)
            await page.keyboard.press('Escape')
          }
        }
        const arch = page.getByRole('button', { name: /Archivad/ }).first()
        if ((await arch.count()) && (await arch.isVisible())) {
          await arch.click()
          await page.waitForLoadState('networkidle')
          await snap(page, `${label} ARCH`, results)
          const act = page.getByRole('button', { name: /^Activ/ }).first()
          if (await act.count()) {
            await act.click()
            await page.waitForLoadState('networkidle')
          }
        }
      }
    }
    await ctx.close()
  }
  await browser.close()
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(results, null, 2))
  for (const r of results) {
    console.log(
      `${r.label}${r.inDialog ? ' (dialogo)' : ''} | frame ${r.frame} scroll ${r.scrollW} table ${r.table} (${r.tableMinW}) ` +
        `sticky ${r.stickyW} overlap ${r.overlap}${r.coveredCol ? ` on "${r.coveredCol}"` : ''} ` +
        `col1 ${r.firstColW} free ${r.free} box ${r.firstBoxCovered} text ${r.firstTextCovered} rows ${r.rows}` +
        `${r.truncHeaders.length ? ` TRUNC ${JSON.stringify(r.truncHeaders)}` : ''}\n    ${r.headers}`,
    )
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 3: Escrever `$SCRATCH/fixture.cjs`**

```js
// fixture.cjs — cada visão de arquivados com 1 linha, para a régua do item 23.
// O banco de dev do offset +2 não tem nenhum registro arquivado.
// Uso: node fixture.cjs archive   (grava fixture-ids.json ao lado, a cada acerto)
//      node fixture.cjs restore   (lê fixture-ids.json e restaura tudo)
const fs = require('fs')
const path = require('path')
const { chromium } = require(
  process.env.PW ||
    '/home/jvbat/.nvm/versions/node/v22.23.1/lib/node_modules/@playwright/cli/node_modules/playwright-core',
)

const SPA = process.env.BASE || 'http://localhost:5175'
const API = process.env.API || 'http://localhost:8082'
const IDS = path.join(__dirname, 'fixture-ids.json')
// O único staff do banco de dev é o admin, e ele nunca se arquiva: a visão de
// arquivados de Usuarios precisa de um usuário próprio, que fica no banco depois.
const USUARIO = { name: 'Fixture Item 23', email: 'fixture.item23@lotus.cl', role: 'admin', is_active: true }

// O primeiro candidato que a API aceitar arquivar vira a fixture. A turma 1
// hospeda a matrícula arquivada e a 3 está concluída.
const ENTIDADES = [
  { chave: 'cliente', lista: '/api/clients', base: (id) => `/api/clients/${id}` },
  { chave: 'presupuesto', lista: '/api/budgets', base: (id) => `/api/budgets/${id}` },
  { chave: 'turma', lista: '/api/turmas', base: (id) => `/api/turmas/${id}`, pular: [1, 3] },
  { chave: 'curso', lista: '/api/courses', base: (id) => `/api/courses/${id}` },
  { chave: 'redactor', lista: '/api/redatores', base: (id) => `/api/redatores/${id}` },
  { chave: 'usuario', lista: '/api/users', base: (id) => `/api/users/${id}`, so: (x) => x.email === USUARIO.email },
  { chave: 'matricula', lista: '/api/turmas/1/alunos', base: (id) => `/api/turmas/1/alunos/${id}` },
]

async function chamar(page, metodo, rota, corpo) {
  return page.evaluate(
    async ({ API, metodo, rota, corpo }) => {
      const par = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))
      const xsrf = par ? decodeURIComponent(par.slice('XSRF-TOKEN='.length)) : ''
      const r = await fetch(API + rota, {
        method: metodo,
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf },
        body: corpo ? JSON.stringify(corpo) : undefined,
      })
      let json = null
      try {
        json = await r.json()
      } catch {
        // 204 sem corpo
      }
      return { status: r.status, json }
    },
    { API, metodo, rota, corpo },
  )
}

const linhas = (json) => (Array.isArray(json) ? json : (json?.data ?? []))

async function arquivar(page) {
  const usuarios = linhas((await chamar(page, 'GET', '/api/users')).json)
  if (!usuarios.some((u) => u.email === USUARIO.email)) {
    const criado = await chamar(page, 'POST', '/api/users', USUARIO)
    if (criado.status >= 300) throw new Error(`POST /api/users ${criado.status}: ${JSON.stringify(criado.json)}`)
  }
  const ids = fs.existsSync(IDS) ? JSON.parse(fs.readFileSync(IDS, 'utf8')) : {}
  for (const e of ENTIDADES) {
    if (ids[e.chave] !== undefined) continue
    const candidatos = linhas((await chamar(page, 'GET', e.lista)).json)
      .filter((x) => !(e.pular || []).includes(x.id))
      .filter((x) => (e.so ? e.so(x) : true))
    for (const x of candidatos) {
      const r = await chamar(page, 'DELETE', e.base(x.id))
      if (r.status < 300) {
        ids[e.chave] = x.id
        fs.writeFileSync(IDS, JSON.stringify(ids, null, 2))
        break
      }
      console.log(`${e.chave} ${x.id}: DELETE ${r.status} ${r.json?.detail ?? ''}`)
    }
    if (ids[e.chave] === undefined) throw new Error(`nenhum ${e.chave} arquivável`)
  }
  console.log('arquivados:', JSON.stringify(ids))
}

async function restaurar(page) {
  if (!fs.existsSync(IDS)) return console.log('nada a restaurar')
  const ids = JSON.parse(fs.readFileSync(IDS, 'utf8'))
  for (const e of ENTIDADES) {
    if (ids[e.chave] === undefined) continue
    const r = await chamar(page, 'POST', `${e.base(ids[e.chave])}/restore`)
    console.log(`${e.chave} ${ids[e.chave]}: restore ${r.status}`)
    if (r.status >= 300) process.exitCode = 1
    else delete ids[e.chave]
  }
  if (Object.keys(ids).length === 0) fs.unlinkSync(IDS)
  else fs.writeFileSync(IDS, JSON.stringify(ids, null, 2))
}

;(async () => {
  const modo = process.argv[2]
  if (!['archive', 'restore'].includes(modo)) throw new Error('uso: node fixture.cjs archive|restore')
  const browser = await chromium.launch()
  const page = await (await browser.newContext()).newPage()
  try {
    await page.goto(`${SPA}/login`)
    await page.fill('input[type=email], input[name=email]', 'admin@lotus.cl')
    await page.fill('input[type=password]', 'senha123')
    await page.keyboard.press('Enter')
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
    if (modo === 'archive') await arquivar(page)
    else await restaurar(page)
  } finally {
    await browser.close()
  }
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 4: Rodar a baseline com a fixture**

```bash
cd $SCRATCH && node fixture.cjs archive; \
  OUT=antes.json node medir.cjs > antes.txt 2>&1; echo "medir exit $?"; \
  node fixture.cjs restore
```

Expected: `arquivados: {...}` com as 7 chaves; `medir exit 0`; 7 linhas `restore 200`. **Se o `POST /api/users` devolver 422**, leia `errors` do corpo (RFC 7807) e acrescente ao `USUARIO` o campo que falta; nunca arquive o `admin@lotus.cl`. Se o `restore` falhar em algum, rode `node fixture.cjs restore` de novo até o `fixture-ids.json` sumir — o banco de dev não pode ficar com registro arquivado pela fixture.

Confira em `antes.txt`: as 7 linhas `ARCH` com `rows 1` (e não 0); a linha `DIALOGO`; e, em 1024, sobreposição 50 nas oito tabelas de piso default e 84 na Emisión (a baseline do spec §2).

- [ ] **Step 5: Abrir o audit com a baseline**

Crie `docs/superpowers/audits/2026-09-27-item23-medicoes.md`:

````markdown
# Medições do item 23 — `frontend-tabelas-reserva-e-rolagem`

**Spec:** `docs/superpowers/specs/2026-09-27-frontend-tabelas-reserva-e-rolagem-design.md`
**Plano:** `docs/superpowers/plans/2026-09-27-frontend-tabelas-reserva-e-rolagem.md`
**Ambiente:** offset +2 (SPA `:5175`, API `:8082`), es-CL, tema claro, `admin@lotus.cl`,
Playwright-core read-only (Apêndice A). Turma medida: 1.

## 1. Régua (spec §3)

- **1024x768:** `scrollWidth == clientWidth`; sobreposição da presa 0; nenhum cabeçalho truncado.
  Dashboard: tabela ≤ moldura (o transbordo de 25px está fora do bloco).
- **390x844:** `box` = 0 (caixa de conteúdo da 1ª célula ≤ borda esquerda da presa, pior linha);
  um controle por linha com 2+ ações; em arquivados, `col1` ≥ o `col1` da visão ativa.
- **1440x900:** sem regressão contra a seção 3.

## 2. Fixture de arquivados

| Entidade | id | Arquivado em | Restaurado em |
|---|---|---|---|

(uma linha por chave do `fixture-ids.json`; o usuário `fixture.item23@lotus.cl` foi criado para
a visão de Usuarios e continua no banco de dev, ativo)

## 3. Antes — `<sha do HEAD na medição>`

(tabela 1024 com moldura/tabela/presa/sobreposição/TRUNC, tabela 390 com presa/col1/free/box/text
e o `col1` das visões `ARCH`, tabela 1440 — uma linha por visão; saída bruta de `antes.txt` em
bloco de código ao fim da seção)
````

Preencha as tabelas da seção 3 e a da seção 2 com a saída do Step 4.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/audits/2026-09-27-item23-medicoes.md
git commit -m "docs(audit): item 23 abre o registro com a baseline das 15 tabelas"
```

---

### Task 2: `Timestamp` e o `Clock` sobre ele

**Files:**
- Create: `frontend/src/shared/ui/Timestamp/Timestamp.tsx`
- Create: `frontend/src/shared/ui/Timestamp/Timestamp.test.tsx`
- Create: `frontend/src/shared/ui/Timestamp/index.ts`
- Modify: `frontend/src/shared/ui/index.ts` (depois de `export * from './StatValue'`)
- Modify: `frontend/src/shared/ui/Clock/Clock.tsx`
- Modify: `frontend/src/shared/ui/Clock/Clock.test.tsx`

**Interfaces:**
- Produces: `Timestamp({ value }: { value: Date })`, exportado por `@shared/ui`. Renderiza `<time dateTime={value.toISOString()} lang={i18n.language}>` com os filhos `i.pi-clock`, `span` (hora), `i.pi-calendar`, `span` (data).

- [ ] **Step 1: Escrever o teste que falha**

`frontend/src/shared/ui/Timestamp/Timestamp.test.tsx`:

```tsx
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import i18n from '@shared/config/i18n'
import { Timestamp } from './Timestamp'

/**
 * O i18n é o REAL, e não o mock de `@shared/testing/i18n`: o que se prova é a
 * máscara de cada idioma e a inscrição na troca — com `t` devolvendo a chave
 * não haveria troca a observar. Mesmo molde do `Clock.test.tsx`.
 */

// 11/08/2026, 14:05 local: dia ≠ mês, então nenhum locale passa no lugar do outro.
const QUANDO = new Date(2026, 7, 11, 14, 5)
const idiomaOriginal = i18n.language

async function trocarIdioma(codigo: string) {
  await act(async () => {
    await i18n.changeLanguage(codigo)
  })
}

beforeEach(async () => {
  await trocarIdioma('es-CL')
})
afterAll(async () => {
  await i18n.changeLanguage(idiomaOriginal)
})

describe('Timestamp', () => {
  it('é um <time> com o instante em ISO no dateTime', () => {
    const { container } = render(<Timestamp value={QUANDO} />)

    expect(container.querySelector('time')?.getAttribute('dateTime')).toBe(QUANDO.toISOString())
  })

  it('hora em cima e data embaixo, cada uma ao lado do próprio ícone', () => {
    const { container } = render(<Timestamp value={QUANDO} />)
    const filhos = Array.from(container.querySelector('time')!.children)

    expect(filhos.map((n) => n.tagName)).toEqual(['I', 'SPAN', 'I', 'SPAN'])
    expect(filhos[0].className).toContain('pi-clock')
    expect(filhos[1].textContent).toBe('14:05')
    expect(filhos[2].className).toContain('pi-calendar')
    expect(filhos[3].textContent).toBe('11-08-2026')
  })

  it('os ícones são decorativos e pintados pela primária do tema', () => {
    const { container } = render(<Timestamp value={QUANDO} />)
    const icones = Array.from(container.querySelectorAll('i'))

    expect(icones).toHaveLength(2)
    for (const icone of icones) {
      expect(icone.getAttribute('aria-hidden')).toBe('true')
      expect(icone.className).toContain('text-(--primary-color)')
    }
  })

  it('o leitor de tela lê hora e data separadas por espaço, sem colar os dois', () => {
    const { container } = render(<Timestamp value={QUANDO} />)

    expect(container.querySelector('time')?.textContent).toBe('14:05 11-08-2026')
  })

  it('a máscara é a do idioma ativo e troca no ato, sem remontar', async () => {
    render(<Timestamp value={QUANDO} />)
    expect(screen.getByText('11-08-2026')).toBeTruthy()

    await trocarIdioma('pt-BR')
    expect(screen.getByText('11/08/2026')).toBeTruthy()
    expect(screen.getByText('14:05')).toBeTruthy()

    await trocarIdioma('en')
    expect(screen.getByText('8/11/2026')).toBeTruthy()
    // O ICU do Node separa "PM" por U+202F; `\s` casa os dois espaços.
    expect(screen.getByText(/^02:05\sPM$/)).toBeTruthy()
  })

  it('declara o idioma no markup, para o leitor de tela não ler pt em es', async () => {
    await trocarIdioma('pt-BR')
    const { container } = render(<Timestamp value={QUANDO} />)

    expect(container.querySelector('time')?.getAttribute('lang')).toBe('pt-BR')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd frontend && pnpm exec vitest run src/shared/ui/Timestamp/Timestamp.test.tsx`
Expected: FAIL — `Failed to resolve import "./Timestamp"`.

- [ ] **Step 3: Implementar**

`frontend/src/shared/ui/Timestamp/Timestamp.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { formatDate, formatTime } from '@shared/lib'

/**
 * Um instante — data E hora juntas — em duas linhas: relógio com a hora, e
 * calendário com a data embaixo. Nasceu no item 23 por pedido do João
 * (2026-09-27) e vale só onde a tela já mostrava as duas juntas: o relógio do
 * cabeçalho e o "Último acceso" de Usuarios e Redactores. Campo só de data
 * segue com `formatDate`/`formatIsoDate` puro.
 *
 * A máscara é a de `formatTime`/`formatDate`, no idioma ativo (27-09-2026 em
 * es-CL, 27/09/2026 em pt-BR, 9/27/2026 em en, com AM/PM em en). O ano segue
 * com 4 dígitos: é o que o relógio já mostrava, e máscara nova seria uma
 * terceira grafia de data na aplicação.
 *
 * `useTranslation` é inscrição, não tradução: os formatadores leem o idioma a
 * cada render, e sem a inscrição o texto só mudaria no reload (lição D-P12 do
 * `Clock`).
 *
 * Só os ÍCONES têm cor própria, a primária do tema (`#25a5e4` nos dois). São
 * decorativos (`aria-hidden`), então os 2,8:1 sobre branco não são régua de
 * texto; sobre o navy do cabeçalho dão 5,3:1. O texto herda a cor de quem
 * posiciona — branco no cabeçalho, a da célula na tabela.
 *
 * O `{' '}` entre as linhas é para o leitor de tela, que sem ele leria
 * "14:0511-08-2026". Na grade ele não vira item: espaço em branco solto não é
 * renderizado num contêiner grid.
 */
export function Timestamp({ value }: { value: Date }) {
  const { i18n } = useTranslation()

  return (
    <time
      dateTime={value.toISOString()}
      lang={i18n.language}
      className="inline-grid grid-cols-[auto_auto] items-center gap-x-1.5 text-sm leading-tight tabular-nums"
    >
      <i className="pi pi-clock text-xs text-(--primary-color)" aria-hidden="true" />
      <span className="font-semibold">{formatTime(value)}</span>{' '}
      <i className="pi pi-calendar text-xs text-(--primary-color)" aria-hidden="true" />
      <span className="opacity-75">{formatDate(value)}</span>
    </time>
  )
}
```

`frontend/src/shared/ui/Timestamp/index.ts`:

```ts
export { Timestamp } from './Timestamp'
```

Em `frontend/src/shared/ui/index.ts`, logo depois de `export * from './StatValue'`:

```ts
export * from './Timestamp'
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd frontend && pnpm exec vitest run src/shared/ui/Timestamp/Timestamp.test.tsx`
Expected: PASS, 6 testes.

- [ ] **Step 5: `Clock` sobre o `Timestamp` — teste primeiro**

Em `frontend/src/shared/ui/Clock/Clock.test.tsx`, acrescente dentro do `describe('Clock', ...)`:

```tsx
  it('é um Timestamp: um <time> com o instante corrente, e a classe do posicionador fica por fora', () => {
    const { container } = render(<Clock className="hidden md:block" />)

    const time = container.querySelector('time')
    expect(time?.getAttribute('dateTime')).toBe(QUANDO.toISOString())
    // `md:block` no próprio <time> derrubaria a grade de ícones.
    expect(time?.className).not.toContain('md:block')
    expect((container.firstElementChild as HTMLElement).className).toBe('hidden md:block')
  })
```

Run: `cd frontend && pnpm exec vitest run src/shared/ui/Clock/Clock.test.tsx`
Expected: FAIL — `time` é `null`.

- [ ] **Step 6: Reescrever o `Clock`**

`frontend/src/shared/ui/Clock/Clock.tsx` inteiro:

```tsx
import { useClock } from '@shared/hooks/useClock'
import { Timestamp } from '../Timestamp'

/**
 * Relógio ao vivo do cabeçalho: o tick vive no `useClock`, e a hora e a data
 * são um `Timestamp` (item 23) — a mesma peça do "Último acceso" das tabelas.
 *
 * A cor NÃO se fixa aqui: o texto herda de quem o posiciona (a barra navy do
 * shell), e só os ícones do `Timestamp` têm cor própria.
 *
 * A inscrição no idioma (D-P12) mora no `Timestamp`, que é quem formata. O
 * `className` do posicionador (`hidden md:block` no Header) fica num `div`
 * por fora: no próprio `<time>` o `md:block` trocaria a grade por bloco.
 */
export function Clock({ className = '' }: { className?: string }) {
  const now = useClock()

  return (
    <div className={className}>
      <Timestamp value={now} />
    </div>
  )
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `cd frontend && pnpm exec vitest run src/shared/ui/Clock src/shared/ui/Timestamp`
Expected: PASS — os 3 do `Clock` (troca de idioma sem remontar, `lang` no markup, o novo) e os 6 do `Timestamp`.

- [ ] **Step 8: Lint e commit**

Run: `cd frontend && pnpm exec eslint src/shared/ui/Timestamp src/shared/ui/Clock src/shared/ui/index.ts`
Expected: sem saída.

```bash
git add frontend/src/shared/ui/Timestamp frontend/src/shared/ui/Clock frontend/src/shared/ui/index.ts
git commit -m "feat(ui): Timestamp com relogio e calendario, e o Clock passa a usa-lo"
```

---

### Task 3: "Último acceso" no `Timestamp` e `formatDateTime` sai

**Files:**
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx:5-7,89`
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.test.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx:5-7,107`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.test.tsx`
- Modify: `frontend/src/features/identity/components/Redator/redatorColumns.ts:6-8`
- Modify: `frontend/src/shared/lib/datetime.ts:128-137`
- Modify: `frontend/src/shared/lib/datetime.test.ts:1-24`

**Interfaces:**
- Consumes: `Timestamp` (Task 2).
- Produces: `formatDateTime` deixa de existir em `@shared/lib`.

- [ ] **Step 1: Testes que falham**

Em `UsersTable.test.tsx`, dentro do `describe('UsersTable', ...)`:

```tsx
  it('Último acceso sai no Timestamp: um <time> com o instante do backend (item 23)', () => {
    renderWithProviders(
      <UsersTable
        users={[{ ...user, last_login: '2026-09-27T23:24:00Z' }]} loading={false} onView={() => {}}
        mode="active" onModeChange={() => {}} onArchive={() => {}} onRestore={() => {}} busy={false}
      />,
    )
    expect(document.querySelector('td time')?.getAttribute('dateTime')).toBe('2026-09-27T23:24:00.000Z')
  })

  it('sem acesso registrado, a célula segue com travessão e sem <time>', () => {
    renderWithProviders(
      <UsersTable
        users={[user]} loading={false} onView={() => {}} mode="active" onModeChange={() => {}}
        onArchive={() => {}} onRestore={() => {}} busy={false}
      />,
    )
    expect(screen.getByText('—')).toBeTruthy()
    expect(document.querySelector('td time')).toBeNull()
  })
```

Em `RedatoresTable.test.tsx`, um `describe` novo ao fim do arquivo:

```tsx
describe('RedatoresTable — Último acceso (item 23)', () => {
  it('sai no Timestamp, com o instante do backend no dateTime', () => {
    renderWithProviders(
      <RedatoresTable
        redatores={[{ ...REDATOR, last_login: '2026-09-27T23:24:00Z' } as RedatorRow]}
        loading={false}
        onView={() => {}}
        mode="active"
        onModeChange={() => {}}
        onArchive={() => {}}
        onRestore={() => {}}
        busy={false}
      />,
    )
    expect(document.querySelector('td time')?.getAttribute('dateTime')).toBe('2026-09-27T23:24:00.000Z')
  })
})
```

Antes de colar, confira as props que o `montar` do arquivo passa à `RedatoresTable` (linhas 27-40) e repita as mesmas aqui, trocando só `redatores`.

Run: `cd frontend && pnpm exec vitest run src/features/identity/components/Admin/UsersTable.test.tsx src/features/identity/components/Redator/RedatoresTable.test.tsx`
Expected: FAIL nos dois casos de `dateTime` (`null`), porque a célula ainda imprime `formatDateTime`.

- [ ] **Step 2: Trocar as duas células**

`UsersTable.tsx` — no import de `@shared/ui` acrescente `Timestamp`; no de `@shared/lib` tire `formatDateTime`:

```tsx
import { formatDateTime, roleLabel, type ArchivableRow } from '@shared/lib'
```
vira
```tsx
import { roleLabel, type ArchivableRow } from '@shared/lib'
```

e a coluna:

```tsx
        body={(u: UserData) => (u.last_login ? formatDateTime(new Date(u.last_login)) : '—')}
```
vira
```tsx
        body={(u: UserData) => (u.last_login ? <Timestamp value={new Date(u.last_login)} /> : '—')}
```

`RedatoresTable.tsx` — mesma troca: `Timestamp` entra no import de `@shared/ui`, `formatDateTime` sai do de `@shared/lib`, e:

```tsx
        body={(r: RedatorData) => (r.last_login ? formatDateTime(new Date(r.last_login)) : '—')}
```
vira
```tsx
        body={(r: RedatorData) => (r.last_login ? <Timestamp value={new Date(r.last_login)} /> : '—')}
```

- [ ] **Step 3: Tirar `formatDateTime` e o teste dele**

Em `frontend/src/shared/lib/datetime.ts`, apague o bloco inteiro de `/**\n * Data + hora no formato curto...` até o `}` de `formatDateTime` (linhas 128-137).

Em `frontend/src/shared/lib/datetime.test.ts`, o import vira:

```ts
import { formatDate, formatIsoDate } from './datetime'
```

e o `describe('formatDateTime', ...)` inteiro (linhas 4-24) sai.

Em `frontend/src/features/identity/components/Redator/redatorColumns.ts`, o parágrafo das linhas 6-8:

```ts
 * `last_login` é `dateTime` e não `date`: `formatDateTime` imprime dia E hora, e
 * a hora é o que distingue dois acessos do mesmo dia — a coluna precisa da fatia
 * maior para não quebrar o carimbo no meio.
```
vira
```ts
 * `last_login` é `dateTime` e não `date`: o `Timestamp` imprime hora E data, e
 * a hora é o que distingue dois acessos do mesmo dia. Desde o item 23 as duas
 * saem em linhas separadas; o peso `dateTime` é de quando o carimbo era uma
 * linha só, e os pesos de `COL` ficaram fora daquele bloco.
```

- [ ] **Step 4: Nenhum consumidor sobrando**

Run: `cd frontend && grep -rn "formatDateTime" src/ ; echo "grep exit $?"`
Expected: sem linhas e `grep exit 1`.

- [ ] **Step 5: Rodar e ver passar**

Run: `cd frontend && pnpm exec vitest run src/features/identity src/shared/lib/datetime.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/components/Admin/UsersTable.tsx \
  frontend/src/features/identity/components/Admin/UsersTable.test.tsx \
  frontend/src/features/identity/components/Redator/RedatoresTable.tsx \
  frontend/src/features/identity/components/Redator/RedatoresTable.test.tsx \
  frontend/src/features/identity/components/Redator/redatorColumns.ts \
  frontend/src/shared/lib/datetime.ts frontend/src/shared/lib/datetime.test.ts
git commit -m "feat(identity): Ultimo acceso sai no Timestamp e formatDateTime deixa de existir"
```

---

### Task 4: Piso default de 42rem

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/style.ts:5-9,68-80,94-109`
- Modify: `frontend/src/shared/ui/AppDataTable/index.ts:3`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx:7,183-254`
- Modify: `frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx:86-90`
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.tsx` (import e `pt=`)
- Modify: `frontend/src/features/identity/components/Admin/UsersTable.test.tsx:35-49`
- Modify: `frontend/src/features/identity/components/Admin/RolesTable.tsx:5,46-48`
- Modify: `frontend/src/features/identity/components/Admin/RolesTable.test.tsx:29-38`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx` (import e `pt=`)
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.test.tsx:41-62`

**Interfaces:**
- Produces: `appDataTablePt.table.className === 'min-w-[42rem] table-fixed'`. `reducedFloorTablePt` deixa de existir. O `pt` do `SearchableTableFrame` fica (a Task 9 o usa).

- [ ] **Step 1: Teste do default que falha**

Em `AppDataTable.test.tsx`, troque o `describe('reducedFloorTablePt — ...')` inteiro (linhas 233-254, com o docblock acima dele) por:

```tsx
/**
 * Item 23 (`D-65`): o piso é o que decide se a tabela rola, e a sobreposição
 * da coluna presa é `larguraDaTabela - larguraDaMoldura` por inteiro. Em
 * 1024x768 as molduras medidas são 718px e 684px (Emisión); 48rem (768px)
 * rolava em todas, 42rem (672px) cabe em todas. A exceção de três tabelas virou
 * o default, e o `table-fixed` segue composto pelo `TABLE_LAYOUT` do wrapper.
 */
describe('appDataTablePt — o piso default cabe em toda moldura de 1024', () => {
  it('é 42rem com table-fixed, e nada mais na folha', () => {
    const classe = (appDataTablePt.table as { className: string }).className
    expect(classe.split(' ')).toEqual(['min-w-[42rem]', 'table-fixed'])
  })

  it('a tabela montada sem pt do chamador sai com o piso default', () => {
    render(
      <AppDataTable value={LINHAS}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )
    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).toContain('min-w-[42rem]')
    expect(tabela.className).not.toContain('min-w-[48rem]')
  })
})
```

No `describe('AppDataTable — largura mínima cede ao guard ...')` (linhas 194-231), o chamador deixa de ser o piso reduzido — ele vira um `pt` local qualquer, que é o que o caso mede:

```tsx
  const CALLER_PT = reducedFloorTablePt
```
vira
```tsx
  // Um piso qualquer do CHAMADOR — o que se mede é quem vence a fusão.
  const CALLER_PT = { table: { className: 'min-w-[30rem] table-fixed' } }
```

e, nos três `it` desse `describe`, `'min-w-[42rem]'` vira `'min-w-[30rem]'`; no terceiro, `expect(tabela.className).not.toContain('min-w-[48rem]')` vira `expect(tabela.className).not.toContain('min-w-[42rem]')`. No docblock do `describe` (linhas 183-193), a primeira frase vira: "Regressão do passe de correção do UI-02 (Administración) e do UI-03 de Pessoas (RedatoresTable, 19a616fb): o piso do chamador voltava a forçar rolagem justamente no vazio/erro."

No import da linha 7, `reducedFloorTablePt` sai:

```tsx
import { appDataTablePt, stickyActionsColumn } from './style'
```

Run: `cd frontend && pnpm exec vitest run src/shared/ui/AppDataTable/AppDataTable.test.tsx`
Expected: FAIL em `é 42rem com table-fixed` (recebe `min-w-[48rem]`) e no `sem pt do chamador`.

- [ ] **Step 2: O default vira 42rem e o reduzido sai**

Em `style.ts`:

1. Docblock do `TABLE_LAYOUT` (linhas 5-9):

```ts
/** O `table-layout` mora num lugar só, e o piso default e o reduzido o compõem:
 * o `mergePt` SUBSTITUI a folha `table.className` (nunca concatena), então quem
 * reduz o piso reescreve a classe inteira — e uma cópia literal do
 * `table-fixed` em cada tabela divergiria em silêncio do default (Q-5 do review
 * de 2026-09-26). O porquê do `table-fixed` está no docblock de `table` abaixo. */
```
vira
```ts
/** O `table-layout` mora num lugar só, e todo piso o compõe: o `mergePt`
 * SUBSTITUI a folha `table.className` (nunca concatena), então quem troca o
 * piso reescreve a classe inteira — e uma cópia literal do `table-fixed` em
 * cada tabela divergiria em silêncio do default (Q-5 do review de 2026-09-26).
 * O porquê do `table-fixed` está no docblock de `table` abaixo. */
```

2. No docblock de `table`, o parágrafo das linhas 68-69:

```ts
   * A largura mínima continua: abaixo de 48rem o wrapper rola, e a coluna de
   * ações fica presa (`stickyActionsColumn`) para continuar alcançável.
```
vira
```ts
   * A largura mínima continua: abaixo de 42rem o wrapper rola, e a coluna de
   * ações fica presa (`stickyActionsColumn`) para continuar alcançável. **42rem
   * (672px) e não 48rem** desde o item 23 (`D-65`): a sobreposição da coluna
   * presa é `larguraDaTabela - larguraDaMoldura` por inteiro, e em 1024x768 as
   * molduras são 718px e 684px (Emisión) — 768px rolava nas nove tabelas do
   * piso antigo, 672px cabe em todas. Era a exceção de Redactores, Usuarios e
   * Roles (fatia 3 do item 16), e virou a regra.
```

3. A linha 80:

```ts
  table: { className: `min-w-[48rem] ${TABLE_LAYOUT}` },
```
vira
```ts
  table: { className: `min-w-[42rem] ${TABLE_LAYOUT}` },
```

4. Apague o bloco inteiro de `/** Piso reduzido: ...` até o `}` de `reducedFloorTablePt` (linhas 94-109).

Em `index.ts` da pasta:

```ts
export { appDataTablePt, reducedFloorTablePt, stickyActionsColumn } from './style'
```
vira
```ts
export { appDataTablePt, stickyActionsColumn } from './style'
```

Em `SearchableTableFrame.tsx`, o docblock do `pt` (linhas 86-90):

```ts
  /** Repassa ao `AppDataTable` por baixo — mesmo `mergePt` dele, então uma
   * folha como `table.className` SUBSTITUI a do wrapper (nunca concatena).
   * Existe para a tabela poder reduzir o piso `min-w-[48rem]` default, que
   * força rolagem (e a coluna presa cobrindo dado) em viewport onde caberia
   * sem rolar — o valor é `reducedFloorTablePt`, nunca a string copiada. */
```
vira
```ts
  /** Repassa ao `AppDataTable` por baixo — mesmo `mergePt` dele, então uma
   * folha como `table.className` SUBSTITUI a do wrapper (nunca concatena).
   * Existe para a tabela trocar o piso por modo (item 23): o valor vem de
   * `AppDataTable/style.ts`, nunca a string copiada. */
```

- [ ] **Step 3: As três tabelas perdem o `pt`**

`UsersTable.tsx`: tire `reducedFloorTablePt` do import de `@shared/ui` e apague as três linhas:

```tsx
      // UI-02 de `2026-09-04-lotus-ui-review-administracion.md`: o piso
      // default rolava em 1024x768 e a coluna presa cobria "Último acceso".
      pt={reducedFloorTablePt}
```

`RedatoresTable.tsx`: tire `reducedFloorTablePt` do import e apague:

```tsx
      // UI-03 de `2026-09-04-lotus-ui-review-personas.md`: o piso default
      // rolava em 1024x768 e a coluna presa cobria "Último acceso".
      pt={reducedFloorTablePt}
```

`RolesTable.tsx`: tire `reducedFloorTablePt,` do import (linha 5) e apague:

```tsx
        // UI-02 de `2026-09-04-lotus-ui-review-administracion.md`: o piso
        // default rolava em 1024x768 e a coluna presa cortava "Permisos".
        pt={reducedFloorTablePt}
```

- [ ] **Step 4: Os testes de exceção saem**

Os três testes afirmam "piso menor que os 48rem default" — frase que passa a ser falsa, e a garantia agora é do default, provada no `AppDataTable.test.tsx`:

- `UsersTable.test.tsx`: apague o `it('usa um piso menor que os 48rem default, ...')` (linhas 35-49).
- `RolesTable.test.tsx`: apague o `it('usa um piso menor que os 48rem default, ...')` (linhas 29-38).
- `RedatoresTable.test.tsx`: apague o `describe('RedatoresTable — largura mínima da tabela (UI-03)', ...)` inteiro (linhas 41-62).

- [ ] **Step 5: Nenhuma referência sobrando e suíte verde**

Run: `cd frontend && grep -rn "reducedFloorTablePt\|min-w-\[48rem\]" src/ ; echo "grep exit $?"`
Expected: sem linhas e `grep exit 1`.

Run: `cd frontend && pnpm exec vitest run src/shared/ui/AppDataTable src/shared/ui/SearchableTableFrame src/features/identity`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppDataTable frontend/src/shared/ui/SearchableTableFrame/SearchableTableFrame.tsx \
  frontend/src/features/identity/components/Admin/UsersTable.tsx \
  frontend/src/features/identity/components/Admin/UsersTable.test.tsx \
  frontend/src/features/identity/components/Admin/RolesTable.tsx \
  frontend/src/features/identity/components/Admin/RolesTable.test.tsx \
  frontend/src/features/identity/components/Redator/RedatoresTable.tsx \
  frontend/src/features/identity/components/Redator/RedatoresTable.test.tsx
git commit -m "refactor(ui): piso default da tabela cai para 42rem e o reducedFloorTablePt sai"
```

---

### Task 5: As quatro tabelas que montavam ação à mão

**Files:**
- Modify: `frontend/src/shared/ui/RowActions/RowActions.tsx:6-14,44-53`
- Modify: `frontend/src/shared/ui/RowActions/RowActions.test.tsx`
- Create: `frontend/src/features/certification/components/Historial/HistorialRowActions.tsx`
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.tsx:2,99-115`
- Modify: `frontend/src/features/certification/components/Historial/HistorialTable.test.tsx`
- Create: `frontend/src/features/certification/components/Emission/EmissionRowActions.tsx`
- Modify: `frontend/src/features/certification/components/Emission/EmissionStudentsTable.tsx:2,89-109`
- Create: `frontend/src/features/certification/components/Emission/EmissionStudentsTable.test.tsx`
- Create: `frontend/src/features/operation/components/Enrollment/EnrollmentRowActions.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx:3,95-121`
- Create: `frontend/src/features/operation/components/Enrollment/EnrollmentTable.test.tsx`
- Modify: `frontend/src/features/operation/components/Enrollment/ArchivedEnrollmentsList.tsx:3-5,236-252`
- Create: `frontend/src/features/operation/components/Enrollment/ArchivedEnrollmentsList.test.tsx`

**Interfaces:**
- Consumes: `RowActions`, `ArchiveRowActions`, `useCollapsibleActionsColumn(width: string): { width: string; collapsed: boolean }`, `stickyActionsColumn(width: string)` — todos de `@shared/ui`.
- Produces: `RowAction` ganha `severity?: 'danger'` e `describedBy?: string`. Adaptadores `HistorialRowActions`, `EmissionRowActions`, `EnrollmentRowActions` (props abaixo). Larguras declaradas: Historial `9rem`, Emisión `6rem`, Matrícula `9rem`, Matrícula arquivada `10rem`; todas `4.5rem` abaixo de `sm`.

- [ ] **Step 1: `RowAction` ganha `severity` e `describedBy` — teste primeiro**

Em `RowActions.test.tsx`, dentro do `describe('RowActions', ...)`:

```tsx
  it('ação destrutiva tinge o botão solto, e o describedBy aponta o motivo do disabled', () => {
    render(
      <RowActions
        collapsed={false}
        actions={[acao('Quitar', { severity: 'danger', disabled: true, describedBy: 'motivo' })]}
      />,
    )

    const botao = screen.getByRole('button', { name: 'Quitar' })
    expect(botao.className).toContain('p-button-danger')
    expect(botao.getAttribute('aria-describedby')).toBe('motivo')
  })
```

Run: `cd frontend && pnpm exec vitest run src/shared/ui/RowActions/RowActions.test.tsx`
Expected: FAIL — erro de tipo não reprova o vitest, a asserção `p-button-danger` reprova.

- [ ] **Step 2: Implementar em `RowActions.tsx`**

O tipo:

```tsx
export type RowAction = {
  /** Já traduzido: nome acessível do botão e rótulo do item de menu. */
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  /** Dica no hover do botão solto. O item de menu já mostra o rótulo. */
  tooltip?: boolean
  /** Ação destrutiva (remover matrícula): tinge o botão solto de perigo. No
   * menu o rótulo já diz o que a ação faz. */
  severity?: 'danger'
  /** `id` do texto que explica o `disabled` — o "Emitir" apagado da Emisión
   * aponta para a tag do bloqueio (f3 UI-03). Vale no botão solto; a tabela
   * que usa é de ação única e nunca abre menu. */
  describedBy?: string
}
```

e o `AppButton` do caminho solto:

```tsx
          <AppButton
            key={acao.label}
            icon={acao.icon}
            text
            rounded
            severity={acao.severity}
            aria-label={acao.label}
            aria-describedby={acao.describedBy}
            tooltip={acao.tooltip ? acao.label : undefined}
            disabled={acao.disabled}
            onClick={acao.onClick}
          />
```

Run: `cd frontend && pnpm exec vitest run src/shared/ui/RowActions/RowActions.test.tsx`
Expected: PASS.

- [ ] **Step 3: Historial — teste que falha**

Em `HistorialTable.test.tsx`:

1. Acrescente aos imports: `import { fireEvent } from '@testing-library/react'` (junte ao import existente de `@testing-library/react`) e `import { setViewportWidth } from '@shared/testing/viewport'`.
2. O `montar` ganha um segundo parâmetro, mesclado por último no `historial.current`:

```tsx
const montar = (c: CertificateData, extra: Partial<Historial> = {}) => {
  historial.current = {
    // ... tudo o que já está aí, sem mudar ...
    setViewingCertificateId: () => {},
    ...extra,
  } as unknown as Historial
```

3. Novo `describe` ao fim:

```tsx
/** Item 23 (`D-65`): três botões de TEXTO numa coluna presa de 16rem cobriam
 * 120px do aluno em 390x844. Viram ícones com nome acessível, e abaixo de `sm`
 * a linha carrega um controle só. */
describe('HistorialTable — ações da linha', () => {
  const larguraDaColunaDeAcoes = () =>
    (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width
  const vigente = () => ({ ...certificado({ name: 'Ana Torres', rut: '1-9' }), snapshot_ok: true })

  it('no desktop, ver e revogar são ícones soltos com nome acessível, numa coluna de 9rem', () => {
    montar(vigente(), { canRevoke: true })

    const ver = screen.getByRole('button', { name: 'certificate.view' })
    expect(ver.textContent?.trim()).toBe('')
    expect(screen.getByRole('button', { name: 'certificate.revoke' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('9rem')
  })

  it('em 390px, a linha tem UM botão de ações e a coluna encolhe para ele', () => {
    setViewportWidth(390)
    montar(vigente(), { canRevoke: true })

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'certificate.revoke' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('revogar continua abrindo o diálogo pelo mesmo caminho: setRevoking com o certificado', () => {
    const setRevoking = vi.fn()
    const c = vigente()
    montar(c, { canRevoke: true, setRevoking })

    fireEvent.click(screen.getByRole('button', { name: 'certificate.revoke' }))
    expect(setRevoking).toHaveBeenCalledWith(c)
  })

  it('revocado com permissão: reemitir aparece, revogar não', () => {
    montar({ ...vigente(), display_status: 'revocado' } as CertificateData, { canRevoke: true, canReissue: true })

    expect(screen.getByRole('button', { name: 'certificate.reissue' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'certificate.revoke' })).toBeNull()
  })
})
```

Run: `cd frontend && pnpm exec vitest run src/features/certification/components/Historial/HistorialTable.test.tsx`
Expected: FAIL — `ver.textContent` é `certificate.view` e a largura é `16rem`.

- [ ] **Step 4: Historial — adaptador e tabela**

`frontend/src/features/certification/components/Historial/HistorialRowActions.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { RowActions, type RowAction } from '@shared/ui'
import type { CertificateData } from '@shared/types/generated'

/**
 * As ações da linha do Historial: Ver sempre; Revocar no vigente e no por
 * vencer; Reemitir no revocado. Eram três botões de texto numa coluna presa de
 * 16rem — em 390x844 ela cobria 120px do aluno (item 23, `D-65`). Viram ícones
 * com o mesmo rótulo como nome acessível e dica, e colapsam abaixo de `sm`.
 *
 * As permissões chegam como booleanos do `useHistorial`, que é quem as lê.
 */
export function HistorialRowActions({
  certificate,
  canRevoke,
  canReissue,
  onView,
  onRevoke,
  onReissue,
  collapsed,
}: {
  certificate: CertificateData
  canRevoke: boolean
  canReissue: boolean
  onView: (c: CertificateData) => void
  onRevoke: (c: CertificateData) => void
  onReissue: (c: CertificateData) => void
  collapsed: boolean
}) {
  const { t } = useTranslation()
  const status = certificate.display_status

  const actions: RowAction[] = [
    { label: t('certificate.view'), icon: 'pi pi-eye', tooltip: true, onClick: () => onView(certificate) },
  ]
  if (canRevoke && (status === 'vigente' || status === 'por_vencer')) {
    actions.push({ label: t('certificate.revoke'), icon: 'pi pi-ban', tooltip: true, onClick: () => onRevoke(certificate) })
  }
  if (canReissue && status === 'revocado') {
    actions.push({
      label: t('certificate.reissue'),
      icon: 'pi pi-replay',
      tooltip: true,
      onClick: () => onReissue(certificate),
    })
  }

  return <RowActions actions={actions} collapsed={collapsed} />
}
```

Em `HistorialTable.tsx`:
- o import de `@shared/ui` troca `AppButton` por `useCollapsibleActionsColumn`, e entra `import { HistorialRowActions } from './HistorialRowActions'`;
- depois de `const h = useHistorial()`:

```tsx
  // No máximo dois ícones por linha (ver + revogar, ou ver + reemitir).
  const colunaDeAcoes = useCollapsibleActionsColumn('9rem')
```

- a última `AppColumn` (linhas 99-115) inteira vira:

```tsx
        <AppColumn
          body={(c: CertificateData) => (
            <HistorialRowActions
              certificate={c}
              canRevoke={h.canRevoke}
              canReissue={h.canReissue}
              onView={(x) => h.setViewingCertificateId(x.id)}
              onRevoke={h.setRevoking}
              onReissue={h.setReissuing}
              collapsed={colunaDeAcoes.collapsed}
            />
          )}
          style={stickyActionsColumn(colunaDeAcoes.width)}
        />
```

Run: `cd frontend && pnpm exec vitest run src/features/certification/components/Historial`
Expected: PASS (os casos antigos e os 4 novos).

- [ ] **Step 5: Emisión — teste que falha**

`frontend/src/features/certification/components/Emission/EmissionStudentsTable.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import type { EmissionPanelEnrollmentData } from '@shared/types/generated'
import type { EmissionCounts } from '../../hooks/useEmissionPanelState'
import { EmissionStudentsTable } from './EmissionStudentsTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const SEM_CERTIFICADO: EmissionPanelEnrollmentData = {
  enrollment_id: 10, student_name: 'Ana Torres', student_rut: '11.111.111-1', approval_status: 'aprobado',
  attendance_pct: '90', nota_final: '6.5', certificate: null, student_photo_url: null,
}
const COM_CERTIFICADO = {
  ...SEM_CERTIFICADO,
  enrollment_id: 11,
  student_name: 'Luis Rojas',
  certificate: { codigo: 'LOT-2026-1001' },
} as unknown as EmissionPanelEnrollmentData
const CONTAGEM: EmissionCounts = { total: 2, aprobados: 2, emitidos: 1, pendientes: 1 }

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

function montar(over: { blocked?: boolean; onEmit?: () => void } = {}) {
  return renderWithProviders(
    <EmissionStudentsTable
      enrollments={[SEM_CERTIFICADO, COM_CERTIFICADO]}
      counts={CONTAGEM}
      loading={false}
      blocked={over.blocked ?? false}
      blockedReasonId="motivo-do-bloqueio"
      onEmit={over.onEmit ?? (() => {})}
      onView={() => {}}
    />,
  )
}

/** Item 23 (`D-65`): "Emitir" e "Ver" eram botões de texto numa presa de 8rem
 * que cobria 84px de "Certificado" em 1024x768 e 95px do nome em 390x844. */
describe('EmissionStudentsTable — ação da linha', () => {
  it('no desktop, emitir e ver são ícones com nome acessível, numa coluna de 6rem', () => {
    montar()

    expect(screen.getByRole('button', { name: 'certificate.emit' }).textContent?.trim()).toBe('')
    expect(screen.getByRole('button', { name: 'certificate.view' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('6rem')
  })

  it('emitir chama onEmit com a matrícula da linha', () => {
    const onEmit = vi.fn()
    montar({ onEmit })

    fireEvent.click(screen.getByRole('button', { name: 'certificate.emit' }))
    expect(onEmit).toHaveBeenCalledWith(SEM_CERTIFICADO)
  })

  it('turma bloqueada: emitir apagado aponta para o motivo (f3 UI-03)', () => {
    montar({ blocked: true })

    const emitir = screen.getByRole('button', { name: 'certificate.emit' })
    expect(emitir.hasAttribute('disabled')).toBe(true)
    expect(emitir.getAttribute('aria-describedby')).toBe('motivo-do-bloqueio')
  })

  it('em 390px a coluna encolhe para o botão, que segue sendo o próprio emitir', () => {
    setViewportWidth(390)
    montar()

    expect(screen.getByRole('button', { name: 'certificate.emit' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })
})
```

Run: `cd frontend && pnpm exec vitest run src/features/certification/components/Emission/EmissionStudentsTable.test.tsx`
Expected: FAIL — o texto do botão é `certificate.emit` e a largura é `8rem`.

- [ ] **Step 6: Emisión — adaptador e tabela**

`frontend/src/features/certification/components/Emission/EmissionRowActions.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { RowActions, type RowAction } from '@shared/ui'
import type { EmissionPanelEnrollmentData } from '@shared/types/generated'
import { rowCertKind } from '../../lib/certStatus'

/**
 * A ação da linha da Emisión — uma só por linha: Ver no emitido, Emitir no
 * aprovado sem certificado, nada no resto. Era botão de texto numa presa de
 * 8rem (item 23, `D-65`); vira ícone com o rótulo como nome acessível e dica.
 *
 * O "Emitir" apagado pela turma bloqueada continua apontando para a tag que
 * explica o bloqueio (`describedBy`, f3 UI-03).
 */
export function EmissionRowActions({
  enrollment,
  blocked,
  blockedReasonId,
  onEmit,
  onView,
  collapsed,
}: {
  enrollment: EmissionPanelEnrollmentData
  blocked: boolean
  blockedReasonId?: string
  onEmit: (e: EmissionPanelEnrollmentData) => void
  onView: (e: EmissionPanelEnrollmentData) => void
  collapsed: boolean
}) {
  const { t } = useTranslation()
  const kind = rowCertKind(enrollment)

  const actions: RowAction[] = []
  if (kind === 'emitido') {
    actions.push({ label: t('certificate.view'), icon: 'pi pi-eye', tooltip: true, onClick: () => onView(enrollment) })
  }
  if (kind === 'sin_emitir') {
    actions.push({
      label: t('certificate.emit'),
      icon: 'pi pi-verified',
      tooltip: true,
      disabled: blocked,
      describedBy: blocked ? blockedReasonId : undefined,
      onClick: () => onEmit(enrollment),
    })
  }

  return <RowActions actions={actions} collapsed={collapsed} />
}
```

Em `EmissionStudentsTable.tsx`:
- o import de `@shared/ui` troca `AppButton` por `useCollapsibleActionsColumn`; `import { rowCertKind } from '../../lib/certStatus'` **fica** (a coluna "Certificado" usa); entra `import { EmissionRowActions } from './EmissionRowActions'`;
- depois de `const table = useTableFilter(enrollments)`:

```tsx
  const colunaDeAcoes = useCollapsibleActionsColumn('6rem')
```

- a última `AppColumn` (linhas 89-109) inteira vira:

```tsx
      <AppColumn
        body={(e: EmissionPanelEnrollmentData) => (
          <EmissionRowActions
            enrollment={e}
            blocked={blocked}
            blockedReasonId={blockedReasonId}
            onEmit={onEmit}
            onView={onView}
            collapsed={colunaDeAcoes.collapsed}
          />
        )}
        style={stickyActionsColumn(colunaDeAcoes.width)}
      />
```

Run: `cd frontend && pnpm exec vitest run src/features/certification`
Expected: PASS (inclui o `EmissionPanel.test.tsx` de antes).

- [ ] **Step 7: Matrícula — teste que falha**

`frontend/src/features/operation/components/Enrollment/EnrollmentTable.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { EnrollmentData } from '@shared/types/generated'
import { EnrollmentTable } from './EnrollmentTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const MATRICULA: EnrollmentData = {
  id: 5, turma_id: 1, student_id: 9, name: 'Ana Torres', rut: '11.111.111-1', email: null, phone: null,
  approval_status: undefined, attendance_pct: null, grades: null, photo_url: null,
}

function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

const montar = () =>
  renderWithProviders(
    <EnrollmentTable
      turmaId={1}
      registroBloqueado={false}
      enrollments={[MATRICULA]}
      loading={false}
      onRemove={() => {}}
      removing={false}
      onResetRemove={() => {}}
    />,
  )

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

/** Item 23 (`D-65`): a presa de 9rem cobria 172px do nome em 390x844. */
describe('EnrollmentTable — ações da linha', () => {
  it('no desktop, resultado e remover são ícones soltos; remover é de perigo; coluna de 9rem', () => {
    comPermissoes(['operation.enrollment.manage'])
    montar()

    expect(screen.getByRole('button', { name: 'certificate.result.action' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'operation.enrollment.remove' }).className).toContain('p-button-danger')
    expect(larguraDaColunaDeAcoes()).toBe('9rem')
  })

  it('em 390px, a linha tem UM botão de ações e a coluna encolhe para ele', () => {
    comPermissoes(['operation.enrollment.manage'])
    setViewportWidth(390)
    montar()

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'operation.enrollment.remove' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('sem manage, só remover: em 390px ele fica solto, sem menu', () => {
    comPermissoes([])
    setViewportWidth(390)
    montar()

    expect(screen.getByRole('button', { name: 'operation.enrollment.remove' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'common.moreActions' })).toBeNull()
  })

  it('remover continua abrindo a confirmação', async () => {
    comPermissoes([])
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'operation.enrollment.remove' }))
    expect(await screen.findByText('operation.enrollment.removeTitle')).toBeTruthy()
  })
})
```

Run: `cd frontend && pnpm exec vitest run src/features/operation/components/Enrollment/EnrollmentTable.test.tsx`
Expected: FAIL no caso de 390 (não há `common.moreActions`; a largura segue `9rem`).

- [ ] **Step 8: Matrícula — adaptador e tabela**

`frontend/src/features/operation/components/Enrollment/EnrollmentRowActions.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { RowActions, type RowAction } from '@shared/ui'

/**
 * As ações da linha da matrícula: registrar resultado (com
 * `operation.enrollment.manage`) e remover. Já eram ícones, montados à mão
 * fora do `RowActions` — e por isso não colapsavam: em 390x844 a presa de 9rem
 * cobria 172px do nome (item 23, `D-65`).
 *
 * `canManage` chega como booleano: quem lê a permissão é a tabela.
 */
export function EnrollmentRowActions({
  canManage,
  removing,
  onResult,
  onRemove,
  collapsed,
}: {
  canManage: boolean
  /** Remoção em voo: trava o botão contra o clique duplo. */
  removing: boolean
  onResult: () => void
  onRemove: () => void
  collapsed: boolean
}) {
  const { t } = useTranslation()

  const actions: RowAction[] = []
  if (canManage) {
    actions.push({ label: t('certificate.result.action'), icon: 'pi pi-pencil', tooltip: true, onClick: onResult })
  }
  actions.push({
    label: t('operation.enrollment.remove'),
    icon: 'pi pi-times',
    tooltip: true,
    severity: 'danger',
    disabled: removing,
    onClick: onRemove,
  })

  return <RowActions actions={actions} collapsed={collapsed} />
}
```

Em `EnrollmentTable.tsx`:
- o import de `@shared/ui` troca `AppButton` por `useCollapsibleActionsColumn`, e entra `import { EnrollmentRowActions } from './EnrollmentRowActions'`;
- depois de `const largura = enrollmentWidths(!registroBloqueado)`:

```tsx
  const colunaDeAcoes = useCollapsibleActionsColumn('9rem')
```

- o `AppColumn` dentro de `{!registroBloqueado && (...)}` (linhas 96-120) vira:

```tsx
          <AppColumn
            body={(e: EnrollmentData) => (
              <EnrollmentRowActions
                canManage={canManage}
                removing={removing}
                onResult={() => setResultTarget(e)}
                onRemove={() => setPending(e)}
                collapsed={colunaDeAcoes.collapsed}
              />
            )}
            style={stickyActionsColumn(colunaDeAcoes.width)}
          />
```

Run: `cd frontend && pnpm exec vitest run src/features/operation/components/Enrollment`
Expected: PASS (inclui o `EnrollmentSection.test.tsx`, que acha os dois botões por `getByLabelText`).

- [ ] **Step 9: Matrícula arquivada — teste que falha**

`frontend/src/features/operation/components/Enrollment/ArchivedEnrollmentsList.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import { ArchivedEnrollmentsList, type ArchivedEnrollmentRow } from './ArchivedEnrollmentsList'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const ARQUIVADA: ArchivedEnrollmentRow = {
  id: 5, turma_id: 1, student_id: 9, name: 'Ana Torres', rut: '11.111.111-1', email: null, phone: null,
  approval_status: undefined, attendance_pct: null, grades: null, photo_url: null,
  archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin Lotus',
}

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

function montar(onRestore: (id: number) => void = () => {}) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions: ['operation.enrollment.restore'], photo_url: null,
    },
  })
  return renderWithProviders(
    <ArchivedEnrollmentsList
      registroBloqueado={false}
      enrollments={[ARQUIVADA]}
      loading={false}
      onRetry={() => {}}
      onRestore={onRestore}
      restoring={false}
    />,
  )
}

/** Item 23: mesma forma das outras seis visões de arquivados — rótulo de `sm`
 * para cima, ícone com nome acessível abaixo. */
describe('ArchivedEnrollmentsList — restaurar', () => {
  it('no desktop, restaurar é rotulado numa coluna de 10rem, e chama onRestore com o id', () => {
    const onRestore = vi.fn()
    montar(onRestore)

    const restaurar = screen.getByRole('button', { name: 'archive.restoreAction' })
    expect(restaurar.textContent).toContain('archive.restoreAction')
    expect(larguraDaColunaDeAcoes()).toBe('10rem')
    fireEvent.click(restaurar)
    expect(onRestore).toHaveBeenCalledWith(5)
  })

  it('em 390px, restaurar fica só ícone e a coluna encolhe para ele', () => {
    setViewportWidth(390)
    montar()

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent?.trim()).toBe('')
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })
})
```

Run: `cd frontend && pnpm exec vitest run src/features/operation/components/Enrollment/ArchivedEnrollmentsList.test.tsx`
Expected: FAIL no caso de 390 (o botão segue rotulado e a coluna em `10rem`).

- [ ] **Step 10: Matrícula arquivada — `ArchiveRowActions`**

Em `ArchivedEnrollmentsList.tsx`:
- o import de `@shared/ui` troca `AppButton` por `ArchiveRowActions, useCollapsibleActionsColumn`;
- depois de `const largura = archivedEnrollmentWidths(!registroBloqueado)`:

```tsx
  // A mesma peça das outras seis visões de arquivados: rótulo de `sm` para
  // cima, ícone com nome acessível abaixo (item 23).
  const colunaDeAcoes = useCollapsibleActionsColumn('10rem')
```

- o `AppColumn` dentro de `{!registroBloqueado && (...)}` (linhas 237-251) vira:

```tsx
        <AppColumn
          body={(e: ArchivedEnrollmentRow) => (
            <ArchiveRowActions
              archived
              busy={restoring}
              canRestore={can('operation.enrollment.restore')}
              onRestore={() => {
                if (e.id != null) onRestore(e.id)
              }}
              collapsed={colunaDeAcoes.collapsed}
            />
          )}
          style={stickyActionsColumn(colunaDeAcoes.width)}
        />
```

Run: `cd frontend && pnpm exec vitest run src/features/operation/components/Enrollment`
Expected: PASS (inclui o `em arquivados, Restaurar existe em curso e some na concluída` do `EnrollmentSection.test.tsx`).

- [ ] **Step 11: Lint e commit**

Run: `cd frontend && pnpm lint`
Expected: 0 problemas.

```bash
git add frontend/src/shared/ui/RowActions \
  frontend/src/features/certification/components/Historial \
  frontend/src/features/certification/components/Emission \
  frontend/src/features/operation/components/Enrollment
git commit -m "refactor(tabelas): Historial, Emision e matriculas montam acao por RowActions e colapsam"
```

---

### Task 6: Colapso nas quatro tabelas de `ArchiveRowActions`

**Files:**
- Modify: `frontend/src/features/operation/components/Turma/{TurmaRowActions.tsx,TurmasTable.tsx,TurmasTable.test.tsx}`
- Modify: `frontend/src/features/commercial/components/Client/{ClientRowActions.tsx,ClientsTable.tsx}`
- Create: `frontend/src/features/commercial/components/Client/ClientsTable.test.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/{BudgetRowActions.tsx,BudgetsTable.tsx}`
- Create: `frontend/src/features/commercial/components/Budget/BudgetsTable.test.tsx`
- Modify: `frontend/src/features/catalog/components/Course/{CourseRowActions.tsx,CoursesTable.tsx}`
- Create: `frontend/src/features/catalog/components/Course/CoursesTable.test.tsx`
- Modify: `frontend/src/shared/ui/RowActions/useCollapsibleActionsColumn.ts:95-111`
- Modify: `frontend/src/shared/ui/ArchiveRowActions/ArchiveRowActions.tsx:25-28`

**Interfaces:**
- Consumes: `useCollapsibleActionsColumn`, `ArchiveRowActions` com `collapsed?: boolean`.
- Produces: `TurmaRowActions`, `ClientRowActions`, `BudgetRowActions`, `CourseRowActions` ganham `collapsed?: boolean`, repassado ao `ArchiveRowActions`.

- [ ] **Step 1: Testes que falham — Clientes**

`frontend/src/features/commercial/components/Client/ClientsTable.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { ArchiveMode } from '@shared/hooks'
import { ClientsTable, type ClientRow } from './ClientsTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

const CLIENTE = {
  id: 1, name: 'Transelec', legal_name: 'Transelec S.A.', rut: '76.555.400-4', email: 'contacto@transelec.cl',
  phone: null, type: 'empresa', business_activity: null, addresses: [], contacts: [], photo_url: null,
  archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin Lotus',
} as unknown as ClientRow

function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

const montar = (mode: ArchiveMode) =>
  renderWithProviders(
    <ClientsTable
      clients={[CLIENTE]} loading={false} onView={() => {}} mode={mode} onModeChange={() => {}}
      onArchive={() => {}} onRestore={() => {}} busy={false}
    />,
  )

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

/** Item 23 (`D-65`): em 390x844 a presa de 9rem cobria 65px da razão social. */
describe('ClientsTable — coluna de ações', () => {
  it('no desktop, arquivar e ver são ícones soltos numa coluna de 9rem', () => {
    comPermissoes(['commercial.client.delete'])
    montar('active')

    expect(screen.getByRole('button', { name: 'archive.archiveAction' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'common.view' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('9rem')
  })

  it('em 390px, a linha tem UM botão de ações e a coluna encolhe para ele', () => {
    comPermissoes(['commercial.client.delete'])
    setViewportWidth(390)
    montar('active')

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'archive.archiveAction' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no 390px, restaurar fica só ícone, com nome acessível', () => {
    comPermissoes(['commercial.client.restore'])
    setViewportWidth(390)
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent?.trim()).toBe('')
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no desktop, restaurar segue rotulado numa coluna de 10rem', () => {
    comPermissoes(['commercial.client.restore'])
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent).toContain('archive.restoreAction')
    expect(larguraDaColunaDeAcoes()).toBe('10rem')
  })
})
```

Run: `cd frontend && pnpm exec vitest run src/features/commercial/components/Client/ClientsTable.test.tsx`
Expected: FAIL nos dois casos de 390.

- [ ] **Step 2: Testes que falham — Cursos**

`frontend/src/features/catalog/components/Course/CoursesTable.test.tsx`: o mesmo arquivo do Step 1 com estas trocas —

- import: `import { CoursesTable, type CourseRow } from './CoursesTable'`;
- fixture:

```tsx
const CURSO = {
  id: 1, name: 'Alta tensión', technical_name: 'AT-01', description: null, workload_hours: 16,
  templates: [], modules: [], redator_ids: [], modules_total_hours: 16,
  archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin Lotus',
} as unknown as CourseRow
```

- `montar`:

```tsx
const montar = (mode: ArchiveMode) =>
  renderWithProviders(
    <CoursesTable
      courses={[CURSO]} loading={false} onView={() => {}} mode={mode} onModeChange={() => {}}
      onArchive={() => {}} onRestore={() => {}} busy={false}
    />,
  )
```

- permissões: `'catalog.course.delete'` nos dois primeiros casos e `'catalog.course.restore'` nos dois últimos;
- docblock do `describe`: `/** Item 23 (\`D-65\`): em 390x844 a presa de 9rem cobria 95px do nome do curso. */` e título `'CoursesTable — coluna de ações'`.

Run: `cd frontend && pnpm exec vitest run src/features/catalog/components/Course/CoursesTable.test.tsx`
Expected: FAIL nos dois casos de 390.

- [ ] **Step 3: Testes que falham — Presupuestos**

`frontend/src/features/commercial/components/Budget/BudgetsTable.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@shared/testing/providers'
import { setViewportWidth } from '@shared/testing/viewport'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { ArchiveMode } from '@shared/hooks'
import { BudgetsTable, type BudgetRow } from './BudgetsTable'

vi.mock('react-i18next', async (importOriginal) => {
  const { mockUseTranslation } = await import('@shared/testing/i18n')
  return {
    ...(await importOriginal<typeof import('react-i18next')>()),
    useTranslation: mockUseTranslation(),
  }
})

// A query auxiliar de clientes: sem o mock ela bateria na API e a tabela
// entraria em erro (spec D16 do bloco que a criou), sem linha a medir.
vi.mock('../../hooks/useCommercialClients', () => ({
  useCommercialClients: () => ({
    data: [], isLoading: false, loadError: null, refetch: () => Promise.resolve(),
    client: () => null, clientName: () => '—',
  }),
}))

const ORCAMENTO = {
  id: 1, client_id: 1, code: 'ORC-1', status: undefined, total_value_uf: '10.5', total_approved_uf: '0',
  total_rejected_uf: '0', total_students: 3, quotes: [], payment_terms: null, files: [],
  archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin Lotus',
} as unknown as BudgetRow

function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

const montar = (mode: ArchiveMode) =>
  renderWithProviders(
    <BudgetsTable
      budgets={[ORCAMENTO]} loading={false} mode={mode} onModeChange={() => {}}
      onRestore={() => {}} busy={false}
    />,
    { route: '/comercial' },
  )

afterEach(() => {
  useSessionStore.setState({ user: null, status: 'unauthenticated' })
})

/** Item 23 (`D-65`): orçamento ativo tem uma ação só (ver) — nada a colapsar,
 * mas a presa de 6rem sobrava sobre o botão; em arquivados, restaurar perde o
 * rótulo no telefone como nas outras visões. */
describe('BudgetsTable — coluna de ações', () => {
  it('no desktop, ver numa coluna de 6rem', () => {
    montar('active')

    expect(screen.getByRole('button', { name: 'common.view' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('6rem')
  })

  it('em 390px, ver segue solto (uma ação não abre menu) e a coluna encolhe para ele', () => {
    setViewportWidth(390)
    montar('active')

    expect(screen.getByRole('button', { name: 'common.view' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'common.moreActions' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no 390px, restaurar fica só ícone, com nome acessível', () => {
    comPermissoes(['commercial.budget.restore'])
    setViewportWidth(390)
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent?.trim()).toBe('')
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no desktop, restaurar segue rotulado numa coluna de 10rem', () => {
    comPermissoes(['commercial.budget.restore'])
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent).toContain('archive.restoreAction')
    expect(larguraDaColunaDeAcoes()).toBe('10rem')
  })
})
```

Run: `cd frontend && pnpm exec vitest run src/features/commercial/components/Budget/BudgetsTable.test.tsx`
Expected: FAIL nos dois casos de 390 (largura `6rem`/`10rem`; restaurar rotulado).

- [ ] **Step 4: Testes que falham — Turmas**

Em `TurmasTable.test.tsx`:

1. imports novos: `import { afterEach } from 'vitest'` (junte ao import existente), `import { setViewportWidth } from '@shared/testing/viewport'`, `import { useSessionStore } from '@shared/stores/sessionStore'`, `import type { ArchiveMode } from '@shared/hooks'` (junte ao `import type { ServerTable }`).
2. no fixture `TURMA`, acrescente `archived_at: '2026-09-01T10:00:00Z', archived_by: 'Admin Lotus',`.
3. `montar` ganha o modo:

```tsx
function montar(mode: ArchiveMode = 'active') {
  return render(
    <MemoryRouter>
      <TurmasTable
        table={tabela()}
        status={null}
        onStatusChange={() => {}}
        mode={mode}
        onModeChange={() => {}}
        onArchive={() => {}}
        onRestore={() => {}}
        busy={false}
      />
    </MemoryRouter>,
  )
}
```

4. `describe` novo ao fim:

```tsx
function comPermissoes(permissions: string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 1, uuid: 'u-1', name: 'Quien Sea', email: 'q@lotus.cl', type: 'admin',
      is_active: true, roles: [], permissions, photo_url: null,
    },
  })
}

const larguraDaColunaDeAcoes = () =>
  (document.querySelector('thead tr th:last-child') as HTMLTableCellElement).style.width

/** Item 23 (`D-65`): a presa de 9rem cobria 79px de "Cliente" em 390x844. */
describe('TurmasTable — coluna de ações', () => {
  afterEach(() => {
    useSessionStore.setState({ user: null, status: 'unauthenticated' })
  })

  it('no desktop, arquivar e ver são ícones soltos numa coluna de 9rem', () => {
    comPermissoes(['operation.turma.delete'])
    montar('active')

    expect(screen.getByRole('button', { name: 'archive.archiveAction' })).toBeTruthy()
    expect(larguraDaColunaDeAcoes()).toBe('9rem')
  })

  it('em 390px, a linha tem UM botão de ações e a coluna encolhe para ele', () => {
    comPermissoes(['operation.turma.delete'])
    setViewportWidth(390)
    montar('active')

    expect(screen.getByRole('button', { name: 'common.moreActions' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'archive.archiveAction' })).toBeNull()
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })

  it('em arquivados no 390px, restaurar fica só ícone, com nome acessível', () => {
    comPermissoes(['operation.turma.restore'])
    setViewportWidth(390)
    montar('archived')

    expect(screen.getByRole('button', { name: 'archive.restoreAction' }).textContent?.trim()).toBe('')
    expect(larguraDaColunaDeAcoes()).toBe('4.5rem')
  })
})
```

Run: `cd frontend && pnpm exec vitest run src/features/operation/components/Turma/TurmasTable.test.tsx`
Expected: FAIL nos dois casos de 390; o caso de UI-07 que já existia segue PASS.

- [ ] **Step 5: Os quatro adaptadores repassam `collapsed`**

Nos quatro arquivos — `TurmaRowActions.tsx`, `ClientRowActions.tsx`, `BudgetRowActions.tsx`, `CourseRowActions.tsx` — a mesma troca, no molde do `RedatorRowActions`:

1. na desestruturação das props, depois do último callback: `collapsed,`
2. no tipo das props, depois do último callback: `collapsed?: boolean`
3. no `<ArchiveRowActions ... />`, como última prop: `collapsed={collapsed}`

Exemplo completo, `TurmaRowActions.tsx`:

```tsx
export function TurmaRowActions({
  turma,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
  collapsed,
}: {
  turma: TurmaData
  archived: boolean
  busy: boolean
  onView: (t: TurmaData) => void
  onArchive: (t: TurmaData) => void
  onRestore: (t: TurmaData) => void
  collapsed?: boolean
}) {
  const { can } = usePermissions()

  return (
    <ArchiveRowActions
      archived={archived}
      busy={busy}
      canRestore={can('operation.turma.restore')}
      canArchive={can('operation.turma.delete')}
      onRestore={() => onRestore(turma)}
      onArchive={() => onArchive(turma)}
      onView={() => onView(turma)}
      collapsed={collapsed}
    />
  )
}
```

- [ ] **Step 6: As quatro tabelas ligam o hook**

Nas quatro tabelas, `useCollapsibleActionsColumn` entra no import de `@shared/ui` e o hook é chamado logo depois de `const largura = ...Widths(archived)`:

| Tabela | Linha nova |
|---|---|
| `TurmasTable.tsx` | `const colunaDeAcoes = useCollapsibleActionsColumn(archived ? '10rem' : '9rem')` |
| `CoursesTable.tsx` | `const colunaDeAcoes = useCollapsibleActionsColumn(archived ? '10rem' : '9rem')` |
| `ClientsTable.tsx` | `const colunaDeAcoes = useCollapsibleActionsColumn(archived ? "10rem" : "9rem");` (o arquivo usa aspas duplas e ponto e vírgula) |
| `BudgetsTable.tsx` | `const colunaDeAcoes = useCollapsibleActionsColumn(archived ? '10rem' : '6rem')` |

Acima da linha, o comentário (nas quatro):

```tsx
  // Abaixo de `sm` a linha carrega um controle só e a presa encolhe junto
  // (item 23, `D-65`).
```

E na coluna de ação de cada uma: o adaptador ganha `collapsed={colunaDeAcoes.collapsed}` como última prop, e o `style` vira `style={stickyActionsColumn(colunaDeAcoes.width)}`. Em `TurmasTable.tsx`, por exemplo:

```tsx
      <AppColumn
        body={(turma: TurmaRow) => (
          <TurmaRowActions
            turma={turma}
            archived={archived}
            busy={busy}
            onView={(x) => navigate(`/operacion/turmas/${x.id}`)}
            onArchive={onArchive}
            onRestore={onRestore}
            collapsed={colunaDeAcoes.collapsed}
          />
        )}
        style={stickyActionsColumn(colunaDeAcoes.width)}
      />
```

- [ ] **Step 7: Docblocks que ficaram falsos**

`useCollapsibleActionsColumn.ts`, o parágrafo das linhas 103-107:

```ts
 * Opt-in por tabela, e não no `stickyActionsColumn` de todas: a coluna só pode
 * encolher se a linha colapsar junto, e cada tabela que liga isto passa a ter
 * um layout de telefone novo, medido no navegador e não suposto. Hoje:
 * Redactores, Alumnos, Usuarios e Roles (item 16 fatia 3). As outras oito
 * tabelas da `D-65` são do item 23.
```
vira
```ts
 * Não mora dentro do `stickyActionsColumn` porque a coluna só pode encolher se
 * a linha colapsar junto, e o `collapsed` tem de chegar ao `*RowActions` da
 * tabela. Desde o item 23 as 12 tabelas com coluna presa ligam isto — as
 * quatro da fatia 3 do item 16 e as oito da `D-65`, medidas no navegador —, e
 * a catraca `ACAO_SEM_COLAPSO` do `eslint.config.js` reprova coluna presa cuja
 * largura não venha daqui.
```

`ArchiveRowActions.tsx`, o parágrafo das linhas 25-28:

```tsx
 * `collapsed` é o do `useCollapsibleActionsColumn` da tabela: abaixo de `sm` a
 * linha ativa vira o menu do `RowActions`, e restaurar perde o rótulo visível
 * (Q-1 do review de 2026-09-26). Tabela que não liga o hook não passa nada e
 * segue como era.
```
vira
```tsx
 * `collapsed` é o do `useCollapsibleActionsColumn` da tabela: abaixo de `sm` a
 * linha ativa vira o menu do `RowActions`, e restaurar perde o rótulo visível
 * (Q-1 do review de 2026-09-26). Desde o item 23 toda tabela que usa isto liga
 * o hook; o default `false` fica para quem monta a peça fora de tabela.
```

- [ ] **Step 8: Rodar e ver passar**

Run: `cd frontend && pnpm exec vitest run src/features/operation/components/Turma src/features/commercial src/features/catalog src/shared/ui/RowActions`
Expected: PASS.

- [ ] **Step 9: Lint e commit**

Run: `cd frontend && pnpm lint`
Expected: 0 problemas.

```bash
git add frontend/src/features/operation/components/Turma \
  frontend/src/features/commercial/components/Client \
  frontend/src/features/commercial/components/Budget \
  frontend/src/features/catalog/components/Course \
  frontend/src/shared/ui/RowActions/useCollapsibleActionsColumn.ts \
  frontend/src/shared/ui/ArchiveRowActions/ArchiveRowActions.tsx
git commit -m "refactor(tabelas): Turmas, Clientes, Presupuestos e Cursos colapsam as acoes abaixo de sm"
```

---

### Task 7: Catraca `ACAO_SEM_COLAPSO`

**Files:**
- Modify: `frontend/eslint.config.js` (depois do `ACAO_SEM_ANCORA`, ~L545-553; e os dois arrays que o citam, ~L629 e ~L640)

**Interfaces:**
- Consumes: as 12 tabelas já em `stickyActionsColumn(colunaDeAcoes.width)` (Tasks 4-6).
- Produces: regra que reprova `stickyActionsColumn(<qualquer coisa que não seja x.width>)` em `src/features/*/components/**`.

- [ ] **Step 1: Inventário — toda chamada já passa `.width`**

Run: `cd frontend && grep -rn "stickyActionsColumn(" src/features src/app | grep -v "\.width)"`
Expected: sem linhas. Se aparecer alguma, a Task 5 ou a 6 deixou tabela para trás: corrija lá antes de seguir.

- [ ] **Step 2: Escrever a regra**

Em `eslint.config.js`, a `message` do `ACAO_SEM_ANCORA` vira:

```js
  message:
    'Coluna de ação fica presa à direita do invólucro que rola: style={stickyActionsColumn(colunaDeAcoes.width)} (itens 17 e 23).',
```

E logo depois do fechamento do `ACAO_SEM_ANCORA`:

```js
// Item 23 (`D-65`): a coluna presa só encolhe no telefone se a linha colapsar
// junto, e as duas coisas saem do MESMO booleano de
// `useCollapsibleActionsColumn`. Com largura literal a tabela volta a cobrir o
// nome em 390x844 — foi o que a medição achou em oito tabelas (172px do aluno
// na matrícula). O argumento tem de ser o `.width` que o hook devolve.
//
// O que ela NÃO pega: uma tabela que chame o hook e passe `.width` mas esqueça
// o `collapsed` no `*RowActions` — aí a coluna encolhe e os ícones transbordam.
// Isso é dos testes de 390px de cada tabela, não desta regra.
const ACAO_SEM_COLAPSO = {
  selector:
    "CallExpression[callee.name='stickyActionsColumn']" +
    ":not(:has(> MemberExpression[property.name='width']))",
  message:
    'A largura da coluna presa vem de useCollapsibleActionsColumn: style={stickyActionsColumn(colunaDeAcoes.width)} (item 23).',
}
```

Nos DOIS arrays de `no-restricted-syntax` que já contêm `ACAO_SEM_ANCORA` (o bloco `files: ['src/features/*/components/**/*.{ts,tsx}']` e o gêmeo `files: FORA_DO_CAMPO_LIGADO`), acrescente `ACAO_SEM_COLAPSO` logo depois de `ACAO_SEM_ANCORA`:

```js
... ...COLUNA_SEM_LARGURA, ACAO_SEM_ANCORA, ACAO_SEM_COLAPSO, DROPDOWN_SEM_NOME, ...
```

- [ ] **Step 3: Lint da árvore verde**

Run: `cd frontend && pnpm lint`
Expected: 0 problemas.

- [ ] **Step 4: Ver a catraca reprovar (lição 10) — literal**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
F=src/features/catalog/components/Course/CoursesTable.tsx
cp "$F" "$SCRATCH/CoursesTable.tsx.bak"
sed -i 's/stickyActionsColumn(colunaDeAcoes.width)/stickyActionsColumn('"'"'9rem'"'"')/' "$F"
grep -n "stickyActionsColumn(" "$F"
pnpm exec eslint "$F"; echo "eslint exit $?"
cp "$SCRATCH/CoursesTable.tsx.bak" "$F" && git diff --exit-code -- "$F" && echo restaurado
```

Expected: o `grep` mostra `stickyActionsColumn('9rem')`; o ESLint aponta `A largura da coluna presa vem de useCollapsibleActionsColumn` e sai com `eslint exit 1`; ao fim, `restaurado`.

- [ ] **Step 5: Ver a catraca reprovar — ternário de literais**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend
F=src/features/operation/components/Turma/TurmasTable.tsx
cp "$F" "$SCRATCH/TurmasTable.tsx.bak"
sed -i 's/stickyActionsColumn(colunaDeAcoes.width)/stickyActionsColumn(archived ? '"'"'10rem'"'"' : '"'"'9rem'"'"')/' "$F"
grep -n "stickyActionsColumn(" "$F"
pnpm exec eslint "$F"; echo "eslint exit $?"
cp "$SCRATCH/TurmasTable.tsx.bak" "$F" && git diff --exit-code -- "$F" && echo restaurado
```

Expected: mesma mensagem, `eslint exit 1`, `restaurado`. **Nunca** `git stash` para esta sonda.

- [ ] **Step 6: Commit**

```bash
git add frontend/eslint.config.js
git commit -m "chore(lint): catraca ACAO_SEM_COLAPSO exige a largura do hook na coluna presa"
```

---

### Task 8: Medição depois do mecanismo — decide o §4.2

**Files:**
- Modify: `docs/superpowers/audits/2026-09-27-item23-medicoes.md` (seção 4 e a decisão da seção 5)

**Interfaces:**
- Consumes: `medir.cjs`, `fixture.cjs` (Task 1); o código das Tasks 2-7.
- Produces: a lista de visões que reprovam a régua de 390 e o X de cada uma, que a Task 9 aplica.

- [ ] **Step 1: Medir com a fixture**

```bash
cd $SCRATCH && node fixture.cjs archive; \
  OUT=meio.json node medir.cjs > meio.txt 2>&1; echo "medir exit $?"; \
  node fixture.cjs restore
```

Expected: como na Task 1. `fixture-ids.json` some ao fim.

- [ ] **Step 2: Conferir 1024 e 1440 (o §4.1 já tem de fechar)**

Em `meio.txt`, toda linha `1024x768` com presa tem `scroll` = `frame`, `overlap 0` e nenhum `TRUNC`; os dois painéis do Dashboard têm `table` ≤ `frame`. Toda linha `1440x900` tem `scroll` = `frame` e `overlap 0`.

Se alguma de 1024 reprovar: PARE. O §4.1 não fechou onde a spec mediu que fecharia — registre a linha no audit e leve ao João antes da Task 9.

- [ ] **Step 3: Classificar 390 e calcular X**

Para cada linha `390x844` (menos Dashboard e diálogo, que não têm presa):

- **Ativa reprova** se `box > 0`. Nela, com `T` = `table`, `w1` = `col1`, `L` = `free`:
  `share = w1 / T`; `Xpx = (L + 16) / share`; **`X` = `Xpx / 16` arredondado para BAIXO em
  passos de 0.25rem**. (16px é o `px-4` da célula; `L` não muda com a largura da tabela, porque a
  presa é fixa na borda direita da moldura e a 1ª coluna na esquerda.)
- **Arquivada reprova** se `box > 0` **ou** se o `col1` dela for menor que o `col1` final da
  visão ativa da mesma tabela (o da ativa DEPOIS do X dela, `share_ativa × X_ativa × 16`, ou o
  medido se a ativa passou). Nela: `share_a = col1_a / table_a`; **`X` = `col1_ativa / share_a / 16`
  arredondado para CIMA em 0.25rem**; confira que `share_a × X × 16 − 16 ≤ free_a` (a caixa
  continua fora da presa) — se não couber, fique com o teto da caixa,
  `floor((free_a + 16) / share_a / 16 × 4) / 4`, e registre que ">= ativa" não fecha nela.

Valores de referência da spec (§4.2, contas sobre a baseline): Matrícula ~32rem, Cursos ~40rem,
Emisión ~39rem, Alumnos ~36rem, Roles ~25rem. Um X muito longe disso é sinal de medição errada —
remeça antes de aceitar.

- [ ] **Step 4: Registrar no audit**

Seção 4 do audit ("Depois do piso, das ações e do colapso — `<sha>`"): as mesmas três tabelas
da seção 3, com os números de `meio.txt` e a saída bruta.

Seção 5 ("Piso estreito (spec §4.2)"): uma tabela `Visão | box | col1 | free | table | share | X`
só com as que reprovaram, e a conta de cada X. **Se nenhuma reprovou**, escreva o veredito: "Com o
piso de 42rem e o colapso nas 12 tabelas, nenhuma visão reprova a régua de 390; o
`narrowFloorTablePt` não nasce." — e pule a Task 9.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/audits/2026-09-27-item23-medicoes.md
git commit -m "docs(audit): item 23 mede o mecanismo e decide o piso estreito"
```

---

### Task 9 (condicional): Piso estreito por modo

**Só execute se a seção 5 do audit listar ao menos uma visão.**

**Files:**
- Modify: `frontend/src/shared/ui/AppDataTable/style.ts` (depois de `appDataTablePt`)
- Modify: `frontend/src/shared/ui/AppDataTable/index.ts`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.test.tsx`
- Modify: cada tabela da seção 5 e o teste dela (os arquivos da tabela do §1 da spec)

**Interfaces:**
- Consumes: os X da seção 5 do audit.
- Produces: `narrowFloorTablePt(floor: \`${number}rem\`): DataTablePassThroughOptions`, exportado por `@shared/ui`.

- [ ] **Step 1: Teste do `pt` que falha**

Em `AppDataTable.test.tsx`, import `narrowFloorTablePt` de `./style` e, ao fim do arquivo:

```tsx
/**
 * Item 23 (`D-65`, spec §4.2): em 390x844 a moldura tem 276px e a presa
 * colapsada 72px; onde a 1ª coluna, proporcional à tabela, passa da área livre,
 * o nome termina sob a presa. O piso por modo muda SÓ abaixo de `sm` — de `sm`
 * para cima volta ao default, então 1024 e 1440 não mudam por construção.
 */
describe('narrowFloorTablePt — piso por modo abaixo de sm', () => {
  const classeDaTabela = (pt: typeof appDataTablePt) => (pt.table as { className: string }).className

  it('abaixo de sm usa o piso da tabela, de sm para cima o default, e compõe o table-fixed', () => {
    expect(classeDaTabela(narrowFloorTablePt('32rem')).split(' ')).toEqual([
      'min-w-(--table-narrow-floor)',
      'sm:min-w-[42rem]',
      'table-fixed',
    ])
  })

  it('o piso de sm para cima é o MESMO do default', () => {
    const padrao = classeDaTabela(appDataTablePt).split(' ').find((c) => c.startsWith('min-w-'))
    expect(classeDaTabela(narrowFloorTablePt('32rem'))).toContain(`sm:${padrao}`)
  })

  it('o valor chega à <table> como variável CSS', () => {
    render(
      <AppDataTable value={LINHAS} pt={narrowFloorTablePt('32rem')}>
        <AppColumn field="id" header="id" />
      </AppDataTable>,
    )
    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.style.getPropertyValue('--table-narrow-floor')).toBe('32rem')
  })
})
```

Run: `cd frontend && pnpm exec vitest run src/shared/ui/AppDataTable/AppDataTable.test.tsx`
Expected: FAIL — `narrowFloorTablePt is not a function`.

- [ ] **Step 2: Implementar**

Em `style.ts`, logo depois do fechamento de `appDataTablePt`:

```ts
/** Piso da tabela abaixo de `sm`, por tabela e por modo (item 23, `D-65`,
 * spec §4.2). De `sm` para cima volta ao default de 42rem, então 1024 e 1440
 * não mudam por construção.
 *
 * Em 390x844 a moldura tem 276px (242px na Emisión) e a presa colapsada 72px:
 * sobram ~204px. Com `table-fixed` a 1ª coluna é uma fração FIXA da tabela, e
 * onde essa fração do piso de 42rem passa da área livre a caixa do nome
 * termina sob a presa. O remédio é o piso, não o peso — a mesma conclusão da
 * `D-65` em 1024. Duas direções:
 * - visão ativa: piso MENOR, para a coluna identificadora caber na área livre;
 * - visão de arquivados: piso MAIOR, para devolver à 1ª coluna o que o par fixo
 *   de 24% de `ARCHIVED_COLUMN` tira dela.
 * Cada valor sai da medição (audit do item 23, seção 5), nunca de conta de
 * cabeça.
 *
 * O valor vai por variável CSS, e não montado numa classe: o Tailwind v4 só
 * gera o CSS de classe que ele LÊ no fonte, e um `min-w-[${x}]` de runtime não
 * existiria. As duas classes abaixo são literais, e o `sm:` repete o piso do
 * default de propósito — o teste amarra os dois. */
export function narrowFloorTablePt(floor: `${number}rem`): DataTablePassThroughOptions {
  return {
    table: {
      className: `min-w-(--table-narrow-floor) sm:min-w-[42rem] ${TABLE_LAYOUT}`,
      style: { '--table-narrow-floor': floor } as CSSProperties,
    },
  }
}
```

Em `index.ts` da pasta:

```ts
export { appDataTablePt, narrowFloorTablePt, stickyActionsColumn } from './style'
```

Run: `cd frontend && pnpm exec vitest run src/shared/ui/AppDataTable/AppDataTable.test.tsx`
Expected: PASS.

- [ ] **Step 3: Aplicar nas visões da seção 5 — uma tabela por vez, teste primeiro**

Para cada tabela listada, com `XA` (ativa) e/ou `XR` (arquivados) da seção 5:

1. No teste da tabela (os arquivos das Tasks 3-6, ou `RolesTable.test.tsx`/`StudentsTable.test.tsx` para Roles e Alumnos), acrescente um caso por modo afetado:

```tsx
  it('abaixo de sm, o piso é o medido para esta visão (item 23, audit §5)', () => {
    // montar('active'), montar('archived') ou montar(); em RolesTable.test.tsx e
    // StudentsTable.test.tsx, o mesmo renderWithProviders(...) que os casos vizinhos usam
    montar('active')
    const tabela = document.querySelector('table') as HTMLTableElement
    expect(tabela.className).toContain('sm:min-w-[42rem]')
    expect(tabela.style.getPropertyValue('--table-narrow-floor')).toBe('<XA>rem')
  })
```

   com `<XA>` (ou `<XR>`) substituído pelo número do audit. Rode o arquivo: FAIL.

2. Na tabela, `narrowFloorTablePt` entra no import de `@shared/ui` e o `pt` vai no `AppDataTable` ou no `SearchableTableFrame`:
   - só a ativa: `pt={archived ? undefined : narrowFloorTablePt('<XA>rem')}`;
   - só arquivados: `pt={archived ? narrowFloorTablePt('<XR>rem') : undefined}`;
   - as duas: `pt={narrowFloorTablePt(archived ? '<XR>rem' : '<XA>rem')}`;
   - tabela de modo único (Matrícula, Matrícula arquivada, Emisión, Alumnos, Roles): `pt={narrowFloorTablePt('<X>rem')}`.

   Acima da prop, um comentário de uma linha: `// Piso de 390 medido (item 23, audit §5): <col1>px de 1ª coluna contra <free>px livres.`

3. Rode o arquivo: PASS. Commit por tabela:

```bash
git add <tabela>.tsx <tabela>.test.tsx
git commit -m "fix(tabelas): <Tabela> ganha o piso de 390 medido no item 23"
```

O primeiro commit da task leva também `style.ts`, `index.ts` e `AppDataTable.test.tsx`.

- [ ] **Step 4: Remedir 390 e confirmar**

```bash
cd $SCRATCH && node fixture.cjs archive; \
  VPS=390x844,1024x768 OUT=piso.json node medir.cjs > piso.txt 2>&1; echo "medir exit $?"; \
  node fixture.cjs restore
```

Expected: toda linha `390x844` com presa em `box 0`, e em cada `ARCH` o `col1` ≥ o da ativa correspondente; as linhas `1024x768` idênticas às de `meio.txt` em `table`, `scroll` e `overlap`. Se alguma de 390 ainda reprovar, recalcule o X dela com os números novos (Task 8, Step 3) e repita o Step 3 só para ela.

Acrescente à seção 5 do audit o resultado de `piso.txt` e commite:

```bash
git add docs/superpowers/audits/2026-09-27-item23-medicoes.md
git commit -m "docs(audit): item 23 confirma o piso de 390 nas visoes que reprovavam"
```

---

### Task 10: Varredura final, `Timestamp` no navegador, veredito e gates

**Files:**
- Create: `$SCRATCH/timestamp.cjs`
- Modify: `docs/superpowers/audits/2026-09-27-item23-medicoes.md` (seções 6, 7, 8 e apêndices)

**Interfaces:**
- Consumes: tudo das Tasks 1-9.

- [ ] **Step 1: Varredura final com a fixture**

```bash
cd $SCRATCH && node fixture.cjs archive; \
  OUT=depois.json node medir.cjs > depois.txt 2>&1; echo "medir exit $?"; \
  node fixture.cjs restore
```

Expected: `medir exit 0`; `fixture-ids.json` some ao fim.

Confira contra a régua, linha por linha:
- `1024x768`: `scroll` = `frame`, `overlap 0`, sem `TRUNC`; Dashboard com `table` ≤ `frame`.
- `390x844`: `box 0` em toda visão com presa; `col1` de cada `ARCH` ≥ o da ativa; e o **um controle por linha**, que o script não mede — abra uma vez, em 390x844, uma visão ativa de cada tabela com 2+ ações (Clientes, Turmas, Matrícula, Cursos, Historial com certificado vigente, Redactores, Usuarios) e confira que a coluna mostra só o `⋮`.
- `1440x900`: `scroll` = `frame` e `overlap 0` em todas; nenhuma coluna de dado mais estreita que em `antes.txt` além do que a presa menor devolveu.
- `DIALOGO`: `scroll` ≤ o de `antes.txt`.

Qualquer reprovação: PARE e leve ao João com a linha; não afrouxe a régua.

- [ ] **Step 2: Escrever `$SCRATCH/timestamp.cjs`**

```js
// timestamp.cjs — o Timestamp no navegador: máscara por idioma e cor dos ícones
// nos dois temas (item 23, spec §6.2).
const { chromium } = require(
  process.env.PW ||
    '/home/jvbat/.nvm/versions/node/v22.23.1/lib/node_modules/@playwright/cli/node_modules/playwright-core',
)

const BASE = process.env.BASE || 'http://localhost:5175'
const OUT = process.env.OUTDIR || __dirname
const PRIMARIA = 'rgb(37, 165, 228)'
const DATA = { 'es-CL': /^\d{2}-\d{2}-\d{4}$/, 'pt-BR': /^\d{2}\/\d{2}\/\d{4}$/, en: /^\d{1,2}\/\d{1,2}\/\d{4}$/ }
const HORA = { 'es-CL': /^\d{2}:\d{2}$/, 'pt-BR': /^\d{2}:\d{2}$/, en: /^\d{2}:\d{2}\s[AP]M$/ }

;(async () => {
  const browser = await chromium.launch()
  let falhas = 0
  for (const lang of Object.keys(DATA)) {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      await ctx.addInitScript(
        ({ lang, theme }) => {
          localStorage.setItem('lotus-lang', lang)
          localStorage.setItem('lotus-ui', JSON.stringify({ state: { theme }, version: 0 }))
        },
        { lang, theme },
      )
      const page = await ctx.newPage()
      await page.goto(`${BASE}/login`)
      await page.fill('input[type=email], input[name=email]', 'admin@lotus.cl')
      await page.fill('input[type=password]', 'senha123')
      await page.keyboard.press('Enter')
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
      for (const path of ['/administracion', '/personas']) {
        await page.goto(`${BASE}${path}`)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1200)
        const achados = await page.evaluate(() =>
          [...document.querySelectorAll('time')].map((t) => ({
            onde: t.closest('header') ? 'cabecalho' : t.closest('td') ? 'tabela' : 'outro',
            hora: t.children[1]?.textContent,
            data: t.children[3]?.textContent,
            icone1: getComputedStyle(t.children[0]).color,
            icone2: getComputedStyle(t.children[2]).color,
            aria: [t.children[0].getAttribute('aria-hidden'), t.children[2].getAttribute('aria-hidden')].join(','),
          })),
        )
        const tracos = await page.evaluate(
          () => [...document.querySelectorAll('td')].filter((td) => td.textContent.trim() === '—').length,
        )
        for (const a of achados) {
          const ok =
            HORA[lang].test(a.hora) &&
            DATA[lang].test(a.data) &&
            a.icone1 === PRIMARIA &&
            a.icone2 === PRIMARIA &&
            a.aria === 'true,true'
          if (!ok) falhas++
          console.log(`${ok ? 'OK    ' : 'FALHA '} ${lang} ${theme} ${path} ${a.onde}: ${a.hora} | ${a.data} | ${a.icone1} ${a.icone2} | aria ${a.aria}`)
        }
        console.log(`       ${lang} ${theme} ${path}: ${achados.filter((a) => a.onde === 'tabela').length} <time> em célula, ${tracos} célula(s) com travessão`)
        if (lang === 'es-CL') {
          await page.locator('header time').first().screenshot({ path: `${OUT}/timestamp-cabecalho-${theme}.png` })
          const celula = page.locator('td time').first()
          if (await celula.count()) await celula.screenshot({ path: `${OUT}/timestamp-${path.slice(1)}-${theme}.png` })
        }
      }
      await ctx.close()
    }
  }
  await browser.close()
  console.log(falhas ? `${falhas} FALHA(S)` : 'tudo OK')
  process.exit(falhas ? 1 : 0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 3: Rodar**

Run: `cd $SCRATCH && node timestamp.cjs | tee timestamp.txt`
Expected: `tudo OK`, com linhas `OK` para o cabeçalho em `/administracion` e `/personas` nos 6 pares idioma × tema, e para a célula do admin em Usuarios. Em Redactores, se o banco de dev não tiver `last_login` em nenhum redator, a linha de contagem mostra `0 <time> em célula` e as células com travessão — registre isso no audit (a coluna fica provada pelo teste de unidade da Task 3). Abra os PNGs `timestamp-*.png` com `Read` e confira: ícones azuis alinhados em coluna, hora em cima, data embaixo, texto branco no cabeçalho.

- [ ] **Step 4: Fechar o audit**

- **Seção 6 — "Depois — `<sha>`":** as três tabelas com os números de `depois.txt`, uma coluna "Régua" com `passa`/`reprova` por linha, a conferência manual do `⋮` em 390 e a saída bruta.
- **Seção 7 — "Timestamp no navegador":** a saída de `timestamp.txt` e os caminhos das capturas (elas ficam no scratchpad; o audit registra o que se viu nelas).
- **Seção 8 — "Veredito da direção (a)":**

  > A `D-65` pedia medir um sinal de rolagem no invólucro. **Não se implementa.** Em 1024x768 o
  > piso de 42rem zera a rolagem de toda tabela (seção 6: `scroll` = `frame` nas 15 consumidoras),
  > então não sobra rolagem a anunciar. Em 390x844 o invólucro já se anuncia pelas sombras da UI-10
  > (`background-attachment: local/scroll`, `AppDataTable/style.ts`) e a coluna presa tem sombra
  > própria permanente; a 1ª coluna, agora fora da presa (seção 6, `box 0`), deixa à vista que a
  > linha continua. Fecha a direção (a) da `D-65` no `/fechar-sprint`.

- **Seção 2:** confira que cada id arquivado nas quatro rodadas foi restaurado (as saídas `restore 200`).
- **Apêndices A, B e C:** o conteúdo integral de `medir.cjs`, `fixture.cjs` e `timestamp.cjs`, cada um em bloco ```` ```js ````.

- [ ] **Step 5: Gates**

```bash
cd /home/jvbat/projetos/fix-frontend/frontend && pnpm lint && pnpm build && pnpm test
cd /home/jvbat/projetos/fix-frontend && git diff --stat main...HEAD -- backend/ frontend/src/shared/types/generated.ts; echo "diff exit $?"
git diff main...HEAD --name-only | grep -v '^frontend/\|^docs/superpowers/' ; echo "fora do escopo exit $?"
```

Expected: `pnpm lint` com 0 problemas; `pnpm build` verde; `pnpm test` verde; o `git diff --stat` do backend e do `generated.ts` **sem linhas** (`pint` e `typescript:transform` ficam N/A por escopo provado); o último `grep` sem linhas e `exit 1`. Registre as três saídas no fim da seção 6 do audit.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/audits/2026-09-27-item23-medicoes.md
git commit -m "docs(audit): item 23 fecha a medicao, o veredito da direcao (a) e os gates"
```

A transição de estado (`executing` → `ready_for_review`) é do `/executar-bloco`, no mesmo commit ou no seguinte, conforme o comando.

---

## Self-review (feito na escrita)

- **Cobertura da spec:** §4.1 → Task 4; §4.2 → Tasks 8 e 9; §4.3 → Task 5 (com o desvio da Matrícula arquivada registrado acima); §4.4 → Tasks 5, 6 e 7; §4.5 → Tasks 2 e 3; §5 → Task 10 Step 4; §6.1 → testes das Tasks 2-7 e 9; §6.2 → Tasks 1, 8, 9 e 10; §6.3 → Task 10 Step 5; ordem do §8 → Task 1 (baseline) primeiro, Task 2 (Timestamp) antes da medição da Task 8, §4.1/4.3/4.4 antes da Task 8, Task 9 condicional, audit por último.
- **Nomes:** `useCollapsibleActionsColumn(...).width/.collapsed`, `narrowFloorTablePt`, `RowAction.severity/describedBy`, `HistorialRowActions`, `EmissionRowActions`, `EnrollmentRowActions` — os mesmos em todas as tasks que os citam.
- **Valores medidos:** os X da Task 9 vêm da seção 5 do audit por decisão da spec ("X sai da medição"); a Task 8 dá a fórmula e as referências para conferir.

## Handoff de execução

executor: claude

Motivo: o bloco toca `shared/ui` (componente novo, `RowAction`, piso default do `AppDataTable`) e
uma catraca de ESLint, tem uma task condicional (Task 9) cujos valores saem de medição em
navegador, e duas paradas de julgamento previstas (Task 8 Step 2 e Task 10 Step 1) que devolvem a
decisão ao João. Nada disso é mecânico com paths fechados.
