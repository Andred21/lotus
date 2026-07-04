# Fluxo de Login + Store de Sessão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo de autenticação do frontend (tela de login fiel ao Figma, store de sessão, hooks de auth, hidratação no boot e guard de rota), sobre o contrato de tipo correto gerado do backend.

**Architecture:** Zustand é a fonte de verdade da sessão; hooks TanStack Query (`useLogin`/`useLogout`/`useMe`) fazem as idas ao servidor e escrevem no store no `onSuccess`. No boot, `GET /api/me` hidrata o store (fonte de verdade = cookie Sanctum, nada em localStorage). Guard distingue autenticado vs não.

**Tech Stack:** Laravel 13 + spatie/laravel-data + typescript-transformer (backend) · React 19 + TypeScript (Vite) · TanStack Query · Zustand · react-router-dom v7 · PrimeReact via wrappers `shared/ui`.

**Spec:** `docs/superpowers/specs/2026-07-04-login-flow-session-design.md`

## Global Constraints

- **Sem test runner no frontend.** O "ciclo de teste" de cada task de front é `pnpm build` (type-check tsc via `tsc -b && vite build`) + verificação manual. TDD com phpunit só no backend (sqlite `:memory:`).
- **Features nunca importam `primereact/*` direto** — só via `@shared/ui`. `AppButton` já existe como referência de padrão.
- **`shared/types/generated.ts` NÃO se edita à mão** — é gerado por `php artisan typescript:transform`.
- **Auth = cookie Sanctum + CSRF.** `initCsrf()` antes da primeira mutação. Nunca token/localStorage.
- **Controllers deixam exceções subirem** — o handler global (`ProblemDetails`) formata. Não montar erro à mão.
- **`verbatimModuleSyntax: true`** no tsconfig → imports só-de-tipo usam `import type`.
- **Cor de marca:** `#25A5E4`. Locale do texto: `es_CL` (estático).
- **Aliases:** `@` = `src/`, `@app`, `@shared`, `@features` (em `vite.config.ts` e `tsconfig.app.json`).
- **Elementos idioma/dark/esqueci-senha:** só visuais (stubs), sem ação.
- Commits frequentes, um por task.

---

### Task 1: Backend — `SessionUserData` DTO, AuthController, fixtures e teste

Fecha o contrato de tipo (decisão D1) e as fixtures necessárias para o teste e a verificação manual. A `UserFactory` atual está quebrada para o schema real (seta `email_verified_at`, coluna inexistente; não seta `type`) — corrigida aqui.

**Files:**
- Create: `backend/app/Data/SessionUserData.php`
- Create: `backend/tests/Feature/Identity/AuthTest.php`
- Modify: `backend/app/Domains/Identity/Http/Controllers/AuthController.php`
- Modify: `backend/database/factories/UserFactory.php`
- Modify: `backend/database/seeders/DatabaseSeeder.php`
- Regenera: `frontend/src/shared/types/generated.ts` (via artisan)

**Interfaces:**
- Produces (TS gerado): `export type SessionUserData = { id: number, uuid: string, name: string, email: string, type: string, is_active: boolean }`
- Produces (backend): `POST /api/login`, `GET /api/me` retornam `SessionUserData`; credencial inválida → 422; inativo → 422 com `auth.inactive`.
- Produces (seed): usuário `admin@lotus.cl` / senha `senha123`, `type=admin`, `is_active=true`.

- [ ] **Step 1: Corrigir a `UserFactory` para o schema real**

`backend/database/factories/UserFactory.php` — substituir `definition()` e trocar o state `unverified()` por `inactive()`:

```php
public function definition(): array
{
    return [
        'name' => fake()->name(),
        'email' => fake()->unique()->safeEmail(),
        'password' => static::$password ??= Hash::make('password'),
        'type' => 'admin',
        'is_active' => true,
        'remember_token' => Str::random(10),
    ];
}

public function inactive(): static
{
    return $this->state(fn (array $attributes) => [
        'is_active' => false,
    ]);
}

public function redator(): static
{
    return $this->state(fn (array $attributes) => [
        'type' => 'redator',
    ]);
}
```

