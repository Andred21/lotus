# Estilização · tema custom (ADR-16), shell e tipografia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar o ADR-16 com identidade própria — temas Lara-Lotus gerados, camada fina de marca,
shell conforme e tipografia em 3 papéis — provando cada correção pela medição que reprovou no
review de UI de 2026-08-11.

**Architecture:** script versionado gera cópias dos 2 temas Lara com a escala celeste (D5' da
spec); `brand-theme.css` fino no bundle cobre fontes, D6 e `tabular-nums`; shell (Sidebar navy,
Header barra utilitária) migra para tokens do tema; aria-labels entram no i18n.

**Tech Stack:** React 19 + TS, Vite, Tailwind v4 (layout), PrimeReact/Lara, `@fontsource`,
vitest, playwright-cli (verificação).

**Spec:** `docs/superpowers/specs/2026-08-11-estilizacao-adr16-shell-tipografia-design.md`

## Global Constraints

- Leis §5: PrimeReact só via `shared/ui`; feature não importa feature; `generated.ts` intocado;
  zero backend/schema.
- Seta de dependência só desce: `shared/config` não importa de `app/` — temas gerados moram em
  `src/shared/styles/`.
- i18n: 3 locales (`pt-BR`, `es-CL`, `en`) com chaves idênticas; `es-CL` é a referência.
- Paleta: só os 6 tokens da spec §4. Nenhum hex novo fora deles.
- Gate de verificação frontend = `pnpm build` + `pnpm lint` + `pnpm test`, de `frontend/`.
- Commits frequentes, mensagem em português, formato `feat/fix/docs(escopo): ...`.
- Baseline esperada (Task 0 confirma): testes frontend verdes, git limpo sobre `463e715`.

---

### Task 0: Baseline

**Files:** nenhum (só medição).

- [ ] **Step 1: instalar e medir**

```bash
cd frontend && pnpm install && pnpm build && pnpm lint && pnpm test
```

Expected: os três verdes. Registrar o placar do vitest (nº arquivos/testes) — é a baseline.

- [ ] **Step 2: árvore limpa**

```bash
git status --porcelain
```

Expected: vazio (nenhum commit nesta task).

---

### Task 1: Fontes self-hosted + tokens de fonte do Tailwind

**Files:**
- Modify: `frontend/package.json` (deps novas)
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Produces: utilities `font-sans`/`font-mono`/`font-display` mapeadas a Inter/IBM Plex
  Mono/Archivo. O `font-mono text-sm` já usado no folio (`HistorialTable.tsx:48`) passa a render
  em Plex **sem tocar a feature**.

- [ ] **Step 1: instalar as 3 famílias**

```bash
cd frontend && pnpm add @fontsource/inter @fontsource/archivo @fontsource/ibm-plex-mono
```

- [ ] **Step 2: importar os pesos usados em `main.tsx`**

Depois da linha `import "flag-icons/css/flag-icons.min.css";`:

```ts
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
```

- [ ] **Step 3: tokens de fonte no `index.css`**

Depois de `@import "tailwindcss-primeui";`:

```css
/* Papéis tipográficos da marca (spec §5): sans = corpo, display = títulos,
 * mono = dado técnico (folio, RUT, datas). Sobrescreve os tokens default do
 * Tailwind v4 — `font-mono` existente passa a render IBM Plex Mono. */
@theme {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Archivo', 'Inter', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}
```

- [ ] **Step 4: verificar**

```bash
pnpm build && ls dist/assets/*.woff2 | wc -l
```

Expected: build verde; contagem ≥ 7 (um woff2 por peso importado, latin no mínimo).

- [ ] **Step 5: commit**

```bash
git add package.json pnpm-lock.yaml src/main.tsx src/index.css
git commit -m "feat(tema): fontes Inter/Archivo/IBM Plex Mono self-hosted e tokens Tailwind"
```

---

### Task 2: Temas Lara-Lotus gerados por script + guarda de drift

**Files:**
- Create: `frontend/scripts/generate-brand-theme.mjs`
- Create: `frontend/scripts/generate-brand-theme.d.mts` (tipos p/ o `tsc -b` dos testes)
- Create: `frontend/src/shared/styles/themes/lara-light-lotus.css` (gerado)
- Create: `frontend/src/shared/styles/themes/lara-dark-lotus.css` (gerado)
- Modify: `frontend/src/shared/config/primeTheme.ts`
- Modify: `frontend/package.json` (script `brand-theme`)
- Test: `frontend/tests/brand-theme.test.ts`

**Interfaces:**
- Produces: `transform(css, map): string`, `LIGHT_MAP`, `DARK_MAP` exportados do script;
  os dois CSS gerados consumidos por `applyPrimeTheme()`.

