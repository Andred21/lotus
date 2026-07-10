# Frontend · Fundação da camada de UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar as duas telas de cadastro entregues no Sprint 1 (Clientes, Redatores) num molde reutilizável: tema PrimeReact que responde ao dark mode, wrappers padronizados, `ModulePage`/`CrudDialog`/`useCrudPage`/`useEntityForm` compartilhados, sessão e RBAC em `shared/`, pastas organizadas por entidade, e i18n em toda a interface.

**Architecture:** A ordem não é arbitrária. O tema vem primeiro porque **remove trabalho**: hoje os wrappers espalham `dark:` à mão porque só a folha clara do PrimeReact é carregada; trocando a folha em runtime, esses `dark:` viram redundantes e são apagados em vez de replicados. Depois vêm os wrappers (base), depois as peças compartilhadas (`ModulePage`, `CrudDialog`, hooks), depois os movimentos de arquivo (arriscados, sem test runner de front), e por último i18n (mecânico, sobre uma estrutura que parou de se mexer).

**Tech Stack:** React 19 + TypeScript (Vite), PrimeReact 10.9.8 (`pt` passthrough + CSS vars do tema Lara), Tailwind v4, TanStack Query v5, Zustand, i18next.

## Global Constraints

- **Pré-requisito:** o plano `2026-07-09-sprint1-correcoes-code-review.md` deve estar concluído. Ele é a rede de segurança: não há test runner de frontend, então "o comportamento que eu acabei de provar continua funcionando" é o único teste de regressão disponível.
- Features **nunca** importam `primereact/*` direto nem outra feature. Dependência aponta só para baixo: `app → features → shared` (CLAUDE.md regra 6, ADR-05).
- `shared` **nunca** importa de `features` nem de `app`.
- Tailwind é camada de **layout**. Customização de componente PrimeReact vai **no wrapper**, via `className` na raiz ou `pt` (passthrough) para as partes internas — nunca `dark:` cru no call-site sobre um componente Prime.
- `frontend/src/shared/types/generated.ts` é gerado. Nunca editar à mão.
- **Não tocar** `frontend/src/features/identity/components/LoginPage.tsx` nem `frontend/src/features/identity/hooks/usePermissions.ts` sem instrução explícita — carregam edições não commitadas do dono. (A Task 5 move `usePermissions`; combinar com ele antes.)
- Vocabulário de domínio é o do backend: **`Redator`**, `redatores`. Não traduzir para inglês. Nomes de *tela* podem ser em inglês (`PeoplePage`).
- Gate de cada commit: `pnpm build` (roda `tsc -b`) e `pnpm lint` limpos. Backend não deve ser afetado; se for, `docker compose exec -T app php artisan test`.
- Cada task termina com verificação manual no navegador quando muda comportamento visual. `docker compose up -d` + `pnpm dev`.

---

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `docs/adrs.md` | ADR-16: Tailwind + estratégia de tema PrimeReact | 1 |
| `frontend/src/shared/config/primeTheme.ts` | Troca a folha de tema do PrimeReact em runtime | 1 |
| `frontend/src/main.tsx` | Deixa de importar a folha clara fixa | 1 |
| `frontend/src/app/providers/useApplyTheme.ts` | Aplica classe `dark` **e** a folha do Prime | 1 |
| `frontend/src/shared/ui/*/style.ts` | Estilo do wrapper (`pt` + variantes), theme-aware por CSS var | 2 |
| `frontend/src/shared/ui/*/index.ts` | Barrel de cada wrapper | 3 |
| `frontend/src/shared/ui/index.ts` | Barrel raiz — importa só de `./X` | 3 |
| `frontend/src/shared/ui/AppearanceControls/` | Idioma + toggle de tema (Header e LoginPage) | 3 |
| `frontend/src/shared/stores/sessionStore.ts` | Sessão do usuário (infra transversal) | 4 |
| `frontend/src/shared/hooks/usePermissions.ts` | RBAC efetivo da sessão | 4 |
| `frontend/src/shared/hooks/useCrudPage.ts` | Estado de lista + dialog de um módulo CRUD | 5 |
| `frontend/src/shared/hooks/useEntityForm.ts` | Estado de formulário de entidade | 6 |
| `frontend/src/shared/ui/ModulePage/` | Header + descrição + ação + corpo | 7 |
| `frontend/src/shared/ui/CrudDialog/` | Dialog unificado view/edit/create, botões no footer | 8 |
| `frontend/src/shared/api/coursesApi.ts` | Recurso `courses` compartilhado (sai de identity) | 9 |
| `frontend/src/features/identity/api/authApi.ts` | authApi + useLogin/useLogout/useMe num arquivo | 9 |
| `frontend/src/features/*/components/<Entidade>/` | Componentes por entidade | 10 |
| `frontend/src/shared/config/locales/*.json` | Chaves de commercial, identity e comuns | 11 |
| `docs/estrutura-monolito.md` | Estrutura real após a refatoração | 12 |

---

### Task 1: ADR-16 — tema do PrimeReact que responde ao dark mode

`main.tsx` importa **só** `lara-light-blue/theme.css`. `useApplyTheme` alterna a classe `dark` no `<html>`, o que move o Tailwind mas não alcança o interior de `DataTable`, `Dialog`, `Dropdown`, `Tag`. Hoje o modo escuro é cosmético: o chrome escurece, os componentes Prime ficam claros.

**Decisão (ADR-16):** manter os temas do PrimeReact e **trocar a folha em runtime** (`lara-light-blue` ↔ `lara-dark-blue`, ambas já em `node_modules`). Tailwind fica só para layout e para os elementos próprios. Rejeitado: `unstyled` + `pt` global — reescreveria todos os wrappers para abandonar o visual do Lara, sem ganho proporcional para ~10 usuários internos.

**Files:**
- Modify: `docs/adrs.md`
- Create: `frontend/src/shared/config/primeTheme.ts`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/app/providers/useApplyTheme.ts`

**Interfaces:**
- Produces: `applyPrimeTheme(theme: 'light' | 'dark'): void` exportado de `@shared/config/primeTheme`.

- [ ] **Step 1: Registrar o ADR**

Acrescentar ao fim de `docs/adrs.md`:

```markdown
## ADR-16 — Tailwind como layout; tema do PrimeReact trocado em runtime

**Contexto.** Tailwind v4 está instalado e em uso desde o shell. PrimeReact traz temas
CSS completos. Sem decisão, o dark mode ficou pela metade: a classe `dark` no `<html>`
move o Tailwind, mas não alcança o interior dos componentes Prime — `main.tsx` carregava
apenas `lara-light-blue`.

**Decisão.**
1. As duas folhas do tema Prime (`lara-light-blue`, `lara-dark-blue`) são carregadas por
   um `<link id="prime-theme">` cujo `href` troca junto com o `uiStore.theme`.
2. Tailwind é camada de **layout** (grid, espaçamento, tipografia dos nossos elementos).
3. Customizar um componente PrimeReact acontece **no wrapper** `shared/ui`, via `className`
   na raiz ou `pt` (passthrough) nas partes internas. Nunca `dark:` cru no call-site sobre
   um componente Prime.
4. Cores que precisam acompanhar o tema usam as CSS vars do Lara
   (`--surface-section`, `--surface-card`, `--surface-border`, `--text-color`),
   não pares `bg-white dark:bg-slate-800`.

**Consequência.** Os `dark:` espalhados nos wrappers viram redundantes e são removidos.
O `<link>` do tema é injetado no topo do `<head>` para que as utilities do Tailwind
continuem vencendo por ordem de cascata.

**Rejeitado.** PrimeReact `unstyled` + `pt` global com Tailwind: controle total, mas
reescreve todos os wrappers e abandona o visual Lara. Desproporcional ao estágio do projeto.
```

- [ ] **Step 2: Criar o módulo de tema**

`frontend/src/shared/config/primeTheme.ts`:

```ts
// Vite resolve `?url` para o caminho servido (dev) ou para o asset emitido (build).
import lightThemeUrl from 'primereact/resources/themes/lara-light-blue/theme.css?url'
import darkThemeUrl from 'primereact/resources/themes/lara-dark-blue/theme.css?url'

const LINK_ID = 'prime-theme'

/**
 * Troca a folha de tema do PrimeReact (ADR-16). O <link> é inserido no TOPO do
 * <head> para que as utilities do Tailwind, injetadas depois, continuem vencendo
 * por ordem de cascata.
 */
export function applyPrimeTheme(theme: 'light' | 'dark'): void {
  const href = theme === 'dark' ? darkThemeUrl : lightThemeUrl

  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = LINK_ID
    link.rel = 'stylesheet'
    document.head.prepend(link)
  }
  if (link.getAttribute('href') !== href) link.setAttribute('href', href)
}
```

- [ ] **Step 3: Tirar a folha fixa do `main.tsx` e aplicar o tema antes do primeiro paint**

`frontend/src/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "primereact/resources/primereact.min.css"; // core dos componentes
import "primeicons/primeicons.css"; // ícones
import "flag-icons/css/flag-icons.min.css"; // bandeiras do seletor de idioma
import "./index.css";
import "./shared/config/i18n"; // inicializa i18next (side-effect)
import { applyPrimeTheme } from "./shared/config/primeTheme";
import { useUiStore } from "./app/providers/uiStore";

// A folha do tema Prime não é mais um import estático (ADR-16): ela é escolhida
// pelo tema persistido, antes do primeiro paint, para não haver flash de tema.
applyPrimeTheme(useUiStore.getState().theme);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Fazer o toggle trocar a folha**

`frontend/src/app/providers/useApplyTheme.ts`:

```ts
import { useEffect } from 'react'
import { applyPrimeTheme } from '@shared/config/primeTheme'
import { useUiStore } from './uiStore'

/**
 * Aplica o tema globalmente: alterna a classe `dark` no <html> (Tailwind) e
 * troca a folha de tema do PrimeReact (ADR-16). Vive nos providers para valer em
 * TODAS as rotas — inclusive a de login, que fica fora do AppLayout.
 */
export function useApplyTheme(): void {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    applyPrimeTheme(theme)
  }, [theme])
}
```

