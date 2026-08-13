# `useCrudForm` mais fundo (BD-5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Absorver o trio da foto que se repete nos 4 diálogos de cadastro, migrar o
`useCourseForm` para o `useCrudForm` e fechar o Q-4 com uma guarda que impeça chave computada de
entrar no corpo da escrita.

**Architecture:** O `useCrudForm` ganha três capacidades independentes (guarda de chave proibida,
mutações extras, `afterCreate` retentável). Um hook novo, `useCrudFormWithPhoto`, **compõe**
`useEntityPhoto` com `useCrudForm` e encadeia o `flush` — a composição não pode morar dentro do
`useCrudForm` (ver D-P1). Um componente novo de `shared/ui`, `FormPhotoRow`, recebe o bloco JSX
idêntico nos 4 sítios.

**Tech Stack:** React 19 + TS, TanStack Query v5, Vitest (jsdom) + @testing-library/react,
PrimeReact via `shared/ui`, i18n por `react-i18next`.

**Spec:** `docs/superpowers/specs/archive/2026-08-13-usecrudform-mais-fundo-design.md` (D1–D6)

## Global Constraints

- **Worktree `/home/jvbat/projetos/fix-frontend`, branch `feat/usecrudform-mais-fundo`** (D6). O main
  tree roda a execução paralela de `login-fora-do-adr16` — **não escreva nada lá**.
- **Backend intocado.** `git diff main...HEAD -- backend/ frontend/src/shared/types/generated.ts` tem
  de devolver zero arquivo no gate.
- **Régua de 150 linhas** vale em `src/features/*/components/**` (`eslint.config.js:246-251`), sem
  exceção — o array `ignores` foi zerado no BD-4. `shared/hooks` e `shared/ui` estão fora dela.
- **Features não importam PrimeReact direto nem outra feature** (lei §5.6). `shared/ui` pode importar
  `shared/hooks` (precedente: `Clock.tsx`).
- **Um commit por task.** Comandos rodam de `frontend/`.
- **Baseline medido em `4284ff7`:** `pnpm test` = **29 arquivos / 143 testes**, `pnpm lint` exit 0,
  `pnpm build` verde. Projeção deste plano: **31 arquivos / 156 testes** — 2 arquivos novos e 13
  casos (3 na Task 1, 3 na Task 2, 2 na Task 3, 3 na Task 4, 2 na Task 10).
- **Nenhuma task fecha por lint verde.** Guarda nova fecha por sonda vista reprovando (lição 10).

## Desvio declarado antes de qualquer código (D-P1)

**A D2 diz "`useCrudForm` ganha `photo`". Escrevendo o plano, isso se mostrou impossível na forma
literal, e a razão é regra do React, não gosto:** `useEntityPhoto` chama `useQueryClient`,
`useState`, `useEffect` e dois `useMutation`. Montá-lo condicionalmente
(`if (opts.photo) useEntityPhoto(...)`) viola as regras dos hooks; montá-lo **sempre** faria
`useQueryClient()` lançar `No QueryClient set` nos 8 testes atuais de `useCrudForm.test.ts`, que
rodam sem `QueryClientProvider` de propósito — o `fakeResource` é um literal estrutural, e é isso que
mantém aquele arquivo sem TanStack.

**Resolução:** a capacidade nasce como hook **irmão**, `useCrudFormWithPhoto`, que compõe os dois na
ordem certa e monta o `useEntityPhoto` incondicionalmente. O efeito para os 3 diálogos é o mesmo que
a D2 pede — o `afterCreate` de foto some do sítio de chamada, e `photo`/`busy` chegam prontos —, e o
`useCrudForm` continua testável sem Provider. `useBudgetForm` e `useRoleForm`, que não têm foto,
seguem no `useCrudForm` puro.

---

## File Structure

**Criar:**
- `src/shared/hooks/useCrudFormWithPhoto.ts` — composição `useEntityPhoto` + `useCrudForm`
- `src/shared/hooks/useCrudFormWithPhoto.test.tsx` — testes da composição (com Provider)
- `src/shared/ui/FormPhotoRow/FormPhotoRow.tsx` — o bloco JSX dos 4 sítios
- `src/shared/ui/FormPhotoRow/index.ts` — barrel do componente

**Modificar:**
- `src/shared/hooks/useCrudForm.ts` — guarda Q-4, `extra`, `afterCreate` retentável
- `src/shared/hooks/useCrudForm.test.ts` — casos das três capacidades
- `src/shared/hooks/index.ts` — exportar o hook novo
- `src/shared/ui/index.ts` — exportar o componente novo
- `src/features/identity/hooks/useStudentForm.ts`, `.../useStaffUserForm.ts`,
  `src/features/commercial/hooks/useClientForm.ts` — passam a usar `useCrudFormWithPhoto`
- `src/features/identity/components/Student/StudentDialog.tsx`,
  `src/features/commercial/components/Client/ClientDialog.tsx`,
  `src/features/identity/components/Admin/StaffUserDialog.tsx` — perdem o trio
- `src/features/identity/components/Redator/RedatorDialog.tsx`, `.../RedatorUserSection.tsx` — só o
  `FormPhotoRow`; o hook não migra
- `src/features/catalog/hooks/useCourseForm.ts`, `.../components/Course/CourseDialog.tsx` — migração

---

### Task 1: Guarda do Q-4 — chave computada não entra no payload

**Files:**
- Modify: `src/shared/hooks/useCrudForm.ts`
- Test: `src/shared/hooks/useCrudForm.test.ts`

**Interfaces:**
- Consumes: nada (primeira task)
- Produces: `forbiddenPayloadKeys(keys: string[]): string[]` — exportada do módulo, **não** do
  barrel (`shared/hooks/index.ts` não a reexporta; Q-2 do review de 2026-08-05 fez do barrel
  fronteira pública, e o único consumidor é o teste ao lado por caminho relativo).

- [ ] **Step 1: Escreva o teste que reprova**

Em `src/shared/hooks/useCrudForm.test.ts`, adicione o import e o bloco. O import da primeira linha
passa a ser:

```ts
import { useCrudForm, unclassifiedPayloadKeys, classificationConflicts, forbiddenPayloadKeys } from './useCrudForm'
```

E, depois do `describe('classificationConflicts', ...)`:

```ts
describe('forbiddenPayloadKeys', () => {
  it('não acusa payload limpo', () => {
    expect(forbiddenPayloadKeys(['name', 'rut', 'email'])).toEqual([])
  })

  it('acusa `photo_url` no payload de escrita', () => {
    expect(forbiddenPayloadKeys(['name', 'photo_url'])).toEqual(['photo_url'])
  })
})

describe('useCrudForm — chave proibida', () => {
  it('lança mesmo quando a chave foi classificada, porque classificação não a salva', () => {
    expect(() =>
      renderHook(() =>
        useCrudForm(fakeResource(), {
          ...base,
          entity: null,
          mode: 'create' as const,
          toPayload: (f: Fields) => ({ name: f.name, secret: f.secret, photo_url: null }),
          // A chave está classificada: sem a guarda nova, isto passa.
          summaryOnly: ['secret', 'photo_url'],
        }),
      ),
    ).toThrow(/photo_url/)
  })
})
```

- [ ] **Step 2: Rode e veja reprovar**

```bash
pnpm vitest run src/shared/hooks/useCrudForm.test.ts
```