Remover o método `unverified()` (a coluna `email_verified_at` não existe nesta migration).

- [ ] **Step 2: Criar o DTO `SessionUserData`**

`backend/app/Data/SessionUserData.php`:

```php
<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript]
class SessionUserData extends Data
{
    public function __construct(
        public int $id,
        public string $uuid,
        public string $name,
        public string $email,
        public string $type,
        public bool $is_active,
    ) {}
}
```

(Os nomes das propriedades espelham as colunas do `User`, então `SessionUserData::from($user)` mapeia automaticamente.)

- [ ] **Step 3: AuthController passa a retornar o DTO**

`backend/app/Domains/Identity/Http/Controllers/AuthController.php` — remover o método privado `userPayload()` e usar o DTO. `login()` e `me()` retornam `SessionUserData::from($user)` (Data é `Responsable`, serializa em 200). Adicionar `use App\Data\SessionUserData;`:

```php
// no topo
use App\Data\SessionUserData;

// login(): trocar o return final
return SessionUserData::from($user);

// me(): corpo inteiro
public function me(Request $request): SessionUserData
{
    return SessionUserData::from($request->user());
}
```

`login()` continua com a validação, `Auth::attempt`, `session()->regenerate()` e o bloqueio de inativo já existentes — só o `return` final muda. `logout()` fica igual.

- [ ] **Step 4: Seed do admin de verificação**

`backend/database/seeders/DatabaseSeeder.php` — substituir o `run()`:

```php
public function run(): void
{
    User::factory()->create([
        'name'      => 'Admin Lotus',
        'email'     => 'admin@lotus.cl',
        'password'  => Hash::make('senha123'),
        'type'      => 'admin',
        'is_active' => true,
    ]);
}
```

Adicionar `use Illuminate\Support\Facades\Hash;` no topo.

- [ ] **Step 5: Escrever o teste (que falha)**

`backend/tests/Feature/Identity/AuthTest.php`:

```php
<?php

namespace Tests\Feature\Identity;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_ok_retorna_session_user(): void
    {
        $user = User::factory()->create([
            'email'     => 'admin@lotus.cl',
            'password'  => Hash::make('senha123'),
            'type'      => 'admin',
            'is_active' => true,
        ]);

        $this->postJson('/api/login', [
            'email'    => 'admin@lotus.cl',
            'password' => 'senha123',
        ])
            ->assertOk()
            ->assertJsonStructure(['id', 'uuid', 'name', 'email', 'type', 'is_active'])
            ->assertJson([
                'id'        => $user->id,
                'email'     => 'admin@lotus.cl',
                'type'      => 'admin',
                'is_active' => true,
            ]);
    }

    public function test_credencial_errada_retorna_422(): void
    {
        User::factory()->create([
            'email'    => 'admin@lotus.cl',
            'password' => Hash::make('senha123'),
        ]);

        $this->postJson('/api/login', [
            'email'    => 'admin@lotus.cl',
            'password' => 'errada',
        ])->assertStatus(422);
    }

    public function test_usuario_inativo_bloqueado(): void
    {
        User::factory()->inactive()->create([
            'email'    => 'inativo@lotus.cl',
            'password' => Hash::make('senha123'),
        ]);

        $this->postJson('/api/login', [
            'email'    => 'inativo@lotus.cl',
            'password' => 'senha123',
        ])->assertStatus(422);
    }
}
```

- [ ] **Step 6: Rodar o teste e ver falhar**

Run (de `backend/`, no container ou PHP local): `php artisan test --filter=AuthTest`
Expected: falha inicial se o DTO/factory ainda não estiverem aplicados (ex.: coluna `type` faltando, ou shape errado). Após Steps 1–4, deve **passar**.

- [ ] **Step 7: Rodar e ver passar**

Run: `php artisan test --filter=AuthTest`
Expected: 3 passed.

- [ ] **Step 8: Regenerar os tipos TS**