- [ ] **Step 5: Build + verificação manual**

```bash
cd frontend && pnpm build && pnpm lint && pnpm dev
```

1. Abrir `/comercial` no tema claro. Anotar a aparência da tabela.
2. Clicar o toggle de tema no Header.
3. **Esperado:** a **tabela**, o **dropdown** e o **dialog** escurecem — não só o chrome. Antes desta task, só o fundo da página mudava.
4. Recarregar a página com o tema escuro ativo. **Esperado:** abre escuro, sem flash claro.
5. `pnpm build && pnpm preview` — **conferir no bundle de produção**, não só no dev.

**Riscos verificados antes de escrever esta task:** as duas folhas existem em `node_modules/primereact/resources/themes/`, e `--surface-section`, `--surface-card` e `--surface-border` estão definidas no tema escuro.

**Risco não verificado:** `import '…theme.css?url'` de dentro de `node_modules`. O `?url` do Vite devolve a URL do asset sem injetar a folha — é o comportamento que queremos —, mas o caminho de build (asset emitido e hash aplicado) só se prova rodando `pnpm build && pnpm preview`, daí o passo 5. Se o `?url` falhar no build, o plano B é copiar as duas folhas para `public/themes/` num script de `postinstall` e apontar o `<link>` para `/themes/lara-<x>-blue.css` — sem `?url`, sem participação do bundler.

- [ ] **Step 6: Commit**

```bash
git add docs/adrs.md frontend/src/shared/config/primeTheme.ts frontend/src/main.tsx frontend/src/app/providers/useApplyTheme.ts
git commit -m "feat(theme): ADR-16 - troca a folha do tema PrimeReact em runtime"
```

---

### Task 2: `style.ts` nos wrappers que precisam — e apagar os `dark:` redundantes

Com a folha de tema trocando, os `dark:` que os wrappers aplicavam à mão passam a competir com o tema. `AppInputText` até documenta a premissa antiga: *"tema PrimeReact é layout-only — ver ADR-16"*. Essa premissa acabou de mudar.

A regra que fica: **`style.ts` quando o wrapper tem variante nomeada ou customização de tema** — não como cerimônia em todo wrapper. `AppButton` já segue esse formato e é o modelo.

**Files:**
- Modify: `frontend/src/shared/ui/AppInputText/AppInputText.tsx`
- Modify: `frontend/src/shared/ui/AppDropdown/AppDropdown.tsx`
- Create: `frontend/src/shared/ui/AppDialog/style.ts`
- Modify: `frontend/src/shared/ui/AppDialog/AppDialog.tsx`
- Create: `frontend/src/shared/ui/AppDataTable/style.ts`
- Modify: `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`

**Interfaces:**
- Produces: `appDialogPt` (objeto `DialogPassThroughOptions`) e `appDataTablePt`, exportados dos respectivos `style.ts` e aplicados por default no wrapper.

- [ ] **Step 1: Limpar `AppInputText`**

`frontend/src/shared/ui/AppInputText/AppInputText.tsx` — o tema Prime agora cobre o dark; sobra o layout:

```tsx
import { forwardRef } from 'react'
import { InputText } from 'primereact/inputtext'
import type { InputTextProps } from 'primereact/inputtext'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'

export interface AppInputTextProps extends InputTextProps {
  /** Classe de ícone primeicons à esquerda, ex.: "pi pi-envelope". */
  leftIcon?: string
}

/** Wrapper do InputText. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui: o estado inválido (.p-invalid) precisa vencer. */
export const AppInputText = forwardRef<HTMLInputElement, AppInputTextProps>(
  ({ leftIcon, ...props }, ref) => {
    if (!leftIcon) {
      return <InputText ref={ref} {...props} />
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={leftIcon} />
        <InputText ref={ref} {...props} className={`w-full ${props.className ?? ''}`} />
      </IconField>
    )
  },
)
AppInputText.displayName = 'AppInputText'
```

- [ ] **Step 2: Limpar `AppDropdown`**

```tsx
import { Dropdown } from 'primereact/dropdown'
import type { DropdownProps } from 'primereact/dropdown'

export type { DropdownProps as AppDropdownProps } from 'primereact/dropdown'

/** Wrapper do Dropdown. Largura total por default; cores vêm do tema (ADR-16). */
export function AppDropdown(props: DropdownProps) {
  return <Dropdown className="w-full" {...props} />
}
```

- [ ] **Step 3: `AppDialog` — footer com a cor do header, via CSS var do tema**

`frontend/src/shared/ui/AppDialog/style.ts`:

```ts
import type { DialogPassThroughOptions } from 'primereact/dialog'

/** Passthrough do Dialog (ADR-16). As cores usam as CSS vars do tema Lara, então
 * acompanham a troca de folha sem `dark:`. O footer recebe a mesma superfície do
 * header — no default do Lara ele sai transparente e "flutua" sobre o conteúdo. */
export const appDialogPt: DialogPassThroughOptions = {
  root: { className: 'w-[70vw] max-w-5xl' },
  header: { className: 'bg-[var(--surface-section)] border-b border-[var(--surface-border)]' },
  content: { className: 'bg-[var(--surface-card)]' },
  footer: { className: 'bg-[var(--surface-section)] border-t border-[var(--surface-border)]' },
}
```

`frontend/src/shared/ui/AppDialog/AppDialog.tsx`:

```tsx
import { Dialog } from 'primereact/dialog'
import type { DialogProps } from 'primereact/dialog'
import { appDialogPt } from './style'

export type { DialogProps as AppDialogProps } from 'primereact/dialog'

/** Wrapper do Dialog: maximizable por default, largo/alto, header e footer na
 * mesma superfície. Usado pelo CrudDialog. */
export function AppDialog({ pt, ...props }: DialogProps) {
  return <Dialog maximizable draggable={false} pt={{ ...appDialogPt, ...pt }} {...props} />
}
```

`frontend/src/shared/ui/AppDialog/index.ts`:

```ts
export { AppDialog } from './AppDialog'
export type { AppDialogProps } from './AppDialog'
export { appDialogPt } from './style'
```

- [ ] **Step 4: `AppDataTable` — cabeçalho na superfície do tema**

`frontend/src/shared/ui/AppDataTable/style.ts`:

```ts
import type { DataTablePassThroughOptions } from 'primereact/datatable'

/** Passthrough do DataTable (ADR-16). Cores por CSS var do tema Lara. */
export const appDataTablePt: DataTablePassThroughOptions = {
  root: { className: 'text-sm' },
  thead: { className: 'bg-[var(--surface-section)]' },
}
```

`frontend/src/shared/ui/AppDataTable/AppDataTable.tsx`:

```tsx
import { DataTable } from 'primereact/datatable'
import type { DataTableProps, DataTableValueArray } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { appDataTablePt } from './style'

/** Wrapper do DataTable: paginação/sort/filtro client-side (o index devolve
 * array puro). Colunas via <AppColumn/>. */
export function AppDataTable<T extends DataTableValueArray>({ pt, ...props }: DataTableProps<T>) {
  return (
    <DataTable
      dataKey="id"
      removableSort
      paginator
      rows={10}
      pt={{ ...appDataTablePt, ...pt }}
      {...props}
    />
  )
}

export { Column as AppColumn }
export type { ColumnProps as AppColumnProps } from 'primereact/column'
```

`frontend/src/shared/ui/AppDataTable/index.ts`:

```ts
export { AppDataTable, AppColumn } from './AppDataTable'
export type { AppColumnProps } from './AppDataTable'
export { appDataTablePt } from './style'
```

- [ ] **Step 5: `AppTag` e `AppFileUpload` — decidir explicitamente**

O pedido original incluía `style.ts` nesses dois. Verifique antes de escrever:

```bash
cd frontend && grep -c "dark:\|className" src/shared/ui/AppTag/AppTag.tsx src/shared/ui/AppFileUpload/AppFileUpload.tsx
```

Ambos são pass-throughs sem estilização própria. Com a folha de tema trocando (Task 1), o `Tag` e o `FileUpload` já acompanham o tema — **não crie `style.ts` vazio para eles**. É a regra desta task: `style.ts` só quando há variante nomeada ou customização real. Se, na verificação visual do Step 6, algum dos dois destoar no tema escuro, aí sim crie o `style.ts` com o `pt` mínimo que corrige o que destoou, e só isso.

`AppFileUpload` tem uma invariante a preservar: `customUpload` é fixado **após** o spread de props, para o chamador nunca reativar o uploader XHR embutido do PrimeReact. Não mexa nessa ordem.

- [ ] **Step 6: Varrer os `dark:` que sobraram sobre componentes Prime**

```bash
cd frontend && grep -rn "dark:" src/shared/ui/ src/features/*/components/
```

Manter os `dark:` que estão em **elementos nossos** (`<div>`, `<p>`, `<h3>`, as caixas de erro em vermelho, o `AppHeader`). Remover os que estão sobre um componente PrimeReact (`AppInputText`, `AppDropdown`, `AppTag`, `AppDataTable`, `AppDialog`) — o tema agora cuida deles.

- [ ] **Step 7: Build + verificação manual**

```bash
cd frontend && pnpm build && pnpm lint
```

Nos dois temas, abrir `/comercial` e `/personas`, abrir um dialog:
1. Header e footer do dialog têm a **mesma** cor de fundo, distinta do conteúdo.
2. Inputs, dropdowns, tags e o botão de upload legíveis nos dois temas.
3. Um campo com erro (`p-invalid`) continua vermelho — não foi sobrescrito.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/shared/ui
git commit -m "feat(shared/ui): style.ts com passthrough e limpeza dos dark: redundantes"
```

---

### Task 3: Barrel padronizado + `AppearanceControls`

Hoje `shared/ui/index.ts` mistura `export * from './AppDialog'` (via index da pasta) com `export { AppButton } from './AppButton/AppButton'` (caminho fundo). Quatro wrappers não têm `index.ts`: `AppAvatar`, `AppDivider`, `AppMenu`, `LanguageMenu`. `AppButton` também não.

E `Header` e `LoginPage` repetem o mesmo bloco: `<LanguageMenu/>` + botão de toggle de tema.

**Files:**
- Create: `frontend/src/shared/ui/{AppButton,AppAvatar,AppDivider,AppMenu,LanguageMenu}/index.ts`
- Create: `frontend/src/shared/ui/AppearanceControls/{AppearanceControls.tsx,index.ts}`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/app/layouts/Header/Header.tsx`

