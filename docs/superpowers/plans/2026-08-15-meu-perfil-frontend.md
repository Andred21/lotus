# Meu Perfil (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** entregar a tela `/perfil` (Mi perfil) para Admin e Redator, consumindo o contrato
self-service `/api/profile` já estabilizado, sem tocar backend nem `generated.ts`.

**Architecture:** feature-sliced (ADR-05). A rota em `app/router` monta `ProfilePage`; a página
compõe sete componentes declarativos em `features/identity/components/Profile/`; toda query,
mutation e derivação vive em `features/identity/api/useProfile.ts` e
`features/identity/hooks/useProfile*.ts`; a única peça nova em `shared/` é
`useResourceState`, o análogo de `useLoadState` para **recurso único**.

**Tech Stack:** React 19 + TypeScript (Vite), TanStack Query, PrimeReact via `shared/ui`,
Tailwind v4 (só layout), react-i18next (3 locales), vitest + @testing-library/react (jsdom).

**Spec:** `docs/superpowers/specs/2026-08-15-meu-perfil-frontend-design.md`
**Context Packet:** `docs/superpowers/context-packets/2026-08-15-meu-perfil-frontend.md`
**Baseline:** `feat/meu-perfil-frontend@de73bf0`

## Global Constraints

Toda task herda estas regras. Elas são **lint**, não conselho — `pnpm lint` reprova.

- **Cor vem do tema, nunca de classe Tailwind de paleta.** `no-restricted-syntax` `COR_HARDCODED`
  reprova `text-slate-500`, `bg-red-100` e as 20 paletas. Use
  `style={{ color: 'var(--text-color-secondary)' }}`, `'var(--surface-border)'`,
  `'var(--text-color)'`, ou os tokens de `shared/ui/styles/tokens` (`dangerText`, `warningText`).
  Tailwind fica para layout (`grid`, `flex`, `gap-4`, `p-4`).
- **Campo só-leitura NÃO é input desabilitado.** `disabled={readOnly}` e o par estático
  `<AppInputText disabled readOnly />` são reprovados (`DISABLED_READONLY`,
  `DISABLED_READONLY_ESTATICO`). Use `<FormField readOnly value={…} label={…} />`, que renderiza
  texto e devolve `—` quando o valor é vazio.
- **Componente de feature não chama `useQuery`/`useMutation`, não chama `xxxApi.useAlgo()` e não
  recebe um `xxxApi` como argumento em posição nenhuma.** `useMutationErrors` continua liberado — é
  consumo de erro, não busca de dado.
- **Multipart só por `postMultipart`.** `new FormData()` é reprovado em `src/features/**`.
- **`max-lines: 150`** em `src/features/*/components/**` — **inclusive nos arquivos de teste que
  moram lá**, que casam o mesmo glob.
- **Feature não importa PrimeReact direto nem outra feature** — nem para tipo.
- **`shared/types/generated.ts` não se edita** (lei §5.3). Nenhuma task o toca.
- **i18n: três locales com chaves idênticas** (`es-CL`, `pt-BR`, `en`), `es-CL` como referência de
  rótulo. Nenhum teste protege a paridade — os três arquivos se editam no mesmo commit.
- **Vocabulário de domínio é o do backend:** `Redator`, `redator`, nunca `Writer`.
- **Sem `globals` no vitest:** cada teste importa `describe`/`it`/`expect` de `vitest`.
- **Gate de verificação, rodado de `frontend/`:** `pnpm build` && `pnpm lint` && `pnpm test`.

---

## Estrutura de arquivos

| Path | Estado | Responsabilidade única |
|---|---|---|
| `frontend/src/shared/hooks/useResourceState.ts` | criar | estados de carga de recurso ÚNICO |
| `frontend/src/shared/hooks/useResourceState.test.ts` | criar | prova os 4 ramos |
| `frontend/src/shared/hooks/index.ts` | modificar | 1 linha no barrel |
| `frontend/src/shared/config/locales/es-CL.json` | modificar | namespace `profile` |
| `frontend/src/shared/config/locales/pt-BR.json` | modificar | idem |
| `frontend/src/shared/config/locales/en.json` | modificar | idem |
| `frontend/src/features/identity/api/useProfile.ts` | criar | query + 5 mutations + invalidação |
| `frontend/src/features/identity/hooks/useProfilePage.ts` | criar | query + `useResourceState` |
| `frontend/src/features/identity/hooks/useProfilePhoto.ts` | criar | foto: enviar, remover, teto |
| `frontend/src/features/identity/hooks/useProfileForm.ts` | criar | form nome/telefone |
| `frontend/src/features/identity/hooks/useProfileForm.test.tsx` | criar | seed, no-reset, payload |
| `frontend/src/features/identity/hooks/useProfilePassword.ts` | criar | form de senha |
| `frontend/src/features/identity/hooks/useProfilePassword.test.tsx` | criar | payload, limpeza |
| `frontend/src/features/identity/hooks/useProfileDocuments.ts` | criar | upload por slot |
| `frontend/src/features/identity/hooks/useProfileDocuments.test.tsx` | criar | gate de slot |
| `frontend/src/features/identity/components/Profile/ProfilePage.tsx` | criar | ramos de carga + grid |
| `.../Profile/ProfileIdentityCard.tsx` | criar | esquerda: foto e leitura |
| `.../Profile/ProfileSummaryCard.tsx` | criar | esquerda: resumo do Redator |
| `.../Profile/ProfilePersonalSection.tsx` | criar | direita: nome, telefone |
| `.../Profile/ProfileSecuritySection.tsx` | criar | direita: senha |
| `.../Profile/ProfileDocumentSlot.tsx` | criar | um tipo documental |
| `.../Profile/ProfileDocumentSlot.test.tsx` | criar | gate de `self_service` |
| `.../Profile/ProfileDocumentsSection.tsx` | criar | direita: os 4 slots |
| `frontend/src/app/router/AppRouter.tsx` | modificar | troca `ModulePlaceholder` |

---

### Task 1: `useResourceState` — estados de carga de recurso único

**Files:**
- Create: `frontend/src/shared/hooks/useResourceState.ts`
- Test: `frontend/src/shared/hooks/useResourceState.test.ts`
- Modify: `frontend/src/shared/hooks/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `useResourceState<T>(query: UseQueryResult<T, ProblemDetails>)` → `{ data: T | undefined, isLoading: boolean, isError: boolean, errorDetail: string | undefined, loadError: ProblemDetails | null, failedWithoutData: boolean, refetch: () => void }`.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/shared/hooks/useResourceState.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'
import { useResourceState } from './useResourceState'

type Perfil = { id: number }

/** O hook não chama hook nenhum: é derivação pura sobre o resultado da query,
 * como o `useLoadState`. O literal basta — `renderHook` está aqui só para não
 * violar `react-hooks/rules-of-hooks` no arquivo de teste. */
function query(over: Partial<UseQueryResult<Perfil, ProblemDetails>>) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch: () => Promise.resolve(),
    ...over,
  } as unknown as UseQueryResult<Perfil, ProblemDetails>
}

const BOOM = { detail: 'boom' } as ProblemDetails

describe('useResourceState', () => {
  it('falhou sem nada em cache: autoriza substituir a tela', () => {
    const { result } = renderHook(() =>
      useResourceState(query({ isError: true, error: BOOM })),
    )

    expect(result.current.failedWithoutData).toBe(true)
    expect(result.current.errorDetail).toBe('boom')
    expect(result.current.loadError).toBe(BOOM)
  })

  it('falhou COM cache: a falha avisa ao lado, não substitui', () => {
    const { result } = renderHook(() =>
      useResourceState(query({ data: { id: 1 }, isError: true, error: BOOM })),
    )

    expect(result.current.failedWithoutData).toBe(false)
    expect(result.current.loadError).toBe(BOOM)
    expect(result.current.data).toEqual({ id: 1 })
  })

  it('isError sem corpo ainda é falha', () => {
    const { result } = renderHook(() =>
      useResourceState(query({ isError: true, error: null })),
    )

    expect(result.current.loadError).toEqual({})
    expect(result.current.failedWithoutData).toBe(true)
  })

  it('sucesso não deixa resíduo de erro', () => {
    const { result } = renderHook(() =>
      useResourceState(query({ data: { id: 1 }, isSuccess: true })),
    )

    expect(result.current.loadError).toBeNull()
    expect(result.current.failedWithoutData).toBe(false)
    expect(result.current.errorDetail).toBeUndefined()
  })
})
```

- [ ] **Step 2: Rode o teste e confirme que falha**

Rode de `frontend/`: `pnpm vitest run src/shared/hooks/useResourceState.test.ts`
Esperado: FAIL — `Failed to resolve import "./useResourceState"`.

- [ ] **Step 3: Implemente**

Crie `frontend/src/shared/hooks/useResourceState.ts`:

```ts
import type { UseQueryResult } from '@tanstack/react-query'
import type { ProblemDetails } from '@shared/api/axios'

/**
 * Os estados de carga de uma query de RECURSO ÚNICO, derivados num lugar só.
 *
 * Irmão do `useLoadState`, não substituto: aquele é tipado
 * `UseQueryResult<T[], …>` e existe pela política "falhou" vs. "veio vazia" de
 * uma LISTA (`isEmpty`, `unusable`, `data.length`). Um recurso único não vem
 * vazio — ou veio, ou não veio —, então esses três predicados não existem aqui.
 * Inventá-los seria a divergência que o `useLoadState` foi extraído para
 * impedir (Q-1/Q-2 do review de 2026-08-14).
 *
 * Recebe o resultado da query, não a query: quem decide key, `enabled` e
 * `select` continua sendo o hook da feature.
 */
export function useResourceState<T>(query: UseQueryResult<T, ProblemDetails>) {
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    errorDetail: query.error?.detail,
    /** Falha no formato que `AppErrorState`/`InlineLoadState` leem. `{}` quando
     * o interceptor não populou o corpo: `isError` sem `error` ainda é falha, e
     * devolver `null` a esconderia. */
    loadError: query.isError ? (query.error ?? ({} as ProblemDetails)) : null,
    /** Falhou E não há nada em cache. É o único que autoriza SUBSTITUIR a tela;
     * com cache em mão o certo é manter o conteúdo e avisar ao lado, porque um
     * refetch falho mantém `data` populado enquanto `status` vira `error`. */
    failedWithoutData: query.isError && query.data === undefined,
    refetch: () => {
      void query.refetch()
    },
  }
}
```

- [ ] **Step 4: Rode o teste e confirme que passa**

Rode: `pnpm vitest run src/shared/hooks/useResourceState.test.ts`
Esperado: PASS — 4 testes.

- [ ] **Step 5: Exporte no barrel**

Em `frontend/src/shared/hooks/index.ts`, adicione a linha em ordem alfabética, logo depois de
`export { useLoadState } from './useLoadState'`:

```ts
export { useResourceState } from './useResourceState'
```

- [ ] **Step 6: Gate e commit**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```
Esperado: lint 0 erros, build verde, suíte inteira passando.

```bash
git add frontend/src/shared/hooks/useResourceState.ts frontend/src/shared/hooks/useResourceState.test.ts frontend/src/shared/hooks/index.ts
git commit -m "feat(shared): useResourceState para estados de carga de recurso unico"
```

---

### Task 2: namespace i18n `profile` nos três locales

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: nada.
- Produces: as chaves `profile.*` que as Tasks 4–10 consomem por `t()`. Reusa, sem duplicar,
  `documentType.{CV,REUF,TITULO,POSTGRADO}`, `photo.*`, `userMenu.profile`, `common.*`.

Não existe teste de paridade de chaves (`i18n.test.ts` protege a sincronia de `<html lang>`, não os
dicionários). Os três arquivos entram no mesmo commit, e o Step 3 confere a paridade à mão.

- [ ] **Step 1: `es-CL.json` — a referência de rótulo**

Adicione o objeto `"profile"` no nível raiz, depois de `"placeholder"`:

```json
  "profile": {
    "subtitle": "Tus datos personales, tu seguridad y tu documentación profesional.",
    "loadError": "No se pudo cargar tu perfil",
    "identity": {
      "title": "Identidad",
      "email": "Correo electrónico",
      "rut": "RUT",
      "role": "Perfil",
      "noRut": "Sin RUT registrado",
      "managedByAdmin": "Estos datos los administra el equipo de Lotus."
    },
    "personal": {
      "title": "Datos personales",
      "name": "Nombre",
      "phone": "Teléfono",
      "save": "Guardar cambios",
      "saved": "Tus datos fueron actualizados."
    },
    "security": {
      "title": "Seguridad",
      "currentPassword": "Contraseña actual",
      "newPassword": "Contraseña nueva",
      "confirmPassword": "Repite la contraseña nueva",
      "warning": "Al cambiar tu contraseña se cerrarán tus otras sesiones. Esta sesión sigue abierta.",
      "save": "Cambiar contraseña",
      "saved": "Tu contraseña fue cambiada."
    },
    "documents": {
      "title": "Documentación profesional",
      "hint": "Puedes subir y reemplazar tus documentos. No se eliminan: el nuevo reemplaza al anterior.",
      "send": "Subir documento",
      "replace": "Reemplazar",
      "managedByAdmin": "Este documento lo gestiona el administrador.",
      "sent": "Documento subido.",
      "validUntil": "Vence el {{date}}",
      "noValidity": "Sin fecha de vencimiento"
    },
    "docStatus": {
      "vigente": "Vigente",
      "vence_em_breve": "Por vencer",
      "vencido": "Vencido",
      "ausente": "Sin subir"
    },
    "summary": {
      "title": "Resumen profesional",
      "enabledCourses": "Cursos habilitados",
      "noCourses": "Aún no tienes cursos habilitados.",
      "goToDashboard": "Ir a mi panel"
    }
  },
```

- [ ] **Step 2: `pt-BR.json` e `en.json` — as mesmas chaves**

Em `frontend/src/shared/config/locales/pt-BR.json`:

```json
  "profile": {
    "subtitle": "Seus dados pessoais, sua segurança e sua documentação profissional.",
    "loadError": "Não foi possível carregar seu perfil",
    "identity": {
      "title": "Identidade",
      "email": "E-mail",
      "rut": "RUT",
      "role": "Perfil",
      "noRut": "Sem RUT cadastrado",
      "managedByAdmin": "Estes dados são administrados pela equipe Lotus."
    },
    "personal": {
      "title": "Dados pessoais",
      "name": "Nome",
      "phone": "Telefone",
      "save": "Salvar alterações",
      "saved": "Seus dados foram atualizados."
    },
    "security": {
      "title": "Segurança",
      "currentPassword": "Senha atual",
      "newPassword": "Nova senha",
      "confirmPassword": "Repita a nova senha",
      "warning": "Ao trocar sua senha, suas outras sessões serão encerradas. Esta sessão continua aberta.",
      "save": "Trocar senha",
      "saved": "Sua senha foi alterada."
    },
    "documents": {
      "title": "Documentação profissional",
      "hint": "Você pode enviar e substituir seus documentos. Eles não são excluídos: o novo substitui o anterior.",
      "send": "Enviar documento",
      "replace": "Substituir",
      "managedByAdmin": "Este documento é gerido pelo administrador.",
      "sent": "Documento enviado.",
      "validUntil": "Vence em {{date}}",
      "noValidity": "Sem data de vencimento"
    },
    "docStatus": {
      "vigente": "Vigente",
      "vence_em_breve": "A vencer",
      "vencido": "Vencido",
      "ausente": "Não enviado"
    },
    "summary": {
      "title": "Resumo profissional",
      "enabledCourses": "Cursos habilitados",
      "noCourses": "Você ainda não tem cursos habilitados.",
      "goToDashboard": "Ir ao meu painel"
    }
  },
```

Em `frontend/src/shared/config/locales/en.json`:

```json
  "profile": {
    "subtitle": "Your personal data, your security and your professional documents.",
    "loadError": "Could not load your profile",
    "identity": {
      "title": "Identity",
      "email": "Email",
      "rut": "RUT",
      "role": "Profile",
      "noRut": "No RUT on file",
      "managedByAdmin": "This information is managed by the Lotus team."
    },
    "personal": {
      "title": "Personal data",
      "name": "Name",
      "phone": "Phone",
      "save": "Save changes",
      "saved": "Your data was updated."
    },
    "security": {
      "title": "Security",
      "currentPassword": "Current password",
      "newPassword": "New password",
      "confirmPassword": "Repeat the new password",
      "warning": "Changing your password will close your other sessions. This session stays open.",
      "save": "Change password",
      "saved": "Your password was changed."
    },
    "documents": {
      "title": "Professional documents",
      "hint": "You can upload and replace your documents. They are not deleted: the new one replaces the previous.",
      "send": "Upload document",
      "replace": "Replace",
      "managedByAdmin": "This document is managed by the administrator.",
      "sent": "Document uploaded.",
      "validUntil": "Valid until {{date}}",
      "noValidity": "No expiry date"
    },
    "docStatus": {
      "vigente": "Valid",
      "vence_em_breve": "Expiring soon",
      "vencido": "Expired",
      "ausente": "Not uploaded"
    },
    "summary": {
      "title": "Professional summary",
      "enabledCourses": "Enabled courses",
      "noCourses": "You have no enabled courses yet.",
      "goToDashboard": "Go to my dashboard"
    }
  },
