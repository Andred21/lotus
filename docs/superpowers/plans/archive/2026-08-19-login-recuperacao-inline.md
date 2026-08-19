# Login e recuperação na mesma tela — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/login` e `/recuperar-clave` passam a ser a mesma tela, trocando só os campos, com o e-mail digitado sobrevivendo à troca.

**Architecture:** As duas rotas viram irmãs do mesmo layout e renderizam `LoginPage`. Um painel (`AuthPanel`) lê o modo do `pathname`, guarda o e-mail compartilhado e escolhe entre dois formulários irmãos (`LoginForm`, `ForgotForm`). `ForgotPasswordPage` deixa de existir.

**Tech Stack:** React 19, TypeScript, react-router-dom 7.18, TanStack Query, PrimeReact via `@shared/ui`, i18next, vitest + jsdom + @testing-library/react.

## Global Constraints

- Spec: `docs/superpowers/specs/archive/2026-08-19-login-recuperacao-inline-design.md`. É emenda do bloco `identity-ativacao-acesso-redator`, não bloco novo.
- **Frontend puro.** Nenhum arquivo em `backend/` é tocado. Sem Pint, sem migration, sem `php artisan typescript:transform`, sem editar `generated.ts`.
- Todos os comandos `pnpm` rodam de `frontend/`. Todos os `git add` usam caminho a partir da raiz do repositório (`frontend/src/...`).
- Teto do ESLint em `src/features/*/components/**`: `max-lines` 150, sem pular linha em branco nem comentário. Nenhum arquivo criado ou editado aqui pode passar disso.
- Componente em `features/*/components/**` **não** chama `useQuery`/`useMutation` direto — só através de hook em `features/*/hooks/`.
- Feature não importa PrimeReact direto (só via `@shared/ui`) nem outra feature (CLAUDE.md §5.6).
- Rótulo de campo por `htmlFor`/`id`, nunca embrulhando o campo; `aria-invalid` e `aria-describedby` no molde já usado pelo `LoginForm` (UI-03).
- A tela de recuperação mostra a **mesma** mensagem exista ou não a conta: ela espelha a resposta genérica do backend e não pode virar enumerador de usuários.
- Não há `@testing-library/jest-dom` nem `user-event` no projeto. Testes usam `render`, `fireEvent` e asserções sobre `container.querySelector`, no molde de `src/features/certification/components/Validation/ValidationPage.test.tsx`. Não há `globals: true` no vitest: `cleanup` é chamado à mão em `afterEach`.
- Um commit por task, Conventional Commits, `git add` só nos caminhos da task. Cada task termina com a árvore compilando (`pnpm build`) — nenhuma task deixa import quebrado para a seguinte consertar.

---

## File Structure

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `frontend/src/features/identity/hooks/useAuthPanel.ts` | modo derivado do `pathname`, e-mail compartilhado, sinal de troca | 1 |
| `frontend/src/features/identity/hooks/useAuthPanel.test.tsx` | prova o modo, a sobrevivência do e-mail e o `switched` | 1 |
| `frontend/src/shared/config/locales/{en,pt-BR,es-CL}.json` | `password.forgotSubtitle` | 2 |
| `frontend/src/features/identity/components/Login/ForgotForm.tsx` | formulário de recuperação, controlado por props | 3 |
| `frontend/src/features/identity/hooks/useForgotPassword.ts` | mutation da recuperação, e-mail vem de fora | 3 |
| `frontend/src/features/identity/hooks/useForgotPassword.test.tsx` | assinatura nova, mesma asserção de rota | 3 |
| `frontend/src/features/identity/components/Password/ForgotPasswordPage.tsx` | ponte transitória na Task 3; apagado na Task 5 | 3, 5 |
| `frontend/src/features/identity/components/Login/LoginForm.tsx` | formulário de login, controlado por props | 4 |
| `frontend/src/features/identity/hooks/useLoginForm.ts` | mutation do login, e-mail vem de fora | 4 |
| `frontend/src/features/identity/components/Login/AuthPanel.tsx` | escolhe o formulário pelo modo | 4 |
| `frontend/src/features/identity/components/Login/AuthPanel.test.tsx` | prova a feature: e-mail atravessa o clique | 4 |
| `frontend/src/features/identity/components/Login/LoginPage.tsx` | shell de marca; passa a renderizar o painel | 4 |
| `frontend/src/app/router/AppRouter.tsx` | `LoginRoute` vira layout; duas rotas irmãs | 5 |