**Interfaces:**
- Produces: `AppearanceControls` — componente sem props, exportado de `@shared/ui`. Renderiza o seletor de idioma e o toggle de tema.

> **`AppearanceControls` lê `useUiStore`, que vive em `app/providers/`.** Isso seria `shared → app`, inversão de dependência. Antes de escrever o componente, mova `uiStore.ts` para `frontend/src/shared/stores/uiStore.ts` e atualize os 4 imports (`useApplyTheme`, `Header`, `LoginPage`, `Sidebar`). Estado de tema/sidebar é UI transversal, não montagem — o lugar certo sempre foi `shared`.

- [ ] **Step 1: Mover o `uiStore` para `shared/stores`**

```bash
cd /home/jvbat/projetos/lotus/frontend
mkdir -p src/shared/stores
git mv src/app/providers/uiStore.ts src/shared/stores/uiStore.ts
grep -rln "providers/uiStore\|@app/providers/uiStore" src/
```

Atualizar cada import encontrado para `@shared/stores/uiStore`. Ajustar o docblock do arquivo:

```ts
/**
 * Zustand de estado de UI do shell (colapso da sidebar + tema), persistido em
 * localStorage. Vive em `shared` porque é consumido por `app` (Header, Sidebar)
 * e por `shared/ui` (AppearanceControls) — nenhum dos dois pode importar do outro.
 * NÃO guarda dados de sessão (isso é do sessionStore).
 */
```

**`LoginPage.tsx` também importa `uiStore`.** Ele está na lista de arquivos intocáveis. Faça só a troca do caminho do import, nada mais, e mencione isso no commit.

- [ ] **Step 2: Criar os `index.ts` faltantes**

`frontend/src/shared/ui/AppButton/index.ts`:

```ts
export { AppButton } from './AppButton'
export type { AppButtonProps } from './AppButton'
export { appButtonStyles } from './style'
export type { AppButtonVariant } from './style'
```

`frontend/src/shared/ui/AppAvatar/index.ts`:

```ts
export { AppAvatar } from './AppAvatar'
export type { AppAvatarProps } from './AppAvatar'
```

`frontend/src/shared/ui/AppDivider/index.ts`:

```ts
export { AppDivider } from './AppDivider'
```

`frontend/src/shared/ui/AppMenu/index.ts`:

```ts
export { AppMenu } from './AppMenu'
export type { AppMenuRef, MenuItem } from './AppMenu'
```

`frontend/src/shared/ui/LanguageMenu/index.ts`:

```ts
export { LanguageMenu } from './LanguageMenu'
```

- [ ] **Step 3: Criar `AppearanceControls`**

`frontend/src/shared/ui/AppearanceControls/AppearanceControls.tsx`:

```tsx
import { useUiStore } from '@shared/stores/uiStore'
import { AppButton } from '../AppButton'
import { LanguageMenu } from '../LanguageMenu'

/** Seletor de idioma + toggle de tema. Repetido no Header e no LoginPage;
 * a duplicação do bloco JSX vivia nos dois. */
export function AppearanceControls({ className }: { className?: string }) {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  return (
    <div className={`flex items-center gap-4 ${className ?? ''}`}>
      <LanguageMenu />
      <AppButton variant="brandIcon" onClick={toggleTheme} aria-label="Alternar tema">
        <i className={`pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'}`} />
      </AppButton>
    </div>
  )
}
```

`frontend/src/shared/ui/AppearanceControls/index.ts`:

```ts
export { AppearanceControls } from './AppearanceControls'
```

- [ ] **Step 4: Barrel raiz — só caminhos de pasta**

`frontend/src/shared/ui/index.ts`:

```ts
// Barrel raiz de shared/ui. Features importam SÓ daqui, nunca de primereact.
// Regra: um `export * from './X'` por pasta. Nada de caminho fundo ('./X/X').
export * from './AppAvatar'
export * from './AppButton'
export * from './AppDataTable'
export * from './AppDialog'
export * from './AppDivider'
export * from './AppDropdown'
export * from './AppFileUpload'
export * from './AppHeader'
export * from './AppInputText'
export * from './AppMenu'
export * from './AppPassword'
export * from './AppSidebar'
export * from './AppTabView'
export * from './AppTag'
export * from './AppearanceControls'
export * from './Clock'
export * from './LanguageMenu'
export * from './PageHeader'
```

- [ ] **Step 5: Usar `AppearanceControls` no Header**

`frontend/src/app/layouts/Header/Header.tsx` — substituir `<LanguageMenu/>` e o botão de tema:

```tsx
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppDivider, AppHeader, AppearanceControls, Clock } from '@shared/ui'
import { NAV_MODULES } from '@shared/config/navigation'
import { UserMenu } from './UserMenu'

const EXTRA_TITLES: Record<string, string> = { '/perfil': 'userMenu.profile' }

/** Chave i18n do título conforme a rota. */
function pageTitleKey(pathname: string): string {
  return NAV_MODULES.find((m) => m.path === pathname)?.labelKey ?? EXTRA_TITLES[pathname] ?? 'nav.dashboard'
}

export function Header() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <AppHeader className="border-slate-400 bg-gray-200 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {t(pageTitleKey(pathname))}
      </h1>

      <div className="flex items-center gap-4">
        <AppearanceControls />
        <AppDivider layout="vertical" className="mx-0! h-6" />
        <Clock className="hidden md:block dark:text-slate-200" />
        <UserMenu />
      </div>
    </AppHeader>
  )
}
```

**`LoginPage.tsx` não é editado nesta task** além do caminho do import do Step 1 — combine com o dono antes de trocar o bloco por `<AppearanceControls/>` lá.

- [ ] **Step 6: Build + lint + verificação**

```bash
cd frontend && pnpm build && pnpm lint
```

No navegador: o toggle de tema e o seletor de idioma continuam funcionando no Header e na tela de login.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared frontend/src/app
git commit -m "refactor(shared/ui): barrel por pasta, AppearanceControls, uiStore em shared/stores"
```

---

### Task 4: Sessão e RBAC vão para `shared`

`app/` importa **cinco** coisas de `features/identity` — `sessionStore`, `usePermissions`, `useSessionBootstrap`, `useLogout`, `LoginPage`. Só a última é de fato uma tela de domínio.

`sessionStore` depende apenas de `SessionUserData`, um tipo **gerado** em `shared/types`. Nenhuma dependência de domínio. Sessão e RBAC são infraestrutura transversal — mesmo estatuto de `shared/api/axios.ts`, que já hospeda `ProblemDetails`. Movidos para `shared`, qualquer feature pode chamar `can()` sem importar outra feature.

> **Aviso que precisa ficar no código:** esconder um botão por `can()` é conveniência, **não segurança**. A fronteira é a API. O backend continua sendo quem autoriza.

**Files:**
- Move: `frontend/src/features/identity/stores/sessionStore.ts` → `frontend/src/shared/stores/sessionStore.ts`
- Move: `frontend/src/features/identity/hooks/usePermissions.ts` → `frontend/src/shared/hooks/usePermissions.ts`
- Move: `frontend/src/features/identity/types.ts` → conteúdo absorvido em `shared/stores/sessionStore.ts`
- Modify: importadores (`app/router/*`, `app/layouts/*`, `app/pages/DashboardPage.tsx`, `features/identity/api/*`, `features/identity/hooks/useSessionBootstrap.ts`)

**Interfaces:**
- Produces:
  - `@shared/stores/sessionStore` → `useSessionStore`, `type SessionStatus`, `type SessionUser`
  - `@shared/hooks/usePermissions` → `usePermissions(): { can(p: string): boolean; hasRole(r: string): boolean; roles: string[] }`

- [ ] **Step 1: Mover os arquivos**

```bash
cd /home/jvbat/projetos/lotus/frontend
git mv src/features/identity/stores/sessionStore.ts src/shared/stores/sessionStore.ts
git mv src/features/identity/hooks/usePermissions.ts src/shared/hooks/usePermissions.ts
git rm src/features/identity/types.ts
rmdir src/features/identity/stores 2>/dev/null || true
```

- [ ] **Step 2: Absorver o alias de tipo**

`frontend/src/shared/stores/sessionStore.ts`:

```ts
import { create } from 'zustand'
import type { SessionUserData } from '@shared/types/generated'

// Fonte do tipo = DTO gerado do backend (ADR-04).
export type SessionUser = SessionUserData

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface SessionState {
  user: SessionUser | null
  status: SessionStatus
  setUser: (user: SessionUser) => void
  clear: () => void
}

/**
 * Sessão do usuário autenticado. Vive em `shared` porque é infraestrutura
 * transversal (como o cliente axios), consumida por `app` (guard de rota, shell)
 * e por qualquer feature que precise do RBAC. Não é domínio.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'loading', // até o boot resolver via GET /api/me
  setUser: (user) => set({ user, status: 'authenticated' }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}))
```

- [ ] **Step 3: Ajustar `usePermissions`**

`frontend/src/shared/hooks/usePermissions.ts`:

```ts
import { useSessionStore } from '@shared/stores/sessionStore'

/**
 * Deriva o RBAC efetivo da sessão. `can` checa permissão pontual; `hasRole`
 * checa role. Fonte = SessionUserData (roles[]/permissions[]).
 *
 * ATENÇÃO: isto é conveniência de interface, NÃO segurança. Esconder um botão
 * não impede a chamada. A autorização real é do backend (ADR-07).
 */
export function usePermissions() {
  const user = useSessionStore((s) => s.user)
  const permissions = user?.permissions ?? []
  const roles = user?.roles ?? []

  return {
    can: (permission: string) => permissions.includes(permission),
    hasRole: (role: string) => roles.includes(role),
    roles,
  }
}
```