Esperado: FAIL. Os dois primeiros casos com
`TypeError: forbiddenPayloadKeys is not a function`; o terceiro com
`expected [Function] to throw error matching /photo_url/ but it didn't throw`.

- [ ] **Step 3: Implemente**

Em `src/shared/hooks/useCrudForm.ts`, depois de `classificationConflicts`:

```ts
/**
 * Chaves que NENHUMA classificação salva. `photo_url` é `#[Computed]` nos quatro
 * DTOs que têm foto e carrega URL pré-assinada na saída (o `SignedUrlTransformer`
 * roda na serialização); mandá-la de volta num corpo de escrita devolve **200**,
 * não 422, porque a promoção no construtor do DTO desvia do
 * `CannotSetComputedValue`. Falha silenciosa: o Q-4 dos achados de 2026-08-05.
 *
 * Separado da guarda de classificação de propósito — lá a resposta certa é
 * declarar a chave numa das caixas; aqui nenhuma caixa é resposta certa.
 */
const FORBIDDEN_PAYLOAD_KEYS = ['photo_url']

/** Chaves de saída computada presentes no payload. Ver `FORBIDDEN_PAYLOAD_KEYS`. */
export function forbiddenPayloadKeys(keys: string[]): string[] {
  return keys.filter((k) => FORBIDDEN_PAYLOAD_KEYS.includes(k))
}
```

E dentro do bloco `if (import.meta.env.DEV) {`, **antes** da checagem de `conflicting` (para que a
chave proibida ganhe a mensagem certa mesmo se também estiver duplamente classificada):

```ts
    const forbidden = forbiddenPayloadKeys(keys)

    if (forbidden.length > 0) {
      throw new Error(
        `useCrudForm: chave computada no payload de escrita: ${forbidden.join(', ')}. ` +
          'Nenhuma classificação salva esta chave — ela não é campo de formulário. ' +
          'Remova do `toPayload`: liste os campos em vez de espalhar `...form`.',
      )
    }
```

- [ ] **Step 4: Rode e veja passar**

```bash
pnpm vitest run src/shared/hooks/useCrudForm.test.ts
```

Esperado: PASS, com 3 casos a mais que o arquivo tinha.

- [ ] **Step 5: Prove nos dois sentidos com sonda real (lição 10)**

Verde de teste não distingue "a guarda vale no app" de "a guarda vale no literal do teste". Em
`src/features/identity/hooks/useStudentForm.ts`, troque o `toPayload` inteiro por
`toPayload: (f) => ({ ...f }),` e rode:

```bash
pnpm build
```

Esperado: FAIL do `tsc -b`, porque `StudentFormFields` não tem `photo_url` — **este não é o vermelho
que queremos**. Restaure e faça a sonda no hook que TEM a chave no tipo: em
`src/features/commercial/hooks/useClientForm.ts`, troque o `toPayload` por
`toPayload: (f) => ({ ...f }),` e rode:

```bash
pnpm vitest run src/features/commercial/hooks/useClientForm.test.tsx
```

Esperado: FAIL com `useCrudForm: chave computada no payload de escrita: photo_url`.

- [ ] **Step 6: Restaure a árvore e confirme**

```bash
git checkout -- src/features/commercial/hooks/useClientForm.ts src/features/identity/hooks/useStudentForm.ts
git status --short
```

Esperado: só `src/shared/hooks/useCrudForm.ts` e `src/shared/hooks/useCrudForm.test.ts` modificados.

- [ ] **Step 7: Commit**

```bash
git add src/shared/hooks/useCrudForm.ts src/shared/hooks/useCrudForm.test.ts
git commit -m "feat(shared): guarda de chave computada no payload de escrita (Q-4)"
```

---

### Task 2: Mutações extras no `pending` e no `fieldErrors`

**Files:**
- Modify: `src/shared/hooks/useCrudForm.ts`
- Test: `src/shared/hooks/useCrudForm.test.ts`

**Interfaces:**
- Consumes: `CrudFormOptions<F, T>` da Task 1 (inalterada por ela)
- Produces: `CrudFormOptions.extra?: { isPending: boolean; error: ProblemDetails | null }[]` —
  a Task 10 (`useCourseForm`) passa `[sync]` por aqui.

- [ ] **Step 1: Escreva o teste que reprova**

Em `src/shared/hooks/useCrudForm.test.ts`, no fim do arquivo:

```ts
describe('useCrudForm — mutações extras', () => {
  const opts = (extra: { isPending: boolean; error: null }[]) => ({
    ...base,
    entity: null,
    mode: 'create' as const,
    extra,
  })

  it('soma o pending da mutação extra', () => {
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), opts([{ isPending: true, error: null }])),
    )
    expect(result.current.crud.pending).toBe(true)
  })

  it('não liga o pending quando nenhuma extra está pendente', () => {
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), opts([{ isPending: false, error: null }])),
    )
    expect(result.current.crud.pending).toBe(false)
  })

  it('mostra o 422 da mutação extra no fieldErrors', () => {
    const erroDaExtra = {
      type: 'about:blank', title: 'Unprocessable', status: 422, detail: null,
      errors: { redator_ids: ['inválido'] },
    }
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), {
        ...base,
        entity: null,
        mode: 'create' as const,
        extra: [{ isPending: false, error: erroDaExtra }],
      }),
    )
    expect(result.current.crud.fieldErrors?.redator_ids).toEqual(['inválido'])
  })
})
```

- [ ] **Step 2: Rode e veja reprovar**

```bash
pnpm vitest run src/shared/hooks/useCrudForm.test.ts
```

Esperado: FAIL — `expected false to be true` no primeiro caso e
`expected undefined to deeply equal [ 'inválido' ]` no terceiro. O segundo passa já (é o controle).

- [ ] **Step 3: Implemente**

Em `src/shared/hooks/useCrudForm.ts`, no tipo `CrudFormOptions`, depois de `afterCreate`:

```ts
  /** Mutações que o hook não dispara mas cujo estado pertence a este formulário
   * (o `sync` de redatores do curso). Somam no `pending` e no `fieldErrors`;
   * quem as dispara é o `afterCreate`. */
  extra?: { isPending: boolean; error: ProblemDetails | null }[]
```

No destructuring da linha 76, acrescente `extra` e, logo abaixo do `excludePrefixes`:

```ts
  const extraMutations = opts.extra ?? []
```

Troque o cálculo de erros e o `pending`:

```ts
  const { fieldErrors, generalError } = useMutationErrors([
    create.error,
    update.error,
    ...extraMutations.map((m) => m.error),
  ])
```

```ts
      pending: create.isPending || update.isPending || extraMutations.some((m) => m.isPending),