---

### Task 1: `useAuthPanel`

**Files:**
- Create: `frontend/src/features/identity/hooks/useAuthPanel.ts`
- Test: `frontend/src/features/identity/hooks/useAuthPanel.test.tsx`

**Interfaces:**
- Consumes: `useLocation` de `react-router-dom`.
- Produces: `useAuthPanel(): { mode: 'login' | 'forgot'; email: string; setEmail: (value: string) => void; switched: boolean }` e o tipo exportado `AuthMode = 'login' | 'forgot'`. As Tasks 3 e 4 consomem esse retorno.

- [ ] **Step 1: Escrever o teste que falha**

Create `frontend/src/features/identity/hooks/useAuthPanel.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuthPanel } from './useAuthPanel'

/**
 * O hook depende do `pathname`, então não dá para medi-lo com `renderHook`
 * puro: a prova que importa é a TROCA de rota. O harness abaixo é o menor
 * componente que expõe o retorno do hook e navega, e as duas rotas usam o
 * MESMO elemento de propósito — é essa a forma que preserva o estado.
 */
function Harness() {
  const { mode, email, setEmail, switched } = useAuthPanel()

  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="switched">{String(switched)}</span>
      <input
        data-testid="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Link to="/recuperar-clave">ir</Link>
    </div>
  )
}

function renderHarness(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<Harness />} />
        <Route path="/recuperar-clave" element={<Harness />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
})

describe('useAuthPanel', () => {
  it('deriva o modo do pathname', () => {
    const login = renderHarness('/login')
    expect(login.getByTestId('mode').textContent).toBe('login')
    cleanup()

    const forgot = renderHarness('/recuperar-clave')
    expect(forgot.getByTestId('mode').textContent).toBe('forgot')
  })

  it('nao marca troca no mount, nem em deep link direto na recuperacao', () => {
    const login = renderHarness('/login')
    expect(login.getByTestId('switched').textContent).toBe('false')
    cleanup()

    const forgot = renderHarness('/recuperar-clave')
    expect(forgot.getByTestId('switched').textContent).toBe('false')
  })

  it('preserva o e-mail digitado ao trocar de modo, e marca a troca', () => {
    const { getByTestId, getByText } = renderHarness('/login')

    fireEvent.change(getByTestId('email'), { target: { value: 'ana@lotus.cl' } })
    fireEvent.click(getByText('ir'))

    expect(getByTestId('mode').textContent).toBe('forgot')
    expect((getByTestId('email') as HTMLInputElement).value).toBe('ana@lotus.cl')
    expect(getByTestId('switched').textContent).toBe('true')
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run (de `frontend/`): `pnpm test src/features/identity/hooks/useAuthPanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./useAuthPanel"`.

- [ ] **Step 3: Escrever o hook**

Create `frontend/src/features/identity/hooks/useAuthPanel.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

export type AuthMode = 'login' | 'forgot'

/**
 * Estado da tela de autenticação, que serve login e recuperação no mesmo lugar.
 *
 * O modo sai do `pathname` e não de `useState`: assim o back do navegador desfaz
 * a troca sem código de história, e deep link em `/recuperar-clave` abre no modo
 * certo. As duas rotas renderizam o MESMO componente, e o `_renderMatches` do
 * react-router monta cada match sem `key` — a árvore reconcilia em vez de
 * remontar, que é o que deixa o e-mail atravessar a troca.
 *
 * Só o e-mail sobe para cá. Senha, erro de credencial e o `sent` da recuperação
 * morrem com o formulário que os produziu, e é isso que se quer: voltar para a
 * recuperação depois de enviar mostra o campo de novo, não a mensagem velha.
 */
export function useAuthPanel() {
  const { pathname } = useLocation()
  const [email, setEmail] = useState('')

  const mode: AuthMode = pathname === '/recuperar-clave' ? 'forgot' : 'login'

  // `switched` separa troca de modo de abertura da tela — só a troca move foco,
  // senão quem abre /login direto tem o foco roubado. Ref e não estado: guardar
  // o modo anterior não deve provocar render.
  const anterior = useRef(mode)
  const switched = anterior.current !== mode
  useEffect(() => {
    anterior.current = mode
  }, [mode])

  return { mode, email, setEmail, switched }
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pnpm test src/features/identity/hooks/useAuthPanel.test.tsx`
Expected: PASS — `Tests 3 passed (3)`.