> Confirme com o dono antes de sobrescrever: o arquivo original tem edições de whitespace não commitadas.

- [ ] **Step 4: Atualizar todos os importadores**

```bash
cd frontend && grep -rln "identity/stores/sessionStore\|identity/hooks/usePermissions\|identity/types" src/
```

Trocar por `@shared/stores/sessionStore` e `@shared/hooks/usePermissions`. Os arquivos esperados: `app/router/AppRouter.tsx`, `app/router/ProtectedRoute.tsx`, `app/layouts/Sidebar/Sidebar.tsx`, `app/layouts/Header/UserMenu.tsx`, `app/pages/DashboardPage.tsx`, `features/identity/api/{authApi,useLogin,useLogout}.ts`, `features/identity/hooks/useSessionBootstrap.ts`.

- [ ] **Step 5: Provar que a regra de camada não foi quebrada**

```bash
cd frontend
# shared não pode importar de features nem de app
grep -rn "@features/\|@app/" src/shared/ && echo "VIOLACAO" || echo "shared limpo"
# features não podem importar primereact direto nem outra feature
grep -rn "from 'primereact" src/features/ && echo "VIOLACAO" || echo "features limpo"
pnpm build && pnpm lint
```

Esperado: `shared limpo`, `features limpo`, build e lint limpos.

- [ ] **Step 6: Verificação manual**

Login, navegação, logout, e a Sidebar escondendo módulos conforme o role. Comportamento idêntico ao anterior.

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "refactor(shared): sessionStore e usePermissions viram infraestrutura compartilhada"
```

---

### Task 5: `useCrudPage` — um hook de página CRUD para todos os módulos

`useClientsPage` e `useRedatoresPage` são o mesmo hook módulo o tipo. Depois do plano de correções, os dois já derivam a entidade da lista (guardam o id). Hoistar agora é literalmente extrair o corpo comum.

**Files:**
- Create: `frontend/src/shared/hooks/useCrudPage.ts`
- Modify: `frontend/src/features/commercial/hooks/useClientsPage.ts`
- Modify: `frontend/src/features/identity/hooks/useRedatoresPage.ts`

**Interfaces:**
- Consumes: um recurso de `createCrudResource<T>` (só o `useList`).
- Produces:

```ts
useCrudPage<T extends { id?: number }>(resource: { useList: () => { data?: T[]; isLoading: boolean } }): {
  items: T[]
  loading: boolean
  dialog: { mode: DialogMode; entity: T | null } | null
  openCreate: () => void
  openView: (item: T) => void
  startEdit: () => void
  close: () => void
}
```

- [ ] **Step 1: Escrever o hook**

`frontend/src/shared/hooks/useCrudPage.ts`:

```ts
import { useState } from 'react'
import type { DialogMode } from '@shared/lib'

/** Contrato mínimo que `createCrudResource<T>` satisfaz. Tipado por estrutura
 * para o hook não depender da fábrica inteira. */
interface ListableResource<T> {
  useList: () => { data?: T[]; isLoading: boolean }
}

/**
 * Estado de uma página de módulo CRUD: a lista e o dialog unificado.
 *
 * O dialog guarda o **id**, não o objeto. A entidade é derivada de `items` a cada
 * render, então uma invalidação de query (upload de documento, edição de nested)
 * chega ao dialog aberto. Guardar o objeto congelava um snapshot obsoleto — foi
 * exatamente esse o bug que a task 4.2.2 escondeu.
 */
export function useCrudPage<T extends { id?: number }>(resource: ListableResource<T>) {
  const query = resource.useList()
  const [dialog, setDialog] = useState<{ mode: DialogMode; id: number | null } | null>(null)

  const items = query.data ?? []
  const entity = dialog?.id != null ? (items.find((i) => i.id === dialog.id) ?? null) : null

  return {
    items,
    loading: query.isLoading,
    dialog: dialog ? { mode: dialog.mode, entity } : null,
    openCreate: () => setDialog({ mode: 'create', id: null }),
    openView: (item: T) => setDialog({ mode: 'view', id: item.id ?? null }),
    /** view -> edit, preservando a entidade aberta. Nunca entra em edit sem entidade. */
    startEdit: () => setDialog((d) => (d && d.id != null ? { ...d, mode: 'edit' } : d)),
    close: () => setDialog(null),
  }
}
```

- [ ] **Step 2: Exportar do barrel de hooks**

`frontend/src/shared/hooks/index.ts` (criar se não existir):

```ts
export { useClock } from './useClock'
export { useCrudPage } from './useCrudPage'
export { usePermissions } from './usePermissions'
```

- [ ] **Step 3: Substituir os dois hooks de página**

`frontend/src/features/commercial/hooks/useClientsPage.ts`:

```ts
import { useCrudPage } from '@shared/hooks'
import { clientsApi } from '../api/clientsApi'

export function useClientsPage() {
  return useCrudPage(clientsApi)
}
```

`frontend/src/features/identity/hooks/useRedatoresPage.ts`:

```ts
import { useCrudPage } from '@shared/hooks'
import { redatoresApi } from '../api/redatoresApi'

export function useRedatoresPage() {
  return useCrudPage(redatoresApi)
}
```

- [ ] **Step 4: Ajustar as duas páginas para os nomes genéricos**

`CommercialPage.tsx`: `page.clients` → `page.items`, `page.dialog.client` → `page.dialog.entity`.
`PersonasPage.tsx`: `page.redatores` → `page.items`, `page.dialog.redator` → `page.dialog.entity`.

As props dos dialogs (`client={...}`, `redator={...}`) continuam com o nome da entidade — elas são a fronteira da feature.

- [ ] **Step 5: Build + verificação manual**

```bash
cd frontend && pnpm build && pnpm lint
```

Repetir a verificação do plano de correções: `/personas` → editar redator → subir documento → a linha atualiza sem fechar o dialog. **Este é o teste de que a abstração preservou o comportamento.**

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "refactor(shared): useCrudPage compartilhado entre modulos CRUD"
```

---

### Task 6: `useEntityForm` — o núcleo do formulário de entidade

`useClientForm` e `useRedatorForm` compartilham: estado do form, `set` tipado, `readOnly` derivado do modo, reset ao trocar de entidade/modo, e a extração de `fieldErrors`/`generalError` do `ProblemDetails`.

Divergem no `submit`: cliente manda JSON; redator manda multipart com `stagedDocs`. **Isso fica na feature.** Forçar os dois no mesmo molde construiria um motor.

**Files:**
- Create: `frontend/src/shared/hooks/useEntityForm.ts`
- Modify: `frontend/src/features/commercial/hooks/useClientForm.ts`
- Modify: `frontend/src/features/identity/hooks/useRedatorForm.ts`

**Interfaces:**
- Consumes: `ProblemDetails` de `@shared/api/axios`; `DialogMode` de `@shared/lib`.
- Produces:

```ts
useEntityForm<T extends { id?: number }>(entity: T | null, mode: DialogMode, empty: T, toFields?: (e: T) => T): {
  form: T
  setForm: Dispatch<SetStateAction<T>>
  set: <K extends keyof T>(k: K, v: T[K]) => void
  readOnly: boolean
  didReset: boolean
}

useMutationErrors(errors: Array<ProblemDetails | null | undefined>): {
  fieldErrors: Record<string, string[]> | undefined
  generalError: string | null
}
```

- [ ] **Step 1: Escrever o hook**

`frontend/src/shared/hooks/useEntityForm.ts`:

```ts
import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { ProblemDetails } from '@shared/api/axios'
import type { DialogMode } from '@shared/lib'

/**
 * Núcleo de um formulário de entidade num dialog unificado (view/edit/create).
 *
 * O reset compara o **id** da entidade e o modo, não a identidade do objeto: a
 * entidade vem derivada da lista (ver useCrudPage), então um refetch produz um
 * objeto novo com o mesmo id — resetar ali apagaria o que o usuário digitou.
 *
 * `structuredClone` garante que editar o form nunca mute o objeto cacheado pelo
 * TanStack Query.
 *
 * `toFields` permite projetar a entidade só nos campos editáveis (o redator
 * exclui `documents`, que são geridos por mutações próprias).
 */
export function useEntityForm<T extends { id?: number }>(
  entity: T | null,
  mode: DialogMode,
  empty: T,
  toFields: (entity: T) => T = (e) => structuredClone(e),
) {
  const initial = () => (entity ? toFields(entity) : structuredClone(empty))

  const [form, setForm] = useState<T>(initial)
  const [prev, setPrev] = useState({ id: entity?.id ?? null, mode })

  // Ajuste de estado durante o render — o padrão do React para "resetar estado
  // quando uma prop muda". Um useEffect com setState é proibido pela regra
  // react-hooks/set-state-in-effect nesta versão do eslint-plugin-react-hooks.
  const currentId = entity?.id ?? null
  const didReset = currentId !== prev.id || mode !== prev.mode
  if (didReset) {
    setPrev({ id: currentId, mode })
    setForm(initial)
  }

  const set = <K extends keyof T>(k: K, v: T[K]) => setForm((f) => ({ ...f, [k]: v }))

  return { form, setForm, set, readOnly: mode === 'view', didReset }
}

/**
 * Normaliza os erros de uma ou mais mutações: 422 traz erros por campo; outros
 * status trazem só a mensagem geral.
 */
export function useMutationErrors(errors: Array<ProblemDetails | null | undefined>) {
  const first = errors.find(Boolean) ?? null

  return {
    fieldErrors: first?.errors,
    generalError: first && !first.errors ? first.detail : null,
  }
}
```

- [ ] **Step 2: Exportar do barrel**

Acrescentar a `frontend/src/shared/hooks/index.ts`:

```ts
export { useEntityForm, useMutationErrors } from './useEntityForm'
```

- [ ] **Step 3: Reescrever `useClientForm` sobre o núcleo**

`frontend/src/features/commercial/hooks/useClientForm.ts`:

```ts
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { ClientData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { clientsApi } from '../api/clientsApi'

export type ClientDialogMode = DialogMode

const EMPTY: ClientData = {
  id: undefined, name: '', rut: '', email: '', phone: null,
  legal_name: '', type: 'client', business_activity: null,
  addresses: [{ id: undefined, line1: null, line2: null, number: null, commune: null, city: null, region: null, zip_code: null, is_primary: true }],
  contacts: [{ id: undefined, name: '', email: null, phone: null, is_primary: true }],
}

export function useClientForm(client: ClientData | null, mode: ClientDialogMode, onDone: () => void) {
  const { form, setForm, set, readOnly } = useEntityForm(client, mode, EMPTY)
  const create = clientsApi.useCreate()
  const update = clientsApi.useUpdate()

  function submit() {
    // Empresa não tem nome separado da razón social: `name` (exigido pelo backend
    // para o `users.name` do login provisionado) é sempre igual a `legal_name`.
    const payload = { ...form, name: form.legal_name }

    if (mode === 'create') {
      create.mutate(payload, { onSuccess: onDone })
      return
    }
    update.mutate({ id: client!.id!, payload }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, setForm, readOnly, submit,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
```

- [ ] **Step 4: Reescrever `useRedatorForm` sobre o núcleo**

`frontend/src/features/identity/hooks/useRedatorForm.ts`:

```ts
import { useState } from 'react'
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { RedatorData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { redatoresApi } from '../api/redatoresApi'

export type RedatorDialogMode = DialogMode

/** Só os campos que o formulário edita. `documents` fica de fora: são geridos por
 * mutações próprias e lidos da entidade viva. */
export type RedatorFormFields = Pick<RedatorData, 'id' | 'name' | 'rut' | 'email' | 'phone' | 'course_ids'>

const EMPTY: RedatorFormFields = {
  id: undefined, name: '', rut: '', email: '', phone: null, course_ids: [],
}

const toFields = (r: RedatorFormFields): RedatorFormFields => {
  const { id, name, rut, email, phone, course_ids } = r
  return structuredClone({ id, name, rut, email, phone, course_ids })
}

export function useRedatorForm(redator: RedatorData | null, mode: RedatorDialogMode, onDone: () => void) {
  const { form, set, readOnly, didReset } = useEntityForm<RedatorFormFields>(redator, mode, EMPTY, toFields)

  // Documentos escolhidos no `create`: ficam no estado local até o submit (não há
  // `redator.id` ainda para subir pelo endpoint aninhado).
  const [stagedDocs, setStagedDocs] = useState<Record<string, File>>({})
  if (didReset && Object.keys(stagedDocs).length > 0) setStagedDocs({})

  const create = redatoresApi.useCreate()
  const update = redatoresApi.useUpdate()

  const toggleCourse = (id: number) =>
    set('course_ids', form.course_ids.includes(id)
      ? form.course_ids.filter((x) => x !== id)
      : [...form.course_ids, id])

  const stageDoc = (type: string, file: File) => setStagedDocs((s) => ({ ...s, [type]: file }))
  const unstageDoc = (type: string) =>
    setStagedDocs((s) => {
      const next = { ...s }
      delete next[type]
      return next
    })

  function submit() {
    if (mode === 'create') {
      // Um único POST multipart: dados do usuário + cursos + documentos tipados
      // iniciais. O backend lê os arquivos de `$request->file('documents')`,
      // keyed por tipo. NÃO fixe Content-Type: o axios negocia o multipart.
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('rut', form.rut)
      fd.append('email', form.email)
      if (form.phone) fd.append('phone', form.phone)
      form.course_ids.forEach((id) => fd.append('course_ids[]', String(id)))
      Object.entries(stagedDocs).forEach(([type, file]) => fd.append(`documents[${type}]`, file))
      create.mutate(fd, { onSuccess: onDone })
      return
    }

    const payload = { name: form.name, rut: form.rut, email: form.email, phone: form.phone, course_ids: form.course_ids }
    update.mutate({ id: redator!.id!, payload }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form, set, toggleCourse, readOnly, submit,
    pending: create.isPending || update.isPending,
    stagedDocs, stageDoc, unstageDoc,
    fieldErrors, generalError,
  }
}
```

> `didReset` limpando `stagedDocs` durante o render é seguro (é um `setState` condicional no corpo, mesmo padrão do reset do form), mas precisa da guarda `Object.keys(...).length > 0` para não gerar loop.

- [ ] **Step 5: Build + verificação manual**

```bash
cd frontend && pnpm build && pnpm lint
```

1. `/comercial` → criar cliente com contato em branco → erro visível (regressão da Task 6 do plano anterior).
2. `/comercial` → editar cliente, mudar Comuna, salvar → persiste.
3. `/personas` → criar redator com CV anexado → 201, documento aparece.
4. `/personas` → editar redator, digitar no Nombre, subir REUF → documento aparece, Nombre digitado continua.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "refactor(shared): useEntityForm e useMutationErrors compartilhados"
```

---

### Task 7: `ModulePage` — o molde de página de módulo

Todo módulo tem a mesma forma: header com nome + descrição + botão de cadastro à direita; corpo com uma tabela, ou abas quando há mais de uma entidade.

**Files:**
- Create: `frontend/src/shared/ui/ModulePage/{ModulePage.tsx,index.ts}`
- Modify: `frontend/src/features/commercial/components/CommercialPage.tsx`
- Modify: `frontend/src/features/identity/components/PersonasPage.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `AppTabView`, `AppTabPanel` de `@shared/ui`.
- Produces: `ModulePage` (props `title`, `description?`, `actions?`, `children`) e o reexport de `AppTabPanel` como `ModuleTab`.

- [ ] **Step 1: Escrever o componente**

`frontend/src/shared/ui/ModulePage/ModulePage.tsx`:

```tsx
import type { ReactNode } from 'react'
import { PageHeader } from '../PageHeader'
import { AppTabView, AppTabPanel } from '../AppTabView'

/**
 * Molde de página de módulo: cabeçalho (título, descrição, ação) + corpo.
 * Apresentacional puro — não conhece feature, não conhece rota.
 *
 * Uma entidade: passe a tabela direto em `children`.
 * Mais de uma: envolva em <ModuleTabs> com <ModuleTab header="…">.
 */
export function ModulePage({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  )
}

export const ModuleTabs = AppTabView
export const ModuleTab = AppTabPanel
```

`frontend/src/shared/ui/ModulePage/index.ts`:

```ts
export { ModulePage, ModuleTabs, ModuleTab } from './ModulePage'
```

Adicionar `export * from './ModulePage'` ao barrel raiz.

- [ ] **Step 2: Adotar em `CommercialPage`**

```tsx
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useClientsPage } from '../hooks/useClientsPage'
import { ClientsTable } from './ClientsTable'
import { ClientDialog } from './ClientDialog'

export function CommercialPage() {
  const page = useClientsPage()

  return (
    <ModulePage
      title="Comercial"
      description="Gestión de clientes y presupuestos de capacitación"
      actions={<AppButton variant="brandIcon" label="Nuevo cliente" icon="pi pi-user-plus" onClick={page.openCreate} />}
    >
      <ModuleTabs>
        <ModuleTab header="Clientes">
          <ClientsTable clients={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
        <ModuleTab header="Presupuestos">
          <p className="p-4 text-sm text-slate-500">Módulo de presupuestos — próxima sprint.</p>
        </ModuleTab>
      </ModuleTabs>

      {page.dialog && (
        <ClientDialog
          visible
          mode={page.dialog.mode}
          client={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </ModulePage>
  )
}
```

- [ ] **Step 3: Adotar em `PersonasPage`** (mesma forma, **Redactores como primeira aba**)

```tsx
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useRedatoresPage } from '../hooks/useRedatoresPage'
import { RedatoresTable } from './RedatoresTable'
import { RedatorDialog } from './RedatorDialog'

export function PersonasPage() {
  const page = useRedatoresPage()

  return (
    <ModulePage
      title="Personas"
      description="Registro canónico de alumnos y redactores"
      actions={<AppButton variant="brandIcon" label="Nuevo redactor" icon="pi pi-user-plus" onClick={page.openCreate} />}
    >
      <ModuleTabs>
        <ModuleTab header="Redactores">
          <RedatoresTable redatores={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
        <ModuleTab header="Alumnos">
          <p className="p-4 text-sm text-slate-500">Módulo de alumnos — próxima sprint.</p>
        </ModuleTab>
      </ModuleTabs>

      {page.dialog && (
        <RedatorDialog
          visible
          mode={page.dialog.mode}
          redator={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </ModulePage>
  )
}
```

- [ ] **Step 4: Build + verificação manual**

```bash
cd frontend && pnpm build && pnpm lint
```

`/comercial` e `/personas` renderizam idênticos ao antes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(shared/ui): ModulePage como molde de pagina de modulo"
```

---

### Task 8: `CrudDialog` — dialog unificado com os botões no footer

`ClientDialog` e `RedatorDialog` repetem a mesma casca: header com título e botão "Editar" à direita, footer com Cancelar/Guardar, `AppDialog` maximizable. O dono pediu **o botão "Editar" no footer**, junto dos outros.

O `CrudDialog` decide os botões pelo `mode`. O conteúdo do formulário vem por `children`.

**Files:**
- Create: `frontend/src/shared/ui/CrudDialog/{CrudDialog.tsx,index.ts}`
- Modify: `frontend/src/features/commercial/components/ClientDialog.tsx`
- Modify: `frontend/src/features/identity/components/RedatorDialog.tsx`

**Interfaces:**
- Consumes: `AppDialog`, `AppButton`.
- Produces:

```ts
CrudDialog(props: {
  visible: boolean
  mode: DialogMode
  title: string
  onHide: () => void
  onEdit?: () => void        // presente só quando mode === 'view'
  onSubmit?: () => void      // presente em edit/create
  pending?: boolean
  submitLabel?: string       // default: t('common.save')
  headerExtra?: ReactNode    // ex.: tag de idoneidade
  children: ReactNode
})
```

- [ ] **Step 1: Escrever o componente**

`frontend/src/shared/ui/CrudDialog/CrudDialog.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDialog } from '../AppDialog'
import { AppButton } from '../AppButton'
import type { DialogMode } from '@shared/lib'