- [ ] **Step 1: teste que reprova drift (escrever primeiro)**

`frontend/tests/brand-theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { transform, LIGHT_MAP, DARK_MAP } from '../scripts/generate-brand-theme.mjs'

const root = resolve(__dirname, '..')
const stock = (name: string) =>
  readFileSync(resolve(root, `node_modules/primereact/resources/themes/${name}/theme.css`), 'utf8')
const committed = (name: string) =>
  readFileSync(resolve(root, `src/shared/styles/themes/${name}.css`), 'utf8')

/** O tema commitado deve ser exatamente uma geração fresca sobre o Lara
 * instalado — pega edição à mão E upgrade do primereact sem re-rodar o script. */
describe('temas Lara-Lotus gerados (spec D5\')', () => {
  it('light commitado == geração fresca, sem azul Lara, radius 4px', () => {
    const fresh = transform(stock('lara-light-blue'), LIGHT_MAP)
    expect(committed('lara-light-lotus')).toBe(fresh)
    expect(fresh).not.toMatch(/#3b82f6/i)
    expect(fresh).not.toMatch(/#1d4ed8/i)
    expect(fresh).not.toMatch(/#4b5563/i) // corpo virou grafite
    expect(fresh).not.toContain('border-radius: 6px')
    expect(fresh).toContain('#25a5e4')
    expect(fresh).toContain('#334155') // grafite (spec §4)
  })

  it('dark commitado == geração fresca, sem azul Lara, ground noche', () => {
    const fresh = transform(stock('lara-dark-blue'), DARK_MAP)
    expect(committed('lara-dark-lotus')).toBe(fresh)
    expect(fresh).not.toMatch(/#60a5fa/i)
    expect(fresh).not.toMatch(/#3b82f6/i)
    expect(fresh).toContain('#25a5e4')
    expect(fresh).toContain('#0b1220') // noche (spec §4)
  })
})
```

- [ ] **Step 2: rodar e ver falhar**

```bash
pnpm test -- tests/brand-theme.test.ts
```

Expected: FAIL — `Cannot find module '../scripts/generate-brand-theme.mjs'`.

- [ ] **Step 3: o script**

`frontend/scripts/generate-brand-theme.mjs`:

```js
// Gera os temas Lara-Lotus (spec D5' de 2026-08-11): cópia dos Lara stock com a
// escala azul substituída pela escala celeste-lotus derivada de #25A5E4, radius
// 6px→4px e "Inter var"→"Inter" (a Inter real é self-hosted via @fontsource).
// Saída VERSIONADA em src/shared/styles/themes/ — não editar à mão; no upgrade
// do primereact, re-rodar `pnpm brand-theme` (tests/brand-theme.test.ts acusa
// drift nos dois casos).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Escala celeste: mistura de #25A5E4 com branco (50–400) e preto (600–900),
// nos mesmos degraus que o Lara usa do azul Tailwind. Valores pré-computados.
export const LIGHT_MAP = {
  // Escala da primária
  '#eff6ff': '#e9f6fc', // 50  — highlight bg
  '#bfdbfe': '#a8dbf4', // 200 — focus ring / bordas de destaque
  '#3b82f6': '#25a5e4', // 500 — primária
  '#2563eb': '#1f8cc2', // 600 — hover
  '#1d4ed8': '#1a73a0', // 700 — active/hover forte
  'rgba(59, 130, 246': 'rgba(37, 165, 228', // sombras/veladuras da primária
  // Neutros: gray → slate, degrau a degrau ("uma família só", spec §6);
  // corpo cai em grafite #334155 (spec §4).
  '#f9fafb': '#f8fafc', // gray-50  → slate-50
  '#f3f4f6': '#f1f5f9', // gray-100 → humo (slate-100)
  '#e5e7eb': '#e2e8f0', // gray-200 → slate-200
  '#d1d5db': '#cbd5e1', // gray-300 → slate-300
  '#9ca3af': '#94a3b8', // gray-400 → slate-400
  '#6b7280': '#64748b', // gray-500 → slate-500 (texto secundário)
  '#4b5563': '#334155', // gray-600 → GRAFITE (corpo, spec §4)
  '#374151': '#1e293b', // gray-700 → slate-800 (headings compilados)
  '#111827': '#0f172a', // gray-900 → slate-900
}

export const DARK_MAP = {
  // Escala da primária
  '#bfdbfe': '#a8dbf4', // 200
  '#93c5fd': '#7cc9ef', // 300 — hover
  '#60a5fa': '#51b7e9', // 400 — primária do dark
  '#3b82f6': '#25a5e4', // 500 — ocorrências residuais
  'rgba(96, 165, 250': 'rgba(81, 183, 233',
  // Neutros do dark → slate + noche (spec §4)
  '#424b57': '#334155', // bordas → slate-700
  '#374151': '#334155', // idem — as duas famílias de borda unificam
  '#1f2937': '#1e293b', // superfícies de card → slate-800
  '#111827': '#0b1220', // ground → NOCHE (spec §4)
}

const COMMON_MAP = {
  'border-radius: 6px': 'border-radius: 4px', // D7 — inclui o token --border-radius
  '"Inter var"': '"Inter"',
}

const HEADER =
  '/* GERADO por scripts/generate-brand-theme.mjs — NÃO editar à mão. */\n'

export function transform(css, map) {
  let out = css
  for (const [from, to] of Object.entries({ ...map, ...COMMON_MAP })) {
    out = out.replaceAll(from, to).replaceAll(from.toUpperCase(), to)
  }
  return HEADER + out
}

function generate(stockName, map, outName) {
  const src = readFileSync(
    resolve(root, `node_modules/primereact/resources/themes/${stockName}/theme.css`),
    'utf8',
  )
  const outDir = resolve(root, 'src/shared/styles/themes')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, `${outName}.css`), transform(src, map))
  console.log(`gerado: src/shared/styles/themes/${outName}.css`)
}

generate('lara-light-blue', LIGHT_MAP, 'lara-light-lotus')
generate('lara-dark-blue', DARK_MAP, 'lara-dark-lotus')
```