- [ ] **Step 5: Sabotagem — provar que o teste mede o que promete**

Troque `const anterior = useRef(mode)` por `const anterior = useRef<AuthMode>('login')` e rode o teste de novo.
Expected: FAIL no caso do deep link (`switched` vem `true` em `/recuperar-clave`). Desfaça a sabotagem e confirme o verde.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/hooks/useAuthPanel.ts frontend/src/features/identity/hooks/useAuthPanel.test.tsx
git commit -m "feat(identity): hook do painel de autenticacao com modo pelo pathname"
```

---

### Task 2: `password.forgotSubtitle` nos três dicionários

**Files:**
- Modify: `frontend/src/shared/config/locales/en.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Test: `frontend/src/shared/config/locales/parity.test.ts` (existente, não editar)

**Interfaces:**
- Produces: chave `password.forgotSubtitle`, consumida pelo `ForgotForm` na Task 3.

- [ ] **Step 1: Rodar a catraca de paridade antes de mexer**

Run: `pnpm test src/shared/config/locales/parity.test.ts`
Expected: PASS. É a linha de base — o teste só reprova se a chave entrar em um dicionário e faltar em outro.

- [ ] **Step 2: Adicionar a chave em `en.json`**

Em `frontend/src/shared/config/locales/en.json`, dentro de `"password"`, logo depois de `"forgotTitle"`:

```json
    "forgotTitle": "Recover password",
    "forgotSubtitle": "Enter your email and we will send a link to change the password.",
```

- [ ] **Step 3: Adicionar a chave em `pt-BR.json`**

```json
    "forgotTitle": "Recuperar senha",
    "forgotSubtitle": "Informe seu e-mail e enviamos um link para alterar a senha.",
```

- [ ] **Step 4: Adicionar a chave em `es-CL.json`**

```json
    "forgotTitle": "Recuperar clave",
    "forgotSubtitle": "Ingresa tu correo y te enviamos un enlace para cambiar la clave.",
```

O texto não afirma que a conta existe — mesma disciplina do `forgotSent`.

- [ ] **Step 5: Rodar a catraca e ver passar**

Run: `pnpm test src/shared/config/locales/parity.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/config/locales/en.json frontend/src/shared/config/locales/pt-BR.json frontend/src/shared/config/locales/es-CL.json
git commit -m "feat(i18n): subtitulo da recuperacao de clave nos tres dicionarios"
```

---

### Task 3: `ForgotForm` e o hook de recuperação controlado

**Files:**
- Create: `frontend/src/features/identity/components/Login/ForgotForm.tsx`
- Modify: `frontend/src/features/identity/hooks/useForgotPassword.ts` (arquivo inteiro)
- Modify: `frontend/src/features/identity/hooks/useForgotPassword.test.tsx:21-30`
- Modify: `frontend/src/features/identity/components/Password/ForgotPasswordPage.tsx` (arquivo inteiro)

**Interfaces:**
- Consumes: `useForgotPasswordMutation` de `../api/passwordApi`; chave `password.forgotSubtitle` da Task 2.
- Produces: `useForgotPassword(email: string): { submit: () => void; isSubmitting: boolean; sent: boolean }` e `ForgotForm({ email, onEmailChange, autoFocusTitle }: { email: string; onEmailChange: (value: string) => void; autoFocusTitle: boolean })`. A Task 4 monta o `ForgotForm` dentro do `AuthPanel`.

**Nota de sequência:** `ForgotPasswordPage` vira uma ponte de 13 linhas nesta task e é apagada na Task 5. Existe para a árvore compilar em todo commit: a rota `/recuperar-clave` só muda de dono na Task 5.

- [ ] **Step 1: Adaptar o teste do hook à assinatura nova**

Em `frontend/src/features/identity/hooks/useForgotPassword.test.tsx`, trocar o corpo do `it` (linhas 21-30) por:

```tsx
  it('pede a recuperação na rota pública e marca sent no sucesso', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: null } as never)

    const { result } = renderHook(() => useForgotPassword('ana@lotus.cl'), { wrapper })
    act(() => result.current.submit())

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/password/forgot', { email: 'ana@lotus.cl' }))
    await waitFor(() => expect(result.current.sent).toBe(true))
  })
```