Run: `php artisan typescript:transform`
Expected: `frontend/src/shared/types/generated.ts` passa a conter `export type SessionUserData = { id: number, uuid: string, name: string, email: string, type: string, is_active: boolean };` (além do `UserData` existente).

- [ ] **Step 9: Commit**

```bash
git add backend/app/Data/SessionUserData.php \
        backend/app/Domains/Identity/Http/Controllers/AuthController.php \
        backend/database/factories/UserFactory.php \
        backend/database/seeders/DatabaseSeeder.php \
        backend/tests/Feature/Identity/AuthTest.php \
        frontend/src/shared/types/generated.ts
git commit -m "feat(identity): SessionUserData DTO + fixtures e teste de auth"
```

---

### Task 2: Tipo de sessão + `sessionStore` (Zustand)

**Files:**
- Create: `frontend/src/features/identity/types.ts`
- Create: `frontend/src/features/identity/stores/sessionStore.ts`

**Interfaces:**
- Consumes: `SessionUserData` de `@shared/types/generated` (Task 1).
- Produces: `type SessionUser = SessionUserData`; `useSessionStore` com `{ user: SessionUser | null, status: 'loading' | 'authenticated' | 'unauthenticated', setUser(u: SessionUser): void, clear(): void }`.

- [ ] **Step 1: Alias do tipo de sessão**

`frontend/src/features/identity/types.ts`:

```ts
import type { SessionUserData } from '@shared/types/generated'

// Fonte do tipo = DTO gerado do backend (ADR-04). Alias local para uso na feature.
export type SessionUser = SessionUserData
```

- [ ] **Step 2: Store de sessão**

`frontend/src/features/identity/stores/sessionStore.ts`:

```ts
import { create } from 'zustand'
import type { SessionUser } from '../types'

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface SessionState {
  user: SessionUser | null
  status: SessionStatus
  setUser: (user: SessionUser) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: 'loading', // até o boot resolver via GET /api/me
  setUser: (user) => set({ user, status: 'authenticated' }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}))
```

- [ ] **Step 3: Type-check**

Run (de `frontend/`): `pnpm build`
Expected: build passa (tsc sem erros).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/identity/types.ts \
        frontend/src/features/identity/stores/sessionStore.ts
git commit -m "feat(identity): tipo SessionUser + sessionStore (zustand)"
```

---

### Task 3: `authApi` + hooks TanStack Query

**Files:**
- Create: `frontend/src/features/identity/api/authApi.ts`
- Create: `frontend/src/features/identity/api/useLogin.ts`
- Create: `frontend/src/features/identity/api/useLogout.ts`
- Create: `frontend/src/features/identity/api/useMe.ts`

**Interfaces:**
- Consumes: `api` e `ProblemDetails` de `@shared/api/axios`; `initCsrf` de `@shared/api/csrf`; `useSessionStore` (Task 2); `SessionUser` (Task 2).
- Produces:
  - `authApi.login(email, password): Promise<SessionUser>`
  - `authApi.logout(): Promise<void>`
  - `authApi.fetchMe(): Promise<SessionUser>`
  - `useLogin()` → mutation `{ mutate/mutateAsync({ email, password }), isPending, error: ProblemDetails | null }`
  - `useLogout()` → mutation
  - `useMe()` → query `['me']`

- [ ] **Step 1: Funções cruas de API**

`frontend/src/features/identity/api/authApi.ts`:

```ts
import { api } from '@shared/api/axios'
import { initCsrf } from '@shared/api/csrf'
import type { SessionUser } from '../types'

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
```

- [ ] **Step 2: `useLogin`**

`frontend/src/features/identity/api/useLogin.ts`:

```ts
import { useMutation } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useSessionStore } from '../stores/sessionStore'
import { login } from './authApi'

interface LoginVars {
  email: string
  password: string
}

export function useLogin() {
  const setUser = useSessionStore((s) => s.setUser)

  return useMutation<Awaited<ReturnType<typeof login>>, ProblemDetails, LoginVars>({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: (user) => setUser(user),
  })
}
```

- [ ] **Step 3: `useLogout`**

`frontend/src/features/identity/api/useLogout.ts`:

```ts
import { useMutation } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useSessionStore } from '../stores/sessionStore'
import { logout } from './authApi'