```

- [ ] **Step 4: Rode e veja passar**

```bash
pnpm vitest run src/shared/hooks/useCrudForm.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/hooks/useCrudForm.ts src/shared/hooks/useCrudForm.test.ts
git commit -m "feat(shared): useCrudForm soma mutações extras no pending e no fieldErrors"
```

---

### Task 3: `afterCreate` retentável — resubmit não recria a entidade

**Files:**
- Modify: `src/shared/hooks/useCrudForm.ts`
- Test: `src/shared/hooks/useCrudForm.test.ts`

**Interfaces:**
- Consumes: `extra` da Task 2
- Produces: comportamento novo do `submit` — a Task 10 apaga o `createdIdRef` do `useCourseForm`
  contando com ele. Nenhuma assinatura muda.

- [ ] **Step 1: Escreva o teste que reprova**

Em `src/shared/hooks/useCrudForm.test.ts`, no fim:

```ts
describe('useCrudForm — afterCreate retentável', () => {
  it('não recria a entidade no resubmit depois de o afterCreate reprovar', async () => {
    const spy: { create: unknown[] } = { create: [] }
    let deveFalhar = true
    const tentativas: number[] = []
    const done: string[] = []

    const { result } = renderHook(() =>
      useCrudForm(fakeResource(spy), {
        ...base,
        entity: null,
        mode: 'create' as const,
        onDone: () => done.push('done'),
        afterCreate: async (created: { id?: number }) => {
          tentativas.push(created.id as number)
          if (deveFalhar) throw new Error('segunda etapa reprovou')
        },
      }),
    )

    await act(async () => { result.current.crud.submit() })

    expect(spy.create).toHaveLength(1)
    expect(tentativas).toEqual([99])
    expect(done).toEqual([])   // afterCreate lançou: o diálogo NÃO fecha

    deveFalhar = false
    await act(async () => { result.current.crud.submit() })

    expect(spy.create).toHaveLength(1)          // <- o create NÃO se repete
    expect(tentativas).toEqual([99, 99])        // <- só a 2ª etapa re-tentou
    expect(done).toEqual(['done'])
  })

  it('fecha o diálogo quando o afterCreate passa de primeira', async () => {
    const done: string[] = []
    const { result } = renderHook(() =>
      useCrudForm(fakeResource(), {
        ...base,
        entity: null,
        mode: 'create' as const,
        onDone: () => done.push('done'),
        afterCreate: async () => undefined,
      }),
    )

    await act(async () => { result.current.crud.submit() })

    expect(done).toEqual(['done'])
  })
})
```

- [ ] **Step 2: Rode e veja reprovar**

```bash
pnpm vitest run src/shared/hooks/useCrudForm.test.ts
```

Esperado: FAIL no primeiro caso — `expected [ 99, 99 ] to deeply equal [ 99 ]` na contagem de
`spy.create` (o create se repete) ou uma rejection não tratada de `segunda etapa reprovou`. O segundo
caso passa já.

- [ ] **Step 3: Implemente**

Em `src/shared/hooks/useCrudForm.ts`, no import do React (primeira linha):

```ts
import { useRef, type Dispatch, type SetStateAction } from 'react'
```

Substitua a função `submit` inteira (hoje linhas 112-127) por:

```ts
  // Entidade já criada nesta sessão do diálogo, quando o `afterCreate` reprovou
  // depois de o create ter dado certo. Sem isto, o resubmit criaria a entidade
  // de novo — e curso, cliente e aluno são registros de peso legal. Não precisa
  // zerar: o diálogo desmonta ao fechar, que é a mesma premissa do
  // `createdIdRef` que este mecanismo substitui.
  const createdRef = useRef<T | null>(null)

  /**
   * Roda a segunda etapa e só então fecha. Se ela lançar, o diálogo fica aberto
   * (o erro já está no `fieldErrors` da mutação que falhou) e o `createdRef`
   * segura o criado para o próximo submit.
   *
   * `photo.flush` NÃO lança de propósito (`useEntityPhoto.ts:97-101`), então os
   * diálogos com foto nunca alcançam este caminho — quem o alcança é o
   * `useCourseForm`, cuja segunda etapa é o `sync` de redatores.
   */
  async function runAfterCreate(created: T) {
    try {
      await afterCreate?.(created)
    } catch {
      return
    }
    onDone()
  }

  function submit() {
    if (mode === 'create') {
      if (createdRef.current !== null) {
        void runAfterCreate(createdRef.current)
        return
      }

      create.mutate(toPayload(form, 'create'), {
        onSuccess: (created: T) => {
          createdRef.current = created
          void runAfterCreate(created)
        },
      })
      return
    }

    // O id do PUT vem da ENTIDADE, nunca do form: o form é editável e o alvo
    // do update não pode depender do que o usuário digitou.
    if (entity?.id == null) return
    update.mutate({ id: entity.id, payload: toPayload(form, 'edit') }, { onSuccess: onDone })
  }
```

- [ ] **Step 4: Rode e veja passar**

```bash
pnpm vitest run src/shared/hooks/useCrudForm.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Confirme que os 5 consumidores atuais não mudaram de comportamento**

```bash
pnpm vitest run src/features/commercial/hooks/useClientForm.test.tsx src/features/commercial/hooks/useBudgetForm.test.tsx src/features/identity/hooks/useRoleForm.test.tsx src/features/identity/hooks/useStudentForm.test.tsx src/features/identity/hooks/useStaffUserForm.test.tsx
```

Esperado: PASS em todos, sem um caso a menos.

- [ ] **Step 6: Commit**

```bash
git add src/shared/hooks/useCrudForm.ts src/shared/hooks/useCrudForm.test.ts
git commit -m "feat(shared): afterCreate retentável, resubmit não recria a entidade"
```

---

### Task 4: `useCrudFormWithPhoto` — a composição

**Files:**
- Create: `src/shared/hooks/useCrudFormWithPhoto.ts`
- Create: `src/shared/hooks/useCrudFormWithPhoto.test.tsx`
- Modify: `src/shared/hooks/index.ts`

**Interfaces:**
- Consumes: `useCrudForm`, `CrudFormOptions`, `MutableResource` (por caminho relativo — não saem do
  barrel), `useEntityPhoto`, `PhotoResource`
- Produces:
  `useCrudFormWithPhoto<F extends { id?: number }, T extends { id?: number }>(resource, opts)`
  devolvendo `{ crud: { ...crud, photo, busy }, setForm }`. As Tasks 6, 7 e 8 chamam exatamente esta
  assinatura. `busy: boolean` = `crud.pending || photo.pending`.

- [ ] **Step 1: Escreva o teste que reprova**