/**
 * Dialog unificado de cadastro: visualização, edição e criação são o mesmo
 * componente — no create os campos vêm vazios. Maximizable.
 *
 * Os botões vivem no footer, inclusive o "Editar" do modo view: o header fica
 * só com título e conteúdo contextual (`headerExtra`).
 */
export function CrudDialog({
  visible, mode, title, onHide, onEdit, onSubmit, pending, submitLabel, headerExtra, children,
}: {
  visible: boolean
  mode: DialogMode
  title: string
  onHide: () => void
  onEdit?: () => void
  onSubmit?: () => void
  pending?: boolean
  submitLabel?: string
  headerExtra?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()

  const header = (
    <div className="flex items-center gap-4 pr-6">
      <span>{title}</span>
      {headerExtra}
    </div>
  )

  const footer =
    mode === 'view' ? (
      <div className="flex justify-end gap-2">
        <AppButton label={t('common.close')} text onClick={onHide} />
        {onEdit && <AppButton variant="brandIcon" label={t('common.edit')} icon="pi pi-pencil" onClick={onEdit} />}
      </div>
    ) : (
      <div className="flex justify-end gap-2">
        <AppButton label={t('common.cancel')} text onClick={onHide} />
        <AppButton
          variant="brandIcon"
          label={submitLabel ?? t('common.save')}
          icon="pi pi-check"
          loading={pending}
          onClick={onSubmit}
        />
      </div>
    )

  return (
    <AppDialog header={header} visible={visible} onHide={onHide} footer={footer}>
      {children}
    </AppDialog>
  )
}
```

`frontend/src/shared/ui/CrudDialog/index.ts`:

```ts
export { CrudDialog } from './CrudDialog'
```

Adicionar `export * from './CrudDialog'` ao barrel raiz.

> `CrudDialog` usa `react-i18next` dentro de `shared/ui`. Permitido: i18next é biblioteca, não feature. As chaves `common.close|edit|cancel|save` são criadas na Task 11 — até lá o i18next renderiza a própria chave, o que é visível e não quebra o build. **Faça a Task 11 na mesma sessão.**

- [ ] **Step 2: `ClientDialog` sobre o `CrudDialog`**

Substituir toda a casca (header, footer, `AppDialog`) por:

```tsx
  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? 'Nuevo cliente' : (form.legal_name || form.name)}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === 'create' ? 'Registrar cliente' : undefined}
    >
      {/* … o conteúdo do formulário, exatamente como está hoje … */}
    </CrudDialog>
  )
```

Remover os imports de `AppDialog` e do `header`/`footer` locais.

- [ ] **Step 3: `RedatorDialog` sobre o `CrudDialog`**

A tag de idoneidade sai do corpo e vira `headerExtra`:

```tsx
  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? 'Nuevo redactor' : form.name}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === 'create' ? 'Registrar redactor' : undefined}
      headerExtra={
        mode !== 'create' && redator ? (
          <AppTag
            value={`Idoneidad: ${idoneidade(redator)}`}
            severity={idoneidade(redator) === 'idoneo' ? 'success' : idoneidade(redator) === 'por_vencer' ? 'warning' : 'danger'}
          />
        ) : null
      }
    >
      {/* … seções Datos de usuario / Documentos / Cursos habilitados … */}
    </CrudDialog>
  )
```

- [ ] **Step 4: Build + verificação manual**

```bash
cd frontend && pnpm build && pnpm lint
```

1. Abrir um cliente em `view`: footer traz **Cerrar** e **Editar**. O header não tem mais botão.
2. Clicar Editar: footer vira **Cancelar** + **Guardar**; os campos destravam.
3. Idem para redator; a tag de idoneidade aparece ao lado do nome no header.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(shared/ui): CrudDialog com botoes no footer (Editar incluso)"
```

---

### Task 9: `coursesApi` sobe para `shared/api`; `authApi` vira um arquivo

`features/identity/api/coursesApi.ts` existe ali só porque a regra 6 proíbe importar `features/catalog`. Enterrá-lo em identity esconde a dívida: o próximo módulo que precisar de cursos vai importar do redator. `courses` é recurso compartilhado — o lugar é `shared/api`.

E `authApi.ts` + `useLogin.ts` + `useLogout.ts` + `useMe.ts` somam 60 linhas em 4 arquivos. Um arquivo.

**Files:**
- Move: `frontend/src/features/identity/api/coursesApi.ts` → `frontend/src/shared/api/coursesApi.ts`
- Merge: `useLogin.ts`, `useLogout.ts`, `useMe.ts` → `frontend/src/features/identity/api/authApi.ts`
- Modify: `frontend/src/features/identity/components/RedatorDialog.tsx`, `app/layouts/Header/UserMenu.tsx`, `features/identity/hooks/{useLoginForm,useSessionBootstrap}.ts`

**Interfaces:**
- Produces:
  - `@shared/api/coursesApi` → `coursesApi` (`createCrudResource<CourseData>('courses')`)
  - `@features/identity/api/authApi` → `login`, `logout`, `fetchMe`, `useLogin`, `useLogout`, `useMe`

- [ ] **Step 1: Mover `coursesApi`**

```bash
cd /home/jvbat/projetos/lotus/frontend
git mv src/features/identity/api/coursesApi.ts src/shared/api/coursesApi.ts
```

`frontend/src/shared/api/coursesApi.ts`:

```ts
import { createCrudResource } from './createCrudResource'
import type { CourseData } from '@shared/types/generated'

/** Recurso `courses`, compartilhado: o dialog do redator lista cursos para as
 * habilitações, e o módulo de Catálogo o consome direto. Vive em `shared` porque
 * mais de uma feature precisa dele e feature não importa feature (ADR-05). */
export const coursesApi = createCrudResource<CourseData>('courses')
```

Atualizar o import em `RedatorDialog.tsx`:

```tsx
import { coursesApi } from '@shared/api/coursesApi'
```

> Nota de comportamento: `GET /api/courses` exige `catalog.course.view`. Um usuário sem essa permissão vê a lista de cursos vazia no dialog, sem erro. É o comportamento atual; não mude nesta task.

- [ ] **Step 2: Consolidar o `authApi`**

`frontend/src/features/identity/api/authApi.ts`:

```ts
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { initCsrf } from '@shared/api/csrf'
import { useSessionStore } from '@shared/stores/sessionStore'
import type { SessionUser } from '@shared/stores/sessionStore'

// ---- chamadas ----

export async function login(email: string, password: string): Promise<SessionUser> {
  await initCsrf()
  const { data } = await api.post<SessionUser>('/api/login', { email, password })
  return data
}

export async function logout(): Promise<void> {
  await api.post('/api/logout')
}

export async function fetchMe(): Promise<SessionUser> {
  const { data } = await api.get<SessionUser>('/api/me')
  return data
}

// ---- hooks ----

interface LoginVars {
  email: string
  password: string
}

export function useLogin() {
  const setUser = useSessionStore((s) => s.setUser)

  return useMutation<SessionUser, ProblemDetails, LoginVars>({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: (user) => setUser(user),
  })
}

export function useLogout() {
  const clear = useSessionStore((s) => s.clear)

  return useMutation<void, ProblemDetails, void>({
    mutationFn: () => logout(),
    onSuccess: () => clear(),
  })
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false, // 401 no boot = deslogado, não re-tentar
    staleTime: Infinity,
  })
}
```

```bash
git rm src/features/identity/api/useLogin.ts src/features/identity/api/useLogout.ts src/features/identity/api/useMe.ts
```

- [ ] **Step 3: Atualizar os importadores**

```bash
cd frontend && grep -rln "api/useLogin\|api/useLogout\|api/useMe\|api/coursesApi" src/
```

`UserMenu.tsx`, `useLoginForm.ts`, `useSessionBootstrap.ts`, `RedatorDialog.tsx`.

- [ ] **Step 4: Provar as regras de camada + build**

```bash
cd frontend
grep -rn "@features/\|@app/" src/shared/ && echo "VIOLACAO" || echo "shared limpo"
grep -rn "from 'primereact" src/features/ && echo "VIOLACAO" || echo "features limpo"
pnpm build && pnpm lint
```

- [ ] **Step 5: Verificação manual**

Login, logout, e o dialog do redator listando os cursos habilitados.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "refactor(api): coursesApi em shared; authApi consolidado num arquivo"
```

---

### Task 10: Pastas por entidade

Padrão que escala: **sub-pasta quando a entidade passa de ~3 arquivos**, não por decreto. Hoje `identity/components` mistura login e redator.

`PersonasPage` → `PeoplePage` (nome de tela, em inglês como o resto do código). **`Redator` não é traduzido** — é o vocabulário do backend (`RedatorController`, tabela `redatores`, rota `/api/redatores`).

**Files:**
- Move: `features/identity/components/{LoginForm,LoginPage}.tsx` → `features/identity/components/Login/`
- Move: `features/identity/components/{RedatorDialog,RedatoresTable}.tsx` → `features/identity/components/Redator/`
- Rename: `features/identity/components/PersonasPage.tsx` → `features/identity/components/PeoplePage.tsx`
- Move: `features/commercial/components/{ClientDialog,ClientsTable}.tsx` → `features/commercial/components/Client/`
- Modify: `app/router/AppRouter.tsx`

- [ ] **Step 1: Mover, preservando histórico**

```bash
cd /home/jvbat/projetos/lotus/frontend/src/features

mkdir -p identity/components/Login identity/components/Redator commercial/components/Client
git mv identity/components/LoginForm.tsx     identity/components/Login/LoginForm.tsx
git mv identity/components/LoginPage.tsx     identity/components/Login/LoginPage.tsx
git mv identity/components/RedatorDialog.tsx identity/components/Redator/RedatorDialog.tsx
git mv identity/components/RedatoresTable.tsx identity/components/Redator/RedatoresTable.tsx
git mv identity/components/PersonasPage.tsx  identity/components/PeoplePage.tsx
git mv commercial/components/ClientDialog.tsx commercial/components/Client/ClientDialog.tsx
git mv commercial/components/ClientsTable.tsx commercial/components/Client/ClientsTable.tsx