O `act(() => result.current.setEmail(...))` some — o e-mail deixa de ser estado do hook.

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pnpm test src/features/identity/hooks/useForgotPassword.test.tsx`
Expected: FAIL — a asserção de `api.post` recebe `{ email: '' }`, porque o hook ainda ignora o argumento.

- [ ] **Step 3: Reescrever o hook**

Substitua `frontend/src/features/identity/hooks/useForgotPassword.ts` inteiro:

```ts
import { useForgotPasswordMutation } from '../api/passwordApi'

/**
 * Pedido de recuperação. O e-mail vem de fora porque ele é compartilhado com o
 * login na mesma tela (`useAuthPanel`) — guardá-lo aqui o mataria na troca de
 * modo, que é justamente o que a tela unificada existe para evitar.
 *
 * `sent` é `isSuccess` e nada mais: a tela mostra a mesma mensagem tendo ou não
 * conta, espelhando a resposta genérica do backend — desmenti-la aqui
 * transformaria a rota em enumerador de usuários.
 */
export function useForgotPassword(email: string) {
  const mutation = useForgotPasswordMutation()

  return {
    submit: () => mutation.mutate({ email }),
    isSubmitting: mutation.isPending,
    sent: mutation.isSuccess,
  }
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pnpm test src/features/identity/hooks/useForgotPassword.test.tsx`
Expected: PASS — `Tests 1 passed (1)`.

- [ ] **Step 5: Criar o `ForgotForm`**

Create `frontend/src/features/identity/components/Login/ForgotForm.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AppButton, AppInputText } from '@shared/ui'
import { useForgotPassword } from '../../hooks/useForgotPassword'

interface Props {
  email: string
  onEmailChange: (value: string) => void
  /** Só na TROCA de modo: abrir /recuperar-clave direto não rouba o foco. */
  autoFocusTitle: boolean
}

export function ForgotForm({ email, onEmailChange, autoFocusTitle }: Props) {
  const { t } = useTranslation()
  const { submit, isSubmitting, sent } = useForgotPassword(email)
  const titulo = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (autoFocusTitle) titulo.current?.focus()
  }, [autoFocusTitle])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4 w-full max-w-sm mx-auto text-left"
    >
      <div>
        {/* `tabIndex={-1}` existe só para o foco programático da troca de modo:
            a URL muda sem trocar de página, e o React Router não move foco. */}
        <h1
          ref={titulo}
          tabIndex={-1}
          className="font-display text-2xl font-semibold tracking-tight"
          style={{ color: 'var(--text-color)' }}
        >
          {t('password.forgotTitle')}
        </h1>
        {!sent && (
          <p style={{ color: 'var(--text-color-secondary)' }}>{t('password.forgotSubtitle')}</p>
        )}
      </div>

      {/* Mensagem IDÊNTICA exista ou não a conta: a tela não pode desmentir a
          resposta genérica do backend e virar enumerador de usuários.
          O container do `aria-live` fica nos DOIS estados: container que nasce
          junto com o texto não anuncia nada. */}
      <div aria-live="polite" style={{ color: 'var(--text-color-secondary)' }}>
        {sent ? t('password.forgotSent') : null}
      </div>

      {!sent && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="forgot-email" className="font-medium" style={{ color: 'var(--text-color)' }}>
              {t('login.email')}
            </label>
            <AppInputText
              id="forgot-email"
              type="email"
              leftIcon="pi pi-envelope"
              autoComplete="username"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
            />
          </div>
          <AppButton type="submit" label={t('password.forgotSubmit')} loading={isSubmitting} />
        </>
      )}

      <Link to="/login" className="text-center text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('password.backToLogin')}
      </Link>
    </form>
  )
}
```

- [ ] **Step 6: Reduzir `ForgotPasswordPage` à ponte**

Substitua `frontend/src/features/identity/components/Password/ForgotPasswordPage.tsx` inteiro:

```tsx
import { useState } from 'react'
import { ForgotForm } from '../Login/ForgotForm'