- [ ] **Step 3b: tipos do script (o `tsc -b` type-checa os testes; import de `.mjs` sem
  declaração reprova)**

`frontend/scripts/generate-brand-theme.d.mts`:

```ts
export const LIGHT_MAP: Record<string, string>
export const DARK_MAP: Record<string, string>
export function transform(css: string, map: Record<string, string>): string
```

- [ ] **Step 4: script npm e geração**

Em `frontend/package.json`, dentro de `"scripts"`:

```json
"brand-theme": "node scripts/generate-brand-theme.mjs",
```

```bash
pnpm brand-theme
```

Expected: os dois `gerado: ...` no stdout, arquivos criados.

- [ ] **Step 5: `primeTheme.ts` consome os temas gerados**

Substituir as duas primeiras linhas de import por:

```ts
// Vite resolve `?url` para o caminho servido (dev) ou para o asset emitido (build).
// Temas GERADOS por scripts/generate-brand-theme.mjs sobre o Lara (ADR-16 §5, spec D5').
import lightThemeUrl from '../styles/themes/lara-light-lotus.css?url'
import darkThemeUrl from '../styles/themes/lara-dark-lotus.css?url'
```

- [ ] **Step 6: verificar**

```bash
pnpm test -- tests/brand-theme.test.ts && pnpm build && pnpm lint
```

Expected: teste PASS (2), build e lint verdes.

- [ ] **Step 7: commit**

```bash
git add scripts/ src/shared/styles/themes/ src/shared/config/primeTheme.ts package.json tests/brand-theme.test.ts
git commit -m "feat(tema): temas Lara-Lotus gerados por script com guarda de drift (D5')"
```

---

### Task 3: `brand-theme.css` fino + higiene de hex + foco visível

**Files:**
- Create: `frontend/src/shared/styles/brand-theme.css`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/shared/ui/AppButton/style.ts`
- Modify: `frontend/src/app/layouts/Header/UserMenu.tsx:42`
- Modify: `frontend/src/shared/config/brand.ts`

**Interfaces:**
- Produces: vars `--brand` e `--brand-navy` disponíveis globalmente (consumidas nas Tasks 4–5).

- [ ] **Step 1: criar `frontend/src/shared/styles/brand-theme.css`**

```css
/* Camada fina de marca sobre o tema gerado (ADR-16 §5, spec §4).
 * Entra no bundle do Vite — depois do <link id="prime-theme"> no head,
 * então vence o tema por ordem de cascata. Cores SÓ dos 6 tokens da spec. */
:root {
  --brand: #25A5E4;      /* celeste-lotus — fonte CSS única (brand.ts é a fonte JS) */
  --brand-navy: #0F2B3D; /* azul-poste — sidebar, texto do botão primário (D6) */
}

/* Fundo claro = humo (spec §4). A var é consumida pelo shell (AppLayout);
 * escopada ao claro para não vazar sobre o noche do tema dark gerado. */
html:not(.dark) {
  --surface-ground: #F1F5F9;
}

/* D6: botão primário celeste com texto navy (branco sobre celeste dá ~2.6:1 e
 * reprova AA). A cadeia de :not() poupa as severidades e variantes, que mantêm
 * o texto do tema. */
.p-button:not(.p-button-outlined):not(.p-button-text):not(.p-button-link):not(.p-button-secondary):not(.p-button-success):not(.p-button-info):not(.p-button-warning):not(.p-button-help):not(.p-button-danger):not(.p-button-contrast) {
  color: var(--brand-navy);
}

