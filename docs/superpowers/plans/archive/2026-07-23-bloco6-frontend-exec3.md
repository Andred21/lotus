# Bloco 6-frontend · Exec 3 — Documentación + Conclusión Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as abas `Documentación` e `Conclusión` da página de detalhe da turma, a abertura do manual PDF e o encerramento da pendência P-07, sem tocar backend.

**Architecture:** Feature `operation` ganha `api/useTurmaDocuments.ts` (list/upload/remove), duas mutations novas em `api/useTurmas.ts` (conclude, manual em blob), a pasta `components/Document/` e dois hooks de seção. `habilitada` e `missing_document_types` chegam prontos em `TurmaData` — o front nunca recalcula habilitação. Toda mutação de documento invalida a key dos documentos **e** `turmaKeys.all`, porque a habilitação é derivada no backend. Infra nova compartilhada: `shared/ui/AppToast` + provider global.

**Tech Stack:** React 19 + TS, TanStack Query, PrimeReact via `shared/ui`, Tailwind v4 (layout), i18next (pt-BR/es-CL/en), axios com envelope RFC 7807.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-21-bloco6-frontend-operacao-design.md` (decisões D6, D9, D10, D11).
- **Zero backend nesta execução.** Rotas consumidas já existem: `GET/POST /api/turmas/{id}/documents`, `DELETE /api/turmas/{id}/documents/{file}`, `POST /api/turmas/{id}/conclude`, `GET /api/turmas/{id}/manual`.
- Taxonomia documental = os 3 tipos do enum backend: `MANUAL`, `PRUEBAS`, `EVALUACION_REDATOR` (D6, RN-16). Não inventar 4º tipo.
- Upload backend: `mimes:pdf`, `max:10240` (10 MB). Vários arquivos por tipo.
- Features não importam PrimeReact direto — só via `shared/ui` (ADR-05). Feature não importa outra feature.
- Componente de feature é declarativo: estado/mutations/derivação vivem em hook da feature.
- i18n: chaves **idênticas** nos 3 locales (`frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json`), `es-CL` é a referência de rótulo.
- `can()` é conveniência de interface, não segurança (ADR-07) — a API continua autorizando.
- Gate de verificação do frontend: `pnpm build` + `pnpm lint` (de `frontend/`). **Não há test runner no front** — cada task fecha com prova comportamental na UI contra o backend real (lei §8).
- `frontend/src/shared/types/generated.ts` não se edita à mão (ADR-04). Nenhuma task deste plano precisa regenerar: `TurmaDocumentData`, `TurmaDocumentType` e `TurmaData.{habilitada,missing_document_types,concluded_at}` já estão gerados.
- Ambiente de prova: `docker compose up -d` + `pnpm dev`; login como superadmin em http://localhost:5173.

---

### Task 1: Aba Documentación em leitura (API + painel + cards por tipo)

**Files:**
- Create: `frontend/src/features/operation/api/useTurmaDocuments.ts`
- Create: `frontend/src/features/operation/lib/turmaDocuments.ts`
- Create: `frontend/src/features/operation/hooks/useTurmaDocsSection.ts`
- Create: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`
- Create: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`
- Modify: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx` (aba `docs`, hoje `comingSoon`)
- Modify: `frontend/src/shared/config/locales/pt-BR.json`, `es-CL.json`, `en.json`

**Interfaces:**
- Consumes: `TurmaData`, `TurmaDocumentData`, `TurmaDocumentType` de `@shared/types/generated`; `turmaKeys` de `../api/useTurmas`.
- Produces: `documentKeys.list(turmaId)`, `useTurmaDocuments(turmaId)`, `TURMA_DOCUMENT_TYPES`, `useTurmaDocsSection(turma)` retornando `{ turmaId, loading, error, byType, deliveredCount, totalTypes, habilitada, concluida }`, `<TurmaDocuments turma={turma} />`, `<DocumentTypeCard type files />`.

- [ ] **Step 1: Criar o cliente de documentos**

Criar `frontend/src/features/operation/api/useTurmaDocuments.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@shared/api/axios'
import type { ProblemDetails } from '@shared/api/axios'
import type { TurmaDocumentData } from '@shared/types/generated'

export const documentKeys = {
  all: ['turma-documents'] as const,
  list: (turmaId: number) => ['turma-documents', 'list', turmaId] as const,
}

export function useTurmaDocuments(turmaId: number) {
  return useQuery<TurmaDocumentData[], ProblemDetails>({
    queryKey: documentKeys.list(turmaId),
    queryFn: () =>
      api.get<TurmaDocumentData[]>(`/api/turmas/${turmaId}/documents`).then((r) => r.data),
    enabled: Number.isFinite(turmaId),
  })
}
```

- [ ] **Step 2: Fixar a ordem de exibição dos 3 tipos**

Criar `frontend/src/features/operation/lib/turmaDocuments.ts`:

```ts
import type { TurmaDocumentType } from '@shared/types/generated'

/** Os 3 tipos do enum backend (D6/RN-16), na ordem de exibição da aba.
 * A habilitação da turma exige um arquivo em cada um deles — quem decide é o
 * backend (`TurmaData.habilitada`), esta lista é só apresentação. */
export const TURMA_DOCUMENT_TYPES: TurmaDocumentType[] = ['MANUAL', 'PRUEBAS', 'EVALUACION_REDATOR']

/** Tamanho legível para a linha do arquivo (o backend devolve bytes). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
```

- [ ] **Step 3: Criar o hook da seção**

Criar `frontend/src/features/operation/hooks/useTurmaDocsSection.ts`:

```ts
import type { TurmaData, TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
import { useMutationErrors } from '@shared/hooks'
import { useTurmaDocuments } from '../api/useTurmaDocuments'
import { TURMA_DOCUMENT_TYPES } from '../lib/turmaDocuments'

/** Orquestra a aba Documentación. O componente só consome.
 * `habilitada` NÃO é recalculada aqui: vem derivada do backend em `TurmaData`. */
export function useTurmaDocsSection(turma: TurmaData) {
  const turmaId = turma.id!
  const list = useTurmaDocuments(turmaId)
  const { message: error } = useMutationErrors([list.error])

  const files = list.data ?? []
  const byType = TURMA_DOCUMENT_TYPES.reduce<Record<TurmaDocumentType, TurmaDocumentData[]>>(
    (acc, type) => {
      acc[type] = files.filter((f) => f.type === type)
      return acc
    },
    {} as Record<TurmaDocumentType, TurmaDocumentData[]>,
  )

  return {
    turmaId,
    loading: list.isLoading,
    error,
    byType,
    deliveredCount: TURMA_DOCUMENT_TYPES.filter((type) => byType[type].length > 0).length,
    totalTypes: TURMA_DOCUMENT_TYPES.length,
    habilitada: turma.habilitada === true,
    concluida: turma.status === 'concluida',
  }
}
```

- [ ] **Step 4: Criar o card de tipo**

Criar `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppTag } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
import { formatFileSize } from '../../lib/turmaDocuments'

type Props = {
  type: TurmaDocumentType
  files: TurmaDocumentData[]
}

export function DocumentTypeCard({ type, files }: Props) {
  const { t } = useTranslation()
  const delivered = files.length > 0

  return (
    <section className="rounded border border-slate-200 p-4 dark:border-slate-700">
      <header className="flex items-center justify-between gap-4">
        <h4 className="font-medium">{t(`operation.documents.type.${type}`)}</h4>
        <AppTag
          value={t(delivered ? 'operation.documents.delivered' : 'operation.documents.pending')}
          severity={delivered ? 'success' : 'warning'}
        />
      </header>

      <ul className="mt-3 space-y-1">
        {files.map((file) => (
          <li key={file.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <i className="pi pi-file-pdf" aria-hidden="true" />
            <span>{file.original_name}</span>
            <span className="text-slate-400">
              {formatFileSize(file.size)} · {formatDate(new Date(file.created_at))}
            </span>
          </li>
        ))}
        {!delivered && <li className="text-sm text-slate-400">{t('operation.documents.empty')}</li>}
      </ul>
    </section>
  )
}
```

- [ ] **Step 5: Criar o painel da aba**

Criar `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import type { TurmaData } from '@shared/types/generated'
import { useTurmaDocsSection } from '../../hooks/useTurmaDocsSection'
import { TURMA_DOCUMENT_TYPES } from '../../lib/turmaDocuments'
import { DocumentTypeCard } from './DocumentTypeCard'

export function TurmaDocuments({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useTurmaDocsSection(turma)

  if (s.loading) return <p className="p-4 text-sm text-slate-500">{t('common.loading')}</p>

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-medium">{t('operation.documents.title')}</h3>
        <p className="text-sm text-slate-500">
          {t('operation.documents.progress', { done: s.deliveredCount, total: s.totalTypes })}
        </p>
        <div className="mt-2 h-2 w-full rounded bg-slate-200 dark:bg-slate-700">
          <div
            className="h-2 rounded bg-emerald-500 transition-[width]"
            style={{ width: `${(s.deliveredCount / s.totalTypes) * 100}%` }}
          />
        </div>
      </div>

      {s.error && <p className="text-sm text-red-600">{s.error}</p>}

      {s.habilitada && !s.concluida && (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {t('operation.documents.enabled')}
        </p>
      )}

      <div className="space-y-3">
        {TURMA_DOCUMENT_TYPES.map((type) => (
          <DocumentTypeCard key={type} type={type} files={s.byType[type]} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Ligar a aba na página de detalhe**

Em `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx`, importar
`import { TurmaDocuments } from '../Document/TurmaDocuments'` e trocar o corpo da aba `docs`:

```tsx
        <AppTabPanel header={t('operation.detail.tabs.docs')}>
          <TurmaDocuments turma={turma} />
        </AppTabPanel>
```

(a aba `conclusion` continua com `comingSoon` até a Task 7)

- [ ] **Step 7: Adicionar as chaves i18n nos 3 locales**

Em `es-CL.json`, dentro de `operation`, após o bloco `enrollment`:

```json
"documents": {
  "title": "Documentación de la turma",
  "progress": "{{done}} de {{total}} documentos completos",
  "type": {
    "MANUAL": "Manual",
    "PRUEBAS": "Pruebas / evaluaciones",
    "EVALUACION_REDATOR": "Evaluación del redactor"
  },
  "delivered": "Entregado",
  "pending": "Pendiente",
  "empty": "Sin archivos.",
  "enabled": "Documentación completa · turma habilitada para la conclusión."
}
```

Em `pt-BR.json`, mesma posição e mesmas chaves:

```json
"documents": {
  "title": "Documentação da turma",
  "progress": "{{done}} de {{total}} documentos completos",
  "type": {
    "MANUAL": "Manual",
    "PRUEBAS": "Provas / avaliações",
    "EVALUACION_REDATOR": "Avaliação do redator"
  },
  "delivered": "Entregue",
  "pending": "Pendente",
  "empty": "Sem arquivos.",
  "enabled": "Documentação completa · turma habilitada para a conclusão."
}
```

Em `en.json`:

```json
"documents": {
  "title": "Class documentation",
  "progress": "{{done}} of {{total}} documents complete",
  "type": {
    "MANUAL": "Manual",
    "PRUEBAS": "Tests / assessments",
    "EVALUACION_REDATOR": "Editor assessment"
  },
  "delivered": "Delivered",
  "pending": "Pending",
  "empty": "No files.",
  "enabled": "Documentation complete · class enabled for completion."
}
```

- [ ] **Step 8: Verificar o gate**

Rodar de `frontend/`:

```bash
pnpm build && pnpm lint
```

Esperado: `tsc -b` sem erro, bundle gerado, eslint sem findings.

- [ ] **Step 9: Provar na UI**

Com `docker compose up -d` e `pnpm dev`, abrir `/operacion`, entrar numa turma e clicar em `Documentación`.
Esperado: título, "0 de 3 documentos completos" (ou o número real), barra proporcional, 3 cards
(`Manual`, `Pruebas / evaluaciones`, `Evaluación del redactor`) com tag `Pendiente`/`Entregado` e
"Sin archivos." nos vazios. Nenhuma chave crua (`operation.documents…`) na tela.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/features/operation frontend/src/shared/config/locales
git commit -m "feat(operation): aba Documentacion em leitura (3 tipos + progresso)"
```