Crie `src/shared/hooks/useCrudFormWithPhoto.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCrudFormWithPhoto } from './useCrudFormWithPhoto'

const upload = vi.fn<(id: number, file: File) => Promise<void>>()
const remove = vi.fn<(id: number) => Promise<void>>()

vi.mock('@shared/api/photoResource', () => ({
  photoResource: () => ({ upload, remove }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

type Fields = { id?: number; name: string }

const criados: unknown[] = []

function fakeResource() {
  return {
    useCreate: () => ({
      mutate: (payload: unknown, opts?: { onSuccess?: (created: { id: number }) => void }) => {
        criados.push(payload)
        opts?.onSuccess?.({ id: 99 })
      },
      isPending: false,
      error: null,
    }),
    useUpdate: () => ({
      mutate: (_vars: unknown, opts?: { onSuccess?: (updated: { id: number }) => void }) => {
        opts?.onSuccess?.({ id: 1 })
      },
      isPending: false,
      error: null,
    }),
  }
}

function montar(mode: 'create' | 'edit' | 'view', onDone = () => undefined) {
  return renderHook(
    () =>
      useCrudFormWithPhoto<Fields, { id?: number }>(fakeResource(), {
        entity: mode === 'create' ? null : { id: 7, name: 'Ana' },
        mode,
        empty: { id: undefined, name: '' },
        toPayload: (f: Fields) => ({ name: f.name }),
        mapped: ['name'],
        summaryOnly: [],
        onDone,
        photo: { resource: 'students', invalidateKey: ['students'], url: null },
      }),
    { wrapper },
  )
}

beforeEach(() => {
  criados.length = 0
  upload.mockReset()
  remove.mockReset()
  upload.mockResolvedValue(undefined)
  URL.createObjectURL = vi.fn(() => 'blob:lotus')
  URL.revokeObjectURL = vi.fn()
})

describe('useCrudFormWithPhoto', () => {
  it('sobe a foto bufferizada com o id recém-criado, antes de fechar', async () => {
    const ordem: string[] = []
    upload.mockImplementation(async () => { ordem.push('upload') })
    const { result } = montar('create', () => ordem.push('done'))

    act(() => { result.current.crud.photo.onSelect(new File(['x'], 'f.png', { type: 'image/png' })) })
    await act(async () => { result.current.crud.submit() })

    expect(upload).toHaveBeenCalledWith(99, expect.any(File))
    expect(ordem).toEqual(['upload', 'done'])
  })

  it('deriva o id da entidade fora do create e null dentro dele', () => {
    const emCreate = montar('create')
    act(() => { emCreate.result.current.crud.photo.onSelect(new File(['x'], 'f.png')) })
    expect(upload).not.toHaveBeenCalled()   // sem id, o arquivo é bufferizado

    const emEdit = montar('edit')
    act(() => { emEdit.result.current.crud.photo.onSelect(new File(['x'], 'f.png')) })
    expect(upload).toHaveBeenCalledWith(7, expect.any(File))
  })

  it('busy soma o pending da foto; pending NÃO', () => {
    const { result } = montar('edit')
    expect(result.current.crud.busy).toBe(false)

    upload.mockImplementation(() => new Promise(() => undefined))   // nunca resolve
    act(() => { result.current.crud.photo.onSelect(new File(['x'], 'f.png')) })

    expect(result.current.crud.photo.pending).toBe(true)
    expect(result.current.crud.busy).toBe(true)
    expect(result.current.crud.pending).toBe(false)
  })
})
```

- [ ] **Step 2: Rode e veja reprovar**

```bash
pnpm vitest run src/shared/hooks/useCrudFormWithPhoto.test.tsx
```

Esperado: FAIL — `Failed to resolve import "./useCrudFormWithPhoto"`.

- [ ] **Step 3: Implemente**

Crie `src/shared/hooks/useCrudFormWithPhoto.ts`:

```ts
import { useCrudForm, type CrudFormOptions, type MutableResource } from './useCrudForm'
import { useEntityPhoto } from './useEntityPhoto'
import type { PhotoResource } from '@shared/api/photoResource'

export type CrudFormPhotoOptions = {
  resource: PhotoResource
  /** Query key a invalidar depois de subir/remover (a do recurso pai). */
  invalidateKey: readonly unknown[]
  /** `photo_url` vindo do DTO. */
  url?: string | null
}

/**
 * `useCrudForm` mais a foto do diálogo, na ordem certa: o `flush` da foto
 * bufferizada roda no `afterCreate`, antes do `afterCreate` do chamador e antes
 * do `onDone`.
 *
 * Por que um hook irmão e não uma opção do `useCrudForm`: `useEntityPhoto` chama
 * `useQueryClient` e dois `useMutation`. Montá-lo condicionalmente violaria as
 * regras dos hooks, e montá-lo sempre faria `useCrudForm` exigir
 * `QueryClientProvider` — os testes dele rodam sem Provider de propósito, com um
 * `MutableResource` literal. Quem não tem foto (`useBudgetForm`, `useRoleForm`)
 * continua no `useCrudForm` puro.
 *
 * `pending` NÃO soma `photo.pending`: o botão de salvar giraria por upload de
 * foto, anunciando um salvamento que não está acontecendo. Quem precisa dos dois
 * juntos — `closeBlocked` e `disabled` do `CrudDialog` — usa `busy`.
 */
export function useCrudFormWithPhoto<F extends { id?: number }, T extends { id?: number }>(
  resource: MutableResource<T>,
  opts: CrudFormOptions<F, T> & { photo: CrudFormPhotoOptions },
) {
  const photo = useEntityPhoto({
    resource: opts.photo.resource,
    // Em `create` não há entidade para pendurar a foto: o arquivo é
    // bufferizado e sobe no `flush` abaixo.
    id: opts.mode === 'create' ? null : (opts.entity?.id ?? null),
    mode: opts.mode,
    url: opts.photo.url,
    invalidateKey: opts.photo.invalidateKey,
  })

  const { crud, setForm } = useCrudForm<F, T>(resource, {
    ...opts,
    afterCreate: async (created: T) => {
      await photo.flush(created.id as number)
      await opts.afterCreate?.(created)
    },
  })

  return {
    crud: { ...crud, photo, busy: crud.pending || photo.pending },
    setForm,
  }
}
```

- [ ] **Step 4: Exporte no barrel**

Em `src/shared/hooks/index.ts`, depois da linha `export { useCrudForm } from './useCrudForm'`:

```ts
export { useCrudFormWithPhoto } from './useCrudFormWithPhoto'
export type { CrudFormPhotoOptions } from './useCrudFormWithPhoto'
```

- [ ] **Step 5: Rode e veja passar**

```bash
pnpm vitest run src/shared/hooks/useCrudFormWithPhoto.test.tsx
```

Esperado: PASS, 3 casos.

- [ ] **Step 6: Commit**

```bash
git add src/shared/hooks/useCrudFormWithPhoto.ts src/shared/hooks/useCrudFormWithPhoto.test.tsx src/shared/hooks/index.ts
git commit -m "feat(shared): useCrudFormWithPhoto compõe a foto do diálogo com o CRUD"
```

---

### Task 5: `FormPhotoRow` — o bloco JSX dos 4 sítios

**Files:**
- Create: `src/shared/ui/FormPhotoRow/FormPhotoRow.tsx`
- Create: `src/shared/ui/FormPhotoRow/index.ts`
- Modify: `src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `AppPhotoField`, `useEntityPhoto` (só o tipo)
- Produces: `<FormPhotoRow name={string} photo={ReturnType<typeof useEntityPhoto>}
  readOnly={boolean}>{children}</FormPhotoRow>`. As Tasks 6–9 o consomem com esta assinatura exata.

- [ ] **Step 1: Copie o bloco byte a byte do original**

Crie `src/shared/ui/FormPhotoRow/FormPhotoRow.tsx`. O markup vem de `StudentDialog.tsx:82-104`, e é
idêntico em `ClientDialog.tsx:82-105`, `StaffUserDialog.tsx:84-107` e `RedatorUserSection.tsx:30-53`
— confira contra os quatro antes de seguir.

```tsx
import type { ReactNode } from "react";
import type { useEntityPhoto } from "@shared/hooks";
import { AppPhotoField } from "../AppPhotoField";

/**
 * A linha "foto à esquerda, campos à direita" dos diálogos de cadastro. O
 * markup era idêntico byte a byte em ClientDialog, StaffUserDialog,
 * StudentDialog e RedatorUserSection (BD-5).
 *
 * `photo` entra inteiro em vez de nove props soltas: o objeto já é o contrato
 * do `useEntityPhoto`, e desmontá-lo aqui só criaria uma segunda grafia dele.
 */