/** Ponte transitória: a rota `/recuperar-clave` muda de dono na task do router
 *  e este arquivo é apagado lá. Existe para a árvore compilar neste commit. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  return (
    <main className="p-8">
      <ForgotForm email={email} onEmailChange={setEmail} autoFocusTitle={false} />
    </main>
  )
}
```

- [ ] **Step 7: Rodar as catracas**

Run: `pnpm lint && pnpm build && pnpm test`
Expected: eslint sem saída; `tsc -b` sem erro e `✓ built`; toda a suíte verde.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/identity/components/Login/ForgotForm.tsx frontend/src/features/identity/hooks/useForgotPassword.ts frontend/src/features/identity/hooks/useForgotPassword.test.tsx frontend/src/features/identity/components/Password/ForgotPasswordPage.tsx
git commit -m "feat(identity): formulario de recuperacao controlado por props"
```

---

### Task 4: `LoginForm` controlado e o `AuthPanel`

**Files:**
- Modify: `frontend/src/features/identity/hooks/useLoginForm.ts` (arquivo inteiro)
- Modify: `frontend/src/features/identity/components/Login/LoginForm.tsx` (arquivo inteiro)
- Create: `frontend/src/features/identity/components/Login/AuthPanel.tsx`
- Create: `frontend/src/features/identity/components/Login/AuthPanel.test.tsx`
- Modify: `frontend/src/features/identity/components/Login/LoginPage.tsx:3,64`

**Interfaces:**
- Consumes: `useAuthPanel` da Task 1; `ForgotForm` da Task 3.
- Produces: `useLoginForm(email: string): { password: string; setPassword: (value: string) => void; submit: () => void; isSubmitting: boolean; fieldErrors: Record<string, string[]> | undefined; generalError: string | null }`; `LoginForm({ email, onEmailChange, autoFocusTitle })` com a mesma forma de props do `ForgotForm`; `AuthPanel()` sem props, consumido pelo `LoginPage`.

- [ ] **Step 1: Escrever o teste que falha**

Create `frontend/src/features/identity/components/Login/AuthPanel.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthPanel } from './AuthPanel'

/** `t` devolve a própria chave; o texto traduzido é assunto do `parity.test.ts`. */
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

/**
 * As duas rotas apontam para o MESMO elemento, igual ao router de verdade: é
 * essa forma que faz o react-router reconciliar em vez de remontar. Se algum dia
 * uma atualização de dependência mudar isso, é este teste que avisa — o e-mail
 * deixaria de atravessar o clique.
 */
function renderPanel(entry: string) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<AuthPanel />} />
          <Route path="/recuperar-clave" element={<AuthPanel />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
})