export function useLogout() {
  const clear = useSessionStore((s) => s.clear)

  return useMutation<void, ProblemDetails, void>({
    mutationFn: () => logout(),
    onSuccess: () => clear(),
  })
}
```

- [ ] **Step 4: `useMe`**

`frontend/src/features/identity/api/useMe.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchMe } from './authApi'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,       // 401 no boot = deslogado, não re-tentar
    staleTime: Infinity,
  })
}
```

- [ ] **Step 5: Type-check**

Run: `pnpm build`
Expected: build passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/api/
git commit -m "feat(identity): authApi + hooks useLogin/useLogout/useMe"
```

---

### Task 4: `AppProviders` (QueryClient) + config de marca

**Files:**
- Create: `frontend/src/app/providers/AppProviders.tsx`
- Create: `frontend/src/shared/config/brand.ts`

**Interfaces:**
- Produces: `<AppProviders>` (envolve a app com `QueryClientProvider`); `BRAND_COLOR` (`'#25A5E4'`).

- [ ] **Step 1: Constante de marca**

`frontend/src/shared/config/brand.ts`:

```ts
// Cor primária do produto. Aplicada em layout (gradiente/botão), sem reformar
// o tema PrimeReact (ADR-16 ainda aberto).
export const BRAND_COLOR = '#25A5E4'
export const APP_VERSION = 'v0.1.0'
```

- [ ] **Step 2: Providers**

`frontend/src/app/providers/AppProviders.tsx`:

```tsx
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: false },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm build`
Expected: build passa.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/providers/AppProviders.tsx \
        frontend/src/shared/config/brand.ts
git commit -m "feat(app): AppProviders (QueryClient) + config de marca"
```

---

### Task 5: Wrappers `shared/ui` — `AppInputText`, `AppPassword`, barrel

**Files:**
- Create: `frontend/src/shared/ui/AppInputText/AppInputText.tsx`
- Create: `frontend/src/shared/ui/AppInputText/index.ts`
- Create: `frontend/src/shared/ui/AppPassword/AppPassword.tsx`
- Create: `frontend/src/shared/ui/AppPassword/index.ts`
- Create: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Produces:
  - `AppInputText` — props = `InputTextProps & { leftIcon?: string }` (classe primeicon, ex.: `'pi pi-envelope'`)
  - `AppPassword` — props = `PasswordProps` (já com `toggleMask` e `feedback={false}` por padrão; aceita `leftIcon?: string`)
  - Barrel `@shared/ui` reexporta `AppButton`, `AppInputText`, `AppPassword`.

- [ ] **Step 1: `AppInputText` (com ícone à esquerda)**

`frontend/src/shared/ui/AppInputText/AppInputText.tsx`:

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

export const AppInputText = forwardRef<HTMLInputElement, AppInputTextProps>(
  ({ leftIcon, ...props }, ref) => {
    if (!leftIcon) {
      return <InputText ref={ref} {...props} />
    }
    return (
      <IconField iconPosition="left">
        <InputIcon className={leftIcon} />
        <InputText ref={ref} {...props} />
      </IconField>
    )
  },
)
AppInputText.displayName = 'AppInputText'
```

`frontend/src/shared/ui/AppInputText/index.ts`:

```ts
export { AppInputText } from './AppInputText'
export type { AppInputTextProps } from './AppInputText'
```

- [ ] **Step 2: `AppPassword` (olho + cadeado)**

`frontend/src/shared/ui/AppPassword/AppPassword.tsx`:

```tsx
import { forwardRef } from 'react'
import { Password } from 'primereact/password'
import type { PasswordProps } from 'primereact/password'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'

export interface AppPasswordProps extends PasswordProps {
  /** Classe de ícone primeicons à esquerda, ex.: "pi pi-lock". */
  leftIcon?: string
}

export const AppPassword = forwardRef<HTMLInputElement, AppPasswordProps>(
  ({ leftIcon, ...props }, ref) => {
    const password = (
      <Password
        ref={ref}
        toggleMask
        feedback={false}
        {...props}
      />
    )
    if (!leftIcon) return password
    return (
      <IconField iconPosition="left">
        <InputIcon className={leftIcon} />
        {password}
      </IconField>
    )
  },
)
AppPassword.displayName = 'AppPassword'
```