/* Dado técnico alinha em coluna (spec §5): tabular-nums em toda célula de
 * tabela — só afeta a largura dos algarismos, texto comum não muda. */
.p-datatable .p-datatable-tbody > tr > td {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: importar no `index.css`**

Depois do bloco `@theme` da Task 1:

```css
@import "./shared/styles/brand-theme.css";
```

- [ ] **Step 3: `AppButton/style.ts` — hex → var, `ring-0` morre (UI-03)**

Arquivo completo:

```ts
// Estilos Tailwind nomeados do AppButton. Adicione novos aqui e selecione
// via prop `variant` no call site — mantém o JSX limpo e a estilização
// centralizada (fora da renderização).

// Visual de marca: contorno celeste sobre superfície no claro; preenchido no
// escuro. O anel de foco é o do tema (celeste no Lara-Lotus) — não zerar:
// `ring-0` aqui deixou o foco de teclado invisível (UI-03 do review de
// 2026-08-11).
const brandOutline =
  'bg-[var(--surface-card)] text-[var(--brand)] border-2 border-[var(--brand)] hover:text-[var(--text-color)] ' +
  'dark:bg-[var(--brand)] dark:border-2 dark:border-white dark:text-white dark:hover:text-[var(--surface-card)]'

export const appButtonStyles = {
  /** Marca, com rótulo (ex.: seletor de idioma "EN"). */
  brandLabel: `flex items-center gap-1 px-3 py-2.5 text-sm ${brandOutline}`,
  /** Marca, só-ícone (toggles: tema, colapso da sidebar). */
  brandIcon: `flex items-center justify-center ${brandOutline}`,
} as const

export type AppButtonVariant = keyof typeof appButtonStyles
```

- [ ] **Step 4: `UserMenu.tsx:42` — hex → var**

```tsx
        <p className="text-sm text-[var(--brand)]">{roleKey && t(roleKey)}</p>
```

- [ ] **Step 5: `brand.ts` — comentário cruzado (dupla fonte declarada)**

```ts
// Cor primária do produto — fonte JS. A fonte CSS é `--brand` em
// shared/styles/brand-theme.css (mesmo hex; TS não lê CSS var). Mudou aqui,
// muda lá e re-roda `pnpm brand-theme` (ADR-16 §5 — fechado em 2026-08-11).
export const BRAND_COLOR = '#25A5E4'
export const APP_VERSION = 'v0.1.0'
```

- [ ] **Step 6: verificar**

```bash
grep -rn '#25A5E4' src/ --include='*.ts' --include='*.tsx' | grep -v brand.ts
pnpm build && pnpm lint && pnpm test
```

Expected: grep devolve **só** `SidebarItem.tsx` (sai na Task 4); os três verdes.

- [ ] **Step 7: commit**

```bash
git add src/shared/styles/brand-theme.css src/index.css src/shared/ui/AppButton/style.ts src/app/layouts/Header/UserMenu.tsx src/shared/config/brand.ts
git commit -m "feat(tema): brand-theme.css fino (D6, tabular-nums), foco visível e hex em var (UI-03)"
```

---

### Task 4: Sidebar navy + toggle oculto em compact + aria no i18n

**Files:**
- Modify: `frontend/src/app/layouts/Sidebar/Sidebar.tsx`
- Modify: `frontend/src/app/layouts/Sidebar/SidebarItem.tsx`
- Modify: `frontend/src/shared/ui/AppLogo/AppLogo.tsx`
- Modify: `frontend/src/shared/ui/AppearanceControls/AppearanceControls.tsx`
- Modify: `frontend/src/features/identity/components/Login/LoginPage.tsx:49`
- Modify: `frontend/src/shared/config/locales/es-CL.json`, `pt-BR.json`, `en.json`

**Interfaces:**
- Consumes: `--brand`, `--brand-navy` (Task 3).
- Produces: chaves `common.toggleMenu`, `common.toggleTheme`, `common.openUserMenu` (a Task 5
  consome `openUserMenu`); `AppLogo` com prop `variant?: 'auto' | 'on-dark'`.

- [ ] **Step 1: chaves i18n (UI-07) — as 3 locales no MESMO commit**

Em `common` de cada locale, depois de `"language"`:

`es-CL.json`: `"toggleMenu": "Alternar menú", "toggleTheme": "Cambiar tema", "openUserMenu": "Abrir menú de usuario",`
`pt-BR.json`: `"toggleMenu": "Alternar menu", "toggleTheme": "Alternar tema", "openUserMenu": "Abrir menu do usuário",`
`en.json`: `"toggleMenu": "Toggle menu", "toggleTheme": "Toggle theme", "openUserMenu": "Open user menu",`

- [ ] **Step 2: rodar a paridade e ver verde**

```bash
pnpm test -- src/shared/config/locales/parity.test.ts
```

Expected: PASS (as 3 receberam as chaves juntas).

- [ ] **Step 3: `AppLogo` ganha `variant`**

```tsx
import { useUiStore } from '@shared/stores/uiStore'
import logoLight from '@/assets/LogoLight.png'
import logoDark from '@/assets/LogoDark.png'

type AppLogoProps = {
  className?: string
  alt?: string
  /** `on-dark`: força o wordmark claro (o do tema dark) sobre fundo escuro
   * fixo, como a sidebar navy — que não acompanha o tema (spec §6). */
  variant?: 'auto' | 'on-dark'
}

export function AppLogo({ className, alt = 'Lotus', variant = 'auto' }: AppLogoProps) {
  const theme = useUiStore((s) => s.theme)

  const currentLogo = variant === 'on-dark' || theme === 'dark' ? logoDark : logoLight

  return <img src={currentLogo} alt={alt} className={className} />
}
```

- [ ] **Step 4: `Sidebar.tsx` — navy fixa, logo sem `ml-15 h-30`, toggle some em compact (UI-02)**

Arquivo completo:

```tsx
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@shared/stores/uiStore'
import { usePermissions, useIsCompactViewport } from '@shared/hooks'
import { NAV_MODULES } from '@shared/config/navigation'
import { APP_VERSION } from '@shared/config/brand'
import { AppButton, AppSidebar, AppLogo } from '@shared/ui'
import { roleSectionLabel } from '@shared/lib'
import { SidebarItem } from './SidebarItem'

export function Sidebar() {
  const { t } = useTranslation()
  const compact = useIsCompactViewport()
  // Abaixo de 1024px a sidebar expandida come a largura útil e empurra a tabela
  // para fora da janela. O colapso é imposto pela viewport sem tocar no estado
  // persistido: ao alargar de volta, a preferência do usuário volta com ele.
  const collapsed = useUiStore((s) => s.sidebarCollapsed) || compact
  const toggle = useUiStore((s) => s.toggleSidebar)
  const { can, roles } = usePermissions()

  const modules = NAV_MODULES.filter((m) => !m.permission || can(m.permission))
  const roleKey = roleSectionLabel(roles)

  // Navy fixa nos DOIS temas (spec §6/UI-04): a sidebar é a assinatura e não
  // acompanha o swap de tema — por isso não há dark: aqui.
  return (
    <AppSidebar
      className={`${collapsed ? 'w-20' : 'w-64'} border-white/10 bg-[var(--brand-navy)] transition-all`}
    >
      <div className={`flex items-center px-4 py-5 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <AppLogo variant="on-dark" className="h-8 w-auto" />}

        {/* Em compact o colapso é imposto pela viewport: o botão sumir (em vez
          * de girar em falso) é o que preserva a pref persistida (UI-02). */}
        {!compact && (
          <AppButton variant="brandIcon" onClick={toggle} aria-label={t('common.toggleMenu')}>
            <i className={`pi ${collapsed ? 'pi-angle-right' : 'pi-angle-left'}`} />
          </AppButton>
        )}
      </div>

      {!collapsed && roleKey && (
        <p className="px-4 pb-2 text-xs font-semibold tracking-wider text-slate-400">
          {t(roleKey)}
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-4 px-3">
        {modules.map((m) => (
          <SidebarItem key={m.key} module={m} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && <div className="px-4 py-3 text-sm text-slate-400 text-center">{APP_VERSION}</div>}
    </AppSidebar>
  )
}
```

- [ ] **Step 5: `SidebarItem.tsx` — ativo celeste sobre navy, hex morre**

Trocar o bloco de classes do `NavLink` por:

```tsx
      className={({ isActive }) =>
        [
          'flex items-center gap-4 rounded-md px-3 py-2.5 text-md font-medium transition-colors no-underline border-l-2',
          isActive
            ? 'border-[var(--brand)] bg-white/5 text-[var(--brand)]'
            : 'border-transparent text-slate-300 hover:bg-white/10',
          collapsed ? 'justify-center' : '',
        ].join(' ')
      }
```

- [ ] **Step 6: aria-labels restantes → i18n**

`AppearanceControls.tsx`: adicionar `import { useTranslation } from 'react-i18next'` +
`const { t } = useTranslation()` no corpo, e `aria-label={t('common.toggleTheme')}`.
`LoginPage.tsx:49`: `aria-label="Alternar tema"` → `aria-label={t('common.toggleTheme')}`
(o `t` já existe na linha 9 da página).

- [ ] **Step 7: verificar**

```bash
grep -rn '#25A5E4' src/ --include='*.ts' --include='*.tsx' | grep -v brand.ts
grep -rn 'aria-label="[A-Z]' src/ --include='*.tsx'
pnpm build && pnpm lint && pnpm test
```

Expected: os dois greps **vazios**; os três verdes.

- [ ] **Step 8: commit**

```bash
git add src/app/layouts/Sidebar/ src/shared/ui/AppLogo/ src/shared/ui/AppearanceControls/ src/features/identity/components/Login/LoginPage.tsx src/shared/config/locales/
git commit -m "feat(shell): sidebar navy fixa com wordmark claro, toggle oculto em compact, aria no i18n (UI-02/04/07)"
```

---

### Task 5: Header barra utilitária + responsivo + tokens no shell + display no PageHeader

**Files:**
- Modify: `frontend/src/app/layouts/Header/Header.tsx`
- Modify: `frontend/src/app/layouts/Header/UserMenu.tsx`
- Modify: `frontend/src/shared/ui/AppHeader/AppHeader.tsx`
- Modify: `frontend/src/app/layouts/AppLayout.tsx:8`
- Modify: `frontend/src/shared/ui/PageHeader/PageHeader.tsx:20`
- Modify: `frontend/src/shared/ui/Clock/Clock.tsx`

**Interfaces:**
- Consumes: `common.openUserMenu` (Task 4); `font-display` (Task 1).

- [ ] **Step 1: `AppHeader` — padding sai do wrapper (o caller responsivo decide)**

```tsx
    <header className={`flex items-center justify-between border-b ${className}`}>
```

- [ ] **Step 2: `Header.tsx` — sem h1 (UI-05), tokens no lugar de gray/slate, gaps responsivos (UI-01)**

Arquivo completo:

```tsx
import { AppDivider, AppHeader, AppearanceControls, Clock } from '@shared/ui'
import { UserMenu } from './UserMenu'

/** Barra utilitária do shell: controles, relógio e usuário. O título de página
 * tem UM dono — o PageHeader (UI-05 do review de 2026-08-11). */
export function Header() {
  return (
    <AppHeader className="min-h-14 border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 sm:px-6">
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <AppearanceControls />
        <AppDivider layout="vertical" className="mx-0! h-6 hidden sm:block" />
        <Clock className="hidden md:block" />
        <UserMenu />
      </div>
    </AppHeader>
  )
}
```

(As importações de `useLocation`/`useTranslation`/`NAV_MODULES`, o `EXTRA_TITLES` e o
`pageTitleKey` morrem — código morto zero.)

- [ ] **Step 3: `UserMenu.tsx` — gaps, aria e nome por token**

Linha 35: `gap-2` → `gap-1 sm:gap-2`. Linha 48: `aria-label="Abrir menu do usuário"` →
`aria-label={t('common.openUserMenu')}`. Linha 40 (par `dark:` vira var, ADR-16 §4):

```tsx
        <p className="text-sm font-semibold" style={{ color: 'var(--text-color)' }}>{user.name}</p>
```

- [ ] **Step 4: `AppLayout.tsx:8` — fundo por token**

```tsx
    <div className="flex h-screen overflow-hidden bg-[var(--surface-ground)]">
```

- [ ] **Step 5: `PageHeader.tsx:20` — display Archivo**

```tsx
        <h2 className="font-display text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-color)' }}>{title}</h2>
```

- [ ] **Step 6: `Clock.tsx` — tabular-nums (o relógio não “respira” a cada minuto)**

```tsx
    <div className={`text-right text-sm leading-tight tabular-nums ${className} `} style={{ color: 'var(--text-color-secondary)' }}>
```

- [ ] **Step 7: verificar**

```bash
grep -rn 'bg-gray-\|bg-slate-\|border-slate-' src/app/ src/shared/ui/AppHeader/
pnpm build && pnpm lint && pnpm test
```

Expected: grep vazio (o shell inteiro em tokens); os três verdes.

- [ ] **Step 8: commit**

```bash
git add src/app/layouts/ src/shared/ui/AppHeader/ src/shared/ui/PageHeader/ src/shared/ui/Clock/
git commit -m "feat(shell): header vira barra utilitária responsiva, dono único de título e tokens (UI-01/05)"
```

---

### Task 6: Enmenda do ADR-16

**Files:**
- Modify: `docs/adrs.md` (seção ADR-16)

- [ ] **Step 1: acrescentar o ponto 5 à lista de Decisão do ADR-16**

Depois do item 4 da lista:

```markdown
5. **Identidade própria sobre o Lara (2026-08-11).** Os temas carregados são cópias GERADAS
   (`frontend/scripts/generate-brand-theme.mjs` → `src/shared/styles/themes/lara-*-lotus.css`)
   com a escala celeste da marca no lugar do azul, radius 4px e Inter self-hosted — porque o Lara
   compila cores inline (97 hexes) e override de token não alcança as regras. Uma camada fina
   (`src/shared/styles/brand-theme.css`) cobre o que é regra nova: texto navy no botão primário
   (AA) e `tabular-nums` em células. Guarda de drift: `frontend/tests/brand-theme.test.ts`.
   A exceção de shell registrada em §4 acabou — o shell consome os tokens do tema.
```

- [ ] **Step 2: nota de sync**

Na nota de sync existente do ADR-16, acrescentar ao final:

```markdown
> O ponto 5 (2026-08-11) ainda não está espelhado — re-sync com o Drive é passo do fechamento
> deste bloco (spec §11).
```

- [ ] **Step 3: commit**

```bash
git add docs/adrs.md
git commit -m "docs(adr): ADR-16 ponto 5 — tema Lara-Lotus gerado e camada de marca"
```

---

### Task 7: Gate do bloco — provar pelo que reprovou

**Files:** nenhum código; medições + placar.

- [ ] **Step 1: suíte e higiene**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
grep -rn '#25A5E4' src/ --include='*.ts' --include='*.tsx' | grep -v brand.ts   # vazio
grep -rn 'ring-0' src/shared/ui/AppButton/                                       # vazio
grep -rn 'bg-gray-\|border-slate-400' src/app/ src/shared/ui/                    # vazio
```

Registrar o placar (baseline da Task 0 + os 2 testes novos de `brand-theme.test.ts`).

- [ ] **Step 2: medições no navegador (as MESMAS do report)**

Com `pnpm dev` de pé e sessão logada (playwright-cli, browser chromium):

```bash
playwright-cli -s=gate open http://localhost:5173 --browser=chromium
# ... login com credencial do seed (admin@lotus.cl / senha123, versionada)
playwright-cli -s=gate resize 390 844
playwright-cli -s=gate eval "() => { const b=[...document.querySelectorAll('header button')].at(-1); return { rightEdge: b.getBoundingClientRect().right, scrollW: document.documentElement.scrollWidth } }"
# Expected (UI-01): rightEdge <= 390 e scrollW == 390
playwright-cli -s=gate eval "() => [...document.querySelectorAll('aside button')].length"
# Expected (UI-02): 0 a 390 (toggle ausente em compact)
playwright-cli -s=gate eval "() => JSON.parse(localStorage.getItem('lotus-ui')).state.sidebarCollapsed"
# Expected (UI-02): o valor que estava ANTES do resize — a pref não corrompe
playwright-cli -s=gate resize 1440 900
playwright-cli -s=gate eval "() => { const el=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')); el.focus(); const s=getComputedStyle(el); return { outline: s.outlineStyle, shadow: s.boxShadow } }"
# Expected (UI-03): outline != 'none' OU shadow != 'none' (anel celeste do tema)
playwright-cli -s=gate eval "() => document.querySelectorAll('h1, main h2').length"
# Expected (UI-05): 1 por página (só o PageHeader)
playwright-cli -s=gate screenshot --filename=light-1440.png
# alternar tema pelo botão e repetir screenshot (UI-04: wordmark legível na navy nos 2 temas)
```

- [ ] **Step 3: paridade e tipos**

```bash
pnpm test -- src/shared/config/locales/parity.test.ts   # PASS
git diff --stat -- src/shared/types/generated.ts        # vazio
```

- [ ] **Step 4: checkpoint visual do João** — 3 viewports (1440/1024/390), light e dark,
  telas: qualquer módulo com tabela + login. **Bloqueante**: sem aprovação dele o bloco não segue.

- [ ] **Step 5: re-run do review** — o João invoca `/lotus-ui-review AppLayout (sidebar, header e
  page)`; achados A/B/C novos decidem com ele se entram aqui ou viram débito.

---

## Emenda de execução — 2026-08-11 (lição 13)

A revisão do plano contra o Lara **instalado**, feita na abertura do `/executar-bloco`, achou seis
defeitos. Os quatro primeiros são defeito ou implementação literal da spec e entram declarados; os
dois últimos mudavam o construído e foram **decididos pelo João** antes de qualquer código.

- **D-P4 — o script REMOVE os dois `@font-face` do Lara.** O `COMMON_MAP` renomeia `"Inter var"` →
  `"Inter"` **dentro** dos blocos `@font-face`, cujo `src` é `url("./fonts/InterVariable.woff2")`,
  relativo ao arquivo gerado — que mora em `src/shared/styles/themes/`, sem pasta `fonts/`. Sem a
  remoção, o tema passa a declarar uma face **"Inter" com src 404** competindo com a real do
  `@fontsource`. Hoje é inofensivo (a família "Inter var" não existe em lugar nenhum); depois do
  bloco seria regressão. O `:root { font-family }` continua sendo renomeado — é ele que dá Inter
  ao corpo, já que o Preflight está desligado e ninguém mais escreve `font-family` no `body`.
- **D-P5 — a escala `--primary-50..900` entra nos dois mapas.** A spec §4 promete escala celeste;
  os mapas do rascunho não tocavam um valor dela. Medido: `--primary-50:#f5f9ff` … `--primary-900:
  #183462` (light, espelhados em `--blue-*`) e `#f7fbff` … `#264264` (dark) sobreviviam inteiros.
  Nada em `src/` usa `bg-primary-*` hoje — o defeito é o arquivo **afirmar** "sem azul Lara"
  carregando 20 hexes azuis, com o primeiro `bg-primary-500` futuro saindo errado.
- **D-P6 — a guarda de drift assere ausência da FAMÍLIA azul, não de 3 hexes.** O rascunho conferia
  `#3b82f6`/`#1d4ed8`/`#60a5fa`. Sobravam não mapeados `#9dc1fb` (box-shadow de foco, 2×),
  `#f5f9ff`/`#d0e1fd`/`#abc9fb`/`#85b2f9` (light) e `rgba(59, 130, 246` (dark, 3×).
- **D-P7 — os cinzas residuais entram no mapa.** Contra a D-P3 ("uma família só") sobreviviam
  `#1f2937` (gray-800, 10× no light, incluindo `--surface-800`/`--gray-800`) e `#030712` (28× no
  dark). O `#030712` é o `--primary-color-text` do dark: vira **azul-poste**, não slate, para
  coincidir com a D6.
- **D-P8 — a D6 vira propriedade do tema gerado, e alcança as 9 superfícies (decisão do João).**
  Medido: **9 blocos** no Lara light pintam `background: #3b82f6` com `color: #ffffff` —
  `.p-button`, `.p-tag` (2×), `.p-badge`, `.p-selectbutton`, `.p-togglebutton`,
  `.p-overlaypanel-close`, `.p-steps`, `.p-stepper`. Depois do mapa isso é branco sobre celeste =
  **2,77:1**, que reprova AA e reprova até o 3:1 de gráfico; `AppTag` é usado em 9+ arquivos de
  feature. O `transform()` passa a ser **block-aware**: em bloco do tema light que pinte o fundo
  com a primária, `color: #ffffff` → azul-poste (5,29:1). O `brand-theme.css` **perde** a cadeia de
  `:not()` do rascunho — ela cobria só `.p-button` e era a segunda fonte de verdade. O dark não tem
  o problema: lá o par já é texto escuro (`#030712`) sobre azul claro.
- **D-P9 — a D-P1 é reaberta: o anel de foco volta ao que a spec §4 escreveu (decisão do João).**
  O anel tingido de celeste-200 mede **~1,4:1 sobre branco** — o mesmo patamar do `#bfdbfe` que ele
  substitui, e o DoD §9.3 (`outline != none OU shadow != none`) passaria **verde com o foco
  praticamente invisível**, que é literalmente o UI-03. O `brand-theme.css` ganha uma regra
  `:focus-visible` com outline 2px celeste sólido + offset: só teclado, os dois temas, somada ao
  anel do Lara em vez de substituí-lo.

## Desvios declarados (lição 13)

- **D-P1 — focus ring:** ~~a spec §4 escreve "2px celeste"; o entregue é o anel do próprio Lara
  (`0.2rem`, ~3.2px) **tingido** de celeste-200 pelo mapa do script.~~ **Revogado pela D-P9** —
  a medição mostrou que o anel tingido não é visível. O tingimento do anel do Lara **fica** (é
  consequência do mapa), mas somado ao outline de 2px da spec.
- **D-P2 — humo e noche:** o fundo claro humo entra por override da var `--surface-ground`
  (consumida só pelo shell), escopado a `html:not(.dark)`; o noche entra pelo mapa do script no
  tema dark (`#111827 → #0b1220`). Dois mecanismos porque o Lara compila o dark ground inline e
  o claro é lido por var — cada um pelo caminho que funciona.
- **D-P3 — neutros:** "uma família só" vira o mapa gray→slate degrau a degrau nos DOIS temas
  gerados, com o corpo caindo em grafite `#334155`. No dark, duas famílias de borda do Lara
  (`#424b57`, `#374151`) unificam em slate-700 de propósito.

## Handoff de execução

```yaml
executor: claude
```

Bloco de julgamento visual de ponta a ponta (paleta aplicada, medições de shell, checkpoint com o
João); nenhuma task é mecânica-com-verificação-fechada o bastante para justificar handoff — o
Codex entra só na segunda lente do review (spec §10).
