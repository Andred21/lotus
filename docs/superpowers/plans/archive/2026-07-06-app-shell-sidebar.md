# App Shell + Sidebar RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o shell da aplicação (sidebar + header) que envolve todos os módulos autenticados, com navegação lateral filtrada por RBAC e toggle de tema claro/escuro persistido.

**Architecture:** Shell vive em `app/` (orquestra navegação cross-feature). A sidebar renderiza itens custom (`NavLink` + Tailwind) filtrados por permissão do `sessionStore`. Estado de UI (colapso + tema) num `uiStore` Zustand persistido. Wrappers PrimeReact (`AppAvatar`, `AppMenu`, `AppDivider`) em `shared/ui`. Rotas autenticadas passam a viver sob uma rota-layout com `<Outlet/>`.

**Tech Stack:** React 19 + TypeScript, Vite, react-router-dom v7, Zustand v5 (+ persist), PrimeReact 10 (via wrappers), Tailwind v4, primeicons.

## Global Constraints

- Features/shell importam PrimeReact **somente via `shared/ui`** (ADR-05). Nav items custom são exceção deliberada (react-router + Tailwind, sem componente PrimeReact).
- Dependência aponta só para baixo: `app/` → `features/` → `shared/`. Nunca o inverso.
- Cor da marca: `#25A5E4` (usar como valor arbitrário Tailwind `bg-[#25A5E4]` / `text-[#25A5E4]`; NÃO reformar tema PrimeReact — ADR-16 aberto).
- Aliases: `@` → `src`, `@app` → `src/app`, `@shared` → `src/shared`, `@features` → `src/features`.
- Auth: só `admin`/`redator` logam; `permissions[]` e `roles[]` vêm de `sessionStore.user` (DTO `SessionUserData` gerado — ADR-04).
- **Sem test runner de frontend** (CLAUDE.md §7). Verificação de cada task = `pnpm build` (type-check `tsc -b`) + `pnpm lint` limpos + critério comportamental manual explícito.
- Dark mode = **layout-only**: alterna classe `.dark` no `<html>`, Tailwind `dark:` responde. Swap do tema PrimeReact (lara-light↔lara-dark) é follow-up documentado, fora de escopo.
- i18n = **stub visual** (botão idioma não funcional; lib é ADR-15, não decidir).
- Commits frequentes, um por task. Idioma dos commits segue o repo (pt-br, conventional commits).

---

### Task 1: UI store (Zustand + persist)

**Files:**
- Create: `frontend/src/app/stores/uiStore.ts`

**Interfaces:**
- Produces: `useUiStore` com estado `{ sidebarCollapsed: boolean, theme: 'light'|'dark' }` e ações `toggleSidebar()`, `toggleTheme()`, `setTheme(theme)`. Tipo exportado `Theme = 'light' | 'dark'`.