`frontend/src/shared/ui/AppPassword/index.ts`:

```ts
export { AppPassword } from './AppPassword'
export type { AppPasswordProps } from './AppPassword'
```

- [ ] **Step 3: Barrel raiz**

`frontend/src/shared/ui/index.ts`:

```ts
export { AppButton } from './AppButton/AppButton'
export * from './AppInputText'
export * from './AppPassword'
```

(Se `AppButton` não tiver `index.ts`, o reexport aponta direto para o arquivo — mantém a porta única do barrel.)

- [ ] **Step 4: Type-check**

Run: `pnpm build`
Expected: build passa. Se o `IconField`/`InputIcon` com `Password` gerar aviso de layout, é visual — resolvido na Task 6.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/
git commit -m "feat(ui): wrappers AppInputText e AppPassword + barrel"
```

---

### Task 6: `LoginForm` + `LoginPage`

**Files:**
- Create: `frontend/src/features/identity/components/LoginForm.tsx`
- Create: `frontend/src/features/identity/components/LoginPage.tsx`

**Interfaces:**
- Consumes: `useLogin` (Task 3); `AppInputText`, `AppPassword`, `AppButton` (Task 5); `BRAND_COLOR`, `APP_VERSION` (Task 4); logo `@/assets/Logo.png`; `ProblemDetails` (`@shared/api/axios`); `useNavigate`/`useLocation` (react-router).
- Produces: `<LoginPage>` (rota `/login`).

- [ ] **Step 1: `LoginForm`**

`frontend/src/features/identity/components/LoginForm.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AppInputText, AppPassword, AppButton } from '@shared/ui'
import { useLogin } from '../api/useLogin'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const fieldErrors = login.error?.errors
  const generalError =
    login.error && !login.error.errors ? login.error.detail : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    login.mutate(
      { email, password },
      { onSuccess: () => navigate(from, { replace: true }) },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div>
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="text-gray-500">Ingresa con tus credenciales</p>
      </div>

      {generalError && (
        <div role="alert" className="text-red-600 text-sm">
          {generalError}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Correo electrónico</span>
        <AppInputText
          leftIcon="pi pi-envelope"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@empresa.cl"
          invalid={!!fieldErrors?.email}
        />
        {fieldErrors?.email && (
          <small className="text-red-600">{fieldErrors.email[0]}</small>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Contraseña</span>
        <AppPassword
          leftIcon="pi pi-lock"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!fieldErrors?.password}
          inputStyle={{ width: '100%' }}
          style={{ width: '100%' }}
        />
        {fieldErrors?.password && (
          <small className="text-red-600">{fieldErrors.password[0]}</small>
        )}
      </label>

      <AppButton
        type="submit"
        label="Iniciar sesión"
        loading={login.isPending}
      />

      {/* stub: fluxo de senha (task futura, sem endpoint) */}
      <a className="text-center text-sm text-gray-400 cursor-default">
        ¿Olvidaste tu contraseña?
      </a>
    </form>
  )
}
```

- [ ] **Step 2: `LoginPage` (layout split)**

`frontend/src/features/identity/components/LoginPage.tsx`:

```tsx
import logo from '@/assets/Logo.png'
import { BRAND_COLOR, APP_VERSION } from '@shared/config/brand'
import { LoginForm } from './LoginForm'

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Painel esquerdo (marca) */}
      <aside
        className="relative flex flex-col items-center justify-center gap-4 p-10 text-white md:w-1/2 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${BRAND_COLOR}, #1b7fb8)`,
        }}
      >
        <img src={logo} alt="Lotus" className="w-40" />
        <p className="text-center opacity-90">
          Plataforma de capacitación profesional
          <br />
          Sector eléctrico de alta tensión
        </p>
        <span className="absolute bottom-4 text-xs opacity-70">{APP_VERSION}</span>
      </aside>

      {/* Painel direito (form) */}
      <main className="flex items-center justify-center p-8 md:w-1/2">
        {/* stubs visuais: idioma (ADR-15) e dark mode (ADR-16) — sem ação */}
        <div className="absolute top-4 right-4 flex gap-2 text-gray-400 text-sm select-none">
          <span>🌐 PT</span>
          <span>☾</span>
        </div>
        <LoginForm />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm build`
Expected: build passa. (Classes Tailwind são layout; sem reestilizar PrimeReact por dentro.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/identity/components/
git commit -m "feat(identity): LoginPage + LoginForm (layout split fiel ao Figma)"
```