describe('AuthPanel', () => {
  it('em /login mostra os campos do login', () => {
    const { container } = renderPanel('/login')

    expect(container.querySelector('#login-email')).not.toBeNull()
    expect(container.querySelector('#login-password')).not.toBeNull()
    expect(container.querySelector('#forgot-email')).toBeNull()
  })

  it('o clique em recuperar troca so os campos e leva o e-mail digitado', () => {
    const { container } = renderPanel('/login')

    fireEvent.change(container.querySelector('#login-email') as HTMLInputElement, {
      target: { value: 'ana@lotus.cl' },
    })
    fireEvent.click(container.querySelector('a[href="/recuperar-clave"]') as HTMLAnchorElement)

    const forgot = container.querySelector('#forgot-email') as HTMLInputElement
    expect(forgot.value).toBe('ana@lotus.cl')
    expect(container.querySelector('#login-password')).toBeNull()
  })

  it('em /recuperar-clave abre no modo recuperacao', () => {
    const { container } = renderPanel('/recuperar-clave')

    expect(container.querySelector('#forgot-email')).not.toBeNull()
    expect(container.querySelector('#login-password')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pnpm test src/features/identity/components/Login/AuthPanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./AuthPanel"`.

- [ ] **Step 3: Reescrever `useLoginForm`**

Substitua `frontend/src/features/identity/hooks/useLoginForm.ts` inteiro:

```ts
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLogin } from "../api/authApi";

/**
 * Lógica do formulário de login: senha, mutation de login, navegação pós-sucesso
 * e derivação de erros. O componente LoginForm apenas consome este hook e
 * renderiza — nenhuma lógica vive no JSX.
 *
 * O e-mail vem de fora (`useAuthPanel`) porque é compartilhado com a
 * recuperação na mesma tela; a senha continua aqui e morre na troca de modo, de
 * propósito.
 */
export function useLoginForm(email: string) {
  const [password, setPassword] = useState("");

  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  // 422 traz erros por campo; 401/inativo trazem só a mensagem geral.
  const fieldErrors = login.error?.errors;
  const generalError =
    login.error && !login.error.errors ? login.error.detail : null;

  function submit() {
    login.mutate(
      { email, password },
      { onSuccess: () => navigate(from, { replace: true }) },
    );
  }

  return {
    password,
    setPassword,
    submit,
    isSubmitting: login.isPending,
    fieldErrors,
    generalError,
  };
}
```

- [ ] **Step 4: Reescrever `LoginForm`**

Substitua `frontend/src/features/identity/components/Login/LoginForm.tsx` inteiro:

```tsx
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppInputText, AppPassword, AppButton, FormErrorBanner } from "@shared/ui";
import { dangerText } from "@shared/styles/tokens";
import { useLoginForm } from "../../hooks/useLoginForm";

interface Props {
  email: string;
  onEmailChange: (value: string) => void;
  /** Só na TROCA de modo: abrir /login direto não rouba o foco. */
  autoFocusTitle: boolean;
}

export function LoginForm({ email, onEmailChange, autoFocusTitle }: Props) {
  const { t } = useTranslation();
  const {
    password,
    setPassword,
    submit,
    isSubmitting,
    fieldErrors,
    generalError,
  } = useLoginForm(email);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (autoFocusTitle) titulo.current?.focus();
  }, [autoFocusTitle]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4 w-full max-w-sm mx-auto text-left"
    >
      <div>
        {/* `tabIndex={-1}` existe só para o foco programático da troca de modo:
            a URL muda sem trocar de página, e o React Router não move foco. */}
        <h1
          ref={titulo}
          tabIndex={-1}
          className="font-display text-2xl font-semibold tracking-tight"
          style={{ color: 'var(--text-color)' }}
        >
          {t("login.title")}
        </h1>
        <p style={{ color: 'var(--text-color-secondary)' }}>{t("login.subtitle")}</p>
      </div>

      <FormErrorBanner message={generalError} variant="inline" />

      {/* O rótulo NÃO embrulha o campo: o olho da senha vive dentro do
          AppPassword e tem nome acessível próprio, então um <label> por fora
          somava os dois e o campo passava a se chamar "Contraseña Mostrar
          contraseña" (UI-03 do review de 2026-08-13). Com htmlFor/id o rótulo
          nomeia só o input.
          O preço do htmlFor é que o erro do campo deixa de estar dentro do
          rótulo, e aí só existe para quem vê a tela: `aria-describedby` o
          reassocia e `aria-invalid` marca o estado, que o PrimeReact não
          escreve (o `invalid` dele só pinta `.p-invalid`). Este par é o molde
          que a P-37 manda copiar para o FormField — o `describedby` faz parte
          do molde, não é acabamento. */}
      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="font-medium" style={{ color: 'var(--text-color)' }}>{t("login.email")}</label>
        <AppInputText
          id="login-email"
          leftIcon="pi pi-envelope"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder={t("login.emailPlaceholder")}
          invalid={!!fieldErrors?.email}
          aria-invalid={!!fieldErrors?.email}
          aria-describedby={fieldErrors?.email ? "login-email-error" : undefined}
        />
        {fieldErrors?.email && (
          <small id="login-email-error" style={{ color: dangerText }}>{fieldErrors.email[0]}</small>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="font-medium" style={{ color: 'var(--text-color)' }}>{t("login.password")}</label>
        <AppPassword
          inputId="login-password"
          leftIcon="pi pi-lock"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!fieldErrors?.password}
          aria-invalid={!!fieldErrors?.password}
          aria-describedby={fieldErrors?.password ? "login-password-error" : undefined}
        />
        {fieldErrors?.password && (
          <small id="login-password-error" style={{ color: dangerText }}>{fieldErrors.password[0]}</small>
        )}
      </div>

      <AppButton type="submit" label={t("login.submit")} loading={isSubmitting} />

      {/* Continua `<Link>` e não botão: o destino é URL de verdade, então href,
          botão do meio e menu de contexto seguem funcionando, e o back do
          navegador desfaz a troca de modo. */}
      <Link
        to="/recuperar-clave"
        className="text-center text-sm"
        style={{ color: 'var(--text-color-secondary)' }}
      >
        {t("login.forgotPassword")}
      </Link>
    </form>
  );
}
```

- [ ] **Step 5: Criar o `AuthPanel`**

Create `frontend/src/features/identity/components/Login/AuthPanel.tsx`:

```tsx
import { useAuthPanel } from '../../hooks/useAuthPanel'
import { ForgotForm } from './ForgotForm'
import { LoginForm } from './LoginForm'

/** Login e recuperação são a mesma tela: o painel decide qual formulário está
 *  no ar e é o dono do único estado que atravessa a troca, o e-mail. */
export function AuthPanel() {
  const { mode, email, setEmail, switched } = useAuthPanel()

  return mode === 'forgot' ? (
    <ForgotForm email={email} onEmailChange={setEmail} autoFocusTitle={switched} />
  ) : (
    <LoginForm email={email} onEmailChange={setEmail} autoFocusTitle={switched} />
  )
}
```

- [ ] **Step 6: Trocar o formulário pelo painel no `LoginPage`**

Em `frontend/src/features/identity/components/Login/LoginPage.tsx`, linha 3, trocar o import:

```tsx
import { AuthPanel } from "./AuthPanel";
```

e na linha 64, trocar o uso:

```tsx
        <AuthPanel />
```

- [ ] **Step 7: Rodar o teste e ver passar**

Run: `pnpm test src/features/identity/components/Login/AuthPanel.test.tsx`
Expected: PASS — `Tests 3 passed (3)`.

- [ ] **Step 8: Rodar as catracas**

Run: `pnpm lint && pnpm build && pnpm test`
Expected: eslint sem saída (nenhum arquivo passa de 150 linhas); `✓ built`; suíte inteira verde.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/identity/hooks/useLoginForm.ts frontend/src/features/identity/components/Login/LoginForm.tsx frontend/src/features/identity/components/Login/AuthPanel.tsx frontend/src/features/identity/components/Login/AuthPanel.test.tsx frontend/src/features/identity/components/Login/LoginPage.tsx
git commit -m "feat(identity): painel de autenticacao com login e recuperacao na mesma tela"
```

---

### Task 5: as duas rotas viram irmãs do mesmo layout

**Files:**
- Modify: `frontend/src/app/router/AppRouter.tsx:1,20,22-26,37-53`
- Delete: `frontend/src/features/identity/components/Password/ForgotPasswordPage.tsx`

**Interfaces:**
- Consumes: `LoginPage` (que agora renderiza `AuthPanel`) da Task 4.
- Produces: `/login` e `/recuperar-clave` renderizando o mesmo elemento sob o mesmo `SessionBootstrap`.

- [ ] **Step 1: Apagar o import morto e a página**

Em `frontend/src/app/router/AppRouter.tsx`, remover a linha 20:

```tsx
import { ForgotPasswordPage } from '@features/identity/components/Password/ForgotPasswordPage'
```

e apagar o arquivo:

```bash
git rm frontend/src/features/identity/components/Password/ForgotPasswordPage.tsx
```

- [ ] **Step 2: `LoginRoute` vira layout**

Em `frontend/src/app/router/AppRouter.tsx`, trocar o corpo de `LoginRoute` (linhas 22-26) por:

```tsx
function LoginRoute() {
  const status = useSessionStore((s) => s.status)
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
```

e acrescentar `Outlet` ao import da linha 1:

```tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
```

- [ ] **Step 3: Trocar as rotas**

Substituir o bloco das linhas 37-53 (o comentário das telas públicas, a rota `/recuperar-clave` e a rota `/login`) por:

```tsx
        {/* Primeiro acesso: pública, sem cookie de sessão. O `flow` da query
            decide o endpoint (convite × recuperação). Fora do SessionBootstrap —
            quem define a senha ainda não tem sessão e não deve disparar
            `GET /api/me`. */}
        <Route path="/definir-clave/:token" element={<SetPasswordPage />} />

        {/* Login e recuperação são a MESMA tela, e por isso o mesmo `element`:
            o react-router monta cada match sem `key`, então a troca de rota
            reconcilia em vez de remontar e o e-mail digitado sobrevive.
            As duas seguem sob o bootstrap: o redirect "já autenticado" depende
            do `GET /api/me` já ter resolvido a sessão, e agora vale para as
            duas — quem tem sessão troca a senha no perfil. */}
        <Route
          element={
            <SessionBootstrap>
              <LoginRoute />
            </SessionBootstrap>
          }
        >
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-clave" element={<LoginPage />} />
        </Route>
```

- [ ] **Step 4: Rodar as catracas**

Run: `pnpm lint && pnpm build && pnpm test`
Expected: eslint sem saída; `✓ built` (o `tsc -b` é quem prova que não sobrou import do arquivo apagado); suíte verde.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/router/AppRouter.tsx frontend/src/features/identity/components/Password/ForgotPasswordPage.tsx
git commit -m "feat(identity): login e recuperacao compartilham rota, layout e estado"
```

---

### Task 6: gate da emenda

**Files:**
- Modify: `.superpowers/sdd/progress.md` (ledger local, fora do Git)
- Modify: `docs/superpowers/state.md:1-17` e a seção `### Emenda — 2026-08-19`

**Interfaces:**
- Consumes: tudo das Tasks 1 a 5.
- Produces: estado `ready_for_review` com a evidência registrada.

- [ ] **Step 1: Catracas, na árvore inteira**

Run (de `frontend/`): `pnpm lint && pnpm build && pnpm test`
Expected: eslint sem saída; `✓ built`; a suíte verde, com os testes novos somados aos 401 de antes.

Run (da raiz): `git status --porcelain`
Expected: sem saída — nada solto fora dos commits das tasks.

- [ ] **Step 2: Subir a stack do worktree sem derrubar a do João**

A stack `lotus` do main tree publica 8080, 3307 e 9000. Use o override efêmero **fora do repo**, no scratchpad da sessão, com `!override` nas portas — lista em compose SOMA por padrão, não substitui:

```yaml
services:
  nginx:
    ports: !override ["8081:80"]
  mysql:
    ports: !override ["3308:3306"]
  minio:
    ports: !override ["9002:9000", "9003:9001"]
```

Escreva o override em `/tmp/claude-1000/-home-jvbat-projetos-fix-frontend/<sessao>/scratchpad/compose.e2e.yml` — fora do repo, para não sujar o diff da emenda — e suba:

```bash
docker compose -f docker-compose.yml -f /tmp/claude-1000/-home-jvbat-projetos-fix-frontend/<sessao>/scratchpad/compose.e2e.yml up -d
```

Vite do worktree na 5174 (`pnpm dev --port 5174`), porque a 5173 é o dev server do main tree. `FRONTEND_URL` do `backend/.env` não muda: nenhum passo desta emenda depende de link de e-mail apontando para o front.

- [ ] **Step 3: Provar a troca de modo no navegador**

1. Abrir `http://localhost:5174/login` e digitar `gate.emenda@lotus.cl` no campo de e-mail.
2. Clicar "¿Olvidaste tu clave?".
3. Conferir no mesmo snapshot: a URL virou `/recuperar-clave`, o campo de e-mail segue com `gate.emenda@lotus.cl`, não existe campo de senha na tela, e o log de rede não tem novo documento HTML (a página não recarregou).

- [ ] **Step 4: Provar o envio e a resposta genérica**

1. Enviar com um e-mail que existe (`admin@lotus.cl`) — a mensagem de envio aparece, o campo some, e o total do Mailpit (`http://localhost:8025`) sobe em 1.
2. Voltar ao login, ir de novo para a recuperação e enviar `no-existe-jamas@lotus.cl` — **mesma** mensagem na tela, e o total do Mailpit **não** sobe.

- [ ] **Step 5: Provar navegação, deep link e as duas portas de entrada**

1. Back do navegador depois da troca — volta ao modo login.
2. Abrir `http://localhost:5174/recuperar-clave` direto — abre em recuperação.
3. `/definir-clave/<token vencido>` → "Solicitar novo link" — cai na tela unificada em modo recuperação.
4. Autenticar como admin e abrir `/recuperar-clave` — redirecionado para `/`.

- [ ] **Step 6: Devolver o ambiente ao estado em que foi encontrado**

Parar `nginx`, `mysql` e `mailpit` do worktree e o Vite da 5174, deixando só o container `app` de pé, que é como a sessão encontrou a máquina.

- [ ] **Step 7: Registrar a evidência no ledger**

Em `.superpowers/sdd/progress.md`, acrescentar a seção da emenda: tabela de tasks com commit e prova, o resultado dos Steps 3 a 5 medido (não "verde"), e qualquer desvio declarado.

- [ ] **Step 8: Fechar o estado**

Em `docs/superpowers/state.md`, frontmatter:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
active_plan: docs/superpowers/plans/2026-08-19-login-recuperacao-inline.md
```

e fechar a seção `### Emenda — 2026-08-19` com o resultado do gate. **Não iniciar o review** — ele é a próxima instrução do João, não deste plano.

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/state.md
git commit -m "docs(state): fecha a emenda da recuperacao inline"
```