export function FormPhotoRow({
  name,
  photo,
  readOnly,
  children,
}: {
  name: string;
  photo: ReturnType<typeof useEntityPhoto>;
  readOnly: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row justify-between">
      <div className="flex flex-col sm:justify-center py-10 gap-4 lg:w-3/5 w-full">
        <AppPhotoField
          name={name}
          url={photo.url}
          readOnly={readOnly}
          pending={photo.pending}
          error={photo.error}
          onSelect={photo.onSelect}
          onRemove={photo.onRemove}
          onSizeReject={photo.onSizeReject}
          onRetry={photo.onRetry}
        />
      </div>
      <div className="flex flex-col gap-4 w-full">{children}</div>
    </div>
  );
}
```

Crie `src/shared/ui/FormPhotoRow/index.ts`:

```ts
export { FormPhotoRow } from './FormPhotoRow'
```

- [ ] **Step 2: Exporte no barrel**

Em `src/shared/ui/index.ts`, na posição alfabética entre `FormField` e `FormSection`
(hoje linhas 36-37):

```ts
export * from './FormPhotoRow'
```

- [ ] **Step 3: Verifique que compila e que nada quebrou**

```bash
pnpm build && pnpm lint
```

Esperado: build verde, lint exit 0. Nenhum consumidor ainda — o componente entra nas tasks
seguintes.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/FormPhotoRow src/shared/ui/index.ts
git commit -m "feat(shared): FormPhotoRow absorve a linha foto+campos dos diálogos"
```

---

### Task 6: `StudentDialog` perde o trio

**Files:**
- Modify: `src/features/identity/hooks/useStudentForm.ts`
- Modify: `src/features/identity/components/Student/StudentDialog.tsx`
- Test: `src/features/identity/hooks/useStudentForm.test.tsx` (existente — tem de continuar verde)

**Interfaces:**
- Consumes: `useCrudFormWithPhoto` (Task 4), `FormPhotoRow` (Task 5)
- Produces: `useStudentForm(student, mode, onDone)` — **a assinatura perde o 4º parâmetro
  `afterCreate`**. As Tasks 7 e 8 fazem o mesmo nos seus hooks.

- [ ] **Step 1: Migre o hook**

Em `src/features/identity/hooks/useStudentForm.ts`, troque o import da primeira linha:

```ts
import { useCrudFormWithPhoto } from '@shared/hooks'
import { studentsApi } from '@shared/api/studentsApi'
```

Troque a assinatura e a chamada (o 4º parâmetro sai; o `photo` entra):

```ts
export function useStudentForm(
  student: StudentData | null,
  mode: DialogMode,
  onDone: () => void,
) {
```

```ts
  const { crud } = useCrudFormWithPhoto<StudentFormFields, StudentData>(studentsApi, {
```

e, dentro das opções, depois de `onDone,` — removendo a linha `afterCreate,`:

```ts
    onDone,
    photo: {
      resource: 'students',
      invalidateKey: studentsApi.keys.all,
      url: student?.photo_url,
    },
```

- [ ] **Step 2: Migre o diálogo**

Em `src/features/identity/components/Student/StudentDialog.tsx`:

Nos imports, tire `AppPhotoField` e ponha `FormPhotoRow`; tire `useEntityPhoto` e `studentsApi`:

```tsx
import {
  CrudDialog,
  FormSection,
  FormErrorBanner,
  FormErrorSummary,
  FormPhotoRow,
} from "@shared/ui";
import type { StudentData } from "@shared/types/generated";
import type { DialogMode } from "@shared/lib";
import { useStudentDetail } from "../../api/useStudentDetail";
```

Substitua o bloco das linhas 34-55 (o `useEntityPhoto` inteiro, o comentário do `flush` e a chamada
do hook com o 4º argumento) por:

```tsx
  const {
    form,
    set,
    readOnly,
    submit,
    pending,
    busy,
    photo,
    fieldErrors,
    generalError,
    errorSummary,
  } = useStudentForm(student, mode, onHide);
```

No `CrudDialog`, troque as duas linhas de gate:

```tsx
      disabled={clientsUnusable || busy}
      closeBlocked={busy}
```

E substitua o bloco `<div className="flex flex-col lg:flex-row justify-between">…</div>`
(linhas 82-104) por:

```tsx
        <FormPhotoRow name={form.name} photo={photo} readOnly={readOnly}>
          <StudentIdentityFields
            form={form}
            set={set}
            readOnly={readOnly}
            fieldErrors={fieldErrors}
          />
        </FormPhotoRow>
```

O banner de `photo.hasBufferedFailure` **fica onde está** (D5).

- [ ] **Step 3: Rode o teste do hook e o build**

```bash
pnpm vitest run src/features/identity/hooks/useStudentForm.test.tsx && pnpm build
```

Esperado: PASS sem caso a menos, build verde. Se o teste do hook montar sem
`QueryClientProvider`, ele passará a exigir um — nesse caso adicione o wrapper no molde de
`useCrudFormWithPhoto.test.tsx` (Task 4, Step 1) e registre no relatório da task.

- [ ] **Step 4: Confirme que o arquivo encolheu e segue sob a régua**

```bash
wc -l src/features/identity/components/Student/StudentDialog.tsx
```

Esperado: ~105 linhas (era 124), abaixo de 150.

- [ ] **Step 5: Commit**

```bash
git add src/features/identity/hooks/useStudentForm.ts src/features/identity/components/Student/StudentDialog.tsx src/features/identity/hooks/useStudentForm.test.tsx
git commit -m "refactor(identity): StudentDialog absorve o trio da foto"
```

---

### Task 7: `ClientDialog` perde o trio

**Files:**
- Modify: `src/features/commercial/hooks/useClientForm.ts`
- Modify: `src/features/commercial/components/Client/ClientDialog.tsx`
- Test: `src/features/commercial/hooks/useClientForm.test.tsx` (existente)

**Interfaces:**
- Consumes: `useCrudFormWithPhoto` (Task 4), `FormPhotoRow` (Task 5)
- Produces: `useClientForm(client, mode, onDone)` — sem o 4º parâmetro. O `setForm` continua saindo
  do par `{ crud, setForm }`, agora do hook novo.

- [ ] **Step 1: Migre o hook**

Em `src/features/commercial/hooks/useClientForm.ts`:

```ts
import { useCrudFormWithPhoto } from '@shared/hooks'
```

```ts
export function useClientForm(
  client: ClientData | null,
  mode: ClientDialogMode,
  onDone: () => void,
) {
```

```ts
  const { crud, setForm } = useCrudFormWithPhoto<ClientFormFields, ClientData>(clientsApi, {
```

Nas opções, remova a linha `afterCreate,` e acrescente depois de `onDone,`:

```ts
    onDone,
    photo: {
      resource: 'clients',
      invalidateKey: clientsApi.keys.all,
      url: client?.photo_url,
    },
```

- [ ] **Step 2: Migre o diálogo**

Em `src/features/commercial/components/Client/ClientDialog.tsx`, imports:

```tsx
import {
  CrudDialog,
  FormSection,
  FormErrorSummary,
  FormErrorBanner,
  FormPhotoRow,
} from "@shared/ui";
import type { ClientData } from "@shared/types/generated";
import {
  useClientForm,
  type ClientDialogMode,
} from "../../hooks/useClientForm";
```

(`clientsApi` e `useEntityPhoto` saem.)

Substitua o bloco 34-59 (o `useEntityPhoto` e a chamada com o 4º argumento) por:

```tsx
  const {
    form,
    set,
    readOnly,
    submit,
    pending,
    busy,
    photo,
    fieldErrors,
    generalError,
    errorSummary,
    addr,
    setAddr,
    patchContact,
    setPrimaryContact,
    addContact,
    removeContact,
  } = useClientForm(client, mode, onHide);
```