git rm commercial/components/.gitkeep commercial/hooks/.gitkeep 2>/dev/null || true
```

- [ ] **Step 2: Renomear o componente e corrigir os imports relativos**

Em `PeoplePage.tsx`: `export function PersonasPage()` → `export function PeoplePage()`, e os imports viram `./Redator/RedatoresTable`, `./Redator/RedatorDialog`.

Em `CommercialPage.tsx`: `./Client/ClientsTable`, `./Client/ClientDialog`.

Dentro de `Login/`, `Redator/`, `Client/`: os imports de `../hooks/…` viram `../../hooks/…`. Os de `@shared/…` e `@features/…` não mudam.

- [ ] **Step 3: Atualizar o router**

`frontend/src/app/router/AppRouter.tsx`:

```tsx
import { PeoplePage } from '@features/identity/components/PeoplePage'
import { LoginPage } from '@features/identity/components/Login/LoginPage'
```

e `<Route path="/personas" element={<PeoplePage />} />` — **a rota continua `/personas`**, é URL voltada ao usuário chileno.

- [ ] **Step 4: Build + lint + smoke**

```bash
cd frontend && pnpm build && pnpm lint
```

Navegar por `/login`, `/comercial`, `/personas`. Tudo renderiza.

- [ ] **Step 5: Commit**

```bash
git add -A frontend/src
git commit -m "refactor(frontend): componentes agrupados por entidade; PersonasPage -> PeoplePage"
```

---

### Task 11: i18n em toda a interface

Zero `useTranslation` em commercial e identity/redator. Os rótulos de enum (`Cliente/Proveedor/Otro`, `CV/REUF/TITULO/POSTGRADO`, `Vigente/Por vencer/Vencido`, `Idóneo/No idóneo`) estão hardcoded em `Record` **dentro** dos componentes, e duplicados entre tabela e dialog.

Mover para os locales mata a duplicação e cumpre a spec §6. `es-CL` é a referência de rótulo (o produto é para o cliente chileno).

**Files:**
- Modify: `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json`
- Modify: `frontend/src/features/commercial/components/{CommercialPage,Client/ClientsTable,Client/ClientDialog}.tsx`
- Modify: `frontend/src/features/identity/components/{PeoplePage,Redator/RedatoresTable,Redator/RedatorDialog}.tsx`
- Modify: `frontend/src/features/identity/lib/redatorStatus.ts` (só o tipo de retorno; nenhuma string)

- [ ] **Step 1: Acrescentar as chaves em `es-CL.json`**

```json
  "common": {
    "language": "Idioma",
    "save": "Guardar",
    "cancel": "Cancelar",
    "close": "Cerrar",
    "edit": "Editar",
    "rut": "RUT",
    "email": "Correo electrónico",
    "phone": "Teléfono",
    "search": "Buscar...",
    "notLoaded": "No cargado",
    "download": "Descargar",
    "delete": "Eliminar"
  },
  "client": {
    "module": "Comercial",
    "moduleDescription": "Gestión de clientes y presupuestos de capacitación",
    "new": "Nuevo cliente",
    "create": "Registrar cliente",
    "tabClients": "Clientes",
    "tabBudgets": "Presupuestos",
    "budgetsPlaceholder": "Módulo de presupuestos — próxima sprint.",
    "empty": "Sin clientes",
    "count": "{{count}} clientes",
    "searchPlaceholder": "Buscar por razón social o RUT...",
    "legalName": "Razón social",
    "type": "Tipo",
    "businessActivity": "Giro",
    "sectionGeneral": "Datos generales",
    "sectionAddress": "Dirección",
    "sectionContacts": "Personas de contacto",
    "addContact": "Agregar contacto",
    "region": "Región",
    "commune": "Comuna",
    "city": "Ciudad",
    "street": "Calle",
    "number": "Número",
    "contactName": "Nombre",
    "contacts": "Contactos"
  },
  "clientType": {
    "client": "Cliente",
    "provider": "Proveedor",
    "other": "Otro"
  },
  "redator": {
    "module": "Personas",
    "moduleDescription": "Registro canónico de alumnos y redactores",
    "new": "Nuevo redactor",
    "create": "Registrar redactor",
    "tabRedatores": "Redactores",
    "tabStudents": "Alumnos",
    "studentsPlaceholder": "Módulo de alumnos — próxima sprint.",
    "empty": "Sin redactores",
    "count": "{{count}} redactores",
    "searchPlaceholder": "Buscar por nombre o RUT...",
    "name": "Nombre completo",
    "sectionUser": "Datos de usuario",
    "sectionDocuments": "Documentos",
    "sectionCourses": "Cursos habilitados",
    "enabledCourses": "Cursos habilitados",
    "suitability": "Idoneidad"
  },
  "documentType": {
    "CV": "Currículum (CV)",
    "REUF": "Certificado REUF",
    "TITULO": "Título universitario",
    "POSTGRADO": "Post-Grado"
  },
  "documentStatus": {
    "sin_venc": "Sin vencimiento",
    "vigente": "Vigente",
    "por_vencer": "Por vencer",
    "vencido": "Vencido"
  },
  "suitability": {
    "idoneo": "Idóneo",
    "por_vencer": "Por vencer",
    "no_idoneo": "No idóneo"
  }
```

- [ ] **Step 2: As mesmas chaves em `pt-BR.json`**

```json
  "common": {
    "language": "Idioma",
    "save": "Salvar",
    "cancel": "Cancelar",
    "close": "Fechar",
    "edit": "Editar",
    "rut": "RUT",
    "email": "E-mail",
    "phone": "Telefone",
    "search": "Buscar...",
    "notLoaded": "Não enviado",
    "download": "Baixar",
    "delete": "Excluir"
  },
  "client": {
    "module": "Comercial",
    "moduleDescription": "Gestão de clientes e orçamentos de capacitação",
    "new": "Novo cliente",
    "create": "Cadastrar cliente",
    "tabClients": "Clientes",
    "tabBudgets": "Orçamentos",
    "budgetsPlaceholder": "Módulo de orçamentos — próxima sprint.",
    "empty": "Sem clientes",
    "count": "{{count}} clientes",
    "searchPlaceholder": "Buscar por razão social ou RUT...",
    "legalName": "Razão social",
    "type": "Tipo",
    "businessActivity": "Ramo de atividade",
    "sectionGeneral": "Dados gerais",
    "sectionAddress": "Endereço",
    "sectionContacts": "Pessoas de contato",
    "addContact": "Adicionar contato",
    "region": "Região",
    "commune": "Comuna",
    "city": "Cidade",
    "street": "Rua",
    "number": "Número",
    "contactName": "Nome",
    "contacts": "Contatos"
  },
  "clientType": {
    "client": "Cliente",
    "provider": "Fornecedor",
    "other": "Outro"
  },
  "redator": {
    "module": "Pessoas",
    "moduleDescription": "Registro canônico de alunos e redatores",
    "new": "Novo redator",
    "create": "Cadastrar redator",
    "tabRedatores": "Redatores",
    "tabStudents": "Alunos",
    "studentsPlaceholder": "Módulo de alunos — próxima sprint.",
    "empty": "Sem redatores",
    "count": "{{count}} redatores",
    "searchPlaceholder": "Buscar por nome ou RUT...",
    "name": "Nome completo",
    "sectionUser": "Dados de usuário",
    "sectionDocuments": "Documentos",
    "sectionCourses": "Cursos habilitados",
    "enabledCourses": "Cursos habilitados",
    "suitability": "Idoneidade"
  },
  "documentType": {
    "CV": "Currículo (CV)",
    "REUF": "Certificado REUF",
    "TITULO": "Título universitário",
    "POSTGRADO": "Pós-graduação"
  },
  "documentStatus": {
    "sin_venc": "Sem vencimento",
    "vigente": "Vigente",
    "por_vencer": "A vencer",
    "vencido": "Vencido"
  },
  "suitability": {
    "idoneo": "Idôneo",
    "por_vencer": "A vencer",
    "no_idoneo": "Não idôneo"
  }
```

- [ ] **Step 3: As mesmas chaves em `en.json`**

```json
  "common": {
    "language": "Language",
    "save": "Save",
    "cancel": "Cancel",
    "close": "Close",
    "edit": "Edit",
    "rut": "RUT",
    "email": "Email",
    "phone": "Phone",
    "search": "Search...",
    "notLoaded": "Not uploaded",
    "download": "Download",
    "delete": "Delete"
  },
  "client": {
    "module": "Commercial",
    "moduleDescription": "Client and training quote management",
    "new": "New client",
    "create": "Register client",
    "tabClients": "Clients",
    "tabBudgets": "Budgets",
    "budgetsPlaceholder": "Budgets module — next sprint.",
    "empty": "No clients",
    "count": "{{count}} clients",
    "searchPlaceholder": "Search by legal name or RUT...",
    "legalName": "Legal name",
    "type": "Type",
    "businessActivity": "Business activity",
    "sectionGeneral": "General information",
    "sectionAddress": "Address",
    "sectionContacts": "Contact persons",
    "addContact": "Add contact",
    "region": "Region",
    "commune": "Commune",
    "city": "City",
    "street": "Street",
    "number": "Number",
    "contactName": "Name",
    "contacts": "Contacts"
  },
  "clientType": {
    "client": "Client",
    "provider": "Provider",
    "other": "Other"
  },
  "redator": {
    "module": "People",
    "moduleDescription": "Canonical registry of students and instructors",
    "new": "New instructor",
    "create": "Register instructor",
    "tabRedatores": "Instructors",
    "tabStudents": "Students",
    "studentsPlaceholder": "Students module — next sprint.",
    "empty": "No instructors",
    "count": "{{count}} instructors",
    "searchPlaceholder": "Search by name or RUT...",
    "name": "Full name",
    "sectionUser": "User information",
    "sectionDocuments": "Documents",
    "sectionCourses": "Enabled courses",
    "enabledCourses": "Enabled courses",
    "suitability": "Suitability"
  },
  "documentType": {
    "CV": "Résumé (CV)",
    "REUF": "REUF certificate",
    "TITULO": "University degree",
    "POSTGRADO": "Postgraduate degree"
  },
  "documentStatus": {
    "sin_venc": "No expiry",
    "vigente": "Valid",
    "por_vencer": "Expiring",
    "vencido": "Expired"
  },
  "suitability": {
    "idoneo": "Suitable",
    "por_vencer": "Expiring",
    "no_idoneo": "Not suitable"
  }