---

### Task 2: Upload de documento por tipo

**Files:**
- Modify: `frontend/src/features/operation/api/useTurmaDocuments.ts`
- Modify: `frontend/src/features/operation/hooks/useTurmaDocsSection.ts`
- Modify: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`
- Modify: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`, `es-CL.json`, `en.json`

**Interfaces:**
- Consumes: `documentKeys`, `useTurmaDocsSection` (Task 1); `turmaKeys` de `../api/useTurmas`.
- Produces: `useUploadTurmaDocument()` → mutation `{ turmaId, type, file }`; `useTurmaDocsSection` passa a expor `upload(type, file)`, `uploading`.

- [ ] **Step 1: Adicionar a mutation de upload**

Em `frontend/src/features/operation/api/useTurmaDocuments.ts`, ampliar os imports e acrescentar ao final:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TurmaDocumentData, TurmaDocumentType } from '@shared/types/generated'
import { turmaKeys } from './useTurmas'
```

```ts
/** Documento sobe como multipart: NÃO fixar Content-Type (o axios deriva o
 * boundary do FormData; fixar json faz o File virar {} e o 201 sair vazio).
 * Invalida também `turmaKeys.all`: `habilitada` é derivada no backend e muda
 * quando o 3º tipo é entregue. */
export function useUploadTurmaDocument() {
  const qc = useQueryClient()
  return useMutation<
    TurmaDocumentData,
    ProblemDetails,
    { turmaId: number; type: TurmaDocumentType; file: File }
  >({
    mutationFn: ({ turmaId, type, file }) => {
      const body = new FormData()
      body.append('type', type)
      body.append('file', file)
      return api
        .post<TurmaDocumentData>(`/api/turmas/${turmaId}/documents`, body)
        .then((r) => r.data)
    },
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: documentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
```

- [ ] **Step 2: Expor upload no hook da seção**

Em `useTurmaDocsSection.ts`, importar `useUploadTurmaDocument` e substituir o bloco de erro/retorno:

```ts
  const uploadMutation = useUploadTurmaDocument()
  const { message: error } = useMutationErrors([list.error, uploadMutation.error])
```

e acrescentar ao objeto retornado:

```ts
    upload: (type: TurmaDocumentType, file: File) =>
      uploadMutation.mutate({ turmaId, type, file }),
    uploading: uploadMutation.isPending,
```

- [ ] **Step 3: Adicionar o uploader ao card**

Em `DocumentTypeCard.tsx`, ampliar as props e o header:

```tsx
import { AppFileUpload, AppTag } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'

type Props = {
  type: TurmaDocumentType
  files: TurmaDocumentData[]
  uploading: boolean
  onUpload: (file: File) => void
}
```

```tsx
export function DocumentTypeCard({ type, files, uploading, onUpload }: Props) {
```

Dentro do `<header>`, depois do `AppTag`, acrescentar:

```tsx
        <AppFileUpload
          accept="application/pdf"
          chooseLabel={t('operation.documents.upload')}
          disabled={uploading}
          uploadHandler={(e: FileUploadHandlerEvent) => {
            const file = e.files[0]
            if (file) onUpload(file)
          }}
        />
```

Abaixo da lista de arquivos, acrescentar a dica de limite:

```tsx
      <p className="mt-2 text-xs text-slate-400">{t('operation.documents.uploadHint')}</p>
```

- [ ] **Step 4: Passar as props no painel**

Em `TurmaDocuments.tsx`, no `map`:

```tsx
          <DocumentTypeCard
            key={type}
            type={type}
            files={s.byType[type]}
            uploading={s.uploading}
            onUpload={(file) => s.upload(type, file)}
          />
```

- [ ] **Step 5: Chaves i18n (3 locales)**

`es-CL.json` → `operation.documents`:

```json
  "upload": "Subir PDF",
  "uploadHint": "Solo PDF, hasta 10 MB. Puedes subir varios archivos por tipo.",
```

`pt-BR.json`:

```json
  "upload": "Subir PDF",
  "uploadHint": "Somente PDF, até 10 MB. É possível subir vários arquivos por tipo.",
```

`en.json`:

```json
  "upload": "Upload PDF",
  "uploadHint": "PDF only, up to 10 MB. Multiple files per type are allowed.",
```

- [ ] **Step 6: Verificar o gate**

```bash
pnpm build && pnpm lint
```

Esperado: verde.

- [ ] **Step 7: Provar na UI**

Numa turma `em_andamento`: subir um PDF em `Manual` → o arquivo aparece na lista com tamanho e data,
a tag vira `Entregado` e o progresso vai a "1 de 3". Subir um segundo PDF no mesmo tipo → os dois
arquivos ficam listados (vários por tipo). Completar os 3 tipos → aparece o banner
"Documentación completa · turma habilitada…" e a tag do cabeçalho da página vira `Habilitada`
(sem recarregar a página: a invalidação de `turmaKeys.all` repinta).
Tentar subir um `.png` renomeado ou arquivo > 10 MB → mensagem de erro 422 exibida no painel, sem
arquivo criado.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/operation frontend/src/shared/config/locales
git commit -m "feat(operation): upload de documento por tipo na aba Documentacion"
```

---

### Task 3: Remoção de documento com ConfirmDialog

**Files:**
- Modify: `frontend/src/features/operation/api/useTurmaDocuments.ts`
- Modify: `frontend/src/features/operation/hooks/useTurmaDocsSection.ts`
- Modify: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`
- Modify: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`, `es-CL.json`, `en.json`

**Interfaces:**
- Consumes: `documentKeys`, `useTurmaDocsSection`, `DocumentTypeCard` (Tasks 1–2); `ConfirmDialog` de `@shared/ui`.
- Produces: `useRemoveTurmaDocument()` → mutation `{ turmaId, fileId }`; `useTurmaDocsSection` passa a expor `remove(fileId)`, `removing`.

- [ ] **Step 1: Adicionar a mutation de remoção**

Ao final de `useTurmaDocuments.ts`:

```ts
/** Remoção de documento com peso legal (RN-16): a rota usa scopeBindings, então
 * arquivo de outra turma responde 404. Invalida a lista e a turma (a habilitação
 * pode cair de volta para "em curso"). */
export function useRemoveTurmaDocument() {
  const qc = useQueryClient()
  return useMutation<void, ProblemDetails, { turmaId: number; fileId: number }>({
    mutationFn: ({ turmaId, fileId }) =>
      api.delete(`/api/turmas/${turmaId}/documents/${fileId}`).then(() => undefined),
    onSuccess: (_data, { turmaId }) => {
      qc.invalidateQueries({ queryKey: documentKeys.list(turmaId) })
      qc.invalidateQueries({ queryKey: turmaKeys.all })
    },
  })
}
```

- [ ] **Step 2: Expor remoção no hook**

Em `useTurmaDocsSection.ts`, importar `useRemoveTurmaDocument`, instanciar
`const removeMutation = useRemoveTurmaDocument()`, incluir `removeMutation.error` no
`useMutationErrors([...])` e acrescentar ao retorno:

```ts
    remove: (fileId: number) => removeMutation.mutate({ turmaId, fileId }),
    removing: removeMutation.isPending,
```

- [ ] **Step 3: Botão Quitar por arquivo**

Em `DocumentTypeCard.tsx`, ampliar as props com `onRemove: (file: TurmaDocumentData) => void` e
`removing: boolean`, importar `AppButton` e acrescentar o botão dentro do `<li>` de cada arquivo,
depois do tamanho/data:

```tsx
            <AppButton
              icon="pi pi-trash"
              text
              severity="danger"
              aria-label={t('operation.documents.remove')}
              disabled={removing}
              onClick={() => onRemove(file)}
            />
```

- [ ] **Step 4: Confirmação no painel**

Em `TurmaDocuments.tsx`, importar `useState` e `ConfirmDialog`, e manter o alvo em estado local
(estado de UI que não cruza fronteira → `useState`, não Zustand):

```tsx
  const [pendingRemoval, setPendingRemoval] = useState<TurmaDocumentData | null>(null)
```

Passar ao card `removing={s.removing}` e `onRemove={setPendingRemoval}`, e renderizar ao final do
`<div>` externo:

```tsx
      <ConfirmDialog
        visible={pendingRemoval !== null}
        title={t('operation.documents.removeTitle')}
        message={t('operation.documents.removeBody', { name: pendingRemoval?.original_name ?? '' })}
        confirmLabel={t('operation.documents.remove')}
        severity="danger"
        pending={s.removing}
        error={s.error}
        onConfirm={() => {
          if (!pendingRemoval) return
          s.remove(pendingRemoval.id)
          setPendingRemoval(null)
        }}
        onCancel={() => setPendingRemoval(null)}
      />
```

- [ ] **Step 5: Chaves i18n (3 locales)**

`es-CL.json` → `operation.documents`:

```json
  "remove": "Quitar",
  "removeTitle": "Quitar documento",
  "removeBody": "¿Quitar «{{name}}»? Si el tipo queda sin archivos, la turma vuelve a En curso.",
```

`pt-BR.json`:

```json
  "remove": "Remover",
  "removeTitle": "Remover documento",
  "removeBody": "Remover «{{name}}»? Se o tipo ficar sem arquivos, a turma volta para Em curso.",
```

`en.json`:

```json
  "remove": "Remove",
  "removeTitle": "Remove document",
  "removeBody": "Remove “{{name}}”? If the type is left with no files, the class returns to In progress.",
```

- [ ] **Step 6: Verificar o gate**

```bash
pnpm build && pnpm lint
```

Esperado: verde.

- [ ] **Step 7: Provar na UI**

Numa turma habilitada: clicar na lixeira de um arquivo → abre o diálogo com o nome do arquivo;
`Cancelar` não remove nada; confirmar → o arquivo some, o progresso cai para "2 de 3", a tag do tipo
volta a `Pendiente` e a tag do cabeçalho volta a `En curso`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/operation frontend/src/shared/config/locales
git commit -m "feat(operation): remocao de documento de turma com confirmacao"
```

---

### Task 4: Bloqueios — turma concluída e permissão `submit_docs`

**Files:**
- Modify: `frontend/src/features/operation/hooks/useTurmaDocsSection.ts`
- Modify: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`
- Modify: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`, `es-CL.json`, `en.json`

**Interfaces:**
- Consumes: `usePermissions` de `@shared/hooks` (expõe `can(permission: string)`); `useTurmaDocsSection` (Tasks 1–3).
- Produces: `useTurmaDocsSection` passa a expor `canSubmit: boolean` e `lockReason: 'concluida' | 'permission' | null`; `DocumentTypeCard` ganha a prop `canSubmit`.

- [ ] **Step 1: Derivar o gate no hook**

Em `useTurmaDocsSection.ts`, importar `usePermissions` junto de `useMutationErrors`:

```ts
import { useMutationErrors, usePermissions } from '@shared/hooks'
```

Antes do return:

```ts
  const { can } = usePermissions()
  const concluida = turma.status === 'concluida'
  // `can()` é conveniência de interface; a autorização real é da API (ADR-07).
  const hasPermission = can('operation.turma.submit_docs')
  const lockReason: 'concluida' | 'permission' | null = concluida
    ? 'concluida'
    : hasPermission
      ? null
      : 'permission'
```

Trocar no retorno `concluida,` por:

```ts
    concluida,
    canSubmit: !concluida && hasPermission,
    lockReason,
```

- [ ] **Step 2: Esconder ações quando bloqueado**

Em `DocumentTypeCard.tsx`, acrescentar `canSubmit: boolean` às props e envolver o `AppFileUpload`,
a dica de limite e o botão de remoção:

```tsx
        {canSubmit && (
          <AppFileUpload
            accept="application/pdf"
            chooseLabel={t('operation.documents.upload')}
            disabled={uploading}
            uploadHandler={(e: FileUploadHandlerEvent) => {
              const file = e.files[0]
              if (file) onUpload(file)
            }}
          />
        )}
```

```tsx
            {canSubmit && (
              <AppButton
                icon="pi pi-trash"
                text
                severity="danger"
                aria-label={t('operation.documents.remove')}
                disabled={removing}
                onClick={() => onRemove(file)}
              />
            )}
```

```tsx
      {canSubmit && <p className="mt-2 text-xs text-slate-400">{t('operation.documents.uploadHint')}</p>}
```

- [ ] **Step 3: Banner de bloqueio no painel**

Em `TurmaDocuments.tsx`, passar `canSubmit={s.canSubmit}` ao card e renderizar acima dos cards:

```tsx
      {s.lockReason && (
        <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t(`operation.documents.lock.${s.lockReason}`)}
        </p>
      )}
```

- [ ] **Step 4: Chaves i18n (3 locales)**

`es-CL.json` → `operation.documents`:

```json
  "lock": {
    "concluida": "La turma está concluida: la documentación quedó inmutable (RN-15).",
    "permission": "No tienes permiso para subir o quitar documentación."
  },
```

`pt-BR.json`:

```json
  "lock": {
    "concluida": "A turma está concluída: a documentação ficou imutável (RN-15).",
    "permission": "Você não tem permissão para subir ou remover documentação."
  },
```

`en.json`:

```json
  "lock": {
    "concluida": "The class is concluded: documentation is now immutable (RN-15).",
    "permission": "You do not have permission to upload or remove documentation."
  },
```

- [ ] **Step 5: Verificar o gate**

```bash
pnpm build && pnpm lint
```

Esperado: verde.

- [ ] **Step 6: Provar na UI**

1. Numa turma já `concluida` (usar uma concluída pelo backend, ou concluir uma após a Task 7):
   abre `Documentación` → banner de imutabilidade, nenhum botão de upload nem lixeira, arquivos ainda
   listados.
2. Criar uma role sem `operation.turma.submit_docs` em `/administracion` (aba Roles y Permisos),
   atribuí-la a um usuário de teste com `operation.turma.view`, logar com ele e abrir a mesma aba →
   banner "No tienes permiso…", lista visível, sem ações.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/operation frontend/src/shared/config/locales
git commit -m "feat(operation): bloqueio de documentacao por conclusao e permissao"
```

---

### Task 5: Abrir manual PDF (blob + objectURL)

**Files:**
- Modify: `frontend/src/features/operation/api/useTurmas.ts`
- Create: `frontend/src/features/operation/components/Document/ManualButton.tsx`
- Modify: `frontend/src/features/operation/components/Document/TurmaDocuments.tsx`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`, `es-CL.json`, `en.json`

**Interfaces:**
- Consumes: `api`, `ProblemDetails` de `@shared/api/axios`.
- Produces: `useTurmaManual()` → mutation `turmaId: number` → `Blob`; `<ManualButton turmaId={number} />`.

- [ ] **Step 1: Mutation de manual em blob**

Ao final de `frontend/src/features/operation/api/useTurmas.ts`:

```ts
/** Com `responseType: 'blob'` o corpo de erro também chega como Blob, então o
 * interceptor do axios rejeita o próprio Blob no lugar do envelope RFC 7807 —
 * por isso o corpo é lido e reparseado aqui (D10). */
async function problemFromBlob(error: unknown): Promise<ProblemDetails> {
  if (error instanceof Blob) {
    try {
      return JSON.parse(await error.text()) as ProblemDetails
    } catch {
      // corpo não-JSON (HTML de erro, PDF truncado): cai no envelope genérico abaixo
    }
  }
  return error as ProblemDetails
}

export function useTurmaManual() {
  return useMutation<Blob, ProblemDetails, number>({
    mutationFn: (turmaId) =>
      api
        .get<Blob>(`/api/turmas/${turmaId}/manual`, { responseType: 'blob' })
        .then((r) => r.data)
        .catch(async (error: unknown) => {
          throw await problemFromBlob(error)
        }),
  })
}
```

- [ ] **Step 2: Componente do botão**

Criar `frontend/src/features/operation/components/Document/ManualButton.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import { useMutationErrors } from '@shared/hooks'
import { useTurmaManual } from '../../api/useTurmas'

/** Abre o manual da turma numa aba nova. O PDF é buscado como blob (a rota exige
 * o cookie de sessão) e o objectURL é revogado no unmount para não vazar. */
export function ManualButton({ turmaId }: { turmaId: number }) {
  const { t } = useTranslation()
  const manual = useTurmaManual()
  const { message } = useMutationErrors([manual.error])
  const urlRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const open = () =>
    manual.mutate(turmaId, {
      onSuccess: (blob) => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = URL.createObjectURL(blob)
        window.open(urlRef.current, '_blank', 'noopener')
      },
    })

  return (
    <div className="flex flex-col items-end gap-1">
      <AppButton
        label={t('operation.documents.manual')}
        icon="pi pi-file-pdf"
        outlined
        loading={manual.isPending}
        onClick={open}
      />
      {message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Colocar o botão no cabeçalho da aba**

Em `TurmaDocuments.tsx`, importar `ManualButton` e substituir o primeiro `<div>` (título + progresso
+ barra) por:

```tsx
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">{t('operation.documents.title')}</h3>
          <p className="text-sm text-slate-500">
            {t('operation.documents.progress', { done: s.deliveredCount, total: s.totalTypes })}
          </p>
          <div className="mt-2 h-2 w-64 rounded bg-slate-200 dark:bg-slate-700">
            <div
              className="h-2 rounded bg-emerald-500 transition-[width]"
              style={{ width: `${(s.deliveredCount / s.totalTypes) * 100}%` }}
            />
          </div>
        </div>
        <ManualButton turmaId={s.turmaId} />
      </div>
```

- [ ] **Step 4: Chaves i18n (3 locales)**

`es-CL.json` → `operation.documents`:

```json
  "manual": "Abrir manual (PDF)",
```

`pt-BR.json`:

```json
  "manual": "Abrir manual (PDF)",
```

`en.json`:

```json
  "manual": "Open manual (PDF)",
```

- [ ] **Step 5: Verificar o gate**

```bash
pnpm build && pnpm lint
```

Esperado: verde.

- [ ] **Step 6: Provar na UI**

Com o container `gotenberg` de pé, clicar em `Abrir manual (PDF)` → botão entra em loading e uma aba
nova abre com o PDF do manual da turma (curso, cliente, alunos). Parar o `gotenberg`
(`docker compose stop gotenberg`) e clicar de novo → mensagem de erro legível abaixo do botão, sem
aba em branco. Religar (`docker compose start gotenberg`).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/operation frontend/src/shared/config/locales
git commit -m "feat(operation): abre manual PDF da turma via blob"
```

---

### Task 6: `AppToast` em `shared/ui` + provider global (D9), provado no upload

**Files:**
- Create: `frontend/src/shared/ui/AppToast/AppToast.tsx`
- Create: `frontend/src/shared/ui/AppToast/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/app/providers/AppProviders.tsx`
- Modify: `frontend/src/features/operation/hooks/useTurmaDocsSection.ts`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`, `es-CL.json`, `en.json`

**Interfaces:**
- Consumes: `Toast` de `primereact/toast` (só aqui — feature nunca importa PrimeReact direto).
- Produces: `<ToastProvider>` e `useToast()` → `{ success(detail: string): void; error(detail: string): void }`, exportados pelo barrel `@shared/ui`.

- [ ] **Step 1: Criar o wrapper + contexto**

Criar `frontend/src/shared/ui/AppToast/AppToast.tsx`:

```tsx
import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Toast } from 'primereact/toast'

type ToastApi = {
  success: (detail: string) => void
  error: (detail: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** Toast global da SPA. Único ponto que conhece o `Toast` do PrimeReact; as
 * features consomem só `useToast()` (ADR-05). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const ref = useRef<Toast>(null)

  const success = useCallback((detail: string) => {
    ref.current?.show({ severity: 'success', detail, life: 5000 })
  }, [])

  const error = useCallback((detail: string) => {
    ref.current?.show({ severity: 'error', detail, life: 8000 })
  }, [])

  const api = useMemo<ToastApi>(() => ({ success, error }), [success, error])

  return (
    <ToastContext.Provider value={api}>
      <Toast ref={ref} position="bottom-right" />
      {children}
    </ToastContext.Provider>
  )
}

/** Fora do provider o toast vira no-op: nenhuma tela quebra por falta de shell. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? { success: () => {}, error: () => {} }
}
```

Criar `frontend/src/shared/ui/AppToast/index.ts`:

```ts
export * from './AppToast'
```

- [ ] **Step 2: Exportar no barrel**

Em `frontend/src/shared/ui/index.ts`, na ordem alfabética (depois de `AppTextarea`):

```ts
export * from './AppToast'
```

- [ ] **Step 3: Montar o provider no shell**

Em `frontend/src/app/providers/AppProviders.tsx`, importar `ToastProvider` de `@shared/ui` e envolver
o conteúdo dentro do `QueryClientProvider`:

```tsx
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
```

- [ ] **Step 4: Usar o toast no upload de documento**

Em `useTurmaDocsSection.ts`, importar `useToast` de `@shared/ui` e `useTranslation` de
`react-i18next`, e trocar a chamada de upload:

```ts
  const { t } = useTranslation()
  const toast = useToast()
```

```ts
    upload: (type: TurmaDocumentType, file: File) =>
      uploadMutation.mutate(
        { turmaId, type, file },
        { onSuccess: () => toast.success(t('operation.documents.uploaded')) },
      ),
```

- [ ] **Step 5: Chaves i18n (3 locales)**

`es-CL.json` → `operation.documents`: `"uploaded": "Documento subido."`
`pt-BR.json`: `"uploaded": "Documento enviado."`
`en.json`: `"uploaded": "Document uploaded."`

- [ ] **Step 6: Verificar o gate**

```bash
pnpm build && pnpm lint
```

Esperado: verde.

- [ ] **Step 7: Provar na UI**

Subir um PDF em qualquer tipo → toast verde no canto inferior direito com "Documento subido.",
some sozinho em ~5s, e o card atualiza como antes. Trocar o idioma no menu e repetir → o texto do
toast acompanha o locale.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/shared/ui frontend/src/app/providers frontend/src/features/operation frontend/src/shared/config/locales
git commit -m "feat(ui): AppToast global e feedback de upload de documento"
```

---

### Task 7: Aba Conclusión (gate, confirmação irreversível, toast)

**Files:**
- Modify: `frontend/src/features/operation/api/useTurmas.ts`
- Create: `frontend/src/features/operation/hooks/useConclusionSection.ts`
- Create: `frontend/src/features/operation/components/Document/ConcludePanel.tsx`
- Modify: `frontend/src/features/operation/components/Turma/TurmaDetailPage.tsx`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`, `es-CL.json`, `en.json`

**Interfaces:**
- Consumes: `TurmaData.{habilitada,missing_document_types,status,concluded_at}`; `turmaDisplayStatus` de `../lib/turmaStatus`; `useToast`, `ConfirmDialog`, `AppButton`, `AppTag` de `@shared/ui`; `usePermissions`, `useMutationErrors` de `@shared/hooks`; `TURMA_DOCUMENT_TYPES` de `../lib/turmaDocuments`.
- Produces: `useConcludeTurma()` → mutation `turmaId: number` → `TurmaData`; `useConclusionSection(turma)` → `{ displayStatus, habilitada, concluida, missingTypes, canComplete, conclude, concluding, error, concludedAt }`; `<ConcludePanel turma={turma} />`.

- [ ] **Step 1: Mutation de conclusão**

Em `frontend/src/features/operation/api/useTurmas.ts`, antes de `useTurmaManual`:

```ts
/** Conclusão é terminal (RN-15): invalida lista, detalhe e pendentes via
 * `turmaKeys.all` para nenhuma tela seguir mostrando a turma como em curso. */
export function useConcludeTurma() {
  const invalidate = useInvalidate()
  return useMutation<TurmaData, ProblemDetails, number>({
    mutationFn: (turmaId) =>
      api.post<TurmaData>(`/api/turmas/${turmaId}/conclude`).then((r) => r.data),
    onSuccess: invalidate,
  })
}
```

- [ ] **Step 2: Hook da seção**

Criar `frontend/src/features/operation/hooks/useConclusionSection.ts`:

```ts
import { useTranslation } from 'react-i18next'
import type { TurmaData } from '@shared/types/generated'
import { useMutationErrors, usePermissions } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { useConcludeTurma } from '../api/useTurmas'
import { turmaDisplayStatus } from '../lib/turmaStatus'

/** Orquestra a aba Conclusión. Nenhuma regra de habilitação é recalculada aqui:
 * `habilitada` e `missing_document_types` vêm derivados do backend. */
export function useConclusionSection(turma: TurmaData) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const toast = useToast()
  const mutation = useConcludeTurma()
  const { message: error } = useMutationErrors([mutation.error])

  const concluida = turma.status === 'concluida'
  const habilitada = turma.habilitada === true

  return {
    displayStatus: turmaDisplayStatus(turma),
    habilitada,
    concluida,
    missingTypes: turma.missing_document_types ?? [],
    // `can()` é conveniência de interface; a API é que autoriza (ADR-07).
    canComplete: can('operation.turma.complete'),
    concludedAt: turma.concluded_at ?? null,
    conclude: () =>
      mutation.mutate(turma.id!, {
        onSuccess: () => toast.success(t('operation.conclusion.success')),
      }),
    concluding: mutation.isPending,
    error,
  }
}
```

- [ ] **Step 3: Painel da aba**

Criar `frontend/src/features/operation/components/Document/ConcludePanel.tsx`:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppTag, ConfirmDialog } from '@shared/ui'
import { formatDate } from '@shared/lib'
import type { TurmaData } from '@shared/types/generated'
import { useConclusionSection } from '../../hooks/useConclusionSection'
import { turmaStatusSeverity } from '../../lib/turmaStatus'

export function ConcludePanel({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useConclusionSection(turma)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <h3 className="font-medium">{t('operation.conclusion.title')}</h3>
        <AppTag
          value={t(`operation.conclusion.state.${s.displayStatus}`)}
          severity={turmaStatusSeverity(s.displayStatus)}
        />
      </div>

      {s.concluida ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {s.concludedAt
            ? t('operation.conclusion.concludedAt', { date: formatDate(new Date(s.concludedAt)) })
            : t('operation.conclusion.state.concluida')}
        </p>
      ) : (
        <>
          {s.habilitada ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('operation.conclusion.ready')}</p>
          ) : (
            <div className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <p>{t('operation.conclusion.missingTitle')}</p>
              <ul className="mt-1 list-inside list-disc">
                {s.missingTypes.map((type) => (
                  <li key={type}>{t(`operation.documents.type.${type}`)}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-slate-500">{t('operation.conclusion.warning')}</p>

          {s.error && <p className="text-sm text-red-600">{s.error}</p>}

          {s.canComplete ? (
            <AppButton
              label={t('operation.conclusion.confirm')}
              icon="pi pi-check-circle"
              severity="danger"
              disabled={!s.habilitada || s.concluding}
              loading={s.concluding}
              onClick={() => setConfirming(true)}
            />
          ) : (
            <p className="text-sm text-slate-500">{t('operation.conclusion.noPermission')}</p>
          )}
        </>
      )}

      <ConfirmDialog
        visible={confirming}
        title={t('operation.conclusion.confirmTitle')}
        message={t('operation.conclusion.confirmBody')}
        confirmLabel={t('operation.conclusion.confirm')}
        severity="danger"
        pending={s.concluding}
        error={s.error}
        onConfirm={() => {
          s.conclude()
          setConfirming(false)
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Ligar a aba**

Em `TurmaDetailPage.tsx`, importar `ConcludePanel` e trocar o corpo da aba `conclusion`:

```tsx
        <AppTabPanel header={t('operation.detail.tabs.conclusion')}>
          <ConcludePanel turma={turma} />
        </AppTabPanel>
```

- [ ] **Step 5: Chaves i18n (3 locales)**

`es-CL.json` → dentro de `operation`, após `documents`:

```json
"conclusion": {
  "title": "Conclusión de la turma",
  "state": {
    "em_andamento": "En curso (bloqueado)",
    "habilitada": "Habilitada",
    "concluida": "Concluida"
  },
  "missingTitle": "Faltan documentos para habilitar la turma:",
  "ready": "La turma está lista para concluir.",
  "warning": "Al confirmar, notas y asistencias quedan inmutables y los certificados de los alumnos aprobados pasan a estar disponibles para emisión. La acción no se puede deshacer.",
  "confirm": "Confirmar conclusión",
  "confirmTitle": "Confirmar conclusión de la turma",
  "confirmBody": "Esta acción es irreversible. ¿Confirmas la conclusión de la turma?",
  "success": "Conclusión confirmada. Certificados disponibles para emisión.",
  "concludedAt": "Concluida el {{date}}",
  "noPermission": "No tienes permiso para concluir turmas."
}
```

`pt-BR.json`:

```json
"conclusion": {
  "title": "Conclusão da turma",
  "state": {
    "em_andamento": "Em curso (bloqueado)",
    "habilitada": "Habilitada",
    "concluida": "Concluída"
  },
  "missingTitle": "Faltam documentos para habilitar a turma:",
  "ready": "A turma está pronta para ser concluída.",
  "warning": "Ao confirmar, notas e presenças ficam imutáveis e os certificados dos alunos aprovados passam a estar disponíveis para emissão. A ação não pode ser desfeita.",
  "confirm": "Confirmar conclusão",
  "confirmTitle": "Confirmar conclusão da turma",
  "confirmBody": "Esta ação é irreversível. Confirma a conclusão da turma?",
  "success": "Conclusão confirmada. Certificados disponíveis para emissão.",
  "concludedAt": "Concluída em {{date}}",
  "noPermission": "Você não tem permissão para concluir turmas."
}
```

`en.json`:

```json
"conclusion": {
  "title": "Class completion",
  "state": {
    "em_andamento": "In progress (blocked)",
    "habilitada": "Enabled",
    "concluida": "Concluded"
  },
  "missingTitle": "Documents missing to enable the class:",
  "ready": "The class is ready to be concluded.",
  "warning": "On confirmation, grades and attendance become immutable and certificates for approved students become available for issuing. This action cannot be undone.",
  "confirm": "Confirm completion",
  "confirmTitle": "Confirm class completion",
  "confirmBody": "This action is irreversible. Confirm the completion of this class?",
  "success": "Completion confirmed. Certificates available for issuing.",
  "concludedAt": "Concluded on {{date}}",
  "noPermission": "You do not have permission to conclude classes."
}
```

- [ ] **Step 6: Verificar o gate**

```bash
pnpm build && pnpm lint
```

Esperado: verde.

- [ ] **Step 7: Provar na UI**

1. Turma sem os 3 documentos: aba `Conclusión` mostra tag `En curso (bloqueado)`, lista dos tipos
   faltantes e botão `Confirmar conclusión` desabilitado.
2. Completar os 3 tipos na aba `Documentación` → voltar: tag `Habilitada`, texto "lista para
   concluir", botão habilitado.
3. Clicar → diálogo irreversível; `Cancelar` não conclui.
4. Confirmar → toast "Conclusión confirmada. Certificados disponibles para emisión.", tag do
   cabeçalho vira `Concluida`, painel mostra "Concluida el <data>" sem botão, e a aba
   `Documentación` entra em modo imutável (Task 4).
5. Usuário sem `operation.turma.complete` → painel mostra o aviso de permissão, sem botão.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/operation frontend/src/shared/config/locales
git commit -m "feat(operation): aba Conclusion com confirmacao irreversivel e toast"
```

---

### Task 8: Encerrar P-07 e registrar o estado das pendências

**Files:**
- Modify: `docs/pendencias.md`

**Interfaces:**
- Consumes: nada de código; depende só da prova na UI.
- Produces: P-07 movida para a seção "Encerradas" com a evidência.

- [ ] **Step 1: Provar que P-07 já não existe**

Abrir `/administracion` → aba `Roles y Permisos` → abrir o picker de permissões do grupo `Operación`
nos 3 idiomas (menu de idioma no header). Esperado: as 8 permissões `operation.*` — incluindo
`operation.enrollment.manage`, `operation.turma.submit_docs` e `operation.turma.complete` — aparecem
com rótulo traduzido, nenhuma chave crua (`perm.operation_…`) na tela.

Confirmar a origem das chaves:

```bash
git log --oneline -1 -- frontend/src/shared/config/locales/es-CL.json | cat
grep -c '"operation_' frontend/src/shared/config/locales/es-CL.json
```

Esperado: as 8 chaves presentes (`grep -c` retorna 8) nos 3 arquivos.

- [ ] **Step 2: Mover P-07 para Encerradas**

Em `docs/pendencias.md`, remover a linha `| P-07 | …` da tabela de pendências abertas (linha 19) e,
na seção "## Encerradas (mantidas 1 sprint para rastro, depois saem)", cujo cabeçalho é
`| ID | Pendência | Como fechou |`, substituir a linha `| _(nenhuma no momento)_ | — | — |` por:

```markdown
| P-07 | Chaves i18n de `operation.enrollment.manage`, `operation.turma.submit_docs` e `operation.turma.complete` ausentes nos 3 locales | Bloco 6-frontend Exec 3 (2026-07-23): as 8 chaves `perm.operation_*` já haviam sido criadas em `c48496c` (Bloco 5.4) nos 3 locales; a Exec 3 provou na UI que o picker de Roles renderiza rótulo traduzido em pt-BR/es-CL/en, sem chave crua (decisão D11 da spec) |
```

- [ ] **Step 3: Commit**

```bash
git add docs/pendencias.md
git commit -m "docs(pendencias): encerra P-07 (i18n das permissoes de Operacao)"
```

---

## Handoff de execução

`executor: claude`

**Critério:** todas as tasks fecham com prova comportamental na UI contra o backend real (upload
multipart, habilitação derivada, gate de permissão, conclusão irreversível com peso legal RN-15/16).
Nenhuma delas tem verificação puramente executável — o frontend não tem test runner e o DoD do
projeto (lei §8) exige o comportamento provado, não `pnpm build` verde. A Task 7 mexe em ação
irreversível de peso legal, e a Task 4 depende de julgamento sobre gate de permissão (ADR-07),
ambos fora do que um executor com paths fechados decide sozinho.