```

- [ ] **Step 3: Confira a paridade das chaves — nenhum teste faz isso por você**

```bash
cd frontend && node -e "
const p=(l)=>{const f=(o,k='')=>Object.entries(o).flatMap(([a,v])=>typeof v==='object'&&v?f(v,k+a+'.'):[k+a]);
return f(require('./src/shared/config/locales/'+l+'.json')).sort()};
const [a,b,c]=['es-CL','pt-BR','en'].map(p);
const eq=(x,y)=>x.length===y.length&&x.every((v,i)=>v===y[i]);
console.log('es-CL x pt-BR:', eq(a,b)); console.log('es-CL x en:', eq(a,c));
console.log('chaves profile:', a.filter(k=>k.startsWith('profile.')).length);
"
```
Esperado: `true`, `true`, `chaves profile: 36`.

- [ ] **Step 4: Gate e commit**

```bash
cd frontend && pnpm lint && pnpm build && pnpm test
```

```bash
git add frontend/src/shared/config/locales/es-CL.json frontend/src/shared/config/locales/pt-BR.json frontend/src/shared/config/locales/en.json
git commit -m "feat(i18n): namespace profile nos tres locales"
```

---

### Task 3: camada de API — query e mutations do perfil

**Files:**
- Create: `frontend/src/features/identity/api/useProfile.ts`

**Interfaces:**
- Consumes: `useResourceState` (Task 1, indiretamente pela Task 4); tipos de `@shared/types/generated`.
- Produces:
  - `PROFILE_KEY: readonly ['profile']`
  - `useProfile(): UseQueryResult<ProfileData, ProblemDetails>`
  - `useUpdateProfile(): UseMutationResult<ProfileData, ProblemDetails, ProfileUpdateData>`
  - `useUploadProfilePhoto(): UseMutationResult<void, ProblemDetails, File>`
  - `useRemoveProfilePhoto(): UseMutationResult<void, ProblemDetails, void>`
  - `useChangePassword(): UseMutationResult<void, ProblemDetails, ProfilePasswordData>`
  - `useUploadProfileDocument(): UseMutationResult<RedatorDocumentData, ProblemDetails, { type: RedatorDocumentType; file: File; valid_until?: string | null }>`

Sem teste unitário próprio: é transporte, e a política de invalidação que ele carrega é provada
end-to-end no DoD (Task 11) e exercitada pelos testes de hook das Tasks 6, 7 e 9. O que o
type-check garante aqui — generics em todo `api.<verbo><T>` — é o que a lição 6 exige.

- [ ] **Step 1: Escreva o arquivo**

Crie `frontend/src/features/identity/api/useProfile.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import { postMultipart } from '@shared/api/postMultipart'
import type {
  ProfileData,
  ProfilePasswordData,
  ProfileUpdateData,
  RedatorDocumentData,
  RedatorDocumentType,
} from '@shared/types/generated'

/** Perfil próprio. `['me']` é a chave da SESSÃO e continua sendo outra coisa:
 * sessão e perfil têm formas e ciclos de vida diferentes (D4 do bloco 1). */
export const PROFILE_KEY = ['profile'] as const
const SESSION_KEY = ['me'] as const

export function useProfile() {
  return useQuery<ProfileData, ProblemDetails>({
    queryKey: PROFILE_KEY,
    queryFn: () => api.get<ProfileData>('/api/profile').then((r) => r.data),
  })
}

/**
 * Invalida o perfil e, quando o que mudou aparece no shell, também a sessão.
 *
 * `SessionUserData` carrega `name` e `photo_url`, e `useSessionBootstrap` já
 * reage a toda mudança de `data` do `useMe()` chamando `setUser` — é assim que
 * o header atualiza. Escrever no `sessionStore` a partir da tela criaria a
 * segunda fonte manual de verdade que a spec proíbe (D8).
 *
 * Documento e senha NÃO tocam a sessão: invalidar `['me']` ali seria refetch
 * inútil em toda troca de senha.
 */
function useInvalidate(alsoSession: boolean) {
  const qc = useQueryClient()
  return async () => {
    await qc.invalidateQueries({ queryKey: PROFILE_KEY })
    if (alsoSession) await qc.invalidateQueries({ queryKey: SESSION_KEY })
  }
}