- [ ] **Step 1: Criar o store**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface UiState {
  sidebarCollapsed: boolean
  theme: Theme
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/**
 * Estado de UI do shell (colapso da sidebar + tema). Persistido em
 * localStorage para sobreviver a reloads. NÃO guarda dados de sessão
 * (isso é do sessionStore).
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'light',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'lotus-ui' },
  ),
)
```

- [ ] **Step 2: Verificar build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: sem erros de tipo nem lint.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/stores/uiStore.ts
git commit -m "feat(app): uiStore (Zustand persist) — colapso da sidebar + tema"
```

---

### Task 2: Hook de permissões

**Files:**
- Create: `frontend/src/features/identity/hooks/usePermissions.ts`

**Interfaces:**
- Consumes: `useSessionStore` (`s.user?.permissions`, `s.user?.roles`).
- Produces: `usePermissions()` → `{ can(permission: string): boolean, hasRole(role: string): boolean, roles: string[] }`.

- [ ] **Step 1: Criar o hook**

```ts
import { useSessionStore } from '../stores/sessionStore'

/**
 * Deriva o RBAC efetivo da sessão. `can` checa permissão pontual;
 * `hasRole` checa role. Fonte = SessionUserData (roles[]/permissions[]).
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

- [ ] **Step 2: Verificar build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/identity/hooks/usePermissions.ts
git commit -m "feat(identity): hook usePermissions (can/hasRole do sessionStore)"
```

---

### Task 3: Wrappers shared/ui (AppAvatar, AppMenu, AppDivider)

**Files:**
- Create: `frontend/src/shared/ui/AppAvatar/AppAvatar.tsx`
- Create: `frontend/src/shared/ui/AppMenu/AppMenu.tsx`
- Create: `frontend/src/shared/ui/AppDivider/AppDivider.tsx`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Produces:
  - `AppAvatar({ name: string, image?: string, ...AvatarProps })` — mostra `image` se houver, senão iniciais de `name`.
  - `AppMenu` = `forwardRef<Menu, MenuProps>` já com `popup`. Consumidores usam `ref.current?.toggle(event)`.
  - `AppDivider(props: DividerProps)`.

- [ ] **Step 1: AppAvatar**

```tsx
import { Avatar } from 'primereact/avatar'
import type { AvatarProps } from 'primereact/avatar'

/** Iniciais: 1ª letra do primeiro + 1ª do último nome (ou 2 letras se nome único). */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export interface AppAvatarProps extends Omit<AvatarProps, 'label' | 'image'> {
  name: string
  image?: string
}

export function AppAvatar({ name, image, ...props }: AppAvatarProps) {
  if (image) {
    return <Avatar image={image} shape="circle" {...props} />
  }
  return (
    <Avatar
      label={initialsFromName(name)}
      shape="circle"
      style={{ backgroundColor: '#25A5E4', color: '#fff' }}
      {...props}
    />
  )
}
```

- [ ] **Step 2: AppMenu**

```tsx
import { forwardRef } from 'react'
import { Menu } from 'primereact/menu'
import type { MenuProps } from 'primereact/menu'

/** Menu popup do PrimeReact. Use ref.current?.toggle(event) para abrir. */
export const AppMenu = forwardRef<Menu, MenuProps>((props, ref) => (
  <Menu ref={ref} popup {...props} />
))
AppMenu.displayName = 'AppMenu'
```

- [ ] **Step 3: AppDivider**

```tsx
import { Divider } from 'primereact/divider'
import type { DividerProps } from 'primereact/divider'

export function AppDivider(props: DividerProps) {
  return <Divider {...props} />
}
```

- [ ] **Step 4: Atualizar o barrel**

Substituir o conteúdo de `frontend/src/shared/ui/index.ts` por:

```ts
export { AppButton } from './AppButton/AppButton'
export * from './AppInputText'
export * from './AppPassword'
export { AppAvatar } from './AppAvatar/AppAvatar'
export type { AppAvatarProps } from './AppAvatar/AppAvatar'
export { AppMenu } from './AppMenu/AppMenu'
export { AppDivider } from './AppDivider/AppDivider'
```

- [ ] **Step 5: Verificar build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/
git commit -m "feat(ui): wrappers AppAvatar, AppMenu, AppDivider + barrel"
```

---

### Task 4: Config de navegação (RBAC-driven)

**Files:**
- Create: `frontend/src/app/config/navigation.ts`

**Interfaces:**
- Produces: `NAV_MODULES: NavModule[]` e o tipo `NavModule = { key, label, icon, path, permission? }`.

- [ ] **Step 1: Criar a config**

```ts
export interface NavModule {
  key: string
  label: string
  icon: string // classe primeicons, ex.: "pi pi-book"
  path: string
  /** Permissão exigida para exibir. undefined = sempre visível. */
  permission?: string
}

/**
 * Módulos do menu lateral. Mapeamento módulo → permissão bate com o
 * RolePermissionSeeder (backend). Ícones são aproximações primeicons;
 * ajustar para casar 100% com o Figma é cosmético.
 */
export const NAV_MODULES: NavModule[] = [
  { key: 'dashboard',      label: 'Dashboard',      icon: 'pi pi-objects-column', path: '/' },
  { key: 'comercial',      label: 'Comercial',      icon: 'pi pi-file',           path: '/comercial',      permission: 'commercial.quote.view' },
  { key: 'operacion',      label: 'Operación',      icon: 'pi pi-briefcase',      path: '/operacion',      permission: 'operation.turma.view' },
  { key: 'cursos',         label: 'Cursos',         icon: 'pi pi-book',           path: '/cursos',         permission: 'catalog.course.view' },
  { key: 'certificados',   label: 'Certificados',   icon: 'pi pi-verified',       path: '/certificados',   permission: 'certification.certificate.view' },
  { key: 'personas',       label: 'Personas',       icon: 'pi pi-id-card',        path: '/personas',       permission: 'identity.user.view' },
  { key: 'administracion', label: 'Administración', icon: 'pi pi-cog',            path: '/administracion', permission: 'identity.access.manage' },
]
```

- [ ] **Step 2: Verificar build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/config/navigation.ts
git commit -m "feat(app): config de navegação dos módulos (RBAC-driven)"
```

---

### Task 5: Sidebar + SidebarItem

**Files:**
- Create: `frontend/src/app/layouts/Sidebar/SidebarItem.tsx`
- Create: `frontend/src/app/layouts/Sidebar/Sidebar.tsx`

**Interfaces:**
- Consumes: `NAV_MODULES`/`NavModule` (Task 4), `usePermissions` (Task 2), `useUiStore` (Task 1), `useSessionStore`, `APP_VERSION` (`@shared/config/brand`), `@/assets/Logo.png`.
- Produces: `Sidebar` (default export nomeado `Sidebar`) usado pelo `AppLayout` (Task 7).

- [ ] **Step 1: SidebarItem**

```tsx
import { NavLink } from 'react-router-dom'
import type { NavModule } from '@app/config/navigation'

interface Props {
  module: NavModule
  collapsed: boolean
}

/** Item de nav custom (NavLink) — estado ativo via router, sem PrimeReact. */
export function SidebarItem({ module, collapsed }: Props) {
  return (
    <NavLink
      to={module.path}
      end={module.path === '/'}
      title={collapsed ? module.label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-[#25A5E4] text-white'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          collapsed ? 'justify-center' : '',
        ].join(' ')
      }
    >
      <i className={module.icon} />
      {!collapsed && <span>{module.label}</span>}
    </NavLink>
  )
}
```

- [ ] **Step 2: Sidebar**

```tsx
import { useUiStore } from '@app/stores/uiStore'
import { useSessionStore } from '@features/identity/stores/sessionStore'
import { usePermissions } from '@features/identity/hooks/usePermissions'
import { NAV_MODULES } from '@app/config/navigation'
import { APP_VERSION } from '@shared/config/brand'
import { SidebarItem } from './SidebarItem'
import logo from '@/assets/Logo.png'

/** Label da seção conforme a role predominante. */
function roleLabel(roles: string[]): string {
  if (roles.includes('superadmin') || roles.includes('admin')) return 'ADMINISTRADOR'
  if (roles.includes('redator')) return 'REDACTOR'
  return ''
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const roles = useSessionStore((s) => s.user?.roles ?? [])
  const { can } = usePermissions()

  const modules = NAV_MODULES.filter((m) => !m.permission || can(m.permission))

  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-64'} flex h-screen flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900`}
    >
      <div className="flex items-center justify-between px-4 py-5">
        {!collapsed && <img src={logo} alt="Lotus" className="h-8 w-auto" />}
        <button
          onClick={toggle}
          aria-label="Alternar menu"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <i className={`pi ${collapsed ? 'pi-angle-right' : 'pi-angle-left'}`} />
        </button>
      </div>

      {!collapsed && (
        <p className="px-4 pb-2 text-xs font-semibold tracking-wider text-slate-400">
          {roleLabel(roles)}
        </p>
      )}

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {modules.map((m) => (
          <SidebarItem key={m.key} module={m} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && <div className="px-4 py-3 text-xs text-slate-400">{APP_VERSION}</div>}
    </aside>
  )
}
```

- [ ] **Step 3: Verificar build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layouts/Sidebar/
git commit -m "feat(app): Sidebar RBAC-driven + colapso (task 2.3.5)"
```

---

### Task 6: Header + UserMenu

**Files:**
- Create: `frontend/src/app/layouts/Header/UserMenu.tsx`
- Create: `frontend/src/app/layouts/Header/Header.tsx`

**Interfaces:**
- Consumes: `AppAvatar`, `AppMenu`, `AppDivider` (`@shared/ui`), `useUiStore` (Task 1), `useSessionStore`, `useLogout`, `NAV_MODULES` (Task 4).
- Produces: `Header` usado pelo `AppLayout` (Task 7).

- [ ] **Step 1: UserMenu**

```tsx
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu } from 'primereact/menu'
import type { MenuItem } from 'primereact/menuitem'
import { AppAvatar, AppMenu } from '@shared/ui'
import { useSessionStore } from '@features/identity/stores/sessionStore'
import { useLogout } from '@features/identity/api/useLogout'

/** Capitaliza a primeira role para exibição (ex.: superadmin → SuperAdmin). */
function displayRole(roles: string[]): string {
  const r = roles[0]
  if (!r) return ''
  if (r === 'superadmin') return 'SuperAdmin'
  return r.charAt(0).toUpperCase() + r.slice(1)
}

export function UserMenu() {
  const user = useSessionStore((s) => s.user)
  const logout = useLogout()
  const navigate = useNavigate()
  const menuRef = useRef<Menu>(null)

  if (!user) return null

  const items: MenuItem[] = [
    { label: 'Mi perfil', icon: 'pi pi-user', command: () => navigate('/perfil') },
    { separator: true },
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () =>
        logout.mutate(undefined, {
          onSuccess: () => navigate('/login', { replace: true }),
        }),
    },
  ]

  return (
    <div className="flex items-center gap-2">
      <AppAvatar name={user.name} />
      <div className="hidden text-left leading-tight sm:block">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
        <p className="text-xs text-[#25A5E4]">{displayRole(user.roles)}</p>
      </div>
      <button
        onClick={(e) => menuRef.current?.toggle(e)}
        aria-label="Abrir menu do usuário"
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <i className="pi pi-angle-down" />
      </button>
      <AppMenu ref={menuRef} model={items} />
    </div>
  )
}
```

- [ ] **Step 2: Header**

```tsx
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AppDivider } from '@shared/ui'
import { useUiStore } from '@app/stores/uiStore'
import { NAV_MODULES } from '@app/config/navigation'
import { UserMenu } from './UserMenu'

function pageTitle(pathname: string): string {
  return NAV_MODULES.find((m) => m.path === pathname)?.label ?? 'Dashboard'
}

export function Header() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const { pathname } = useLocation()

  // Relógio ao vivo (HH:MM) — atualiza a cada minuto.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {pageTitle(pathname)}
      </h1>

      <div className="flex items-center gap-4">
        {/* Idioma — stub visual (i18n = ADR-15, lib ainda não decidida) */}
        <button
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          title="Idioma (em breve)"
        >
          <i className="pi pi-globe" /> EN
        </button>

        <button
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <i className={`pi ${theme === 'dark' ? 'pi-sun' : 'pi-moon'}`} />
        </button>

        <AppDivider layout="vertical" className="!mx-0 h-6" />

        <div className="hidden text-right text-xs leading-tight text-slate-500 md:block">
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p>{now.toLocaleDateString('es-CL')}</p>
        </div>

        <UserMenu />
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Verificar build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layouts/Header/
git commit -m "feat(app): Header + UserMenu (idioma/tema stub, dropdown, logout)"
```

---

### Task 7: AppLayout + variante dark do Tailwind

**Files:**
- Create: `frontend/src/app/layouts/AppLayout.tsx`
- Modify: `frontend/src/index.css` (adicionar a variante `dark` de classe)

**Interfaces:**
- Consumes: `Sidebar` (Task 5), `Header` (Task 6), `useUiStore` (Task 1), `Outlet` (react-router).
- Produces: `AppLayout` usado pelo router (Task 8).

- [ ] **Step 1: Habilitar dark por classe no Tailwind v4**

No topo de `frontend/src/index.css`, logo após a linha `@layer theme, base, components, utilities;`, adicionar:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Isso faz os utilitários `dark:` responderem à classe `.dark` no `<html>` (em vez de `prefers-color-scheme`).

- [ ] **Step 2: AppLayout**

```tsx
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar/Sidebar'
import { Header } from './Header/Header'
import { useUiStore } from '@app/stores/uiStore'

export function AppLayout() {
  const theme = useUiStore((s) => s.theme)

  // Aplica o tema no <html> — Tailwind dark: e (futuro) tema PrimeReact leem daqui.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layouts/AppLayout.tsx frontend/src/index.css
git commit -m "feat(app): AppLayout (shell) + variante dark do Tailwind (task 2.4.1)"
```

---

### Task 8: Rewire do router + páginas placeholder + migração do logout

**Files:**
- Create: `frontend/src/app/pages/DashboardPage.tsx`
- Create: `frontend/src/app/pages/ModulePlaceholder.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx`
- Delete: `frontend/src/app/HomePage.tsx`

**Interfaces:**
- Consumes: `AppLayout` (Task 7), `ProtectedRoute`, `LoginPage`, `useSessionStore`.
- Produces: rotas autenticadas sob a rota-layout; `DashboardPage` (index) e `ModulePlaceholder` (demais módulos + `/perfil`).

- [ ] **Step 1: DashboardPage (substitui a HomePage)**

```tsx
import { useSessionStore } from '@features/identity/stores/sessionStore'

/** Placeholder da dashboard (conteúdo real é task futura). O logout saiu
 * daqui e foi para o UserMenu do header. */
export function DashboardPage() {
  const user = useSessionStore((s) => s.user)
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        Bienvenido, {user?.name}
      </h2>
      <p className="mt-1 text-sm text-slate-500">Panel en construcción.</p>
    </div>
  )
}
```

- [ ] **Step 2: ModulePlaceholder**

```tsx
/** Stand-in para módulos ainda não implementados; mantém a nav clicável. */
export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">Módulo en construcción.</p>
    </div>
  )
}
```

- [ ] **Step 3: Rewire do AppRouter**

Substituir o conteúdo de `frontend/src/app/router/AppRouter.tsx` por:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSessionStore } from '@features/identity/stores/sessionStore'
import { LoginPage } from '@features/identity/components/LoginPage'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@app/layouts/AppLayout'
import { DashboardPage } from '@app/pages/DashboardPage'
import { ModulePlaceholder } from '@app/pages/ModulePlaceholder'

function LoginRoute() {
  const status = useSessionStore((s) => s.status)
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <LoginPage />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/comercial" element={<ModulePlaceholder title="Comercial" />} />
          <Route path="/operacion" element={<ModulePlaceholder title="Operación" />} />
          <Route path="/cursos" element={<ModulePlaceholder title="Cursos" />} />
          <Route path="/certificados" element={<ModulePlaceholder title="Certificados" />} />
          <Route path="/personas" element={<ModulePlaceholder title="Personas" />} />
          <Route path="/administracion" element={<ModulePlaceholder title="Administración" />} />
          <Route path="/perfil" element={<ModulePlaceholder title="Mi perfil" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Deletar a HomePage antiga**

```bash
git rm frontend/src/app/HomePage.tsx
```

- [ ] **Step 5: Verificar build + lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: sem erros. Confirmar que nada mais importa `HomePage` (o build falharia se importasse).

- [ ] **Step 6: Verificação comportamental manual (critério de aceite do shell)**

Run: `cd frontend && pnpm dev` e no browser (http://localhost:5173):
- Login como superadmin → cai em `/` dentro do shell; sidebar mostra os **7 módulos**.
- Login como redator → sidebar mostra só **Dashboard + Operación**.
- Clicar num módulo → título do header muda; item fica ativo (azul da marca).
- Botão de colapso encolhe a sidebar (só ícones) e persiste após reload.
- Toggle de tema escurece o layout (sidebar/header/fundo) e persiste após reload.
- Seta do usuário abre dropdown; *Cerrar sesión* encerra e volta pro `/login`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/pages/ frontend/src/app/router/AppRouter.tsx
git commit -m "feat(app): rota-layout do shell + placeholders + logout no header"
```

---

## Notas de escopo (fora deste plano, documentado)

- **Swap do tema PrimeReact** (lara-light↔lara-dark): componentes PrimeReact não escurecem por dentro ainda — só o layout Tailwind. Follow-up quando ADR-16 fechar.
- **i18n**: botão de idioma é stub. Lib pendente (ADR-15).
- **Páginas dos módulos** (Comercial, Operación, etc.): placeholders. Cada uma é sua própria task/feature.
- **Página de perfil** (`/perfil`): placeholder; página real é task futura.
- **Foto do avatar**: `SessionUserData` não expõe `avatar_url` hoje — só iniciais. Quando o backend expuser, passar `image` ao `AppAvatar`.
