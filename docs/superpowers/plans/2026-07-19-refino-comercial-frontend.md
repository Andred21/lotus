# Refino do Frontend Comercial (H.1.3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinhar o código e a interface da feature `commercial` às rules `frontend-fsliced.md`, fechando os achados C+B das revisões, **sem mudar comportamento observável**.

**Architecture:** Refino em duas ondas — estrutural (mover orquestração/estado para hooks da feature, extrair subcomponentes coesos, usar o kit de form) e visual (novo wrapper `AppDatePicker`, stepper, consistência de toolbar, acessibilidade, ordem de ação). Nada toca backend/schema/DTO; o contrato de tipos (`generated.ts`) fica intacto.

**Tech Stack:** React 19 + TS, PrimeReact via `shared/ui`, TanStack Query + Zustand, Tailwind v4 (layout), i18next (3 locales), Vite.

## Global Constraints

- **Sem test runner no frontend.** O ciclo de prova de cada task é: editar → `pnpm lint` (limpo) → `pnpm build` (`tsc -b && vite build` verde) → **caminhada comportamental** concreta na tela afetada → commit. Build verde **não** é aceite (lei §8).
- Rodar tudo de `frontend/` (nativo no WSL — Node 22/pnpm): `pnpm lint`, `pnpm build`, `pnpm dev`.
- **Comportamento idêntico (peso legal):** nenhuma task pode alterar o que a tela renderiza/faz. Se o diff mudar comportamento, é bug, não refino.
- **Fronteira §6:** feature importa só de `@shared/ui`/`@shared/hooks`/`@shared/api`/`@shared/lib`, nunca de `primereact` direto nem de outra feature. Wrapper novo mora em `shared/ui` (pasta-por-componente + `index.ts` com `export * from './X'` + reexporta `AppXProps`; entra no barrel raiz).
- **Cor segue o kit:** Tailwind layout + cor do nosso elemento com par `dark:` (padrão do `shared/ui`). Nenhuma cor nova fura o tema Prime.
- **i18n:** toda chave nova entra IDÊNTICA nos 3 locales (`es-CL.json`, `pt-BR.json`, `en.json`); `es-CL` é a referência de rótulo.
- **Git cirúrgico (lição #9):** `git add` só os caminhos exatos da task. Rode `git status` antes; o working tree do João é intocável. `pint` não se aplica (frontend).
- Commits em `main` (padrão do projeto para este bloco; execução pode isolar em worktree de frontend — sem trava P-03, que é do backend).

---

## Onda 1 — Estrutural

### Task 1: `useClientForm` ganha os helpers de array; `ClientDialog` os consome

Move a manipulação de array nested do JSX para o hook (rule: "manipulação de array nested vive no hook"; molde `useCourseForm`). O `ClientDialog` para de declarar `patchContact`/`setPrimaryContact`/`setAddr` e de importar `Dispatch`/`SetStateAction`. **Endereço e contatos seguem inline nesta task** (a extração é a Task 2).

**Files:**
- Modify: `frontend/src/features/commercial/hooks/useClientForm.ts`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx`

**Interfaces:**
- Produces (de `useClientForm`): além do retorno atual, `setAddr(patch: Partial<ClientAddressData>): void`, `patchContact(i: number, patch: Partial<ClientData['contacts'][number]>): void`, `setPrimaryContact(i: number): void`, `addContact(): void`.
- Consumes: `useEntityForm` retorna `{ form, setForm, set, readOnly }`.

- [ ] **Step 1: Reescreva `useClientForm.ts` com os helpers**

```ts
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { ClientAddressData, ClientData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { clientsApi } from '@shared/api/clientsApi'

export type ClientDialogMode = DialogMode

const EMPTY_ADDRESS: ClientAddressData = {
  id: undefined, line1: null, line2: null, number: null, commune: null, city: null, region: null, zip_code: null, is_primary: true,
}

const EMPTY_CONTACT: ClientData['contacts'][number] = {
  id: undefined, name: '', job_title: null, email: null, phone: null, is_primary: false,
}

const EMPTY: ClientData = {
  id: undefined, name: '', rut: '', email: '', phone: null,
  legal_name: '', type: 'client', business_activity: null,
  addresses: [{ ...EMPTY_ADDRESS }],
  contacts: [{ ...EMPTY_CONTACT, is_primary: true }],
}

export function useClientForm(client: ClientData | null, mode: ClientDialogMode, onDone: () => void) {
  const { form, setForm, set, readOnly } = useEntityForm(client, mode, EMPTY)
  const create = clientsApi.useCreate()
  const update = clientsApi.useUpdate()

  // Só o primeiro endereço é editável nesta tela; os demais são preservados.
  // (O update do backend apaga-e-recria os nested; reconstruir o array com um
  // único elemento descartaria os outros endereços em silêncio.)
  const setAddr = (patch: Partial<ClientAddressData>) =>
    setForm((f) => {
      const first = { ...(f.addresses[0] ?? EMPTY_ADDRESS), ...patch }
      return { ...f, addresses: [first, ...f.addresses.slice(1)] }
    })

  const patchContact = (i: number, patch: Partial<ClientData['contacts'][number]>) =>
    setForm((f) => ({ ...f, contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }))

  const setPrimaryContact = (i: number) =>
    setForm((f) => ({ ...f, contacts: f.contacts.map((c, idx) => ({ ...c, is_primary: idx === i })) }))

  const addContact = () =>
    setForm((f) => ({ ...f, contacts: [...f.contacts, { ...EMPTY_CONTACT }] }))

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
    setAddr, patchContact, setPrimaryContact, addContact,
    pending: create.isPending || update.isPending,
    fieldErrors, generalError,
  }
}
```

- [ ] **Step 2: Reescreva `ClientDialog.tsx` para consumir os helpers (endereço/contatos ainda inline)**

Troque o topo do arquivo e os call-sites. Remova o import `Dispatch, SetStateAction`, o `EMPTY_ADDRESS` local, o `setAddr` local e as funções livres `patchContact`/`setPrimaryContact` do fim do arquivo.

```tsx
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppInputText, AppDropdown, AppRadioButton, FormField, NestedField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import { CHILE_REGIONS } from '@shared/lib'
import type { ClientAddressData, ClientData } from '@shared/types/generated'
import { useClientForm, type ClientDialogMode } from '../../hooks/useClientForm'

const TYPE_VALUES = ['client', 'provider', 'other'] as const

const EMPTY_ADDRESS: ClientAddressData = {
  id: undefined, line1: null, line2: null, number: null, commune: null, city: null, region: null, zip_code: null, is_primary: true,
}

export function ClientDialog({
  visible, mode, client, onHide, onEdit,
}: {
  visible: boolean
  mode: ClientDialogMode
  client: ClientData | null
  onHide: () => void
  onEdit?: () => void
}) {
  const { t } = useTranslation()
  const { form, set, readOnly, submit, pending, fieldErrors, generalError, setAddr, patchContact, setPrimaryContact, addContact } =
    useClientForm(client, mode, onHide)
  const types = TYPE_VALUES.map((value) => ({ value, label: t(`clientType.${value}`) }))

  // Cliente criado fora da UI (seed/API) pode não ter endereço — cai para vazio
  // em vez de quebrar ao ler `addr.region`.
  const addr = form.addresses[0] ?? EMPTY_ADDRESS

  return (
    <CrudDialog
      visible={visible}
      mode={mode}
      title={mode === 'create' ? t('client.new') : (form.legal_name || form.name)}
      onHide={onHide}
      onEdit={onEdit}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === 'create' ? t('client.create') : undefined}
    >
      <FormErrorBanner message={generalError} />
      <FormErrorSummary
        errors={fieldErrors}
        mapped={['legal_name', 'name', 'rut', 'email', 'type', 'business_activity']}
        excludePrefixes={['contacts.']}
      />
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase text-slate-500">{t('client.sectionGeneral')}</h3>
        <FormField label={t('client.legalName')} error={fieldErrors?.legal_name?.[0] ?? fieldErrors?.name?.[0]}>
          <AppInputText value={form.legal_name} disabled={readOnly} onChange={(e) => set('legal_name', e.target.value)} className="w-full" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]}>
            <AppInputText value={form.rut} disabled={readOnly} onChange={(e) => set('rut', e.target.value)} className="w-full" />
          </FormField>
          <FormField label={t('common.email')} error={fieldErrors?.email?.[0]}>
            <AppInputText value={form.email} disabled={readOnly} onChange={(e) => set('email', e.target.value)} className="w-full" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('client.type')}>
            <AppDropdown value={form.type} options={types} disabled={readOnly} onChange={(e) => set('type', e.value)} />
          </FormField>
          <FormField label={t('client.businessActivity')}>
            <AppInputText value={form.business_activity ?? ''} disabled={readOnly} onChange={(e) => set('business_activity', e.target.value)} className="w-full" />
          </FormField>
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('client.sectionAddress')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t('client.region')}>
            <AppDropdown value={addr.region} options={CHILE_REGIONS} disabled={readOnly} onChange={(e) => setAddr({ region: e.value })} />
          </FormField>
          <FormField label={t('client.commune')}>
            <AppInputText value={addr.commune ?? ''} disabled={readOnly} onChange={(e) => setAddr({ commune: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.city')}>
            <AppInputText value={addr.city ?? ''} disabled={readOnly} onChange={(e) => setAddr({ city: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.street')}>
            <AppInputText value={addr.line1 ?? ''} disabled={readOnly} onChange={(e) => setAddr({ line1: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.complement')}>
            <AppInputText value={addr.line2 ?? ''} disabled={readOnly} onChange={(e) => setAddr({ line2: e.target.value })} className="w-full" />
          </FormField>
          <FormField label={t('client.number')}>
            <AppInputText value={addr.number ?? ''} disabled={readOnly} onChange={(e) => setAddr({ number: e.target.value })} className="w-full" />
          </FormField>
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('client.sectionContacts')}</h3>
        {form.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-start gap-2">
            <div className="flex h-10.5 items-center" title={t('client.contactPrimary')}>
              <AppRadioButton
                name="primaryContact"
                checked={c.is_primary}
                disabled={readOnly}
                aria-label={t('client.contactPrimary')}
                onChange={() => setPrimaryContact(i)}
              />
            </div>
            <NestedField error={fieldErrors?.[`contacts.${i}.name`]?.[0]}>
              <AppInputText placeholder={t('client.contactName')} value={c.name} disabled={readOnly} onChange={(e) => patchContact(i, { name: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.job_title`]?.[0]}>
              <AppInputText placeholder={t('client.contactJobTitle')} value={c.job_title ?? ''} disabled={readOnly} onChange={(e) => patchContact(i, { job_title: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.email`]?.[0]}>
              <AppInputText placeholder={t('common.email')} value={c.email ?? ''} disabled={readOnly} onChange={(e) => patchContact(i, { email: e.target.value })} />
            </NestedField>
            <NestedField error={fieldErrors?.[`contacts.${i}.phone`]?.[0]}>
              <AppInputText placeholder={t('common.phone')} value={c.phone ?? ''} disabled={readOnly} onChange={(e) => patchContact(i, { phone: e.target.value })} />
            </NestedField>
          </div>
        ))}
        {!readOnly && (
          <AppButton label={t('client.addContact')} icon="pi pi-user-plus" text onClick={addContact} />
        )}
      </section>
    </CrudDialog>
  )
}
```

> ⚠️ `AppButton` passou a ser usado — adicione-o ao import de `@shared/ui`: `import { CrudDialog, AppButton, AppInputText, ... }`. (No original ele já vinha; mantenha.)

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: sem erros. Em especial, nenhum `no-unused-vars` para `Dispatch`/`SetStateAction`/`setForm` (removidos do componente).

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: `tsc -b` e `vite build` verdes.

- [ ] **Step 5: Caminhada comportamental**

Run: `pnpm dev` → `/clientes` (aba Clientes). Prove idêntico:
- Abrir um cliente (view): campos preenchem, tudo `disabled`.
- Editar → mudar razón social, mudar região do endereço, editar um contato, marcar outro contato como principal (radio troca de um para outro, nunca dois marcados), **Agregar contacto** adiciona linha vazia.
- Salvar cliente com 2+ endereços no seed e confirmar que os endereços além do 1º continuam lá após reabrir (não some nenhum).
- Criar cliente novo (campos vazios) e salvar.

Expected: comportamento igual ao de antes do refino.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/commercial/hooks/useClientForm.ts frontend/src/features/commercial/components/Client/ClientDialog.tsx
git commit -m "refactor(commercial): move manipulação de array nested do ClientDialog para useClientForm

C1 do review: patchContact/setPrimaryContact/setAddr saem do JSX e viram
helpers do hook (molde useCourseForm). Comportamento idêntico.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Extrair `AddressFields` + `ContactFields`

Grupo de campos coeso vira subcomponente da feature (rule: "grupo de campos coeso = subcomponente da feature"; contra-exemplo nomeado = os 6 FormField de endereço inline). Markup **idêntico** ao da Task 1, só movido.

**Files:**
- Create: `frontend/src/features/commercial/components/Client/AddressFields.tsx`
- Create: `frontend/src/features/commercial/components/Client/ContactFields.tsx`
- Modify: `frontend/src/features/commercial/components/Client/ClientDialog.tsx`

**Interfaces:**
- Produces `AddressFields`: `({ value: ClientAddressData; readOnly: boolean; onChange: (patch: Partial<ClientAddressData>) => void }) => JSX`.
- Produces `ContactFields`: `({ contacts: ClientData['contacts']; readOnly: boolean; fieldErrors?: Record<string, string[]> | null; onPatch: (i: number, patch: Partial<ClientData['contacts'][number]>) => void; onSetPrimary: (i: number) => void; onAdd: () => void }) => JSX`.
- Consumes: `useClientForm` (Task 1) — `setAddr`, `patchContact`, `setPrimaryContact`, `addContact`.

- [ ] **Step 1: Crie `AddressFields.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppInputText, AppDropdown, FormField } from '@shared/ui'
import { CHILE_REGIONS } from '@shared/lib'
import type { ClientAddressData } from '@shared/types/generated'

/** Bloco de endereço do cliente. Só o 1º endereço é editável nesta tela; o
 * dono (ClientDialog via useClientForm) preserva os demais. */
export function AddressFields({
  value, readOnly, onChange,
}: {
  value: ClientAddressData
  readOnly: boolean
  onChange: (patch: Partial<ClientAddressData>) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField label={t('client.region')}>
        <AppDropdown value={value.region} options={CHILE_REGIONS} disabled={readOnly} onChange={(e) => onChange({ region: e.value })} />
      </FormField>
      <FormField label={t('client.commune')}>
        <AppInputText value={value.commune ?? ''} disabled={readOnly} onChange={(e) => onChange({ commune: e.target.value })} className="w-full" />
      </FormField>
      <FormField label={t('client.city')}>
        <AppInputText value={value.city ?? ''} disabled={readOnly} onChange={(e) => onChange({ city: e.target.value })} className="w-full" />
      </FormField>
      <FormField label={t('client.street')}>
        <AppInputText value={value.line1 ?? ''} disabled={readOnly} onChange={(e) => onChange({ line1: e.target.value })} className="w-full" />
      </FormField>
      <FormField label={t('client.complement')}>
        <AppInputText value={value.line2 ?? ''} disabled={readOnly} onChange={(e) => onChange({ line2: e.target.value })} className="w-full" />
      </FormField>
      <FormField label={t('client.number')}>
        <AppInputText value={value.number ?? ''} disabled={readOnly} onChange={(e) => onChange({ number: e.target.value })} className="w-full" />
      </FormField>
    </div>
  )
}
```

- [ ] **Step 2: Crie `ContactFields.tsx`**

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton, AppInputText, AppRadioButton, NestedField } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

/** Lista de contatos do cliente. `key={i}` (não `id`): o backend replace-total
 * recria os nested e o id muda a cada save — o índice é a identidade estável. */
export function ContactFields({
  contacts, readOnly, fieldErrors, onPatch, onSetPrimary, onAdd,
}: {
  contacts: ClientData['contacts']
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onPatch: (i: number, patch: Partial<ClientData['contacts'][number]>) => void
  onSetPrimary: (i: number) => void
  onAdd: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      {contacts.map((c, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-start gap-2">
          <div className="flex h-10.5 items-center" title={t('client.contactPrimary')}>
            <AppRadioButton
              name="primaryContact"
              checked={c.is_primary}
              disabled={readOnly}
              aria-label={t('client.contactPrimary')}
              onChange={() => onSetPrimary(i)}
            />
          </div>
          <NestedField error={fieldErrors?.[`contacts.${i}.name`]?.[0]}>
            <AppInputText placeholder={t('client.contactName')} value={c.name} disabled={readOnly} onChange={(e) => onPatch(i, { name: e.target.value })} />
          </NestedField>
          <NestedField error={fieldErrors?.[`contacts.${i}.job_title`]?.[0]}>
            <AppInputText placeholder={t('client.contactJobTitle')} value={c.job_title ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { job_title: e.target.value })} />
          </NestedField>
          <NestedField error={fieldErrors?.[`contacts.${i}.email`]?.[0]}>
            <AppInputText placeholder={t('common.email')} value={c.email ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { email: e.target.value })} />
          </NestedField>
          <NestedField error={fieldErrors?.[`contacts.${i}.phone`]?.[0]}>
            <AppInputText placeholder={t('common.phone')} value={c.phone ?? ''} disabled={readOnly} onChange={(e) => onPatch(i, { phone: e.target.value })} />
          </NestedField>
        </div>
      ))}
      {!readOnly && (
        <AppButton label={t('client.addContact')} icon="pi pi-user-plus" text onClick={onAdd} />
      )}
    </>
  )
}
```

- [ ] **Step 3: Substitua os blocos inline no `ClientDialog.tsx` pelos subcomponentes**

No `ClientDialog.tsx`, troque o `<div className="grid grid-cols-2 gap-4">` do endereço (os 6 FormField) por `<AddressFields .../>` e o `{form.contacts.map(...)}` + botão por `<ContactFields .../>`. O trecho da seção fica:

```tsx
        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('client.sectionAddress')}</h3>
        <AddressFields value={addr} readOnly={readOnly} onChange={setAddr} />

        <h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('client.sectionContacts')}</h3>
        <ContactFields
          contacts={form.contacts}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          onPatch={patchContact}
          onSetPrimary={setPrimaryContact}
          onAdd={addContact}
        />
```

Ajuste os imports do `ClientDialog.tsx`:
- Adicione: `import { AddressFields } from './AddressFields'` e `import { ContactFields } from './ContactFields'`.
- Remova de `@shared/ui` os que só o endereço/contatos usavam **se não sobrarem outros usos**: `AppRadioButton`, `NestedField`, `CHILE_REGIONS` (de `@shared/lib`). Mantenha `CrudDialog, AppInputText, AppDropdown, FormField, FormErrorSummary, FormErrorBanner`. Remova `AppButton` (voltou para `ContactFields`). Remova o import de `ClientAddressData`? **Não** — o `EMPTY_ADDRESS` local ainda o usa.
- `pnpm lint` no Step 4 é a rede de segurança para import sobrando.

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: sem `no-unused-vars` (todos os imports que migraram para os subcomponentes saíram do `ClientDialog`).

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: verde.

- [ ] **Step 6: Caminhada comportamental**

`pnpm dev` → `/clientes`. Repita a mesma prova da Task 1 (view/edit/principal-único/agregar/preserva endereços). A tela renderiza **exatamente igual** — mesma grade, mesmos rótulos, mesmo comportamento.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/commercial/components/Client/AddressFields.tsx frontend/src/features/commercial/components/Client/ContactFields.tsx frontend/src/features/commercial/components/Client/ClientDialog.tsx
git commit -m "refactor(commercial): extrai AddressFields e ContactFields do ClientDialog

C2 do review: grupo de campos coeso vira subcomponente da feature.
Markup idêntico, só movido. ClientDialog fica declarativo.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Extrair `useBudgetDetail` (extração completa) e deixar `BudgetDetailPage` declarativo

Componente-Deus (237 linhas) → toda a orquestração (queries, 6 mutations, erros, estado de dialog, handlers, navegação) vai para o hook. O componente vira JSX puro. `TotalCard`/`CONFIRM_COPY` continuam locais.

**Files:**
- Create: `frontend/src/features/commercial/hooks/useBudgetDetail.ts`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`

**Interfaces:**
- Produces `useBudgetDetail(budgetId: number)` → objeto com: `loading: boolean`, `budget: BudgetData | undefined`, `client: ClientData | undefined`, `canApprove: boolean`, `editing`, `openEdit()`, `closeEdit()`, `wizard: { quote: QuoteData | null } | null`, `openWizard(quote: QuoteData | null)`, `closeWizard()`, `confirm: { action: 'approve'|'reject'|'remove'; quote: QuoteData } | null`, `askConfirm(action: 'approve'|'reject'|'remove', quote: QuoteData)`, `closeConfirm()`, `runConfirm()`, `confirmPending: boolean`, `confirmError: string | null`, `confirmDeleteBudget: boolean`, `askDeleteBudget()`, `closeDeleteBudget()`, `deleteBudget()`, `removeBudgetPending: boolean`, `removeBudgetError: string | null`, `fileType: BudgetFileType`, `setFileType(t: BudgetFileType)`, `handleUpload(e: FileUploadHandlerEvent)`, `uploadPending: boolean`, `removeFile(fileId: number)`, `fileError: string | null`, `goBack()`.
- Consumes: `budgetsApi.useOne/useRemove`, `clientsApi.useList`, `useApproveQuote/useRejectQuote/useRemoveQuote`, `useUploadBudgetFile/useRemoveBudgetFile` + tipo `BudgetFileType`, `usePermissions`, `useMutationErrors`, `useNavigate`.

- [ ] **Step 1: Crie `useBudgetDetail.ts`**

```ts
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FileUploadHandlerEvent } from '@shared/ui'
import { usePermissions, useMutationErrors } from '@shared/hooks'
import { budgetsApi } from '@shared/api/budgetsApi'
import { clientsApi } from '@shared/api/clientsApi'
import type { QuoteData } from '@shared/types/generated'
import { useApproveQuote, useRejectQuote, useRemoveQuote } from '../api/useQuotes'
import { useUploadBudgetFile, useRemoveBudgetFile, type BudgetFileType } from '../api/useCommercialFiles'

type ConfirmAction = 'approve' | 'reject' | 'remove'

/** Toda a orquestração da página de detalhe do orçamento. O componente só
 * consome e renderiza (rule: componente de feature = declarativo). */
export function useBudgetDetail(budgetId: number) {
  const navigate = useNavigate()
  const query = budgetsApi.useOne(budgetId)
  const clients = clientsApi.useList()
  const budget = query.data
  const client = budget ? clients.data?.find((c) => c.id === budget.client_id) : undefined

  const [editing, setEditing] = useState(false)
  // null = fechado; { quote: null } = criar; { quote } = editar.
  const [wizard, setWizard] = useState<{ quote: QuoteData | null } | null>(null)
  const [confirm, setConfirm] = useState<{ action: ConfirmAction; quote: QuoteData } | null>(null)
  const [confirmDeleteBudget, setConfirmDeleteBudget] = useState(false)
  const [fileType, setFileType] = useState<BudgetFileType>('invoice')

  const { can } = usePermissions()
  const canApprove = can('commercial.quote.approve')

  const approve = useApproveQuote()
  const reject = useRejectQuote()
  const removeQuote = useRemoveQuote()
  const removeBudget = budgetsApi.useRemove()
  const uploadFile = useUploadBudgetFile()
  const removeFile = useRemoveBudgetFile()

  // `message` (não `generalError`): estes 422 vêm por campo (errors.status =
  // "cotação aprovada não pode ser excluída") e não há input onde pendurá-los.
  const { message: confirmError } = useMutationErrors([approve.error, reject.error, removeQuote.error])
  const { message: removeBudgetError } = useMutationErrors([removeBudget.error])
  const { message: fileError } = useMutationErrors([uploadFile.error, removeFile.error])

  // e.options.clear() devolve o AppFileUpload ao estado vazio depois do envio.
  const handleUpload = (e: FileUploadHandlerEvent) => {
    const file = e.files[0]
    if (!file) return
    uploadFile.mutate({ budgetId, type: fileType, file }, { onSuccess: () => e.options.clear() })
  }

  // Reseta o erro da tentativa anterior: sem isso, reabrir o dialog para outra
  // cotação mostraria um erro fantasma de uma tentativa que nunca ocorreu para ela
  // (approve/reject/removeQuote vivem no hook, não são remontados a cada abertura).
  const closeConfirm = () => {
    approve.reset()
    reject.reset()
    removeQuote.reset()
    setConfirm(null)
  }

  const runConfirm = () => {
    if (!confirm) return
    const mutation = confirm.action === 'approve' ? approve : confirm.action === 'reject' ? reject : removeQuote
    mutation.mutate(confirm.quote.id!, { onSuccess: () => setConfirm(null) })
  }

  const closeDeleteBudget = () => {
    removeBudget.reset()
    setConfirmDeleteBudget(false)
  }

  // Sucesso navega para fora da página do orçamento excluído.
  const deleteBudget = () => removeBudget.mutate(budgetId, { onSuccess: () => navigate('/comercial') })

  return {
    loading: query.isLoading,
    budget,
    client,
    canApprove,
    editing,
    openEdit: () => setEditing(true),
    closeEdit: () => setEditing(false),
    wizard,
    openWizard: (quote: QuoteData | null) => setWizard({ quote }),
    closeWizard: () => setWizard(null),
    confirm,
    askConfirm: (action: ConfirmAction, quote: QuoteData) => setConfirm({ action, quote }),
    closeConfirm,
    runConfirm,
    confirmPending: approve.isPending || reject.isPending || removeQuote.isPending,
    confirmError,
    confirmDeleteBudget,
    askDeleteBudget: () => setConfirmDeleteBudget(true),
    closeDeleteBudget,
    deleteBudget,
    removeBudgetPending: removeBudget.isPending,
    removeBudgetError,
    fileType,
    setFileType,
    handleUpload,
    uploadPending: uploadFile.isPending,
    removeFile: (fileId: number) => removeFile.mutate({ budgetId, fileId }),
    fileError,
    goBack: () => navigate('/comercial'),
  }
}
```

- [ ] **Step 2: Reescreva `BudgetDetailPage.tsx` como componente declarativo**

```tsx
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { AppButton, AppTag, ConfirmDialog, AppFileUpload, AppDropdown } from '@shared/ui'
import type { BudgetFileType } from '../../api/useCommercialFiles'
import { quoteStatusSeverity } from '../../lib/quoteStatus'
import { formatUf } from '../../lib/uf'
import { useBudgetDetail } from '../../hooks/useBudgetDetail'
import { QuotesList } from './QuotesList'
import { BudgetDialog } from './BudgetDialog'
import { QuoteWizard } from './QuoteWizard'
import { FileList } from './FileList'

export function BudgetDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const budgetId = Number(id)
  const d = useBudgetDetail(budgetId)

  if (d.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>
  if (!d.budget) return <p className="p-4 text-sm text-slate-500">{t('budget.notFound')}</p>

  const budget = d.budget

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        onClick={d.goBack}
      >
        <i className="pi pi-arrow-left" aria-hidden="true" />
        {t('budget.back')}
      </button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{budget.code}</h2>
          <p className="text-sm text-slate-500">
            {d.client?.legal_name ?? '—'}
            {d.client?.rut && ` · RUT ${d.client.rut}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {budget.status && (
            <AppTag value={t(`quoteStatus.${budget.status}`)} severity={quoteStatusSeverity(budget.status)} />
          )}
          {/* Ação primária primeiro; destrutivo por último (UI-B5). */}
          <AppButton
            variant="brandIcon"
            label={t('budget.addQuote')}
            icon="pi pi-file"
            onClick={() => d.openWizard(null)}
          />
          {/* Único caminho de edição: o backend só deixa payment_terms mudar. */}
          <AppButton label={t('common.edit')} icon="pi pi-pencil" outlined onClick={d.openEdit} />
          <AppButton
            label={t('common.delete')}
            icon="pi pi-trash"
            outlined
            severity="danger"
            onClick={d.askDeleteBudget}
          />
        </div>
      </header>

      {/* Os três totais vêm SOMADOS do backend (bcmath). A UI nunca soma UF. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <TotalCard label={t('budget.totalQuoted')} value={budget.total_value_uf} />
        <TotalCard label={t('budget.totalApproved')} value={budget.total_approved_uf} tone="success" />
        <TotalCard label={t('budget.totalRejected')} value={budget.total_rejected_uf} tone="danger" />
      </div>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700">
        <header className="flex items-center justify-between p-4">
          <h3 className="font-medium">
            {t('budget.quotes')} <span className="text-slate-500">({budget.quotes.length})</span>
          </h3>
        </header>
        <QuotesList
          quotes={budget.quotes}
          onEdit={(q) => d.openWizard(q)}
          onRemove={(q) => d.askConfirm('remove', q)}
          onApprove={d.canApprove ? (q) => d.askConfirm('approve', q) : undefined}
          onReject={d.canApprove ? (q) => d.askConfirm('reject', q) : undefined}
        />
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700">
        <header className="flex flex-wrap items-center justify-between gap-3 p-4">
          <h3 className="font-medium">{t('budget.documents')}</h3>
          <div className="flex items-center gap-2">
            <div className="w-44">
              <AppDropdown
                value={d.fileType}
                options={[
                  { label: t('budget.fileTypeInvoice'), value: 'invoice' },
                  { label: t('budget.fileTypeReceipt'), value: 'receipt' },
                ]}
                onChange={(e) => d.setFileType(e.value as BudgetFileType)}
              />
            </div>
            <AppFileUpload
              chooseOptions={{ icon: 'pi pi-upload' }}
              chooseLabel={t('budget.uploadDocument')}
              disabled={d.uploadPending}
              uploadHandler={d.handleUpload}
            />
          </div>
        </header>
        {d.fileError && (
          <p className="mx-4 mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {d.fileError}
          </p>
        )}
        <FileList files={budget.files ?? []} onRemove={(fileId) => d.removeFile(fileId)} />
      </section>

      {/* Reusa o dialog em modo edit — trava cliente e código, só payment_terms muda. */}
      {d.editing && (
        <BudgetDialog visible mode="edit" budget={budget} onHide={d.closeEdit} />
      )}

      {d.wizard && (
        <QuoteWizard visible budgetId={budgetId} quote={d.wizard.quote} onHide={d.closeWizard} />
      )}

      {d.confirm && (
        <ConfirmDialog
          visible
          title={t(CONFIRM_COPY[d.confirm.action].title)}
          message={t(CONFIRM_COPY[d.confirm.action].body)}
          confirmLabel={t(CONFIRM_COPY[d.confirm.action].label)}
          severity={d.confirm.action === 'approve' ? undefined : 'danger'}
          pending={d.confirmPending}
          error={d.confirmError}
          onCancel={d.closeConfirm}
          onConfirm={d.runConfirm}
        />
      )}

      {d.confirmDeleteBudget && (
        <ConfirmDialog
          visible
          title={t('budget.confirmDeleteTitle')}
          message={t('budget.confirmDeleteBody')}
          confirmLabel={t('common.delete')}
          severity="danger"
          pending={d.removeBudgetPending}
          error={d.removeBudgetError}
          onCancel={d.closeDeleteBudget}
          onConfirm={d.deleteBudget}
        />
      )}
    </div>
  )
}

const CONFIRM_COPY = {
  approve: { title: 'quote.confirmApproveTitle', body: 'quote.confirmApproveBody', label: 'quote.approve' },
  reject: { title: 'quote.confirmRejectTitle', body: 'quote.confirmRejectBody', label: 'quote.reject' },
  remove: { title: 'quote.confirmDeleteTitle', body: 'quote.confirmDeleteBody', label: 'common.delete' },
} as const

function TotalCard({ label, value, tone }: { label: string; value?: string; tone?: 'success' | 'danger' }) {
  const color =
    tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <p className={`text-2xl font-semibold ${color}`}>{formatUf(value ?? '0')} UF</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}
```

> Nota: a caixa de `fileError` continua na mão aqui **de propósito** — a troca por `FormErrorBanner` é a Task 4 (mantém os diffs separados e revisáveis). O reorder do header (UI-B5) já entrou nesta task porque o header inteiro foi reescrito.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: sem `no-unused-vars`. O componente não importa mais `useState`, `useNavigate`, `usePermissions`, `useMutationErrors`, `budgetsApi`, `clientsApi`, os hooks de quote/file, nem `QuoteData`.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: verde.

- [ ] **Step 5: Caminhada comportamental (peso legal — capriche)**

`pnpm dev` → abra um orçamento em `/comercial/presupuestos/<id>`. Prove idêntico:
- **Aprovar/recusar cotação** (com usuário que tem `commercial.quote.approve`): botões aparecem; ação funciona; totais repintam.
- **Erro no confirm:** tente excluir uma cotação **aprovada** → o 422 ("não pode ser excluída") aparece no dialog. Feche, reabra o confirm para OUTRA cotação → **não** aparece erro fantasma.
- **Upload/remoção de documento:** enviar arquivo → some do input (clear); erro de upload aparece na caixa.
- **Editar orçamento** (só payment_terms) e **excluir orçamento** → navega para `/comercial`.
- **Voltar** (seta) → `/comercial`.

Expected: tudo igual ao de antes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/commercial/hooks/useBudgetDetail.ts frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx
git commit -m "refactor(commercial): extrai useBudgetDetail; BudgetDetailPage vira declarativo

C-Deus do review: query+mutations+estado+handlers+navegação saem do
componente (237 linhas) para o hook da feature. Header reordenado (UI-B5:
primária primeiro, destrutivo por último). Comportamento idêntico.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Trocar caixa de erro na mão por `FormErrorBanner` (B1)

Rule: não reintroduzir "UnmappedErrors local". As caixas `<p bg-red-50>` de `fileError` viram `FormErrorBanner`. **Preservar a margem** com wrapper (o banner traz só `mb-4`).

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`

**Interfaces:**
- Consumes: `FormErrorBanner` de `@shared/ui` — `({ message?: string | null; variant?: 'box' | 'inline' })`, default `box` = caixa vermelha com `mb-4`.

- [ ] **Step 1: `BudgetDetailPage.tsx` — troque a caixa de `fileError`**

Substitua o bloco:

```tsx
        {d.fileError && (
          <p className="mx-4 mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {d.fileError}
          </p>
        )}
```

por:

```tsx
        <div className="mx-4">
          <FormErrorBanner message={d.fileError} />
        </div>
```

E adicione `FormErrorBanner` ao import de `@shared/ui`:

```tsx
import { AppButton, AppTag, ConfirmDialog, AppFileUpload, AppDropdown, FormErrorBanner } from '@shared/ui'
```

> `FormErrorBanner` já renderiza `null` quando `message` é falsy, então o `{d.fileError && ...}` não é mais necessário. O `<div className="mx-4">` fica sempre no DOM mas vazio — reproduz o espaçamento horizontal `mx-4` da caixa original.

- [ ] **Step 2: `QuotesList.tsx` — troque a caixa de `fileError`**

Substitua:

```tsx
      {fileError && (
        <p className="m-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {fileError}
        </p>
      )}
```

por:

```tsx
      <div className="m-4 empty:m-0">
        <FormErrorBanner message={fileError} />
      </div>
```

E adicione `FormErrorBanner` ao import de `@shared/ui` do `QuotesList.tsx`:

```tsx
import { AppTag, AppButton, AppFileUpload, FormErrorBanner } from '@shared/ui'
```

> `empty:m-0` evita margem fantasma quando não há erro (o wrapper fica sem filho renderizado). A caixa original usava `m-4` (margem em todos os lados); com erro presente o resultado é idêntico.

- [ ] **Step 3: Lint + Build**

Run: `pnpm lint && pnpm build`
Expected: verde.

- [ ] **Step 4: Caminhada comportamental**

`pnpm dev`:
- **BudgetDetailPage:** force um erro de upload (ex.: arquivo de tipo inválido) → a caixa vermelha aparece no mesmo lugar (com margem lateral), some ao sucesso.
- **QuotesList:** force um erro de upload de documento de cotação → caixa vermelha aparece com o mesmo espaçamento.

Expected: visual e posicionamento idênticos ao anterior.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/BudgetDetailPage.tsx frontend/src/features/commercial/components/Budget/QuotesList.tsx
git commit -m "refactor(commercial): usa FormErrorBanner do kit para fileError

B1 do review: caixa de erro na mão vira o componente do kit (preservando
a margem). Mata a reintrodução de UnmappedErrors local.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Trocar `<input type="radio">` cru por `AppRadioButton` no QuoteWizard (B2)

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx`

**Interfaces:**
- Consumes: `AppRadioButton` de `@shared/ui` (wrapper do RadioButton do Prime; sem forwardRef).

- [ ] **Step 1: Troque o input cru dentro do `<label>` do picker de curso**

No `QuoteWizard.tsx`, o bloco atual:

```tsx
                <input
                  type="radio"
                  name="quote-course"
                  checked={form.course_id === c.id}
                  onChange={() => set('course_id', c.id as number)}
                />
```

vira:

```tsx
                <AppRadioButton
                  name="quote-course"
                  checked={form.course_id === c.id}
                  onChange={() => set('course_id', c.id as number)}
                />
```

Adicione `AppRadioButton` ao import de `@shared/ui`:

```tsx
import { AppDialog, AppButton, AppInputText, AppRadioButton, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 2: Lint + Build**

Run: `pnpm lint && pnpm build`
Expected: verde.

- [ ] **Step 3: Caminhada comportamental**

`pnpm dev` → abra um orçamento → **Agregar cotización** → passo 1: a lista de cursos mostra o radio do Prime; clicar numa linha seleciona o curso (só um marcado); **Siguiente** habilita ao selecionar. Editar cotização existente também mantém o curso marcado ao voltar ao passo 1.

Expected: seleção de curso idêntica, agora com o radio do design system.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/QuoteWizard.tsx
git commit -m "refactor(commercial): usa AppRadioButton no picker de curso do QuoteWizard

B2 do review: radio cru vira o wrapper do design system.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Onda 2 — Visual

### Task 6: Criar `AppDatePicker` (wrapper + locale es-CL)

Wrapper novo em `shared/ui` sobre o `Calendar` do Prime. Contrato **string `'YYYY-MM-DD'` in/out** (preserva o form) com conversão **local** (anti-shift de fuso). Locale `es` registrado no boot.

**Files:**
- Create: `frontend/src/shared/ui/AppDatePicker/AppDatePicker.tsx`
- Create: `frontend/src/shared/ui/AppDatePicker/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Create: `frontend/src/shared/config/primeLocale.ts`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Produces `AppDatePicker`: `(props: AppDatePickerProps) => JSX`, onde `AppDatePickerProps = Omit<CalendarProps, 'value' | 'onChange' | 'ref'> & { value: string | null; onChange: (value: string | null) => void }`.
- Produces `registerPrimeLocales(): void`.

- [ ] **Step 1: Crie `AppDatePicker.tsx`**

```tsx
import { Calendar } from 'primereact/calendar'
import type { CalendarProps } from 'primereact/calendar'

export type AppDatePickerProps = Omit<CalendarProps, 'value' | 'onChange' | 'ref'> & {
  /** Data em ISO `YYYY-MM-DD` (o formato que o backend espera). `null` = vazio. */
  value: string | null
  onChange: (value: string | null) => void
}

// `YYYY-MM-DD` → Date à meia-noite LOCAL. Nunca `new Date('YYYY-MM-DD')`, que
// parseia como UTC e recua um dia em fuso negativo (Chile é UTC-3/-4).
function isoToDate(iso: string | null): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// Date → `YYYY-MM-DD` pelos componentes LOCAIS (mesma razão anti-fuso).
function dateToIso(date: Date | null | undefined): string | null {
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Wrapper do Calendar. String ISO in/out para não passar dinheiro-de-tempo por
 * conversão de fuso perigosa. Cores vêm do tema (ADR-16). Sem forwardRef: o
 * Calendar do Prime é class component (categoria AppDropdown). */
export function AppDatePicker({ value, onChange, ...rest }: AppDatePickerProps) {
  return (
    <Calendar
      value={isoToDate(value)}
      onChange={(e) => onChange(dateToIso(e.value as Date | null))}
      dateFormat="dd/mm/yy"
      locale="es"
      showIcon
      className="w-full"
      {...rest}
    />
  )
}
```

- [ ] **Step 2: Crie `AppDatePicker/index.ts`**

```ts
export * from './AppDatePicker'
```

- [ ] **Step 3: Registre no barrel raiz `shared/ui/index.ts`**

Adicione a linha (ordem alfabética, junto dos outros `App*`):

```ts
export * from './AppDatePicker'
```

- [ ] **Step 4: Crie `shared/config/primeLocale.ts`**

```ts
import { addLocale } from 'primereact/api'

/** Locale es-CL do PrimeReact (nomes de mês/dia do Calendar). Rodar uma vez no
 * boot, antes do primeiro render — mesmo lugar do applyPrimeTheme (ADR-16). */
export function registerPrimeLocales(): void {
  addLocale('es', {
    firstDayOfWeek: 1,
    dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    monthNames: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    today: 'Hoy',
    clear: 'Limpiar',
  })
}
```

- [ ] **Step 5: Chame no `main.tsx`**

Adicione o import e a chamada logo antes de `applyPrimeTheme(...)`:

```tsx
import { applyPrimeTheme } from "./shared/config/primeTheme";
import { registerPrimeLocales } from "./shared/config/primeLocale";
import { useUiStore } from "./shared/stores/uiStore";

registerPrimeLocales();
applyPrimeTheme(useUiStore.getState().theme);
```

- [ ] **Step 6: Lint + Build**

Run: `pnpm lint && pnpm build`
Expected: verde. (O wrapper ainda não é consumido; a Task 7 o usa.)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/ui/AppDatePicker/ frontend/src/shared/ui/index.ts frontend/src/shared/config/primeLocale.ts frontend/src/main.tsx
git commit -m "feat(shared/ui): AppDatePicker (Calendar) com contrato ISO string e locale es-CL

Wrapper string YYYY-MM-DD in/out com conversão local (anti-shift de fuso).
Locale es registrado no boot. Sem forwardRef (class component).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Usar `AppDatePicker` no QuoteWizard (resolve UI-B2)

Troca os dois `<input type="date">` crus pelo wrapper. O contrato string do `useQuoteForm` **não muda**.

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx`

**Interfaces:**
- Consumes: `AppDatePicker` de `@shared/ui`; `form.planned_start_date`/`planned_end_date` são `string | null` e `set(...)` os aceita.

- [ ] **Step 1: Substitua os dois inputs de data**

O bloco atual:

```tsx
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('quote.plannedStart')} error={fieldErrors?.planned_start_date?.[0]}>
              <input
                type="date"
                className="w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                value={form.planned_start_date ?? ''}
                onChange={(e) => set('planned_start_date', e.target.value || null)}
              />
            </FormField>
            <FormField label={t('quote.plannedEnd')} error={fieldErrors?.planned_end_date?.[0]}>
              <input
                type="date"
                className="w-full rounded border border-slate-300 p-2 dark:border-slate-600 dark:bg-slate-800"
                value={form.planned_end_date ?? ''}
                onChange={(e) => set('planned_end_date', e.target.value || null)}
              />
            </FormField>
          </div>
```

vira:

```tsx
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('quote.plannedStart')} error={fieldErrors?.planned_start_date?.[0]}>
              <AppDatePicker
                value={form.planned_start_date ?? null}
                onChange={(v) => set('planned_start_date', v)}
              />
            </FormField>
            <FormField label={t('quote.plannedEnd')} error={fieldErrors?.planned_end_date?.[0]}>
              <AppDatePicker
                value={form.planned_end_date ?? null}
                onChange={(v) => set('planned_end_date', v)}
              />
            </FormField>
          </div>
```

Adicione `AppDatePicker` ao import de `@shared/ui`:

```tsx
import { AppDialog, AppButton, AppInputText, AppRadioButton, AppDatePicker, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

- [ ] **Step 2: Lint + Build**

Run: `pnpm lint && pnpm build`
Expected: verde.

- [ ] **Step 3: Caminhada comportamental (prova de fuso — obrigatória)**

`pnpm dev` → abra um orçamento → **Agregar cotización** → passo 2:
- Os campos de data mostram o Calendar do Prime (ícone, look igual aos inputs Prime), com nomes de mês em espanhol.
- Escolha **1 de um mês** (ex.: 01/03/2026). Salve. Reabra a cotação em edição: a data volta como **01/03/2026**, não 28/02. (Confirma que não houve shift de fuso.)
- Deixar a data vazia continua permitido (campo opcional).

Expected: datas gravam e re-hidratam corretamente; visual consistente com os inputs Prime.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/QuoteWizard.tsx
git commit -m "refactor(commercial): usa AppDatePicker no QuoteWizard

UI-B2 do review: input date nativo destoava do input Prime. Contrato de
string preservado; sem shift de fuso.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Indicador de passo no QuoteWizard (UI-B1)

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/QuoteWizard.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `step` (1 | 2) de `useQuoteForm` (já existe).

- [ ] **Step 1: Adicione a chave `quote.step` nos 3 locales**

Em `es-CL.json`, dentro de `"quote"`:

```json
    "step": "Paso {{current}} de {{total}}",
```

Em `pt-BR.json`, dentro de `"quote"`:

```json
    "step": "Passo {{current}} de {{total}}",
```

Em `en.json`, dentro de `"quote"`:

```json
    "step": "Step {{current}} of {{total}}",
```

- [ ] **Step 2: Renderize o indicador no header do dialog**

No `QuoteWizard.tsx`, o `AppDialog` recebe um `header`. Troque o `header` atual:

```tsx
      header={quote ? t('quote.edit') : t('quote.new')}
```

por um header com título + indicador de passo:

```tsx
      header={
        <div className="flex items-center justify-between gap-4">
          <span>{quote ? t('quote.edit') : t('quote.new')}</span>
          <span className="text-xs font-normal text-slate-500">{t('quote.step', { current: step, total: 2 })}</span>
        </div>
      }
```

> `AppDialog` (wrapper do Dialog do Prime) aceita `ReactNode` em `header`. Se o TS reclamar do tipo do header, confirme a assinatura em `shared/ui/AppDialog` — o Dialog do Prime aceita `header?: ReactNode`.

- [ ] **Step 3: Lint + Build**

Run: `pnpm lint && pnpm build`
Expected: verde.

- [ ] **Step 4: Caminhada comportamental**

`pnpm dev` → **Agregar cotización**: header mostra "Paso 1 de 2"; **Siguiente** → "Paso 2 de 2"; **Volver** → volta a "Paso 1 de 2". Editar cotização abre em "Paso 2 de 2". Trocar idioma reflete o rótulo.

Expected: indicador correto em cada passo, nos 3 idiomas.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/commercial/components/Budget/QuoteWizard.tsx frontend/src/shared/config/locales/
git commit -m "feat(commercial): indicador de passo no QuoteWizard

UI-B1 do review: wizard de 2 passos sem orientação. Chave quote.step nos
3 locales.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Unificar a toolbar das duas abas (UI-B3)

A busca da aba Clientes ganha o mesmo wrapper da aba Orçamentos. Cai junto a linha em branco solta (`ClientsTable.tsx:18`).

**Files:**
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx`

- [ ] **Step 1: Envolva a busca no mesmo wrapper da `BudgetsTable`**

Troque o topo do `return` do `ClientsTable.tsx`:

```tsx
    <div className="space-y-3">
      
      <AppInputText
        leftIcon="pi pi-search"
        placeholder={t('client.searchPlaceholder')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <AppDataTable
```

por:

```tsx
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="min-w-64 flex-1">
          <AppInputText
            leftIcon="pi pi-search"
            placeholder={t('client.searchPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>
      <AppDataTable
```

> Mesmo padrão de wrapper que a `BudgetsTable` (`flex flex-wrap gap-3` + `min-w-64 flex-1`). A linha em branco solta desaparece no processo.

- [ ] **Step 2: Lint + Build**

Run: `pnpm lint && pnpm build`
Expected: verde.

- [ ] **Step 3: Caminhada comportamental**

`pnpm dev` → `/clientes`: alterne entre aba **Clientes** e aba **Orçamentos** — a barra de busca tem a mesma largura/alinhamento nas duas. A busca por nome/RUT do cliente continua filtrando.

Expected: toolbars consistentes; busca funciona igual.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/commercial/components/Client/ClientsTable.tsx
git commit -m "style(commercial): unifica a toolbar das abas Clientes e Orçamentos

UI-B3 do review: busca da aba Clientes ganha o wrapper da BudgetsTable.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: `aria-label` nos botões só-ícone (UI-B4)

Botão só-ícone sem nome acessível → adicionar `aria-label` (i18n). Sem mudança visual.

**Files:**
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`
- Modify: `frontend/src/features/commercial/components/Budget/QuotesList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/FileList.tsx`
- Modify: `frontend/src/features/commercial/components/Budget/BudgetsTable.tsx`
- Modify: `frontend/src/features/commercial/components/Client/ClientsTable.tsx`

**Interfaces:**
- Consumes: `AppButton` aceita `aria-label` (passa para o Button do Prime). Chaves i18n novas: `common.view`, `common.upload`.

- [ ] **Step 1: Adicione `common.view` e `common.upload` nos 3 locales**

`es-CL.json` em `"common"`:

```json
    "view": "Ver",
    "upload": "Subir documento",
```

`pt-BR.json` em `"common"`:

```json
    "view": "Ver",
    "upload": "Enviar documento",
```

`en.json` em `"common"`:

```json
    "view": "View",
    "upload": "Upload document",
```

- [ ] **Step 2: `QuotesList.tsx` — aria-label nos ícones e no upload**

- Botão editar: `<AppButton icon="pi pi-pencil" text rounded aria-label={t('common.edit')} onClick={() => onEdit(q)} />`
- Botão excluir: `<AppButton icon="pi pi-trash" text rounded severity="danger" aria-label={t('common.delete')} onClick={() => onRemove(q)} />`
- Upload da linha: adicione `chooseOptions={{ icon: 'pi pi-upload', className: 'p-button-text p-button-rounded', 'aria-label': t('common.upload') }}` (mantém `chooseLabel=""`).

- [ ] **Step 3: `FileList.tsx` — aria-label no download e no trash**

- Download: `<AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />`
- Trash: `<AppButton icon="pi pi-trash" text rounded severity="danger" aria-label={t('common.delete')} onClick={() => onRemove(f.id)} />`

- [ ] **Step 4: `BudgetsTable.tsx` e `ClientsTable.tsx` — aria-label no olho**

Em ambas, o botão de ação da última coluna:

```tsx
<AppButton icon="pi pi-eye" text rounded aria-label={t('common.view')} onClick={...} />
```

(mantém o `onClick` existente de cada uma).

- [ ] **Step 5: Lint + Build**

Run: `pnpm lint && pnpm build`
Expected: verde.

- [ ] **Step 6: Caminhada comportamental (a11y)**

`pnpm dev`. Com o devtools (aba Accessibility) ou um leitor de tela, confirme que os botões de olho/lápis/lixeira/download/upload agora expõem um **nome acessível** (Ver/Editar/Excluir/Baixar/Subir documento). Visualmente nada muda.

Expected: nome acessível presente; zero mudança visual.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/commercial/components/ frontend/src/shared/config/locales/
git commit -m "a11y(commercial): aria-label nos botões só-ícone

UI-B4 do review: olho/lápis/lixeira/download/upload ganham nome acessível
(chaves common.view/common.upload nos 3 locales).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (feito na escrita do plano)

- **Cobertura do spec:** C1→Task 1 · C2→Task 2 · C-Deus→Task 3 · B1→Task 4 · B2→Task 5 · UI-B2/AppDatePicker→Tasks 6-7 · UI-B1→Task 8 · UI-B3→Task 9 · UI-B4→Task 10 · UI-B5→dobrado na Task 3 (header reescrito de qualquer forma; nota explícita). Nit da linha em branco→Task 9. Locale es-CL→Task 6. Todos os itens da tabela da Seção 3 do spec têm task.
- **Placeholders:** nenhum — todo passo tem código real e comando com expectativa.
- **Consistência de tipos:** o objeto de `useBudgetDetail` (Task 3) declara os nomes que o componente consome (`d.openWizard`, `d.askConfirm`, `d.confirmError`, `d.goBack`…); `AppDatePickerProps` (Task 6) é o que a Task 7 usa; `setAddr`/`patchContact`/`setPrimaryContact`/`addContact` (Task 1) são os que a Task 2 injeta nos subcomponentes.
- **Ordem:** estrutural (1-5) antes de visual (6-10), como manda o review.

## Pós-execução (fora deste plano)

- Rodar `/fechar-sprint` (gate) e atualizar `docs/superpowers/progress.md` (nova linha Entregue).
- Acionar sync de docs no Notion: task **H.1.3**.