No `CrudDialog`:

```tsx
      closeBlocked={busy}
      disabled={busy}
```

E o bloco 82-105 vira:

```tsx
        <FormPhotoRow name={form.legal_name} photo={photo} readOnly={readOnly}>
          <ClientGeneralFields
            form={form}
            readOnly={readOnly}
            fieldErrors={fieldErrors}
            onChange={set}
          />
        </FormPhotoRow>
```

- [ ] **Step 3: Rode e verifique**

```bash
pnpm vitest run src/features/commercial/hooks/useClientForm.test.tsx && pnpm build
wc -l src/features/commercial/components/Client/ClientDialog.tsx
```

Esperado: PASS, build verde, ~104 linhas (era 123).

- [ ] **Step 4: Commit**

```bash
git add src/features/commercial/hooks/useClientForm.ts src/features/commercial/components/Client/ClientDialog.tsx src/features/commercial/hooks/useClientForm.test.tsx
git commit -m "refactor(commercial): ClientDialog absorve o trio da foto"
```

---

### Task 8: `StaffUserDialog` perde o trio — o que estava em 150 ganha folga

**Files:**
- Modify: `src/features/identity/hooks/useStaffUserForm.ts`
- Modify: `src/features/identity/components/Admin/StaffUserDialog.tsx`
- Test: `src/features/identity/hooks/useStaffUserForm.test.tsx` (existente)

**Interfaces:**
- Consumes: `useCrudFormWithPhoto` (Task 4), `FormPhotoRow` (Task 5)
- Produces: `useStaffUserForm(user, mode, onDone)` — sem o 4º parâmetro.

- [ ] **Step 1: Migre o hook**

Em `src/features/identity/hooks/useStaffUserForm.ts`:

```ts
import { useCrudFormWithPhoto } from '@shared/hooks'
```

```ts
export function useStaffUserForm(
  user: UserData | null,
  mode: DialogMode,
  onDone: () => void,
) {
```

```ts
  const { crud } = useCrudFormWithPhoto<StaffUserFormFields, UserData>(usersApi, {
```

Nas opções, remova `afterCreate,` e acrescente:

```ts
    onDone,
    photo: {
      resource: 'users',
      invalidateKey: usersApi.keys.all,
      url: user?.photo_url,
    },
```

- [ ] **Step 2: Migre o diálogo**

Em `src/features/identity/components/Admin/StaffUserDialog.tsx`, nos imports troque `AppPhotoField`
por `FormPhotoRow` e remova `usersApi` e `useEntityPhoto`:

```tsx
import {
  CrudDialog,
  AppDropdown,
  FormField,
  FormSection,
  FormErrorSummary,
  FormErrorBanner,
  FormPhotoRow,
  AppTag,
} from "@shared/ui";
import type { UserData } from "@shared/types/generated";
import type { DialogMode } from "@shared/lib";
import { useStaffUserForm } from "../../hooks/useStaffUserForm";
```

Substitua o bloco 36-55 por:

```tsx
  const {
    form,
    set,
    readOnly,
    submit,
    pending,
    busy,
    photo,
    fieldErrors,
    generalError,
    errorSummary,
  } = useStaffUserForm(user, mode, onHide);
```

No `CrudDialog`:

```tsx
      closeBlocked={busy}
      disabled={busy}
```

E o bloco 84-107 vira:

```tsx
        <FormPhotoRow name={form.name} photo={photo} readOnly={readOnly}>
          <StaffIdentityFields
            form={form}
            set={set}
            readOnly={readOnly}
            fieldErrors={fieldErrors}
            mode={mode}
          />
        </FormPhotoRow>
```

- [ ] **Step 3: Rode e verifique a folga ganha**

```bash
pnpm vitest run src/features/identity/hooks/useStaffUserForm.test.tsx && pnpm lint
wc -l src/features/identity/components/Admin/StaffUserDialog.tsx
```

Esperado: PASS, lint exit 0, ~131 linhas (era **150**, na régua exata).

- [ ] **Step 4: Commit**

```bash
git add src/features/identity/hooks/useStaffUserForm.ts src/features/identity/components/Admin/StaffUserDialog.tsx src/features/identity/hooks/useStaffUserForm.test.tsx
git commit -m "refactor(identity): StaffUserDialog absorve o trio da foto"
```

---

### Task 9: Redator — só o `FormPhotoRow`, e o comentário que aponta para este bloco

**Files:**
- Modify: `src/features/identity/components/Redator/RedatorUserSection.tsx`
- Modify: `src/features/identity/components/Redator/RedatorDialog.tsx`

**Interfaces:**
- Consumes: `FormPhotoRow` (Task 5)
- Produces: nada consumido adiante. `useRedatorForm` **não muda** — segue com o 4º parâmetro
  `afterCreate` e o `useEntityPhoto` montado à mão no `RedatorDialog`.

- [ ] **Step 1: Troque o bloco na seção**

Em `src/features/identity/components/Redator/RedatorUserSection.tsx`, imports:

```tsx
import { FormPhotoRow, FormSection } from "@shared/ui";
```

E substitua o bloco das linhas 30-53 por:

```tsx
      <FormPhotoRow name={form.name} photo={photo} readOnly={readOnly}>
        <RedatorIdentityFields
          form={form}
          set={set}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
        />
      </FormPhotoRow>
```

- [ ] **Step 2: Corrija o comentário que aponta para este bloco**

`RedatorDialog.tsx:86-89` diz hoje "decisão do BD-5" sobre uma decisão que **este** bloco tomou.
Troque o comentário do `FormErrorSummary` por:

```tsx
        // `useRedatorForm` não roda sobre `useCrudForm`: o create é multipart
        // (`new FormData()`), e `toPayload` devolvendo objeto não modela isso —
        // critério mantido no BD-5 (2026-08-13), não corte de escopo. Sem
        // `errorSummary` a espalhar, a lista é literal, no estilo do
        // CourseDialog. Só name, rut e email têm `error=` no campo; phone,
        // course_ids e documents[<tipo>] caem aqui.
```

- [ ] **Step 3: Verifique**

```bash
pnpm build && pnpm lint
wc -l src/features/identity/components/Redator/RedatorUserSection.tsx src/features/identity/components/Redator/RedatorDialog.tsx
```

Esperado: build verde, lint exit 0, `RedatorUserSection` ~40 linhas (era 56), `RedatorDialog` ~125.

- [ ] **Step 4: Confirme que o trio morreu nos três que migraram**

```bash
grep -rn "closeBlocked={pending || photo.pending}" src/ || echo "ZERO"
grep -rn "photo.flush(created.id" src/ || echo "ZERO"
```

Esperado: a primeira devolve `ZERO`; a segunda devolve **uma** ocorrência, em `RedatorDialog.tsx`
(o hook do redator não migra, por critério).

- [ ] **Step 5: Commit**

```bash
git add src/features/identity/components/Redator/
git commit -m "refactor(identity): Redator adota o FormPhotoRow e corrige o ponteiro do BD-5"
```

---

### Task 10: `useCourseForm` migra para o `useCrudForm`

**Files:**
- Modify: `src/features/catalog/hooks/useCourseForm.ts`
- Modify: `src/features/catalog/components/Course/CourseDialog.tsx`
- Test: `src/features/catalog/hooks/useCourseForm.test.tsx` (criar)