```

> Nota de vocabulário: `redator` é o termo do backend e permanece no **código**. Nos rótulos de interface em inglês ele vira "instructor" — o `en` existe para conveniência de desenvolvimento; o produto é entregue em `es-CL`.

- [ ] **Step 4: Provar que os três locales têm exatamente o mesmo conjunto de chaves**

Uma chave presente em `es-CL` e ausente em `en` só aparece como texto cru na tela, e ninguém percebe até um usuário trocar de idioma.

```bash
cd /home/jvbat/projetos/lotus/frontend/src/shared/config/locales
cat > /tmp/checkkeys.mjs <<'EOF'
import { readFileSync } from 'node:fs'
const flat = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`])
const load = (f) => new Set(flat(JSON.parse(readFileSync(f, 'utf8'))))
const [base, ...rest] = ['es-CL.json', 'pt-BR.json', 'en.json']
const b = load(base)
let ok = true
for (const f of rest) {
  const s = load(f)
  const missing = [...b].filter((k) => !s.has(k))
  const extra = [...s].filter((k) => !b.has(k))
  if (missing.length || extra.length) {
    ok = false
    console.log(`${f}: faltando=${JSON.stringify(missing)} sobrando=${JSON.stringify(extra)}`)
  }
}
console.log(ok ? 'LOCALES OK' : 'LOCALES DIVERGENTES')
process.exit(ok ? 0 : 1)
EOF
node /tmp/checkkeys.mjs
```

Esperado: `LOCALES OK`.

- [ ] **Step 5: Substituir os `Record` hardcoded**

`ClientsTable.tsx` — some o `TYPE_LABEL`:

```tsx
const { t } = useTranslation()
…
<AppColumn header={t('client.type')} body={(c: ClientData) => <AppTag value={t(`clientType.${c.type}`)} />} />
```

`ClientDialog.tsx` — o `TYPES` do dropdown passa a ser derivado:

```tsx
const TYPE_VALUES = ['client', 'provider', 'other'] as const
…
const types = TYPE_VALUES.map((value) => ({ value, label: t(`clientType.${value}`) }))
```

`RedatorDialog.tsx` — somem `DOC_TYPES` e `STATUS_TAG`:

```tsx
const DOC_TYPES = ['CV', 'REUF', 'TITULO', 'POSTGRADO'] as const
const STATUS_SEVERITY: Record<DocStatus, 'success' | 'warning' | 'danger'> = {
  sin_venc: 'success', vigente: 'success', por_vencer: 'warning', vencido: 'danger',
}
…
{DOC_TYPES.map((type) => {
  const doc = existing.find((d) => d.type === type)
  const st = doc ? docStatus(doc.valid_until) : null
  …
  <p className="text-sm font-medium">{t(`documentType.${type}`)}</p>
  {st && <AppTag value={t(`documentStatus.${st}`)} severity={STATUS_SEVERITY[st]} />}
```

`RedatoresTable.tsx` — some o `IDON_TAG`:

```tsx
const IDON_SEVERITY = { idoneo: 'success', por_vencer: 'warning', no_idoneo: 'danger' } as const
…
<AppColumn header={t('redator.suitability')} body={(r: RedatorData) => {
  const k = idoneidade(r)
  return <AppTag value={t(`suitability.${k}`)} severity={IDON_SEVERITY[k]} />
}} />
```

`redatorStatus.ts` continua devolvendo as **chaves** (`'vigente'`, `'no_idoneo'`), nunca texto. É a fronteira certa: lógica devolve chave, componente traduz.

- [ ] **Step 6: Traduzir as páginas e o resto dos rótulos**

`CommercialPage`/`PeoplePage`: `title={t('client.module')}`, `description={t('client.moduleDescription')}`, `label={t('client.new')}`, headers das abas, placeholders.

`CrudDialog` (Task 8) já usa `common.close|edit|cancel|save` — as chaves agora existem.

Contagens usam a pluralização do i18next: `t('client.count', { count: clients.length })`.

- [ ] **Step 7: Build + verificação nos três idiomas**

```bash
cd frontend && pnpm build && pnpm lint
node /tmp/checkkeys.mjs   # de dentro de src/shared/config/locales
```

Trocar o idioma no Header e conferir `/comercial` e `/personas` em ES, PT e EN. Nenhuma chave crua (`client.legalName`) visível na tela.

- [ ] **Step 8: Commit**

```bash
git add frontend/src
git commit -m "feat(i18n): traduz os modulos Comercial e Personas (labels de enum inclusos)"
```

---

### Task 12: Atualizar a documentação para a estrutura real

`docs/estrutura-monolito.md` descreve `identity/ # login, perfil, gestão de roles`, cita um wrapper `AppTable/` que não existe, e não conhece `shared/stores`, `shared/hooks/useCrudPage`, `ModulePage`, `CrudDialog`. Documentação que mente é pior que ausente.

**Files:**
- Modify: `docs/estrutura-monolito.md`
- Modify: `INSTRUÇÕES-DO-PROJETO.md` (seção de frontend)

- [ ] **Step 1: Atualizar a árvore em `docs/estrutura-monolito.md`**

Refletir:
- `shared/stores/` (uiStore, sessionStore) — novo, com a justificativa de "infra transversal, não domínio".
- `shared/hooks/` (useClock, useCrudPage, useEntityForm, usePermissions).
- `shared/ui/` — lista real dos wrappers, `ModulePage`, `CrudDialog`, `AppearanceControls`. Remover `AppTable/`.
- `shared/api/` — `coursesApi.ts`, `createCrudResource.ts`, `crud.ts`.
- `features/<x>/components/<Entidade>/` como padrão de sub-pasta.
- Nota: `features/identity` cobre auth **e** redator, espelhando `Domains/Identity` do backend. A sessão foi extraída para `shared` por ser infra.

- [ ] **Step 2: Registrar as regras novas**

Acrescentar às "Regras do frontend (acionáveis)":

```markdown
- **`style.ts` no wrapper quando houver variante nomeada ou customização de tema.**
  Não é cerimônia: wrapper sem customização não ganha `style.ts`.
- **Cor que acompanha o tema usa CSS var do Lara** (`--surface-section`, `--surface-card`,
  `--surface-border`), não par `bg-white dark:bg-slate-800` (ADR-16).
- **Um `export * from './X'` por pasta** no barrel `shared/ui/index.ts`. Nunca caminho fundo.
- **Sub-pasta por entidade** em `components/` quando a entidade passa de ~3 arquivos.
- **Vocabulário de domínio é o do backend.** `Redator`, não `Writer`. Nome de tela pode ser
  em inglês (`PeoplePage`); a rota fica em espanhol (`/personas`), é interface de usuário.
- **`can()` é conveniência de interface, não segurança.** A autorização é da API (ADR-07).
```

- [ ] **Step 3: Marcar o ADR-16 como resolvido**

Em `CLAUDE.md`, seção 8, a lista "Pendências abertas" cita "ADR-16 do Tailwind". Remover esse item (o ADR foi escrito na Task 1). Manter os outros dois (i18n ADR-15, pruning da auditoria ADR-08).

- [ ] **Step 4: Commit**

```bash
git add docs/ CLAUDE.md INSTRUÇÕES-DO-PROJETO.md
git commit -m "docs: estrutura real do frontend pos-refatoracao; ADR-16 resolvido"
```

---

## Definition of Done

- [ ] `pnpm build` e `pnpm lint` limpos.
- [ ] `grep -rn "@features/\|@app/" frontend/src/shared/` não retorna nada.
- [ ] `grep -rn "from 'primereact" frontend/src/features/` não retorna nada.
- [ ] Toggle de tema escurece **a tabela, o dropdown e o dialog**, não só o chrome. Recarregar mantém o tema, sem flash.
- [ ] `/comercial` e `/personas` renderizam idênticos ao estado pré-refatoração, e as verificações do plano de correções continuam passando (documento reflete no dialog; erro de contato em branco aparece; endereços preservados).
- [ ] Botão "Editar" está no **footer** do dialog, nos dois módulos.
- [ ] Trocar o idioma no Header traduz `/comercial` e `/personas` por completo, incluindo tipos de cliente, tipos de documento, status e idoneidade. Nenhuma chave crua visível.
- [ ] `docs/adrs.md` tem o ADR-16; `docs/estrutura-monolito.md` descreve a árvore real.

## Fora de escopo (registrado, não feito)

- **Dialog data-driven por descritor de campos (`FieldSpec<T>` + `EntityForm`).** Adiado por decisão do dono. Regra de corte quando voltar: se mais de ~30% do dialog vira escape hatch, o motor não paga. Reavaliar quando existir uma terceira entidade de cadastro.
- **`download_url` presignada de 10 min** embutida no DTO e cacheada pelo TanStack Query: expira com a tela aberta. Correção estrutural = rota `GET /api/redatores/{r}/documents/{d}/download` que assina no clique e redireciona. É backend.
- **Coluna `Documentos`** (pior status agregado) na tabela de redator, prevista na spec §5.3.
- **Rotas nested sem checagem de posse** (`addresses/{address}`, `contacts/{contact}`, `templates/{template}`).
- Test runner de frontend. Enquanto não existir, "verificação manual no navegador" é o gate real — e foi ele que pegou os três bugs que build, lint e 12 reviews de código não pegaram.