---

### Task 7: `HomePage`, roteamento, guard, bootstrap e wiring (`App.tsx`/`main.tsx`)

Amarra tudo: rota pública `/login`, rota protegida `/`, hidratação no boot e guard. Substitui o template Vite.

**Files:**
- Create: `frontend/src/app/HomePage.tsx`
- Create: `frontend/src/app/SessionBootstrap.tsx`
- Create: `frontend/src/app/router/ProtectedRoute.tsx`
- Create: `frontend/src/app/router/AppRouter.tsx`
- Modify: `frontend/src/app/App.tsx`
- Modify: `frontend/src/main.tsx:3` (import de `App`)

**Interfaces:**
- Consumes: `useSessionStore` (Task 2), `useMe` (Task 3), `useLogout` (Task 3), `AppProviders` (Task 4), `LoginPage` (Task 6), `AppButton` (Task 5).
- Produces: `<App/>` como raiz da SPA.

- [ ] **Step 1: `HomePage` placeholder**

`frontend/src/app/HomePage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { AppButton } from '@shared/ui'
import { useSessionStore } from '@features/identity/stores/sessionStore'
import { useLogout } from '@features/identity/api/useLogout'

// Placeholder pós-login (stand-in da futura dashboard).
export function HomePage() {
  const user = useSessionStore((s) => s.user)
  const logout = useLogout()
  const navigate = useNavigate()

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl">Bienvenido, {user?.name}</h1>
      <AppButton label="Cerrar sesión" onClick={handleLogout} loading={logout.isPending} />
    </div>
  )
}
```

- [ ] **Step 2: `SessionBootstrap` (hidrata no boot)**

`frontend/src/app/SessionBootstrap.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react'
import { useMe } from '@features/identity/api/useMe'
import { useSessionStore } from '@features/identity/stores/sessionStore'

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const { data, isError, isSuccess } = useMe()
  const setUser = useSessionStore((s) => s.setUser)
  const clear = useSessionStore((s) => s.clear)
  const status = useSessionStore((s) => s.status)

  useEffect(() => {
    if (isSuccess && data) setUser(data)
    else if (isError) clear()
  }, [isSuccess, isError, data, setUser, clear])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <i className="pi pi-spin pi-spinner text-3xl" />
      </div>
    )
  }
  return <>{children}</>
}
```

- [ ] **Step 3: `ProtectedRoute` (guard)**

`frontend/src/app/router/ProtectedRoute.tsx`:

```tsx
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useSessionStore } from '@features/identity/stores/sessionStore'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status)
  const location = useLocation()

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
```

- [ ] **Step 4: `AppRouter` (rotas)**

`frontend/src/app/router/AppRouter.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSessionStore } from '@features/identity/stores/sessionStore'
import { LoginPage } from '@features/identity/components/LoginPage'
import { ProtectedRoute } from './ProtectedRoute'
import { HomePage } from '../HomePage'

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
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Reescrever `App.tsx`**

`frontend/src/app/App.tsx` — substituir todo o conteúdo (remove template Vite + login hardcoded):

```tsx
import { AppProviders } from './providers/AppProviders'
import { SessionBootstrap } from './SessionBootstrap'
import { AppRouter } from './router/AppRouter'