export function useUpdateProfile() {
  const invalidate = useInvalidate(true)
  return useMutation<ProfileData, ProblemDetails, ProfileUpdateData>({
    mutationFn: (payload) => api.put<ProfileData>('/api/profile', payload).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUploadProfilePhoto() {
  const invalidate = useInvalidate(true)
  return useMutation<void, ProblemDetails, File>({
    // Rota singular, sem id: o alvo é sempre `$request->user()`. Por isso este
    // caminho não passa por `photoResource`/`useEntityPhoto`, que montam
    // `/api/<recurso>/<id>/photo` e bufferizam foto de criação (spec D7).
    mutationFn: (photo) => postMultipart<void>('/api/profile/photo', { photo }),
    onSuccess: invalidate,
  })
}

export function useRemoveProfilePhoto() {
  const invalidate = useInvalidate(true)
  return useMutation<void, ProblemDetails, void>({
    mutationFn: () => api.delete('/api/profile/photo').then(() => undefined),
    onSuccess: invalidate,
  })
}

/** 204 e nada a invalidar: a troca de senha não muda leitura nenhuma da tela.
 * A sessão atual segue aberta — só as OUTRAS morrem (D3 do bloco 1). */
export function useChangePassword() {
  return useMutation<void, ProblemDetails, ProfilePasswordData>({
    mutationFn: (payload) => api.put('/api/profile/password', payload).then(() => undefined),
  })
}

export function useUploadProfileDocument() {
  const invalidate = useInvalidate(false)
  return useMutation<
    RedatorDocumentData,
    ProblemDetails,
    { type: RedatorDocumentType; file: File; valid_until?: string | null }
  >({
    // `valid_until` vazio vira `undefined`: `postMultipart` OMITE a chave, em
    // vez de mandar a string "undefined" para uma coluna de data.
    mutationFn: ({ type, file, valid_until }) =>
      postMultipart<RedatorDocumentData>('/api/profile/documents', {
        type,
        file,
        valid_until: valid_until || undefined,
      }),
    onSuccess: invalidate,
  })
}
```

- [ ] **Step 2: Confirme que compila e que o lint aceita**

```bash
cd frontend && pnpm build && pnpm lint
```
Esperado: build verde, lint 0. Se `pnpm lint` reprovar `new FormData()`, o arquivo não está usando
`postMultipart` — corrija antes de seguir.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/identity/api/useProfile.ts
git commit -m "feat(identity): camada de API do perfil proprio"
```

---

### Task 4: `ProfilePage` com os ramos de carga, e a rota

**Files:**
- Create: `frontend/src/features/identity/hooks/useProfilePage.ts`
- Create: `frontend/src/features/identity/components/Profile/ProfilePage.tsx`
- Modify: `frontend/src/app/router/AppRouter.tsx:68`

**Interfaces:**
- Consumes: `useResourceState` (Task 1), `useProfile` (Task 3), chaves `profile.*` (Task 2).
- Produces: `useProfilePage()` → o retorno de `useResourceState<ProfileData>`; `<ProfilePage />`,
  default-less named export montado pela rota `/perfil`.

Nesta task a página monta apenas os ramos de carga e o grid vazio. As Tasks 5–10 preenchem as
colunas; cada uma delas volta aqui para acrescentar **uma** linha de JSX.

- [ ] **Step 1: Escreva o hook de página**

Crie `frontend/src/features/identity/hooks/useProfilePage.ts`:

```ts
import { useResourceState } from '@shared/hooks'
import { useProfile } from '../api/useProfile'

/**
 * Alias de página: existe para a query NÃO viver no componente.
 *
 * Não é delegação vazia — é o que mantém `useQuery` fora de
 * `components/**`, do mesmo jeito que os 7 `useXPage` das outras features.
 * Eliminá-lo regrediria a fronteira, e o lint não veria (frontend-fsliced.md).
 */
export function useProfilePage() {
  return useResourceState(useProfile())
}
```

- [ ] **Step 2: Escreva a página**

Crie `frontend/src/features/identity/components/Profile/ProfilePage.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppDetailSkeleton, AppErrorState, InlineLoadState, ModulePage } from '@shared/ui'
import { useProfilePage } from '../../hooks/useProfilePage'

/**
 * Mi perfil. Duas colunas com corte por MUTABILIDADE (spec D1): à esquerda o
 * que o usuário não controla (identidade, papel, resumo), à direita exatamente
 * o que é self-service. A regra do bloco é a regra visível do layout.
 *
 * O que ramifica a tela é o DADO que falta, não o `status` da query:
 * `failedWithoutData` é o único que troca o conteúdo pelo erro; falha COM
 * perfil em cache vira aviso ao lado e preserva o que o usuário digitou.
 */
export function ProfilePage() {
  const { t } = useTranslation()
  const { data: profile, isLoading, loadError, errorDetail, failedWithoutData, refetch } =
    useProfilePage()

  if (isLoading) return <AppDetailSkeleton />

  if (failedWithoutData || !profile) {
    return (
      <ModulePage title={t('userMenu.profile')} description={t('profile.subtitle')}>
        <AppErrorState
          title={t('profile.loadError')}
          detail={errorDetail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={refetch}
        />
      </ModulePage>
    )
  }

  return (
    <ModulePage title={t('userMenu.profile')} description={t('profile.subtitle')}>
      <InlineLoadState
        error={loadError ? (errorDetail ?? t('common.loadErrorHint')) : null}
        retryLabel={t('common.retry')}
        onRetry={refetch}
      />

      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {/* Task 5: <ProfileIdentityCard /> · Task 10: <ProfileSummaryCard /> */}
        </div>
        <div className="flex flex-col gap-4">
          {/* Task 6: <ProfilePersonalSection /> · Task 7: <ProfileSecuritySection /> · Task 9: <ProfileDocumentsSection /> */}
        </div>
      </div>
    </ModulePage>
  )
}
```

- [ ] **Step 3: Troque o placeholder pela página real**

Em `frontend/src/app/router/AppRouter.tsx`, adicione o import junto dos outros de `identity`
(depois da linha do `AdministracionPage`):

```tsx
import { ProfilePage } from '@features/identity/components/Profile/ProfilePage'
```

E troque a linha 68:

```tsx
          <Route path="/perfil" element={<ModulePlaceholder titleKey="userMenu.profile" />} />
```

por:

```tsx
          <Route path="/perfil" element={<ProfilePage />} />
```

`ModulePlaceholder` continua importado e usado? Confira: se nenhuma outra rota o usa, remova
também o import, senão o lint reprova por variável não usada.

```bash
cd frontend && grep -n "ModulePlaceholder" src/app/router/AppRouter.tsx
```

- [ ] **Step 4: Gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```
Esperado: os três verdes.

- [ ] **Step 5: Prove no navegador**

Suba `pnpm dev`, entre como admin e abra http://localhost:5173/perfil.
Esperado: o título "Mi perfil", o subtítulo e a área de duas colunas vazia — **não** mais o
placeholder de módulo. Recarregue com o backend derrubado (`docker compose stop nginx`) e confirme
o `AppErrorState` com "Reintentar"; suba de novo (`docker compose start nginx`) e clique em
Reintentar para ver a página voltar.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/hooks/useProfilePage.ts frontend/src/features/identity/components/Profile/ProfilePage.tsx frontend/src/app/router/AppRouter.tsx
git commit -m "feat(identity): pagina Mi perfil com ramos de carga na rota /perfil"
```

---

### Task 5: coluna esquerda — cartão de identidade e foto

**Files:**
- Create: `frontend/src/features/identity/hooks/useProfilePhoto.ts`
- Create: `frontend/src/features/identity/components/Profile/ProfileIdentityCard.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `useUploadProfilePhoto`, `useRemoveProfilePhoto` (Task 3); `AppPhotoField`, `AppCard`,
  `FormField`, `FormSection` de `@shared/ui`.
- Produces:
  - `useProfilePhoto(url: string | null)` → `{ url: string | null, pending: boolean, error: string | null, onSelect: (file: File) => void, onRemove: () => void, onSizeReject: (message: string) => void, onRetry: (() => void) | undefined }` — exatamente o contrato de props do `AppPhotoField`.
  - `<ProfileIdentityCard profile={profile} />` onde `profile: ProfileData`.

- [ ] **Step 1: Escreva o hook da foto**

Crie `frontend/src/features/identity/hooks/useProfilePhoto.ts`:

```ts
import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import { useRemoveProfilePhoto, useUploadProfilePhoto } from '../api/useProfile'

/**
 * Foto do próprio perfil, no formato de props do `AppPhotoField`.
 *
 * Não reusa `useEntityPhoto` (spec D7): aquele monta `/api/<recurso>/<id>/photo`
 * a partir de um id e carrega o buffer de criação — segurar o arquivo até a
 * entidade existir. As rotas daqui são singulares e sem id, e não há criação a
 * bufferizar. O que se reusa é o componente apresentacional, inteiro.
 */
export function useProfilePhoto(url: string | null) {
  const upload = useUploadProfilePhoto()
  const remove = useRemoveProfilePhoto()
  const [sizeError, setSizeError] = useState<string | null>(null)
  // Último arquivo tentado, para o "Reintentar" reenviar o MESMO arquivo e não
  // o que estiver na tela no momento do clique.
  const [lastTried, setLastTried] = useState<File | null>(null)

  const { message } = useMutationErrors([upload.error, remove.error])

  function onSelect(file: File) {
    setSizeError(null)
    setLastTried(file)
    upload.mutate(file, { onSuccess: () => setLastTried(null) })
  }

  function onRemove() {
    setSizeError(null)
    setLastTried(null)
    remove.mutate()
  }

  return {
    url,
    pending: upload.isPending || remove.isPending,
    // Teto tem precedência: é o erro do arquivo que o usuário acabou de
    // escolher, não o da tentativa anterior.
    error: sizeError ?? message,
    onSelect,
    onRemove,
    onSizeReject: (m: string) => setSizeError(m),
    // `undefined` apaga o botão "Reintentar" no `AppPhotoField`. Com
    // `sizeError` na tela o botão mentiria: reenviaria o arquivo ANTERIOR,
    // não o que acabou de ser recusado pelo teto.
    onRetry:
      sizeError === null && lastTried !== null
        ? () => upload.mutate(lastTried, { onSuccess: () => setLastTried(null) })
        : undefined,
  }
}
```

- [ ] **Step 2: Escreva o cartão**

Crie `frontend/src/features/identity/components/Profile/ProfileIdentityCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppCard, AppPhotoField, FormField, FormSection } from '@shared/ui'
import type { ProfileData } from '@shared/types/generated'
import { useProfilePhoto } from '../../hooks/useProfilePhoto'

/**
 * Coluna esquerda: o que o usuário NÃO controla (spec D1). Papel, e-mail e RUT
 * são leitura de verdade — `FormField readOnly` renderiza texto e devolve `—`
 * quando vazio. Input desabilitado corta o valor e derruba o contraste, e é
 * lint (BD-3 §4).
 *
 * A foto é a exceção deliberada nesta coluna: ela É self-service, mas mora ao
 * lado do nome porque é assim que o usuário a reconhece como sua.
 */
export function ProfileIdentityCard({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation()
  const photo = useProfilePhoto(profile.photo_url)

  return (
    <AppCard className="p-4">
      <AppPhotoField name={profile.name} {...photo} />

      <p className="mt-4 text-center text-base font-semibold" style={{ color: 'var(--text-color)' }}>
        {profile.name}
      </p>
      <p className="text-center text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {profile.role ? t(`roleName.${profile.role}`) : '—'}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <FormSection title={t('profile.identity.title')} />
        <FormField label={t('profile.identity.email')} readOnly value={profile.email} />
        <FormField
          label={t('profile.identity.rut')}
          readOnly
          value={profile.rut ?? t('profile.identity.noRut')}
        />
        <FormField
          label={t('profile.identity.role')}
          readOnly
          value={profile.role ? t(`roleName.${profile.role}`) : null}
        />
        <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.identity.managedByAdmin')}
        </p>
      </div>
    </AppCard>
  )
}
```

- [ ] **Step 3: Monte na página**

Em `frontend/src/features/identity/components/Profile/ProfilePage.tsx`, importe

```tsx
import { ProfileIdentityCard } from './ProfileIdentityCard'
```

e troque o comentário da coluna esquerda por:

```tsx
          <ProfileIdentityCard profile={profile} />
          {/* Task 10: <ProfileSummaryCard /> */}
```

- [ ] **Step 4: Gate**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```
Esperado: verdes. Se o lint reclamar de `COR_HARDCODED`, alguma classe de paleta escapou — troque
por `style={{ color: 'var(--…)' }}`.

- [ ] **Step 5: Prove no navegador**

Em `/perfil`: troque a foto por um JPG pequeno e confirme que ela muda **também no avatar do header**
(é a invalidação de `['me']`). Remova a foto e confirme que voltam as iniciais nos dois lugares.
Tente subir um arquivo acima de 5 MB e confirme a mensagem de teto **sem** requisição na aba Network.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/hooks/useProfilePhoto.ts frontend/src/features/identity/components/Profile/ProfileIdentityCard.tsx frontend/src/features/identity/components/Profile/ProfilePage.tsx
git commit -m "feat(identity): cartao de identidade e foto do perfil proprio"
```

---

### Task 6: `useProfileForm` + seção Datos personales

**Files:**
- Create: `frontend/src/features/identity/hooks/useProfileForm.ts`
- Test: `frontend/src/features/identity/hooks/useProfileForm.test.tsx`
- Create: `frontend/src/features/identity/components/Profile/ProfilePersonalSection.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `useUpdateProfile` (Task 3), `useMutationErrors` de `@shared/hooks`.
- Produces: `useProfileForm(profile: ProfileData, onSaved?: () => void)` → `{ form: { name: string; phone: string }, set: (k: 'name' | 'phone', v: string) => void, submit: () => void, pending: boolean, fieldErrors: Record<string, string[]> | undefined, generalError: string | null }`. O segundo parâmetro é opcional: o teste do Step 1 chama o hook com um argumento só.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/features/identity/hooks/useProfileForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ProfileData } from '@shared/types/generated'
import { useProfileForm } from './useProfileForm'

const enviados = vi.hoisted(() => ({ payloads: [] as unknown[] }))

vi.mock('../api/useProfile', () => ({
  useUpdateProfile: () => ({
    mutate: (payload: unknown) => enviados.payloads.push(payload),
    isPending: false,
    error: null,
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function perfil(over: Partial<ProfileData> = {}): ProfileData {
  return {
    id: 1, uuid: 'u', name: 'Juan Morales', email: 'juan@lotus.cl',
    rut: '18.400.000-2', phone: '+56 9 1111 1111', type: 'staff',
    role: 'redator', photo_url: null, redator: null, ...over,
  }
}

describe('useProfileForm', () => {
  it('semeia o form a partir do perfil', () => {
    const { result } = renderHook(() => useProfileForm(perfil()), { wrapper })

    expect(result.current.form).toEqual({ name: 'Juan Morales', phone: '+56 9 1111 1111' })
  })

  it('telefone nulo vira string vazia, nao a string "null"', () => {
    const { result } = renderHook(() => useProfileForm(perfil({ phone: null })), { wrapper })

    expect(result.current.form.phone).toBe('')
  })

  it('refetch com o MESMO id nao apaga o que o usuario digitou', () => {
    const { result, rerender } = renderHook((p: ProfileData) => useProfileForm(p), {
      wrapper,
      initialProps: perfil(),
    })

    act(() => result.current.set('name', 'Juan M. Morales'))
    // Objeto NOVO, mesmo id — é o que um refetch produz.
    rerender(perfil())

    expect(result.current.form.name).toBe('Juan M. Morales')
  })

  it('envia name e phone, e telefone vazio vira null', () => {
    enviados.payloads = []
    const { result } = renderHook(() => useProfileForm(perfil({ phone: null })), { wrapper })

    act(() => result.current.set('name', 'Ana'))
    act(() => result.current.submit())

    expect(enviados.payloads).toEqual([{ name: 'Ana', phone: null }])
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

```bash
cd frontend && pnpm vitest run src/features/identity/hooks/useProfileForm.test.tsx
```
Esperado: FAIL — `Failed to resolve import "./useProfileForm"`.

- [ ] **Step 3: Implemente o hook**

Crie `frontend/src/features/identity/hooks/useProfileForm.ts`:

```ts
import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type { ProfileData } from '@shared/types/generated'
import { useUpdateProfile } from '../api/useProfile'

type Campos = { name: string; phone: string }

function toFields(profile: ProfileData): Campos {
  return { name: profile.name, phone: profile.phone ?? '' }
}

/**
 * Nome e telefone — os dois únicos campos que `ProfileUpdateData` aceita.
 *
 * O reset compara o **id**, não a identidade do objeto: um refetch produz um
 * objeto novo com o mesmo id, e resetar ali apagaria o que o usuário digitou.
 * É "adjust state during render", não `useEffect` + `setState`, que é proibido
 * pelo `react-hooks/set-state-in-effect` (molde: `useEntityForm`).
 */
export function useProfileForm(profile: ProfileData, onSaved?: () => void) {
  const update = useUpdateProfile()
  const [form, setForm] = useState<Campos>(() => toFields(profile))
  const [prevId, setPrevId] = useState(profile.id)

  if (profile.id !== prevId) {
    setPrevId(profile.id)
    setForm(toFields(profile))
  }

  const { fieldErrors, generalError } = useMutationErrors([update.error])

  return {
    form,
    set: (k: keyof Campos, v: string) => setForm((f) => ({ ...f, [k]: v })),
    // Telefone em branco é AUSÊNCIA, e o DTO aceita `null`. Mandar `''` gravaria
    // string vazia numa coluna que distingue "sem telefone" de "telefone vazio".
    submit: () =>
      update.mutate({ name: form.name, phone: form.phone.trim() || null }, { onSuccess: onSaved }),
    pending: update.isPending,
    fieldErrors,
    generalError,
  }
}
```

- [ ] **Step 4: Rode e confirme que passa**

```bash
cd frontend && pnpm vitest run src/features/identity/hooks/useProfileForm.test.tsx
```
Esperado: PASS — 4 testes.

- [ ] **Step 5: Escreva a seção**

Crie `frontend/src/features/identity/components/Profile/ProfilePersonalSection.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import {
  AppButton, AppCard, AppInputText, FormErrorBanner, FormErrorSummary, FormField, FormSection,
} from '@shared/ui'
import { useToast } from '@shared/ui'
import type { ProfileData } from '@shared/types/generated'
import { useProfileForm } from '../../hooks/useProfileForm'

/** Coluna direita: exatamente o que é self-service. */
export function ProfilePersonalSection({ profile }: { profile: ProfileData }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { form, set, submit, pending, fieldErrors, generalError } = useProfileForm(profile, () =>
    toast.success(t('profile.personal.saved')),
  )

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.personal.title')} />

      <div className="mt-3 flex flex-col gap-3">
        <FormErrorBanner message={generalError} />
        <FormErrorSummary errors={fieldErrors} mapped={['name', 'phone']} />

        <FormField label={t('profile.personal.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText
            className="w-full"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </FormField>

        <FormField label={t('profile.personal.phone')} error={fieldErrors?.phone?.[0]}>
          <AppInputText
            className="w-full"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </FormField>

        <div>
          <AppButton
            label={t('profile.personal.save')}
            icon="pi pi-check"
            loading={pending}
            onClick={() => submit()}
          />
        </div>
      </div>
    </AppCard>
  )
}
```

- [ ] **Step 6: Monte na página**

Em `ProfilePage.tsx`, importe `ProfilePersonalSection` e troque o comentário da coluna direita por:

```tsx
          <ProfilePersonalSection profile={profile} />
          {/* Task 7: <ProfileSecuritySection /> · Task 9: <ProfileDocumentsSection /> */}
```

- [ ] **Step 7: Gate, prova e commit**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

No navegador: mude o nome, salve, e confirme que **o nome no header muda junto**. Recarregue e
confirme que persistiu. Apague o telefone, salve, recarregue: deve ficar em branco, não com "null".

```bash
git add frontend/src/features/identity/hooks/useProfileForm.ts frontend/src/features/identity/hooks/useProfileForm.test.tsx frontend/src/features/identity/components/Profile/ProfilePersonalSection.tsx frontend/src/features/identity/components/Profile/ProfilePage.tsx
git commit -m "feat(identity): secao Datos personales do perfil proprio"
```

---

### Task 7: `useProfilePassword` + seção Seguridad

**Files:**
- Create: `frontend/src/features/identity/hooks/useProfilePassword.ts`
- Test: `frontend/src/features/identity/hooks/useProfilePassword.test.tsx`
- Create: `frontend/src/features/identity/components/Profile/ProfileSecuritySection.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `useChangePassword` (Task 3).
- Produces: `useProfilePassword(onChanged?: () => void)` → `{ form: ProfilePasswordData, set: (k: keyof ProfilePasswordData, v: string) => void, submit: () => void, pending: boolean, fieldErrors, generalError }`.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/features/identity/hooks/useProfilePassword.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useProfilePassword } from './useProfilePassword'

const chamadas = vi.hoisted(() => ({
  payloads: [] as unknown[],
  falhar: false,
}))

vi.mock('../api/useProfile', () => ({
  useChangePassword: () => ({
    mutate: (payload: unknown, opts?: { onSuccess?: () => void }) => {
      chamadas.payloads.push(payload)
      if (!chamadas.falhar) opts?.onSuccess?.()
    },
    isPending: false,
    error: null,
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useProfilePassword', () => {
  it('envia os tres campos que o DTO exige', () => {
    chamadas.payloads = []
    chamadas.falhar = false
    const { result } = renderHook(() => useProfilePassword(), { wrapper })

    act(() => result.current.set('current_password', 'antiga'))
    act(() => result.current.set('password', 'nova-secreta-1'))
    act(() => result.current.set('password_confirmation', 'nova-secreta-1'))
    act(() => result.current.submit())

    expect(chamadas.payloads).toEqual([
      { current_password: 'antiga', password: 'nova-secreta-1', password_confirmation: 'nova-secreta-1' },
    ])
  })

  it('sucesso limpa os tres campos e avisa quem pediu', () => {
    chamadas.payloads = []
    chamadas.falhar = false
    const avisado = vi.fn()
    const { result } = renderHook(() => useProfilePassword(avisado), { wrapper })

    act(() => result.current.set('password', 'nova-secreta-1'))
    act(() => result.current.submit())

    expect(result.current.form).toEqual({
      current_password: '', password: '', password_confirmation: '',
    })
    expect(avisado).toHaveBeenCalledOnce()
  })

  it('falha NAO limpa: o usuario nao redigita o que ele acertou', () => {
    chamadas.payloads = []
    chamadas.falhar = true
    const { result } = renderHook(() => useProfilePassword(), { wrapper })

    act(() => result.current.set('current_password', 'antiga'))
    act(() => result.current.submit())

    expect(result.current.form.current_password).toBe('antiga')
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

```bash
cd frontend && pnpm vitest run src/features/identity/hooks/useProfilePassword.test.tsx
```
Esperado: FAIL — módulo inexistente.

- [ ] **Step 3: Implemente**

Crie `frontend/src/features/identity/hooks/useProfilePassword.ts`:

```ts
import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type { ProfilePasswordData } from '@shared/types/generated'
import { useChangePassword } from '../api/useProfile'

const VAZIO: ProfilePasswordData = {
  current_password: '',
  password: '',
  password_confirmation: '',
}

/**
 * Troca da própria senha. Sem seed: senha não se lê do servidor.
 *
 * Limpa os campos SÓ no sucesso. Limpar sempre obrigaria o usuário a redigitar
 * a senha atual que ele já tinha acertado quando o 422 foi sobre a nova.
 */
export function useProfilePassword(onChanged?: () => void) {
  const change = useChangePassword()
  const [form, setForm] = useState<ProfilePasswordData>(VAZIO)

  const { fieldErrors, generalError } = useMutationErrors([change.error])

  return {
    form,
    set: (k: keyof ProfilePasswordData, v: string) => setForm((f) => ({ ...f, [k]: v })),
    submit: () =>
      change.mutate(form, {
        onSuccess: () => {
          setForm(VAZIO)
          onChanged?.()
        },
      }),
    pending: change.isPending,
    fieldErrors,
    generalError,
  }
}
```

- [ ] **Step 4: Rode e confirme que passa**

```bash
cd frontend && pnpm vitest run src/features/identity/hooks/useProfilePassword.test.tsx
```
Esperado: PASS — 3 testes.

- [ ] **Step 5: Escreva a seção**

Crie `frontend/src/features/identity/components/Profile/ProfileSecuritySection.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import {
  AppButton, AppCard, AppPassword, FormErrorBanner, FormErrorSummary, FormField, FormSection, useToast,
} from '@shared/ui'
import { useProfilePassword } from '../../hooks/useProfilePassword'

const MAPEADOS = ['current_password', 'password', 'password_confirmation']

/**
 * Troca de senha inline, na coluna self-service (spec D4).
 *
 * O aviso fica ACIMA do botão, onde é lido antes de agir: trocar a senha
 * encerra as outras sessões do usuário (D3 do bloco 1) e a atual sobrevive.
 */
export function ProfileSecuritySection() {
  const { t } = useTranslation()
  const toast = useToast()
  const { form, set, submit, pending, fieldErrors, generalError } = useProfilePassword(() =>
    toast.success(t('profile.security.saved')),
  )

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.security.title')} />

      <div className="mt-3 flex flex-col gap-3">
        <FormErrorBanner message={generalError} />
        <FormErrorSummary errors={fieldErrors} mapped={MAPEADOS} />

        <FormField
          label={t('profile.security.currentPassword')}
          error={fieldErrors?.current_password?.[0]}
        >
          <AppPassword
            className="w-full"
            value={form.current_password}
            onChange={(e) => set('current_password', e.target.value)}
          />
        </FormField>

        <FormField label={t('profile.security.newPassword')} error={fieldErrors?.password?.[0]}>
          <AppPassword
            className="w-full"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
          />
        </FormField>

        <FormField
          label={t('profile.security.confirmPassword')}
          error={fieldErrors?.password_confirmation?.[0]}
        >
          <AppPassword
            className="w-full"
            value={form.password_confirmation}
            onChange={(e) => set('password_confirmation', e.target.value)}
          />
        </FormField>

        <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.security.warning')}
        </p>

        <div>
          <AppButton
            label={t('profile.security.save')}
            icon="pi pi-lock"
            loading={pending}
            onClick={() => submit()}
          />
        </div>
      </div>
    </AppCard>
  )
}
```

- [ ] **Step 6: Monte na página**

Em `ProfilePage.tsx`, importe `ProfileSecuritySection` e acrescente-o depois de
`ProfilePersonalSection`:

```tsx
          <ProfileSecuritySection />
```

- [ ] **Step 7: Gate, prova e commit**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

No navegador: envie a senha atual errada e confirme o 422 no campo certo, com os outros campos
preservados. Troque a senha de verdade e confirme o toast, os campos limpos e que **a sessão atual
continua navegando** (clique em outra rota sem recarregar).

```bash
git add frontend/src/features/identity/hooks/useProfilePassword.ts frontend/src/features/identity/hooks/useProfilePassword.test.tsx frontend/src/features/identity/components/Profile/ProfileSecuritySection.tsx frontend/src/features/identity/components/Profile/ProfilePage.tsx
git commit -m "feat(identity): secao Seguridad com troca de senha no perfil proprio"
```

---

### Task 8: `ProfileDocumentSlot` — o slot que consome o status do backend

**Files:**
- Create: `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.tsx`
- Test: `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx`

**Interfaces:**
- Consumes: `AppTag`, `AppFileRow`, `AppFileActions`, `AppFileUpload`, `AppButton` de `@shared/ui`;
  `RedatorProfileDocumentData` e `DocumentValidityStatus` de `@shared/types/generated`.
- Produces:
```ts
export type ProfileDocumentSlotProps = {
  doc: RedatorProfileDocumentData
  uploading: boolean
  onUpload: (type: RedatorDocumentType, e: FileUploadHandlerEvent) => void
  onSizeReject: (message: string) => void
  onPreview: (file: PreviewableFile) => void
}
export function ProfileDocumentSlot(props: ProfileDocumentSlotProps): JSX.Element
```

Este é o **único** componente do bloco com teste próprio, e o motivo é o gate de `self_service`:
ele decide se um documento de peso legal oferece envio. Teste de componente PrimeReact no jsdom
**está** no corte do runner — a `.claude/rules/frontend-fsliced.md` diz o contrário e é a pendência
**P-38**, que manda a rule valer pelo que o `pnpm test` faz. Molde: `QuotesList.test.tsx`.

O arquivo de teste mora em `components/**` e por isso casa `max-lines: 150` — mantenha-o enxuto.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { ProfileDocumentSlot } from './ProfileDocumentSlot'

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

afterEach(cleanup)

function doc(over: Partial<RedatorProfileDocumentData> = {}): RedatorProfileDocumentData {
  return {
    type: 'CV', status: 'vigente', self_service: true, valid_until: null,
    original_name: 'cv.pdf', size: 1024, created_at: '2026-08-01T10:00:00Z',
    download_url: 'https://minio/cv.pdf', ...over,
  }
}

function montar(over: Partial<RedatorProfileDocumentData> = {}) {
  return render(
    <ProfileDocumentSlot
      doc={doc(over)}
      uploading={false}
      onUpload={() => {}}
      onSizeReject={() => {}}
      onPreview={() => {}}
    />,
  )
}

describe('ProfileDocumentSlot', () => {
  it('exibe o status do BACKEND, sem recalcular por valid_until', () => {
    montar({ status: 'vence_em_breve', valid_until: '2099-01-01' })

    expect(screen.getByText('profile.docStatus.vence_em_breve')).toBeTruthy()
  })

  it('slot ausente oferece ENVIO, e o que ja tem documento oferece SUBSTITUIR', () => {
    const { unmount } = montar({ status: 'ausente', original_name: null, download_url: null, size: null })

    expect(screen.getByText('profile.docStatus.ausente')).toBeTruthy()
    expect(screen.getByText('profile.documents.send')).toBeTruthy()
    expect(screen.queryByText('profile.documents.replace')).toBeNull()
    expect(screen.queryByText('profile.documents.managedByAdmin')).toBeNull()
    unmount()

    // O rótulo é o único aviso de que substituir apaga o anterior.
    montar()
    expect(screen.getByText('profile.documents.replace')).toBeTruthy()
  })

  it('sem self_service NAO ha envio, e a gestao e nomeada', () => {
    montar({ type: 'REUF', self_service: false, status: 'vigente' })

    expect(screen.getByText('profile.documents.managedByAdmin')).toBeTruthy()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

```bash
cd frontend && pnpm vitest run src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx
```
Esperado: FAIL — `Failed to resolve import "./ProfileDocumentSlot"`.

- [ ] **Step 3: Implemente**

Crie `frontend/src/features/identity/components/Profile/ProfileDocumentSlot.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppFileActions, AppFileRow, AppFileUpload, AppTag } from '@shared/ui'
import type { FileUploadHandlerEvent, PreviewableFile } from '@shared/ui'
import type {
  DocumentValidityStatus, RedatorDocumentType, RedatorProfileDocumentData,
} from '@shared/types/generated'

/**
 * `ausente` é NEUTRO, não `danger` (spec D10): o perfil não recebe idoneidade
 * no DTO e não a calcula, então pintar ausência de vermelho seria emitir um
 * veredito de compliance que este contrato não fornece. A ausência aparece
 * como ação pendente, pelo botão de envio.
 */
const SEVERIDADE: Record<DocumentValidityStatus, 'success' | 'warning' | 'danger' | 'secondary'> = {
  vigente: 'success',
  vence_em_breve: 'warning',
  vencido: 'danger',
  ausente: 'secondary',
}

const UPLOAD_CHOOSE_OPTIONS = { icon: 'pi pi-upload', className: 'p-button-text p-button-sm' }

export type ProfileDocumentSlotProps = {
  doc: RedatorProfileDocumentData
  uploading: boolean
  onUpload: (type: RedatorDocumentType, e: FileUploadHandlerEvent) => void
  onSizeReject: (message: string) => void
  onPreview: (file: PreviewableFile) => void
}

/**
 * Um tipo documental em Mi perfil.
 *
 * Irmão do `RedatorDocumentSlot`, não reuso dele (spec D3): o slot
 * administrativo deriva o status no front porque `RedatorDocumentData` não tem
 * `status`; este consome `RedatorProfileDocumentData.status` PRONTO do backend,
 * sem recalcular validade. São duas fontes de verdade para a mesma pergunta, e
 * embutir as duas no mesmo componente é o que faria a tela mentir sob refactor.
 */
export function ProfileDocumentSlot({
  doc, uploading, onUpload, onSizeReject, onPreview,
}: ProfileDocumentSlotProps) {
  const { t } = useTranslation()

  // `PreviewableFile` exige nome e URL não-nulos; o DTO os traz nullable porque
  // o slot ausente é projetado igual. Montar o literal aqui é o que estreita.
  const file: PreviewableFile | null =
    doc.original_name && doc.download_url
      ? { original_name: doc.original_name, size: doc.size ?? undefined, download_url: doc.download_url }
      : null

  // O RÓTULO muda com o estado, e não é cosmética: substituir apaga o
  // documento anterior de forma irreversível, e o texto é o único aviso disso
  // na tela (spec §6, mesmo contrato do `AppPhotoField`). O slot
  // administrativo usa ícone mudo; aqui quem age é o dono do documento.
  const upload = doc.self_service ? (
    <AppFileUpload
      chooseOptions={UPLOAD_CHOOSE_OPTIONS}
      chooseLabel={file ? t('profile.documents.replace') : t('profile.documents.send')}
      disabled={uploading}
      onSizeReject={onSizeReject}
      uploadHandler={(e) => onUpload(doc.type, e)}
    />
  ) : null

  return (
    <div className="rounded border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t(`documentType.${doc.type}`)}</p>
        <AppTag value={t(`profile.docStatus.${doc.status}`)} severity={SEVERIDADE[doc.status]} />
      </div>

      <div className="mt-2">
        {file ? (
          <AppFileRow
            name={file.original_name}
            size={file.size}
            createdAt={doc.created_at}
            actions={<AppFileActions file={file} onPreview={onPreview}>{upload}</AppFileActions>}
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('common.notLoaded')}
            </p>
            {upload}
          </div>
        )}

        {!doc.self_service && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
            {t('profile.documents.managedByAdmin')}
          </p>
        )}

        {file && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
            {doc.valid_until
              ? t('profile.documents.validUntil', {
                  date: new Date(doc.valid_until).toLocaleDateString(),
                })
              : t('profile.documents.noValidity')}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rode e confirme que passa**

```bash
cd frontend && pnpm vitest run src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx
```
Esperado: PASS — 3 testes.

- [ ] **Step 5: Confirme a régua de 150 linhas nos dois arquivos**

```bash
cd frontend && pnpm lint && wc -l src/features/identity/components/Profile/ProfileDocumentSlot*.tsx
```
Esperado: lint 0 e ambos abaixo de 150.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/components/Profile/ProfileDocumentSlot.tsx frontend/src/features/identity/components/Profile/ProfileDocumentSlot.test.tsx
git commit -m "feat(identity): slot documental do perfil consumindo status do backend"
```

---

### Task 9: `useProfileDocuments` + seção Documentación profesional

**Files:**
- Create: `frontend/src/features/identity/hooks/useProfileDocuments.ts`
- Test: `frontend/src/features/identity/hooks/useProfileDocuments.test.tsx`
- Create: `frontend/src/features/identity/components/Profile/ProfileDocumentsSection.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `useUploadProfileDocument` (Task 3), `ProfileDocumentSlot` (Task 8), `useFilePreview` e
  `useMutationErrors` de `@shared/hooks`.
- Produces: `useProfileDocuments(onSent?: () => void)` → `{ upload: (type: RedatorDocumentType, e: FileUploadHandlerEvent) => void, uploadingType: RedatorDocumentType | null, error: string | null, setSizeError: (m: string) => void }`.

- [ ] **Step 1: Escreva o teste que falha**

Crie `frontend/src/features/identity/hooks/useProfileDocuments.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { useProfileDocuments } from './useProfileDocuments'

const envios = vi.hoisted(() => ({ vars: [] as unknown[], pendingType: null as string | null }))

vi.mock('../api/useProfile', () => ({
  useUploadProfileDocument: () => ({
    mutate: (v: unknown, opts?: { onSuccess?: () => void }) => {
      envios.vars.push(v)
      opts?.onSuccess?.()
    },
    isPending: envios.pendingType !== null,
    variables: envios.pendingType ? { type: envios.pendingType } : undefined,
    error: null,
  }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const limpar = vi.fn()

function evento(file: File | undefined): FileUploadHandlerEvent {
  return { files: file ? [file] : [], options: { clear: limpar } } as unknown as FileUploadHandlerEvent
}

describe('useProfileDocuments', () => {
  it('envia o arquivo com o tipo do slot e limpa o controle', () => {
    envios.vars = []
    envios.pendingType = null
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })
    const arquivo = new File(['x'], 'cv.pdf', { type: 'application/pdf' })

    act(() => result.current.upload('CV', evento(arquivo)))

    expect(envios.vars).toEqual([{ type: 'CV', file: arquivo }])
    expect(limpar).toHaveBeenCalled()
  })

  it('evento sem arquivo nao vira requisicao', () => {
    envios.vars = []
    envios.pendingType = null
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })

    act(() => result.current.upload('CV', evento(undefined)))

    expect(envios.vars).toEqual([])
  })

  it('so o slot em voo fica pendente, nao os quatro', () => {
    envios.vars = []
    envios.pendingType = 'TITULO'
    const { result } = renderHook(() => useProfileDocuments(), { wrapper })

    expect(result.current.uploadingType).toBe('TITULO')
  })
})
```

- [ ] **Step 2: Rode e confirme que falha**

```bash
cd frontend && pnpm vitest run src/features/identity/hooks/useProfileDocuments.test.tsx
```
Esperado: FAIL — módulo inexistente.

- [ ] **Step 3: Implemente**

Crie `frontend/src/features/identity/hooks/useProfileDocuments.ts`:

```ts
import { useState } from 'react'
import { useMutationErrors } from '@shared/hooks'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorDocumentType } from '@shared/types/generated'
import { useUploadProfileDocument } from '../api/useProfile'

/**
 * Envio da própria documentação profissional.
 *
 * Não existe remoção self-service: o backend oferece substituição (D2 do bloco
 * 1), e a rota de `destroy` não existe neste caminho. `valid_until` também não
 * é enviado daqui — quem o declara é o administrador, e deixar o redator
 * declarar a própria validade fura a RN-09 (D5 do bloco 1).
 */
export function useProfileDocuments(onSent?: () => void) {
  const upload = useUploadProfileDocument()
  const [sizeError, setSizeError] = useState<string | null>(null)

  const { message } = useMutationErrors([upload.error])

  function enviar(type: RedatorDocumentType, e: FileUploadHandlerEvent) {
    setSizeError(null)
    const file = e.files[0]
    if (file) upload.mutate({ type, file }, { onSuccess: onSent })
    e.options.clear()
  }

  return {
    upload: enviar,
    /** O slot EM VOO, não "algum slot em voo": desabilitar os quatro por causa
     * de um trava a tela inteira num upload de 10 MB. */
    uploadingType: upload.isPending ? (upload.variables?.type ?? null) : null,
    error: sizeError ?? message,
    setSizeError: (m: string) => setSizeError(m),
  }
}
```

- [ ] **Step 4: Rode e confirme que passa**

```bash
cd frontend && pnpm vitest run src/features/identity/hooks/useProfileDocuments.test.tsx
```
Esperado: PASS — 3 testes.

- [ ] **Step 5: Escreva a seção**

Crie `frontend/src/features/identity/components/Profile/ProfileDocumentsSection.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppCard, AppFilePreviewDialog, FormErrorBanner, FormSection, useToast } from '@shared/ui'
import type { PreviewableFile } from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
import type { RedatorProfileDocumentData } from '@shared/types/generated'
import { useProfileDocuments } from '../../hooks/useProfileDocuments'
import { ProfileDocumentSlot } from './ProfileDocumentSlot'

/**
 * Os quatro slots documentais do Redator. O backend projeta SEMPRE os quatro
 * tipos, ausentes inclusive — a tela não decide quais existem.
 */
export function ProfileDocumentsSection({
  documentos,
}: {
  documentos: RedatorProfileDocumentData[]
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const preview = useFilePreview<PreviewableFile>()
  const { upload, uploadingType, error, setSizeError } = useProfileDocuments(() =>
    toast.success(t('profile.documents.sent')),
  )

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.documents.title')} />

      <p className="mt-1 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {t('profile.documents.hint')}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <FormErrorBanner message={error} />

        {documentos.map((doc) => (
          <ProfileDocumentSlot
            key={doc.type}
            doc={doc}
            uploading={uploadingType === doc.type}
            onUpload={upload}
            onSizeReject={setSizeError}
            onPreview={preview.open}
          />
        ))}
      </div>

      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </AppCard>
  )
}
```

- [ ] **Step 6: Monte na página**

Em `ProfilePage.tsx`, importe `ProfileDocumentsSection` e acrescente na coluna direita, depois de
`ProfileSecuritySection`:

```tsx
          {profile.redator && <ProfileDocumentsSection documentos={profile.redator.documentos} />}
```

- [ ] **Step 7: Gate, prova e commit**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```

No navegador, **logado como Redator**: confirme os quatro slots, envie um PDF em CV e veja o status
mudar sem recarregar; confirme que o REUF **não** oferece envio e mostra a nota de gestão
administrativa. Logado como **Admin**: a seção não deve existir.

```bash
git add frontend/src/features/identity/hooks/useProfileDocuments.ts frontend/src/features/identity/hooks/useProfileDocuments.test.tsx frontend/src/features/identity/components/Profile/ProfileDocumentsSection.tsx frontend/src/features/identity/components/Profile/ProfilePage.tsx
git commit -m "feat(identity): secao documental self-service do perfil do redator"
```

---

### Task 10: `ProfileSummaryCard` — resumo profissional do Redator

**Files:**
- Create: `frontend/src/features/identity/components/Profile/ProfileSummaryCard.tsx`
- Modify: `frontend/src/features/identity/components/Profile/ProfilePage.tsx`

**Interfaces:**
- Consumes: `AppCard`, `AppTag`, `AppButton`, `FormSection` de `@shared/ui`; `useNavigate` de
  `react-router-dom`; `RedatorProfileData` de `@shared/types/generated`.
- Produces: `<ProfileSummaryCard redator={profile.redator} />`.

`RedatorProfileData` entrega exatamente `cursos_habilitados: number` e `cursos: string[]` — o corte
D1 do bloco 1 removeu turmas e pendências, e o front **não inventa campo**. O CTA para `/` é o que
a EAP 8.5.5 pede; hoje `/` serve um `DashboardPage` ainda magro, e isso é risco declarado na spec,
não bloqueio.

- [ ] **Step 1: Escreva o cartão**

Crie `frontend/src/features/identity/components/Profile/ProfileSummaryCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppButton, AppCard, AppTag, FormSection } from '@shared/ui'
import type { RedatorProfileData } from '@shared/types/generated'

/**
 * Resumo profissional do Redator, na coluna do que ele não controla.
 *
 * Só cursos: `turmas_em_andamento`, `proximas_turmas` e `pendencias` saíram do
 * contrato pelo corte D1 do bloco 1, que evitou a aresta Identity → Operation.
 * Eles vivem no Dashboard, e o CTA abaixo é o caminho até lá.
 */
export function ProfileSummaryCard({ redator }: { redator: RedatorProfileData }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AppCard className="p-4">
      <FormSection title={t('profile.summary.title')} />

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.summary.enabledCourses')}
        </span>
        <span className="text-2xl font-semibold" style={{ color: 'var(--text-color)' }}>
          {redator.cursos_habilitados}
        </span>
      </div>

      {redator.cursos.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {redator.cursos.map((curso) => (
            <AppTag key={curso} value={curso} severity="info" />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs" style={{ color: 'var(--text-color-secondary)' }}>
          {t('profile.summary.noCourses')}
        </p>
      )}

      <div className="mt-4">
        <AppButton
          label={t('profile.summary.goToDashboard')}
          icon="pi pi-arrow-right"
          iconPos="right"
          outlined
          className="w-full"
          onClick={() => navigate('/')}
        />
      </div>
    </AppCard>
  )
}
```

- [ ] **Step 2: Monte na página**

Em `ProfilePage.tsx`, importe `ProfileSummaryCard` e troque o comentário da coluna esquerda por:

```tsx
          {profile.redator && <ProfileSummaryCard redator={profile.redator} />}
```

- [ ] **Step 3: Confirme que a página inteira está montada**

`ProfilePage.tsx` deve agora ter, na coluna esquerda, `ProfileIdentityCard` + `ProfileSummaryCard`
condicional; e na direita `ProfilePersonalSection` + `ProfileSecuritySection` +
`ProfileDocumentsSection` condicional. Nenhum comentário `{/* Task N: … */}` deve sobrar.

```bash
cd frontend && grep -n "Task " src/features/identity/components/Profile/ProfilePage.tsx
```
Esperado: nenhuma linha.

- [ ] **Step 4: Gate, prova e commit**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test && wc -l src/features/identity/components/Profile/*.tsx
```
Esperado: verdes, e todo componente abaixo de 150 linhas.

No navegador como Redator: a contagem e as tags de curso batem com os cursos habilitados dele, e o
botão leva a `/`. Como Admin: o cartão não existe, e a coluna esquerda continua com conteúdo.

```bash
git add frontend/src/features/identity/components/Profile/ProfileSummaryCard.tsx frontend/src/features/identity/components/Profile/ProfilePage.tsx
git commit -m "feat(identity): resumo profissional do redator no perfil proprio"
```

---

### Task 11: gate final, DoD end-to-end e UI review

**Files:** nenhum arquivo de código novo. Correções que aparecerem aqui entram como commits próprios,
nos paths exatos.

**Interfaces:**
- Consumes: tudo das Tasks 1–10.
- Produces: a prova de que o bloco está pronto para `ready_for_review`.

- [ ] **Step 1: Gate de verificação completo**

```bash
cd frontend && pnpm build && pnpm lint && pnpm test
```
Esperado: build verde, `pnpm lint` com 0 erros e 0 warnings, e a suíte inteira passando com
**5 arquivos de teste novos** em relação à baseline (`useResourceState`, `useProfileForm`,
`useProfilePassword`, `useProfileDocuments`, `ProfileDocumentSlot`).

- [ ] **Step 2: DoD end-to-end contra a API real — Admin**

Com `docker compose up -d` e `pnpm dev`, logado como **admin**:

1. `/perfil` carrega com foto, nome, papel, e-mail e RUT.
2. As seções **Documentación profesional** e **Resumen profesional** NÃO existem.
3. Editar nome e telefone salva, e o nome muda no header sem recarregar.
4. Trocar a foto muda o avatar do header; remover volta às iniciais.
5. Trocar a senha emite o toast, limpa os campos, e a navegação continua funcionando.
6. E-mail, RUT e papel são texto — não há input desabilitado em lugar nenhum.

- [ ] **Step 3: DoD end-to-end contra a API real — Redator**

Logado como **redator**:

1. Os quatro slots aparecem, com o status vindo do backend.
2. CV, TÍTULO e POSTGRADO oferecem envio; **REUF não**, e mostra a nota de gestão administrativa.
3. Enviar um PDF em CV muda o status do slot sem recarregar a página.
4. Enviar arquivo acima de 10 MB mostra a mensagem de teto **sem** requisição (confira em Network).
5. O resumo mostra a contagem e os nomes dos cursos habilitados; o botão leva a `/`.
6. Um segundo upload no mesmo tipo **substitui** — e não existe botão de excluir em slot nenhum.

- [ ] **Step 4: Ramo de falha, provado ao vivo**

Com a página aberta e carregada, derrube o backend (`docker compose stop nginx`) e clique em
Reintentar: a falha deve aparecer **ao lado** do conteúdo, que continua na tela com o que estiver
digitado preservado. Recarregue com o backend ainda derrubado: aí sim `AppErrorState` substitui a
tela. Suba de volta (`docker compose start nginx`).

- [ ] **Step 5: UI review**

Rode `/lotus-ui-review` sobre `/perfil`, cobrindo: Admin e Redator; dados, erro e ausência
documental; os três locales (`es-CL`, `pt-BR`, `en`); os dois temas; desktop e mobile — incluindo
o colapso para uma coluna e o comportamento em 390px de largura.

- [ ] **Step 6: Commit de fechamento (se houver correção) e handoff**

Correções do review entram uma a uma, com escopo próprio. Ao fim, o bloco está pronto para
`/revisar-sprint`; a transição de `state.md` para `ready_for_review` é do fluxo, não desta task.

---

## Handoff de execução

```yaml
executor: claude
```

**Por que Claude e não Codex:** o bloco é quase todo convenção local com mecanismo de lint por trás
— `COR_HARDCODED`, `DISABLED_READONLY` nas três grafias, `max-lines: 150` incidindo inclusive sobre
arquivos de teste, os três seletores de query-em-componente, `postMultipart` como único transporte,
e paridade de chaves em três locales que **nenhum teste protege**. É também trabalho de UI, cujo
gate final é visual (`/lotus-ui-review`) e itera contra o navegador. Delegar aumentaria o custo de
validação do diff sem reduzir o de execução.