**Interfaces:**
- Consumes: `extra` (Task 2), `afterCreate` retentável (Task 3)
- Produces: `useCourseForm` mantém o retorno atual mais `errorSummary`; `createdIdRef` deixa de
  existir.

- [ ] **Step 1: Escreva o teste que prova o comportamento a preservar**

Crie `src/features/catalog/hooks/useCourseForm.test.tsx`. Ele existe para uma coisa só: garantir
que a migração **não** reintroduz o defeito que o `createdIdRef` existia para evitar.

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCourseForm } from './useCourseForm'

const create = vi.fn()
const sync = vi.fn()

vi.mock('@shared/api/coursesApi', () => ({
  coursesApi: {
    keys: { all: ['courses'] },
    useCreate: () => ({ mutate: create, isPending: false, error: null }),
    useUpdate: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  },
}))

vi.mock('../api/useSyncCourseRedatores', () => ({
  useSyncCourseRedatores: () => ({ mutateAsync: sync, isPending: false, error: null }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  create.mockReset()
  sync.mockReset()
  create.mockImplementation((_payload, opts) => opts?.onSuccess?.({ id: 42 }))
})

describe('useCourseForm', () => {
  it('não recria o curso quando o sync de redatores reprova e o usuário reenvia', async () => {
    sync.mockRejectedValueOnce(new Error('sync falhou'))
    const onDone = vi.fn()
    const { result } = renderHook(() => useCourseForm(null, 'create', onDone), { wrapper })

    act(() => { result.current.toggleRedator(7) })
    await act(async () => { result.current.submit() })

    expect(create).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()

    sync.mockResolvedValueOnce(undefined)
    await act(async () => { result.current.submit() })

    expect(create).toHaveBeenCalledTimes(1)   // <- o curso NÃO nasce duas vezes
    expect(sync).toHaveBeenCalledTimes(2)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('não dispara o sync quando nenhum redator foi escolhido', async () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useCourseForm(null, 'create', onDone), { wrapper })

    await act(async () => { result.current.submit() })

    expect(sync).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Rode e veja reprovar**

```bash
pnpm vitest run src/features/catalog/hooks/useCourseForm.test.tsx
```

Esperado: FAIL — o hook atual usa `sync.mutate` (não `mutateAsync`), então o mock de `mutateAsync`
não é chamado: `expected "sync" to be called 1 times, but got 0 times`.

- [ ] **Step 3: Migre o hook**

Em `src/features/catalog/hooks/useCourseForm.ts`:

Troque os imports das linhas 1-2:

```ts
import { useCrudForm } from '@shared/hooks'
import type { CourseData, CourseModuleData } from '@shared/types/generated'
```

(`useRef`, `useEntityForm` e `useMutationErrors` saem.)

Substitua o corpo da função, das linhas 41 até o `return` final, por:

```ts
export function useCourseForm(course: CourseData | null, mode: CourseDialogMode, onDone: () => void) {
  // A resposta da API sempre traz `modules`; o `| undefined` do tipo é do lado da
  // ENTRADA (Optional). Normaliza aqui para o form não carregar o undefined.
  const entity: CourseFormFields | null = course ? { ...course, modules: course.modules ?? [] } : null
  const sync = useSyncCourseRedatores()

  const { crud, setForm } = useCrudForm<CourseFormFields, CourseData>(coursesApi, {
    entity,
    mode,
    empty: EMPTY,
    toFields,
    // redator_ids NÃO entra: o backend ignora na escrita do curso.
    // modules entra SEMPRE: o backend faz replace-total, então omitir o campo
    // apagaria todos os módulos. Só os campos editáveis — sort_order e
    // total_hours são derivados no backend e descartados no except() da Action.
    toPayload: (f) => ({
      name: f.name,
      technical_name: f.technical_name,
      description: f.description,
      workload_hours: f.workload_hours,
      modules: f.modules.map((m) => ({
        name: m.name,
        learnings: m.learnings,
        contents: m.contents,
        theory_hours: m.theory_hours,
        practice_hours: m.practice_hours,
      })),
    }),
    mapped: ['name', 'technical_name', 'description', 'workload_hours'],
    // `modules` é a lista inteira (cada módulo mostra o próprio erro pelo
    // prefixo). `redator_ids` NÃO está no payload do curso: é a chave que um
    // 422 do `sync` traria, e sem ela aqui o erro não teria onde aparecer.
    summaryOnly: ['modules', 'redator_ids'],
    excludePrefixes: ['modules.'],
    onDone,
    // Segunda etapa do create: a habilitação mora em endpoint dedicado. Lança
    // de propósito — é o que faz o `useCrudForm` segurar o diálogo aberto e,
    // no resubmit, re-tentar só esta etapa em vez de recriar o curso (que é
    // registro de peso legal). Em edit a habilitação é leitura.
    afterCreate: async (created) => {
      if (crud.form.redator_ids.length === 0) return
      await sync.mutateAsync({ courseId: created.id!, redator_ids: crud.form.redator_ids })
    },
    extra: [sync],
  })

  // Updater funcional: dois toggles no mesmo tick precisam ver o array já
  // atualizado pelo anterior (mesmo motivo do toggleCourse no redator).
  const toggleRedator = (id: number) =>
    setForm((f) => ({
      ...f,
      redator_ids: f.redator_ids.includes(id)
        ? f.redator_ids.filter((x) => x !== id)
        : [...f.redator_ids, id],
    }))

  const addModule = () =>
    setForm((f) => ({ ...f, modules: [...f.modules, structuredClone(EMPTY_MODULE)] }))

  const removeModule = (i: number) =>
    setForm((f) => ({ ...f, modules: f.modules.filter((_, idx) => idx !== i) }))

  const patchModule = (i: number, patch: Partial<CourseModuleData>) =>
    setForm((f) => ({ ...f, modules: f.modules.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }))

  // A ordem do array É o sort_order (o backend o deriva do índice). Mover = trocar
  // com o vizinho. No-op nas pontas: os botões já vêm desabilitados lá, então um
  // índice fora de faixa só chegaria por bug — e derrubar o diálogo não é a resposta.
  const moveModule = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const j = i + dir
      if (j < 0 || j >= f.modules.length) return f
      const modules = [...f.modules]
      ;[modules[i], modules[j]] = [modules[j], modules[i]]
      return { ...f, modules }
    })

  // Totais derivados: reagem ao que está sendo digitado, não ao último valor
  // salvo (o modules_total_hours do backend serve a consumidores de leitura).
  const modulesTotal = crud.form.modules.reduce((sum, m) => sum + m.theory_hours + m.practice_hours, 0)
  // Curso sem módulo nenhum não é divergência — é curso sem módulo cadastrado.
  const hoursMismatch = crud.form.modules.length > 0 && modulesTotal !== crud.form.workload_hours

  return {
    ...crud,
    toggleRedator,
    addModule, removeModule, patchModule, moveModule,
    modulesTotal, hoursMismatch,
  }
}
```

**Atenção ao `crud.form` dentro do `afterCreate`:** ele é lido no momento da chamada, não capturado
no primeiro render — o `useCrudForm` chama `afterCreate` a partir do `onSuccess`, já com o form
atual. Se o teste do Step 1 acusar `redator_ids` vazio quando o toggle rodou, o valor está sendo
capturado cedo: nesse caso passe a lista via `useRef` atualizado no `toggleRedator` e **registre o
desvio no relatório da task**.

- [ ] **Step 4: Ajuste o `CourseDialog`**

Em `src/features/catalog/components/Course/CourseDialog.tsx`, o destructuring da linha 20 ganha
`errorSummary`:

```tsx
  const { form, set, toggleRedator, readOnly, submit, pending, fieldErrors, generalError,
          errorSummary, addModule, removeModule, patchModule, moveModule,
          modulesTotal, hoursMismatch } = useCourseForm(course, mode, onHide)
```

E o `FormErrorSummary` (linhas 39-43) troca a lista literal pelo objeto do hook:

```tsx
      <FormErrorSummary errors={fieldErrors} {...errorSummary} />
```

- [ ] **Step 5: Rode e veja passar**

```bash
pnpm vitest run src/features/catalog/hooks/useCourseForm.test.tsx && pnpm build && pnpm lint
```

Esperado: PASS nos 2 casos, build verde, lint exit 0.

- [ ] **Step 6: Confirme que o `createdIdRef` morreu**

```bash
grep -rn "createdIdRef" src/ || echo "ZERO"
wc -l src/features/catalog/hooks/useCourseForm.ts
```

Esperado: `ZERO`; ~115 linhas (era 145). **A spec §3.5 projetou ~110**: a diferença é o docblock do
`afterCreate`, que não existia quando ela foi escrita. Divergência declarada, não silenciada.

- [ ] **Step 7: Commit**

```bash
git add src/features/catalog/hooks/useCourseForm.ts src/features/catalog/components/Course/CourseDialog.tsx src/features/catalog/hooks/useCourseForm.test.tsx
git commit -m "refactor(catalog): useCourseForm migra para o useCrudForm"
```

---

### Task 11: Gate — o DoD provado, incluindo a foto no S3

**Files:** nenhum de produção. Esta task é verificação; ela **não** commita código novo, só o
relatório se algum passo exigir correção.

**Interfaces:**
- Consumes: tudo
- Produces: o relatório do gate, para o `/revisar-sprint`

- [ ] **Step 1: Ferramentas**

```bash
pnpm lint && pnpm build && pnpm test
```

Esperado: exit 0, build verde, **31 arquivos / 156 testes** (baseline 29/143). Divergência para
menos é achado, não arredondamento.

- [ ] **Step 2: A régua, provada nos dois sentidos (lição 10)**

```bash
wc -l src/features/identity/components/Admin/StaffUserDialog.tsx
printf '\n%.0s' {1..30} >> src/features/identity/components/Admin/StaffUserDialog.tsx
pnpm lint
```

Esperado: FAIL com `File has too many lines`. Depois:

```bash
git checkout -- src/features/identity/components/Admin/StaffUserDialog.tsx
pnpm lint && git status --short
```

Esperado: exit 0 e árvore limpa.

- [ ] **Step 3: O trio não sobreviveu**

```bash
grep -rn "closeBlocked={pending || photo.pending}" src/ || echo "ZERO"
grep -rn "useEntityPhoto({" src/features/ | wc -l
grep -rn "createdIdRef" src/ || echo "ZERO"
```

Esperado: `ZERO`; a segunda devolve **1** (só o `RedatorDialog`); `ZERO`.

- [ ] **Step 4: Órfãos**

```bash
grep -rln "FormPhotoRow" src/ | wc -l
grep -rln "useCrudFormWithPhoto" src/ | wc -l
```

Esperado: `FormPhotoRow` em 7 arquivos (4 consumidores + componente + 2 barrels);
`useCrudFormWithPhoto` em 6 (3 hooks + hook + teste + barrel). Qualquer arquivo novo com zero
consumidor é achado.

- [ ] **Step 5: Backend intocado**

```bash
git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts
```

Esperado: **zero linha**.

- [ ] **Step 6: A prova que o DoD exige — foto real chegando no S3**

Primeiro, confirme que a stack do main tree serve o mesmo backend que esta branch, **agora** (o main
tree roda a execução paralela de `login-fora-do-adr16`, D6):

```bash
git -C /home/jvbat/projetos/lotus diff main...HEAD --name-only -- backend/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/students
```

Esperado: **zero linha** no diff (se houver, PARE e registre — a medição seria de outra stack) e
**401** no curl (sem cookie).

Com sessão Sanctum viva (cookie + CSRF, `Origin` e `Accept` nos dois lados), prove os dois caminhos:

1. **`edit`** — `POST /api/students/{id}/photo` multipart com um PNG real → **200/204**; em seguida
   `GET /api/students/{id}` devolve `photo_url` **não nulo** e diferente do anterior.
2. **`create`** — crie um aluno, e no mesmo fluxo suba a foto contra o id devolvido (é o que o
   `flush` faz) → o `GET` seguinte traz `photo_url` preenchido.

Confira o objeto **no MinIO**, não só o 200:

```bash
docker compose exec -T minio sh -c "ls -la /data/lotus/photos | tail -5"
```

Esperado: objeto novo, **tamanho > 0** — arquivo de zero byte é exatamente a falha silenciosa da
lição 6 que este DoD existe para pegar.

Registre no relatório: o id usado, o `photo_url` antes e depois, o tamanho do objeto. Os registros
criados saem por `forceDelete` ao fim (molde do BD-2), e o que sobrar em `audits` fica declarado.

- [ ] **Step 7: Escreva o relatório**

Em `.superpowers/sdd/task-11-report.md` (local, não versionado), registre cada passo com o número
medido e, sem maquiagem, o que **não** foi provado. Candidatos conhecidos: nenhum diálogo tem teste
de componente, então a composição `FormPhotoRow` + diálogo não é exercitada por teste; e a checagem
visual (`/lotus-ui-review`) não está neste plano — se ela não rodar, isso é débito escrito, não
omissão.

---

## Handoff de execução

**`executor: claude`**, sem `paths_autorizados`.

Critério: o bloco mexe em `shared/hooks` com **5 consumidores** e muda o `submit` para todos
(Task 3); decide apresentação em 4 telas (Tasks 5–9); a Task 10 depende de um julgamento que só
aparece rodando (o `crud.form` lido dentro do `afterCreate`, com desvio previsto e instrução de
registro); e a Task 11 fecha por prova contra API real, num ambiente compartilhado com outra
execução ativa. Nada disso é transformação mecânica com paths fechados.

## Self-review contra a spec

- **§3.1 `photo`** → Task 4, com o desvio D-P1 declarado no topo.
- **§3.1 `afterCreate` retentável** → Task 3.
- **§3.1 `extra`** → Task 2.
- **§3.2 guarda Q-4** → Task 1, com sonda nos dois sentidos.
- **§3.3 `FormPhotoRow`** → Task 5.
- **§3.4 os 4 diálogos** → Tasks 6, 7, 8, 9, com `wc -l` em cada.
- **§3.5 `useCourseForm` + `CourseDialog`** → Task 10, incluindo a classificação nova.
- **§4 DoD 1 (S3)** → Task 11 Step 6. **DoD 2** → Task 3 Step 1. **DoD 3** → Task 1 Steps 5-6.
  **DoD 4** → Task 4 Step 1, terceiro caso. **DoD 5** → Task 9 Step 4 e Task 11 Step 3.
  **DoD 6** → Task 11 Steps 1-2. **DoD 7** → Task 11 Step 5.
- **§6 fora de escopo** → `useQuoteForm`, `useTurmaConfigForm` e `useRedatorForm` não aparecem em
  task nenhuma; o banner de `hasBufferedFailure` fica, dito em cada task de diálogo.