export default function App() {
  return (
    <AppProviders>
      <SessionBootstrap>
        <AppRouter />
      </SessionBootstrap>
    </AppProviders>
  )
}
```

- [ ] **Step 6: Ajustar o import em `main.tsx`**

`frontend/src/main.tsx` — a linha `import App from './app/App.tsx'` continua válida (App.tsx segue em `app/`). Confirmar que nada mais referencia `@/App.css` órfão; se o build acusar, remover só o import órfão que a mudança criou. Não deletar `App.css`/assets do template (mencionar, não remover — regra de mudança cirúrgica).

- [ ] **Step 7: Type-check**

Run: `pnpm build`
Expected: build passa. Erros de `noUnusedLocals` de imports do template antigo → remover só os imports órfãos criados por esta troca.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/
git commit -m "feat(app): router + guard + bootstrap de sessão, substitui template"
```

---

### Task 8: Verificação end-to-end (critério de aceite)

Sem runner de front — prova manual com o app rodando.

**Files:** nenhum (verificação).

- [ ] **Step 1: Subir backend e migrar/semear**

Run:
```bash
docker compose up -d
docker compose run --rm app php artisan migrate:fresh --seed
```
Expected: tabelas criadas; usuário `admin@lotus.cl` semeado.

- [ ] **Step 2: Subir o front**

Run (de `frontend/`): `pnpm dev`
Expected: Vite em http://localhost:5173.

- [ ] **Step 3: Percorrer o critério de aceite**

1. Abrir `/` sem sessão → redireciona para `/login`.
2. Login `admin@lotus.cl` / `senha123` → cai na Home ("Bienvenido, Admin Lotus").
3. Refresh (F5) na Home → permanece logado (spinner do boot, depois Home).
4. "Cerrar sesión" → volta para `/login`; tentar `/` → redireciona para `/login`.
5. Credencial errada → mensagem de erro no form, sem travar.
6. Usuário inativo (criar um via tinker/seed extra ou `factory()->inactive()`) → bloqueado com mensagem.
7. Conferir visual contra o protótipo: layout split, logo, gradiente `#25A5E4`, ícones nos campos, olho na senha.

Expected: todos os 7 passam. Se algum falhar, **não** seguir para conclusão — abrir a skill `systematic-debugging`.

- [ ] **Step 4: Verificação final de tipos e fronteira**

Run (de `frontend/`): `pnpm build` e `pnpm lint`
Expected: sem erros; nenhuma feature importando `primereact/*` direto (só via `@shared/ui`).

- [ ] **Step 5: (Opcional) Marcar a task 2.2.4 como concluída no Notion.**

---

## Self-Review (checklist do autor do plano)

**1. Cobertura do spec:**
- Store 3 estados → Task 2 ✓
- Hooks useLogin/useLogout/useMe → Task 3 ✓
- Bootstrap GET /api/me → Task 7 (SessionBootstrap) ✓
- ProtectedRoute + rotas → Task 7 ✓
- LoginPage/LoginForm fiéis ao Figma → Task 6 ✓
- Wrappers AppInputText/AppPassword → Task 5 ✓
- HomePage placeholder → Task 7 ✓
- QueryClientProvider → Task 4 ✓
- SessionUserData DTO + regenerar tipos → Task 1 ✓
- Cor de marca sem tocar tema → Task 4 (brand.ts) + Task 6 (uso) ✓
- Stubs idioma/dark/senha → Task 6 ✓
- Critério de aceite (7 itens) → Task 8 ✓

**2. Placeholders:** nenhum "TBD"/"TODO" com código faltando; todo step de código traz o código.

**3. Consistência de tipos:** `SessionUser` (alias de `SessionUserData`) usado em store/api/components; `useSessionStore` com `{user,status,setUser,clear}` idêntico em todas as tasks; `login/logout/fetchMe` com as mesmas assinaturas em `authApi` e nos hooks; `ProblemDetails.errors?` usado no form conforme o shape de `@shared/api/axios`.

---

## Execution Handoff

Ver a seção de handoff ao fim da conversa.
