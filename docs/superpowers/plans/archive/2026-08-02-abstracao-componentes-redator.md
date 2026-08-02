# Abstração de componentes do Redator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cortar `RedatorDialog.tsx` (448 linhas, 4 responsabilidades) em subcomponentes locais de `identity` e extrair para `shared/` as duas fatias que ficaram repetidas em 3 features — as ações da linha de arquivo e o estado do preview — sem mudar comportamento observável.

**Architecture:** `shared/hooks/useFilePreview` guarda o estado do diálogo de pré-visualização; `shared/ui/AppFileActions` renderiza o conjunto padrão de botões da linha (ver → baixar → extras do consumidor → excluir). Os três consumidores (`identity`, `operation`, `commercial`) adotam os dois e mantêm **a estrutura de suas telas na tela**. O `RedatorDialog` passa a compor `RedatorIdentityFields`, `RedatorDocumentSlot` e `RedatorCourseSelector`, todos locais de `identity`.

**Tech Stack:** React 19 + TypeScript, Vite, PrimeReact via `shared/ui`, Tailwind v4 (layout), i18next (3 locales), TanStack Query.

**Spec:** `docs/superpowers/specs/2026-08-02-abstracao-componentes-redator-design.md` (D1–D12).

---

## Global Constraints

- **Sem test runner no frontend.** Não existe Vitest/Jest neste projeto. O gate por task é `pnpm build` + `pnpm lint`; o gate de aceite é comparação visual contra a baseline da Task 1. **Nenhuma task deste plano escreve teste automatizado** — não é esquecimento, é a realidade da stack, e o desvio do TDD padrão está registrado na Task 0.
- **Comportamento observável idêntico**, com exatamente três exceções declaradas: D7 (cor da borda do slot do redator), D10 (`aria-label` nos botões de download) e a unificação do rótulo do lixo (Task 2, passo 1).
- **Lei §6 (`CLAUDE.md` §5.6):** feature não importa PrimeReact direto (só via `shared/ui`) nem outra feature, nem para tipo.
- **`shared/ui` não carrega regra de domínio** (`.claude/rules/frontend-fsliced.md`).
- **Tailwind é layout; cor vem de variável CSS do tema** (ADR-16).
- **`forwardRef` é condicional, não cerimônia** — `AppFileActions` não leva (apresentacional sem ref de DOM útil).
- **Branch no main tree, sem worktree (D12).** Branch `refactor/abstracao-componentes-redator` a partir de `main`. **Nunca commitar no `main`.**
- **Disciplina git no main tree (lição 9):** `git status` antes de cada task; `git add` **só** nos paths exatos da task; `git diff <arquivo>` antes de editar arquivo que já esteja sujo. O João edita o working tree **ao vivo** — o WIP dele é intocável.
- **Pint não se aplica** (bloco 100% frontend, zero arquivo de `backend/`).
- **`generated.ts` não é tocado.** Se alguma task parecer exigir mudança nele, PARE — é sinal de erro de escopo.
- Todos os comandos rodam de `frontend/` (nativo no WSL, Node 22/pnpm).
- **Números de linha citados neste plano são do `RedatorDialog.tsx` ORIGINAL (448 linhas), no commit anterior à Task 7.** As Tasks 7, 8 e 9 editam o mesmo arquivo em sequência, então as linhas **derivam** a cada task. Toda referência traz junto o trecho de código que a ancora — **localize pelo conteúdo, nunca pelo número.**

## Chaves i18n — todas já existem nas 3 locales, nenhuma a criar

`common.preview` (Ver/Ver/View) · `common.download` (Baixar/Descargar/Download) · `common.delete` (Excluir/Eliminar/Delete) · `common.notLoaded` (Não enviado/No cargado/Not uploaded). Verificado em `shared/config/locales/{pt-BR,es-CL,en}.json`.

---

## File Structure

**Criar**

| Path | Responsabilidade |
|---|---|
| `frontend/src/shared/hooks/useFilePreview.ts` | Estado do diálogo de preview: `{ file, visible, open, close }` |
| `frontend/src/shared/ui/AppFileActions/AppFileActions.tsx` | Botões padrão da linha de arquivo |
| `frontend/src/shared/ui/AppFileActions/index.ts` | Barrel da pasta |
| `frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx` | Grid 2×2 nome/RUT/e-mail/telefone |
| `frontend/src/features/identity/components/Redator/RedatorDocumentSlot.tsx` | Um tipo de documento, três modos |
| `frontend/src/features/identity/components/Redator/RedatorCourseSelector.tsx` | Os cinco estados da seleção de cursos |

**Modificar**

| Path | Mudança |
|---|---|
| `frontend/src/shared/ui/index.ts` | + `export * from './AppFileActions'` |
| `frontend/src/shared/hooks/index.ts` | + `export { useFilePreview } from './useFilePreview'` |
| `frontend/src/shared/lib/redatorStatus.ts` | + `Idoneidade`, `IDONEIDADE_SEVERITY`, `DOC_STATUS_SEVERITY`, `DocType`, `DOC_TYPES` |
| `frontend/src/features/commercial/components/Budget/FileList.tsx` | adota os dois primitivos |
| `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx` | adota os dois primitivos |
| `frontend/src/features/catalog/components/Course/RedatorCard.tsx` | usa `IDONEIDADE_SEVERITY` |
| `frontend/src/features/identity/components/Redator/RedatoresTable.tsx` | usa `IDONEIDADE_SEVERITY` |
| `frontend/src/features/identity/hooks/useRedatorForm.ts` | `stagedDocs` fecha o tipo |
| `frontend/src/features/identity/components/Redator/RedatorDialog.tsx` | 448 → ~185 linhas |

`frontend/src/shared/lib/index.ts` **não** entra: ele já faz `export * from './redatorStatus'`, então os símbolos novos saem sozinhos.

---

## Task 0: Branch e registro do desvio de TDD

**Files:**
- Create: `.superpowers/sdd/progress.md` (ou append, se já existir)

- [ ] **Step 1: Confirmar árvore limpa e criar a branch**

```bash
cd /home/jvbat/projetos/lotus
git status --short
```

Se houver arquivo sujo que **não** seja seu, PARE e reporte ao João (lição 9). Depois:

```bash
git checkout -b refactor/abstracao-componentes-redator
git branch --show-current
```

Esperado: `refactor/abstracao-componentes-redator`

- [ ] **Step 2: Registrar o desvio de convenção**

O plano-padrão do projeto usa TDD. Este não usa, e o motivo vai registrado (regra do `/executar-bloco`). Acrescente a `.superpowers/sdd/progress.md`:

```markdown
## 2026-08-02 — abstracao-componentes-redator

**Desvio de convenção: plano sem TDD.** O frontend do Lotus não tem test runner
(sem Vitest/Jest — ver `.claude/rules/frontend-fsliced.md`, "Comandos"). O gate por
task é `pnpm build` + `pnpm lint`; o aceite é comparação visual contra a baseline de
screenshots capturada na Task 1, conforme D11 da spec. Introduzir Vitest foi avaliado
no brainstorming e recusado: é decisão de stack, exige ADR e backlog próprio.
```

- [ ] **Step 3: Commit**

```bash
git add .superpowers/sdd/progress.md
git commit -m "docs(sdd): registra desvio de TDD por ausência de test runner no front"
```

---

## Task 1: Baseline de screenshots (D11)

Esta task é **pré-requisito de todas as outras**. Sem ela, a comparação final é contra memória.

**Files:** nenhum arquivo de código. Saída em `docs/superpowers/audits/2026-08-02-baseline-abstracao-redator/`.

- [ ] **Step 1: Subir o ambiente**

```bash
cd /home/jvbat/projetos/lotus
docker compose up -d
cd frontend && pnpm dev
```

Backend via nginx em http://localhost:8080 · frontend em http://localhost:5173.

- [ ] **Step 2: Capturar os estados, nos DOIS temas**

Criar `docs/superpowers/audits/2026-08-02-baseline-abstracao-redator/` e salvar, com nome descritivo (`redator-create-claro.png`, `redator-edit-com-doc-escuro.png`, …):

| Tela | Estados |
|---|---|
| Redator (`/personas`, aba Redatores) | `create` sem doc · `create` com doc em stage · `view` com doc · `view` sem doc · `edit` com doc · `edit` sem doc |
| Cursos dentro do diálogo do redator | seleção com cursos habilitados e não habilitados |
| Documentos de turma (`operation`) | com arquivo entregue · sem arquivo |
| Arquivos de orçamento (`commercial`) | lista com arquivos |

Enquadrar de forma a mostrar **a linha do arquivo e seus botões** — é o que vai mudar.

- [ ] **Step 3: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add docs/superpowers/audits/2026-08-02-baseline-abstracao-redator
git commit -m "docs(audit): baseline visual antes do refactor do RedatorDialog"
```

---

## Task 2: `useFilePreview` + `AppFileActions` em `shared/`

**Files:**
- Create: `frontend/src/shared/hooks/useFilePreview.ts`
- Create: `frontend/src/shared/ui/AppFileActions/AppFileActions.tsx`
- Create: `frontend/src/shared/ui/AppFileActions/index.ts`
- Modify: `frontend/src/shared/hooks/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `PreviewableFile` de `shared/ui/AppFilePreviewDialog` (`{ original_name: string; mime?: string | null; size?: number; download_url: string }`); `AppButton` de `shared/ui/AppButton`.
- Produces:
  - `useFilePreview<T>(): { file: T | null; visible: boolean; open: (f: T) => void; close: () => void }`
  - `AppFileActions<T extends PreviewableFile>(props: AppFileActionsProps<T>)`
  - `AppFileActionsProps<T>` = `{ file: T; onPreview: (file: T) => void; onRemove?: () => void; removing?: boolean; children?: ReactNode }`

> **Decisão de rótulo, declarada:** hoje o lixo usa `t('common.delete')` no `commercial` e `t('operation.documents.remove')` no `operation` ("Eliminar" vs "Quitar" em es-CL). O primitivo unifica em `common.delete`. É mudança de `aria-label` no `operation`, não de comportamento, e estende o D10 da spec. Está no DoD para ser conferida, não para passar despercebida.

- [ ] **Step 1: Criar o hook**

`frontend/src/shared/hooks/useFilePreview.ts`:

```ts
import { useState } from 'react'

/**
 * Estado do diálogo de pré-visualização de arquivo.
 *
 * Existe porque o trio `useState<T | null>` + `visible={preview !== null}` +
 * `onHide={() => setPreview(null)}` estava repetido, idêntico, em três features
 * (`RedatorDialog`, `DocumentTypeCard`, `FileList`).
 *
 * Genérico sem constraint de propósito: quem restringe é o `AppFilePreviewDialog`,
 * que só aceita `PreviewableFile | null`. Assim o hook serve a qualquer DTO de
 * arquivo sem o `shared/hooks` depender do `shared/ui`.
 */
export function useFilePreview<T>() {
  const [file, setFile] = useState<T | null>(null)

  return {
    file,
    visible: file !== null,
    open: (f: T) => setFile(f),
    close: () => setFile(null),
  }
}
```

- [ ] **Step 2: Exportar o hook no barrel**

Em `frontend/src/shared/hooks/index.ts`, acrescentar em ordem alfabética (depois da linha de `useEntityPhoto`, antes de `useIsCompactViewport`):

```ts
export { useFilePreview } from './useFilePreview'
```

- [ ] **Step 3: Criar o componente**

`frontend/src/shared/ui/AppFileActions/AppFileActions.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '../AppButton'
import type { PreviewableFile } from '../AppFilePreviewDialog'

export type AppFileActionsProps<T extends PreviewableFile> = {
  file: T
  onPreview: (file: T) => void
  /** Ausente = sem botão de excluir. */
  onRemove?: () => void
  removing?: boolean
  /** Ações da própria tela, entre baixar e excluir (ex.: substituir, no redator). */
  children?: ReactNode
}

/**
 * Conjunto padrão de ações da linha de arquivo: ver → baixar → extras → excluir.
 *
 * Nasce de 4 blocos repetidos em 3 features, que divergiam no `aria-label`: dois
 * punham, um não. Padroniza o CONJUNTO sem tirar a escolha do chamador — `onRemove`
 * ausente significa sem lixeira, `children` são as ações da tela — que é exatamente
 * o contrato que o `AppFileRow.actions` já estabelecia ("o chamador decide quais
 * existem").
 *
 * NÃO absorve a estrutura da lista nem do slot: o D8 da spec de upload de
 * 2026-07-31 avaliou e rejeitou um `AppFileList`/`AppDocumentSlot`, e segue em vigor.
 * Arquivo sem `download_url` (em stage, ainda não subiu) não usa este componente —
 * não há o que pré-visualizar nem baixar.
 */
export function AppFileActions<T extends PreviewableFile>({
  file,
  onPreview,
  onRemove,
  removing,
  children,
}: AppFileActionsProps<T>) {
  const { t } = useTranslation()

  return (
    <>
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.preview')}
        onClick={() => onPreview(file)}
      />
      <a href={file.download_url} target="_blank" rel="noreferrer">
        <AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />
      </a>
      {children}
      {onRemove && (
        <AppButton
          icon="pi pi-trash"
          text
          rounded
          severity="danger"
          aria-label={t('common.delete')}
          disabled={removing}
          onClick={onRemove}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: Criar o barrel da pasta**

`frontend/src/shared/ui/AppFileActions/index.ts`:

```ts
export * from './AppFileActions'
```

- [ ] **Step 5: Exportar no barrel raiz**

Em `frontend/src/shared/ui/index.ts`, na ordem alfabética existente — entre `export * from './AppErrorState'` e `export * from './AppFilePreviewDialog'`:

```ts
export * from './AppFileActions'
```

- [ ] **Step 6: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: build e lint verdes. Nada mudou na tela ainda — nenhum consumidor adotou os primitivos.

- [ ] **Step 7: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/shared/hooks/useFilePreview.ts frontend/src/shared/hooks/index.ts frontend/src/shared/ui/AppFileActions frontend/src/shared/ui/index.ts
git commit -m "feat(shared): AppFileActions e useFilePreview"
```

---

## Task 3: `commercial/FileList` adota os primitivos

O consumidor mais simples primeiro — valida o contrato com o menor risco.

**Files:**
- Modify: `frontend/src/features/commercial/components/Budget/FileList.tsx`

**Interfaces:**
- Consumes: `AppFileActions`, `useFilePreview` (Task 2).

- [ ] **Step 1: Reescrever o arquivo**

Substituir o conteúdo inteiro de `frontend/src/features/commercial/components/Budget/FileList.tsx` por:

```tsx
import { useTranslation } from 'react-i18next'
import { AppFileRow, AppFileActions, AppFilePreviewDialog } from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
import type { FileData } from '@shared/types/generated'

export function FileList({ files, onRemove }: { files: FileData[]; onRemove?: (fileId: number) => void }) {
  const { t } = useTranslation()
  const preview = useFilePreview<FileData>()

  if (files.length === 0) {
    return <p className="px-4 pb-4 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('budget.noDocuments')}</p>
  }

  return (
    <>
      <ul>
        {files.map((f) => (
          <li
            key={f.id}
            className="border-t px-4 py-3 first:border-t-0"
            style={{ borderColor: 'var(--surface-border)' }}
          >
            <AppFileRow
              name={f.original_name}
              mime={f.mime}
              size={f.size}
              createdAt={f.created_at}
              actions={
                <AppFileActions
                  file={f}
                  onPreview={preview.open}
                  onRemove={onRemove ? () => onRemove(f.id) : undefined}
                />
              }
            />
          </li>
        ))}
      </ul>

      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
    </>
  )
}
```

- [ ] **Step 2: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: verdes.

- [ ] **Step 3: Conferir na tela**

Abrir um orçamento com arquivos anexados. Comparar contra a baseline: ícone, nome, data/tamanho, e os botões ver/baixar/excluir na mesma ordem. `AppButton` repassa `aria-label` por spread — conferir no inspetor que os três botões têm rótulo.

- [ ] **Step 4: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/commercial/components/Budget/FileList.tsx
git commit -m "refactor(commercial): FileList usa AppFileActions e useFilePreview"
```

---

## Task 4: `operation/DocumentTypeCard` adota os primitivos

**Files:**
- Modify: `frontend/src/features/operation/components/Document/DocumentTypeCard.tsx`

**Interfaces:**
- Consumes: `AppFileActions`, `useFilePreview` (Task 2).

- [ ] **Step 1: Trocar imports e o estado de preview**

Substituir as linhas 1-3 e a linha 27 do arquivo.

De:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppFileUpload, AppTag, AppFileRow, AppFilePreviewDialog } from '@shared/ui'
```

Para:

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppFileUpload, AppTag, AppFileRow, AppFilePreviewDialog, AppFileActions } from '@shared/ui'
import { useFilePreview } from '@shared/hooks'
```

`AppButton` sai dos imports — depois deste passo o arquivo não usa mais nenhum.

De (linha 27):

```tsx
  const [preview, setPreview] = useState<TurmaDocumentData | null>(null)
```

Para:

```tsx
  const preview = useFilePreview<TurmaDocumentData>()
```

O `useState` do `sizeError` (linha 28) **permanece** — não é preview.

- [ ] **Step 2: Trocar o bloco de ações**

Substituir todo o `actions={...}` do `AppFileRow` (linhas 71-95 do original):

```tsx
              actions={
                <>
                  <AppButton
                    icon="pi pi-eye"
                    text
                    rounded
                    aria-label={t('common.preview')}
                    onClick={() => setPreview(file)}
                  />
                  <a href={file.download_url} target="_blank" rel="noreferrer">
                    <AppButton icon="pi pi-download" text rounded aria-label={t('common.download')} />
                  </a>
                  {canSubmit && (
                    <AppButton
                      icon="pi pi-trash"
                      text
                      rounded
                      severity="danger"
                      aria-label={t('operation.documents.remove')}
                      disabled={removing}
                      onClick={() => onRemove(file)}
                    />
                  )}
                </>
              }
```

Por:

```tsx
              actions={
                <AppFileActions
                  file={file}
                  onPreview={preview.open}
                  onRemove={canSubmit ? () => onRemove(file) : undefined}
                  removing={removing}
                />
              }
```

- [ ] **Step 3: Trocar a montagem do diálogo**

De (linha 104):

```tsx
      <AppFilePreviewDialog file={preview} visible={preview !== null} onHide={() => setPreview(null)} />
```

Para:

```tsx
      <AppFilePreviewDialog file={preview.file} visible={preview.visible} onHide={preview.close} />
```

- [ ] **Step 4: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: verdes. Se o lint acusar `t` não usado, conferir — ele ainda é usado no header e no empty state; se acusar, é sinal de que um passo removeu demais.

- [ ] **Step 5: Conferir na tela**

Turma → aba Documentación. Comparar contra a baseline: tag entregue/pendente, upload, linha do arquivo, e os botões. **Mudança esperada e aceita:** o `aria-label` do lixo passa de "Quitar" para "Eliminar" (es-CL).

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/operation/components/Document/DocumentTypeCard.tsx
git commit -m "refactor(operation): DocumentTypeCard usa AppFileActions e useFilePreview"
```

---

## Task 5: Mapas de severidade e tipos de documento em `shared/lib` (D8, D9)

**Files:**
- Modify: `frontend/src/shared/lib/redatorStatus.ts`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`
- Modify: `frontend/src/features/catalog/components/Course/RedatorCard.tsx`

**Interfaces:**
- Produces: `Idoneidade`, `IDONEIDADE_SEVERITY`, `DOC_STATUS_SEVERITY`, `DocType`, `DOC_TYPES`.

> Os três consumidores do mapa mudam **no mesmo commit** que o mapa nasce. O terceiro (`RedatorDialog`) é tratado na Task 9, que reescreve aquele trecho de qualquer jeito — mas o mapa antigo dele é um ternário inline, não uma const, então nada quebra no intervalo.

- [ ] **Step 1: Acrescentar os símbolos ao `redatorStatus.ts`**

No fim de `frontend/src/shared/lib/redatorStatus.ts`, e ajustando a assinatura de `idoneidade`:

```ts
export type Idoneidade = 'idoneo' | 'por_vencer' | 'no_idoneo'

/** Tipos de documento do redator. Vocabulário do backend (`documents[<tipo>]`),
 * não constante de componente. */
export const DOC_TYPES = ['CV', 'REUF', 'TITULO', 'POSTGRADO'] as const
export type DocType = (typeof DOC_TYPES)[number]

/** Convenção única de cor para idoneidade e para status de documento.
 * Antes existiam três cópias divergindo (RedatoresTable, RedatorDialog inline,
 * catalog/RedatorCard) — e o comentário do RedatorCard já pedia que não se
 * inventasse uma segunda. Agora é uma só, ao lado da regra que a produz. */
export const IDONEIDADE_SEVERITY: Record<Idoneidade, 'success' | 'warning' | 'danger'> = {
  idoneo: 'success',
  por_vencer: 'warning',
  no_idoneo: 'danger',
}

export const DOC_STATUS_SEVERITY: Record<DocStatus, 'success' | 'warning' | 'danger'> = {
  sin_venc: 'success',
  vigente: 'success',
  por_vencer: 'warning',
  vencido: 'danger',
}
```

E trocar a assinatura de `idoneidade` (linha 21) para usar o alias, sem mudar o corpo:

```ts
export function idoneidade(r: RedatorData): Idoneidade {
```

- [ ] **Step 2: `RedatoresTable` usa o mapa compartilhado**

Em `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`, remover a linha 11:

```tsx
const IDON_SEVERITY = { idoneo: 'success', por_vencer: 'warning', no_idoneo: 'danger' } as const
```

Trocar o import da linha 9:

```tsx
import { idoneidade, IDONEIDADE_SEVERITY } from '@shared/lib'
```

E no corpo da coluna de idoneidade (linha 88), trocar `IDON_SEVERITY[k]` por `IDONEIDADE_SEVERITY[k]`.

- [ ] **Step 3: `RedatorCard` usa o mapa compartilhado**

Em `frontend/src/features/catalog/components/Course/RedatorCard.tsx`, remover as linhas 6-12 (o comentário e a const `SEVERITY`), trocar o import da linha 3:

```tsx
import { idoneidade, IDONEIDADE_SEVERITY } from '@shared/lib'
```

E na linha 56, trocar `SEVERITY[status]` por `IDONEIDADE_SEVERITY[status]`.

- [ ] **Step 4: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: verdes. Erro de tipo aqui costuma significar que `status`/`k` não é `Idoneidade` — conferir que vem de `idoneidade()`.

- [ ] **Step 5: Conferir na tela**

Tabela de redatores e cards de redator dentro do `CourseDialog`: as tags de idoneidade mantêm exatamente as mesmas cores.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/shared/lib/redatorStatus.ts frontend/src/features/identity/components/Redator/RedatoresTable.tsx frontend/src/features/catalog/components/Course/RedatorCard.tsx
git commit -m "refactor(shared): mapas de severidade e DOC_TYPES em redatorStatus"
```

---

## Task 6: `useRedatorForm` fecha o tipo de `stagedDocs` (D9)

**Files:**
- Modify: `frontend/src/features/identity/hooks/useRedatorForm.ts`

**Interfaces:**
- Consumes: `DocType` (Task 5).
- Produces: `stagedDocs: Partial<Record<DocType, File>>`, `stageDoc(type: DocType, file: File)`, `unstageDoc(type: DocType)`.

- [ ] **Step 1: Trocar o import de tipos**

Na linha 4 de `frontend/src/features/identity/hooks/useRedatorForm.ts`:

```ts
import type { DialogMode, DocType } from '@shared/lib'
```

- [ ] **Step 2: Fechar o tipo do estado e dos setters**

Trocar a linha 36:

```ts
  const [stagedDocs, setStagedDocs] = useState<Record<string, File>>({})
```

Por:

```ts
  const [stagedDocs, setStagedDocs] = useState<Partial<Record<DocType, File>>>({})
```

Trocar as linhas 53-59:

```ts
  const stageDoc = (type: DocType, file: File) => setStagedDocs((s) => ({ ...s, [type]: file }))
  const unstageDoc = (type: DocType) =>
    setStagedDocs((s) => {
      const next = { ...s }
      delete next[type]
      return next
    })
```

- [ ] **Step 3: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: verdes. O `Object.entries(stagedDocs)` do `submit` (linha 72) continua válido — `entries` de um `Partial<Record<...>>` devolve `[string, File | undefined][]`, e o valor é sempre definido porque `unstageDoc` deleta a chave em vez de gravar `undefined`. Se o TS reclamar do `File | undefined` no `fd.append`, trocar aquela linha por:

```ts
      Object.entries(stagedDocs).forEach(([type, file]) => {
        if (file) fd.append(`documents[${type}]`, file)
      })
```

- [ ] **Step 4: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/identity/hooks/useRedatorForm.ts
git commit -m "refactor(identity): stagedDocs tipado por DocType"
```

---

## Task 7: Extrair `RedatorIdentityFields`

**Files:**
- Create: `frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx:170-208`

**Interfaces:**
- Consumes: `RedatorFormFields` de `../../hooks/useRedatorForm`.
- Produces: `RedatorIdentityFields({ form, set, readOnly, fieldErrors })`.

- [ ] **Step 1: Criar o componente**

`frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppInputText, FormField } from '@shared/ui'
import type { RedatorFormFields } from '../../hooks/useRedatorForm'

/** Os quatro campos de identificação do redator, no grid 2×2 de sempre.
 *
 * Não é um `PersonFields` genérico de propósito: os grids de Redator, Aluno e
 * Staff divergem (o aluno tem nome em linha inteira e empresa ao lado do
 * telefone), e unificá-los mudaria o que três telas renderizam. */
export function RedatorIdentityFields({
  form,
  set,
  readOnly,
  fieldErrors,
}: {
  form: RedatorFormFields
  set: <K extends keyof RedatorFormFields>(key: K, value: RedatorFormFields[K]) => void
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
}) {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('redator.name')} error={fieldErrors?.name?.[0]}>
          <AppInputText
            value={form.name}
            disabled={readOnly}
            onChange={(e) => set('name', e.target.value)}
            className="w-full"
          />
        </FormField>

        <FormField label={t('common.rut')} error={fieldErrors?.rut?.[0]}>
          <AppInputText
            value={form.rut}
            disabled={readOnly}
            onChange={(e) => set('rut', e.target.value)}
            className="w-full"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('common.email')} error={fieldErrors?.email?.[0]}>
          <AppInputText
            value={form.email}
            disabled={readOnly}
            onChange={(e) => set('email', e.target.value)}
            className="w-full"
          />
        </FormField>

        <FormField label={t('common.phone')}>
          <AppInputText
            value={form.phone ?? ''}
            disabled={readOnly}
            onChange={(e) => set('phone', e.target.value)}
            className="w-full"
          />
        </FormField>
      </div>
    </>
  )
}
```

> O tipo de `set` acima é o de `useEntityForm` (`shared/hooks/useEntityForm.ts:39`), conferido: `const set = <K extends keyof T>(k: K, v: T[K]) => ...`. Não é aproximação.

- [ ] **Step 2: Usar no diálogo**

Em `RedatorDialog.tsx`, substituir as linhas 170-208 (os dois `<div className="grid gap-4 sm:grid-cols-2">` com os quatro `FormField`) por:

```tsx
        <RedatorIdentityFields
          form={form}
          set={set}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
        />
```

Acrescentar o import:

```tsx
import { RedatorIdentityFields } from './RedatorIdentityFields'
```

- [ ] **Step 3: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: verdes. Se `AppInputText` ou `FormField` ficarem sem uso no `RedatorDialog`, o lint acusa — remover só o que de fato sobrou.

- [ ] **Step 4: Conferir na tela**

Diálogo do redator nos três modos. Os quatro campos, no mesmo grid 2×2, com os mesmos erros de validação.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/identity/components/Redator/RedatorIdentityFields.tsx frontend/src/features/identity/components/Redator/RedatorDialog.tsx
git commit -m "refactor(identity): extrai RedatorIdentityFields"
```

---

## Task 8: Extrair `RedatorCourseSelector`

**Files:**
- Create: `frontend/src/features/identity/components/Redator/RedatorCourseSelector.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx:393-444` (e os imports/derivações que sobem junto)

**Interfaces:**
- Consumes: `coursesApi` (`@shared/api/coursesApi`), `useEnabledFirstCourses(courses, enabledIds, resetKey)`, `CourseCard`.
- Produces: `RedatorCourseSelector({ courseIds, readOnly, onToggle, orderKey })`.

- [ ] **Step 1: Criar o componente**

`frontend/src/features/identity/components/Redator/RedatorCourseSelector.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppErrorState, AppSkeleton } from '@shared/ui'
import { coursesApi } from '@shared/api/coursesApi'
import { useEnabledFirstCourses } from '../../hooks/useEnabledFirstCourses'
import { CourseCard } from './CourseCard'

/**
 * Seleção de cursos do redator, com os cinco estados que a spec D11 do bloco de
 * cards exigiu manter distinguíveis: carregando, erro com "Reintentar", vazio de
 * verdade, leitura sem cursos, e seleção.
 *
 * Eram cinco ramos de ternário aninhado dentro do `return` do RedatorDialog;
 * aqui são guardas sequenciais. `?? []` continua proibido: fazia falha de GET se
 * disfarçar de "sem cursos habilitados".
 */
export function RedatorCourseSelector({
  courseIds,
  readOnly,
  onToggle,
  orderKey,
}: {
  courseIds: number[]
  readOnly: boolean
  onToggle: (id: number) => void
  /** Congela a ordem na abertura do diálogo (`<id>:<mode>`). */
  orderKey: string
}) {
  const { t } = useTranslation()
  const courses = coursesApi.useList()

  const allCourses = courses.data ?? []
  const enabledCourses = allCourses.filter((c) => courseIds.includes(c.id as number))
  const orderedCourses = useEnabledFirstCourses(allCourses, courseIds, orderKey)

  if (courses.isLoading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
        <AppSkeleton height="3.5rem" />
        <AppSkeleton height="3.5rem" />
      </div>
    )
  }

  if (courses.isError) {
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={courses.error?.detail ?? t('common.loadErrorHint')}
        retryLabel={t('common.retry')}
        onRetry={() => {
          void courses.refetch()
        }}
      />
    )
  }

  if (allCourses.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('course.empty')}
      </p>
    )
  }

  if (readOnly) {
    if (enabledCourses.length === 0) {
      return (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('redator.noCourses')}
        </p>
      )
    }
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {enabledCourses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {orderedCourses.map((c) => (
        <CourseCard
          key={c.id}
          course={c}
          selected={courseIds.includes(c.id as number)}
          onToggle={() => onToggle(c.id as number)}
        />
      ))}
    </div>
  )
}
```

> **Atenção ao `useEnabledFirstCourses`:** ele é um hook e por isso tem que ser chamado **antes** de qualquer `return` condicional (regra dos hooks). Por isso as três derivações ficam no topo, e só depois vêm as guardas. Inverter a ordem quebra o lint `react-hooks/rules-of-hooks`.

- [ ] **Step 2: Usar no diálogo**

Em `RedatorDialog.tsx`, substituir todo o bloco das linhas 393-444 (do `<FormSection title={t('redator.sectionCourses')} spaced />` até o fim da cadeia de ternários) por:

```tsx
        <FormSection title={t('redator.sectionCourses')} spaced />

        <RedatorCourseSelector
          courseIds={courseIds}
          readOnly={readOnly}
          onToggle={toggleCourse}
          orderKey={`${redator?.id ?? 'new'}:${mode}`}
        />
```

Remover do diálogo, que agora vivem dentro do componente novo: a linha 82 (`const courses = coursesApi.useList()`), as linhas 95-103 (`allCourses`, `enabledCourses`, `orderedCourses`) e os imports que sobraram sem uso — `coursesApi`, `useEnabledFirstCourses`, `CourseCard`, e possivelmente `AppErrorState`/`AppSkeleton`.

`const courseIds = form.course_ids` (linha 91) **permanece**: é passado como prop.

- [ ] **Step 3: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: verdes, e o lint acusando qualquer import que tenha ficado órfão.

- [ ] **Step 4: Conferir na tela — os cinco estados**

1. **Carregando:** dois skeletons (recarregar com a rede lenta no DevTools).
2. **Erro:** derrubar `docker compose stop app`, reabrir → `AppErrorState` com "Reintentar" funcionando; subir de novo com `docker compose start app`.
3. **Vazio de verdade:** só se não houver curso cadastrado.
4. **`view` sem cursos habilitados:** texto `redator.noCourses`, não lista vazia.
5. **`edit`:** habilitados primeiro, e a ordem **não** muda ao clicar — o card clicado não pode saltar de grupo sob o ponteiro.

O item 5 é o que a spec D9 do bloco de cards comprou; se ele regredir, o `orderKey` está sendo recalculado a cada render.

- [ ] **Step 5: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/identity/components/Redator/RedatorCourseSelector.tsx frontend/src/features/identity/components/Redator/RedatorDialog.tsx
git commit -m "refactor(identity): extrai RedatorCourseSelector"
```

---

## Task 9: Extrair `RedatorDocumentSlot` (D5, D6, D7)

A maior das extrações. 172 linhas de JSX com seis caminhos de render viram um componente com guardas por modo.

**Files:**
- Create: `frontend/src/features/identity/components/Redator/RedatorDocumentSlot.tsx`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx`

**Interfaces:**
- Consumes: `DocType`/`DOC_TYPES`/`docStatus`/`DOC_STATUS_SEVERITY` (Task 5); `AppFileActions` (Task 2); `AppFileRow`, `AppFileUpload`, `AppTag`, `AppButton` de `@shared/ui`; `FileUploadHandlerEvent`.
- Produces: `RedatorDocumentSlot(props)` com a assinatura do Step 1.

- [ ] **Step 1: Criar o componente**

`frontend/src/features/identity/components/Redator/RedatorDocumentSlot.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton, AppTag, AppFileUpload, AppFileRow, AppFileActions } from '@shared/ui'
import type { FileUploadHandlerEvent } from '@shared/ui'
import type { RedatorDocumentData } from '@shared/types/generated'
import type { DialogMode, DocType } from '@shared/lib'
import { docStatus, DOC_STATUS_SEVERITY } from '@shared/lib'

const UPLOAD_CHOOSE_OPTIONS = {
  icon: 'pi pi-upload',
  className: 'p-button-text p-button-rounded',
}

/**
 * Um tipo de documento do redator, nos três modos do diálogo.
 *
 * - `create`: o arquivo fica em stage no estado local até o submit (não há id de
 *   redator ainda para o endpoint aninhado). Arquivo em stage é um `File` do
 *   browser, sem `download_url` — não há o que pré-visualizar nem baixar, então
 *   a linha traz só a remoção do stage (por isso não usa `AppFileActions`).
 * - `view`: documento é imutável; só ver e baixar.
 * - `edit`: ver, baixar, substituir (upload imediato pelo endpoint aninhado) e excluir.
 *
 * `preview` e `sizeError` NÃO moram aqui (D6): são únicos para os quatro tipos e
 * vivem no diálogo — descê-los montaria quatro diálogos de preview e moveria a
 * mensagem de erro para dentro do slot.
 */
export function RedatorDocumentSlot({
  type,
  mode,
  doc,
  staged,
  canRemove,
  uploading,
  onStage,
  onUnstage,
  onUpload,
  onRemoveDoc,
  onPreview,
  onSizeReject,
}: {
  type: DocType
  mode: DialogMode
  doc: RedatorDocumentData | undefined
  staged: File | undefined
  /** Só há exclusão quando o redator já existe. */
  canRemove: boolean
  uploading: boolean
  onStage: (type: DocType, e: FileUploadHandlerEvent) => void
  onUnstage: (type: DocType) => void
  onUpload: (type: DocType, e: FileUploadHandlerEvent) => void
  onRemoveDoc: (docId: number) => void
  onPreview: (doc: RedatorDocumentData) => void
  onSizeReject: (message: string) => void
}) {
  const { t } = useTranslation()
  const status = doc ? docStatus(doc.valid_until) : null

  // D7: a borda vem da variável do tema, não de par Tailwind hardcoded
  // (`border-slate-200 dark:border-slate-700`), que era o débito do D18.
  return (
    <div className="rounded border p-2" style={{ borderColor: 'var(--surface-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{t(`documentType.${type}`)}</p>
        {mode !== 'create' && status && (
          <AppTag value={t(`documentStatus.${status}`)} severity={DOC_STATUS_SEVERITY[status]} />
        )}
      </div>

      {mode === 'create' &&
        (staged ? (
          <div className="mt-2">
            <AppFileRow
              name={staged.name}
              mime={staged.type}
              size={staged.size}
              actions={
                <AppButton
                  icon="pi pi-times"
                  text
                  rounded
                  severity="danger"
                  aria-label={t('common.delete')}
                  onClick={() => onUnstage(type)}
                />
              }
            />
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{t('common.notLoaded')}</p>
            <AppFileUpload
              chooseOptions={UPLOAD_CHOOSE_OPTIONS}
              chooseLabel=""
              onSizeReject={onSizeReject}
              uploadHandler={(e) => onStage(type, e)}
            />
          </div>
        ))}

      {mode === 'view' &&
        (doc ? (
          <div className="mt-2">
            <AppFileRow
              name={doc.original_name}
              mime={doc.mime}
              size={doc.size}
              createdAt={doc.created_at}
              actions={<AppFileActions file={doc} onPreview={onPreview} />}
            />
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">{t('common.notLoaded')}</p>
        ))}

      {mode === 'edit' &&
        (doc ? (
          <div className="mt-2">
            <AppFileRow
              name={doc.original_name}
              mime={doc.mime}
              size={doc.size}
              createdAt={doc.created_at}
              actions={
                <AppFileActions
                  file={doc}
                  onPreview={onPreview}
                  onRemove={canRemove ? () => onRemoveDoc(doc.id) : undefined}
                >
                  <AppFileUpload
                    chooseOptions={UPLOAD_CHOOSE_OPTIONS}
                    chooseLabel=""
                    disabled={uploading}
                    onSizeReject={onSizeReject}
                    uploadHandler={(e) => onUpload(type, e)}
                  />
                </AppFileActions>
              }
            />
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{t('common.notLoaded')}</p>
            <AppFileUpload
              chooseOptions={UPLOAD_CHOOSE_OPTIONS}
              chooseLabel=""
              disabled={uploading}
              onSizeReject={onSizeReject}
              uploadHandler={(e) => onUpload(type, e)}
            />
          </div>
        ))}
    </div>
  )
}
```

> **Duas notas de fidelidade.** (1) O botão de *unstage* no `create` mantém o ícone `pi pi-times` original, não `pi pi-trash` — é remoção do stage, não exclusão de documento, e trocar o ícone seria mudança visual não autorizada; ganha `aria-label` por consistência com D10. (2) `text-slate-500` dos textos "não carregado" **permanece** — é o débito D18 dos diálogos, explicitamente fora do escopo da spec (§2). Só a **borda** muda, que é o que D7 autoriza.

- [ ] **Step 2: Usar no diálogo**

Em `RedatorDialog.tsx`, substituir todo o `{DOC_TYPES.map((type) => { ... })}` (linhas 215-386) por:

```tsx
        {DOC_TYPES.map((type) => (
          <RedatorDocumentSlot
            key={type}
            type={type}
            mode={mode}
            doc={existing.find((d) => d.type === type)}
            staged={stagedDocs[type]}
            canRemove={Boolean(redator?.id)}
            uploading={upload.isPending && upload.variables?.type === type}
            onStage={handleStage}
            onUnstage={unstageDoc}
            onUpload={handleUpload}
            onRemoveDoc={(fileId) => removeDoc.mutate({ redatorId: redator!.id!, fileId })}
            onPreview={preview.open}
            onSizeReject={setSizeError}
          />
        ))}
```

- [ ] **Step 3: Ajustar o topo do diálogo**

Remover a const local `DOC_TYPES` (linha 35) e `STATUS_SEVERITY` (linhas 37-42) — agora vêm de `@shared/lib`. Trocar o import da linha 32:

```tsx
import { DOC_TYPES, idoneidade, IDONEIDADE_SEVERITY } from '@shared/lib'
```

Trocar o estado de preview (linha 85):

```tsx
  const preview = useFilePreview<RedatorDocumentData>()
```

e a montagem do diálogo (linhas 387-391):

```tsx
        <AppFilePreviewDialog
          file={preview.file}
          visible={preview.visible}
          onHide={preview.close}
        />
```

Ajustar as assinaturas dos dois handlers, que agora recebem `DocType`:

```tsx
  function handleUpload(type: DocType, e: FileUploadHandlerEvent) {
    setSizeError(null)
    const file = e.files[0]
    if (file && redator?.id) {
      upload.mutate({ redatorId: redator.id, type, file })
    }
    e.options.clear()
  }

  function handleStage(type: DocType, e: FileUploadHandlerEvent) {
    setSizeError(null)
    const file = e.files[0]
    if (file) stageDoc(type, file)
    e.options.clear()
  }
```

E simplificar o `headerExtra` (linhas 133-146), que chamava `idoneidade(redator)` três vezes:

```tsx
      headerExtra={
        mode !== 'create' && redator ? (
          <AppTag
            value={`${t('redator.suitability')}: ${t(`suitability.${idoneidade(redator)}`)}`}
            severity={IDONEIDADE_SEVERITY[idoneidade(redator)]}
          />
        ) : null
      }
```

Acrescentar os imports novos (`RedatorDocumentSlot`, `useFilePreview`) e remover os que ficaram órfãos (`AppButton`, `AppFileRow`, `AppFileUpload`, `docStatus`, `DocStatus`, `useState` se não sobrar outro uso — `sizeError` ainda usa).

- [ ] **Step 4: Verificar**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: verdes.

```bash
wc -l src/features/identity/components/Redator/RedatorDialog.tsx
```

Esperado: ~185 linhas (era 448). Bem acima disso indica que algum bloco não foi removido ao ser substituído.

- [ ] **Step 5: Conferir na tela — é o passo mais importante do plano**

Documento de redator tem peso legal. Nos **quatro** tipos:

1. **`create`:** escolher arquivo mantém em stage, sem requisição de rede (conferir na aba Network); o `×` remove do stage; submeter sobe tudo num único POST multipart e o redator nasce com os documentos.
2. **`view`:** só ver e baixar. Nenhuma ação de escrita visível.
3. **`edit` com documento:** ver, baixar, **substituir**, excluir — nesta ordem. Substituir troca o arquivo; excluir remove.
4. **`edit` sem documento:** só o upload, com o texto "não carregado".
5. **Erro de tamanho:** subir arquivo > 10 MB — a mensagem aparece **uma vez, acima da lista dos quatro tipos**, não dentro do slot (D6).
6. **D7:** a borda do slot acompanha o tema nos dois modos; comparar contra a baseline sabendo que **esta é a mudança autorizada**.
7. Tags de status do documento com as mesmas cores da baseline.

- [ ] **Step 6: Commit**

```bash
cd /home/jvbat/projetos/lotus
git add frontend/src/features/identity/components/Redator/RedatorDocumentSlot.tsx frontend/src/features/identity/components/Redator/RedatorDialog.tsx
git commit -m "refactor(identity): extrai RedatorDocumentSlot e adota AppFileActions"
```

---

## Task 10: Gate de aceite

**Files:** nenhum. Esta task só prova.

- [ ] **Step 1: Build e lint**

```bash
cd /home/jvbat/projetos/lotus/frontend && pnpm build && pnpm lint
```

Esperado: os dois verdes. **Não é aceite** (lei §8) — é pré-requisito.

- [ ] **Step 2: Greps da lei §6**

```bash
cd /home/jvbat/projetos/lotus/frontend/src
grep -rn "from 'primereact" --include=*.tsx --include=*.ts features/ || echo "OK: nenhum import direto de primereact em features"
grep -rn "@features/identity" --include=*.tsx --include=*.ts features/catalog features/commercial features/operation || echo "OK: nenhum import cruzado para identity"
grep -rn "@features/\(catalog\|commercial\|operation\)" --include=*.tsx --include=*.ts features/identity || echo "OK: identity não importa outra feature"
```

Esperado: as três linhas de "OK".

- [ ] **Step 3: Regressão do backend**

O bloco não toca `backend/`, mas a suíte roda como regressão:

```bash
cd /home/jvbat/projetos/lotus
git diff --name-only main...HEAD -- backend/
```

Esperado: **saída vazia**. Se houver qualquer arquivo, o escopo foi violado — PARE.

- [ ] **Step 4: Comparação contra a baseline**

Recapturar os mesmos estados da Task 1, nos dois temas, e comparar lado a lado. Percorrer os 11 critérios do §7 da spec. Diferença encontrada que **não** seja D7 (borda do slot do redator), D10 (`aria-label` de download) ou o rótulo do lixo do `operation` ("Quitar" → "Eliminar") é **regressão** — não fechar.

- [ ] **Step 5: Confirmar as contagens**

```bash
cd /home/jvbat/projetos/lotus/frontend/src
grep -rn "AppFilePreviewDialog" --include=*.tsx features/ | grep -c "useState" || echo "OK: nenhum useState de preview sobrou em feature"
wc -l features/identity/components/Redator/RedatorDialog.tsx
```

Esperado: nenhum `useState` de preview nas features; `RedatorDialog` em ~185 linhas.

- [ ] **Step 6: Prova visual do João**

Apresentar as comparações. **O aceite é dele**, não do build.

---

## Handoff de execução

**executor: claude**

**Motivo:** nenhuma task deste plano tem verificação executável suficiente. O critério de aceite é comparação visual contra baseline em três features — o Codex não pode provar isso, e um "build verde" seria falso aceite (lei §8). Além disso, as Tasks 2 e 9 tocam a fronteira da lei §6 e a decisão viva do `D8-upload`, que exigem julgamento fora do texto do plano. Não há `paths_autorizados` a declarar.

**Ordem obrigatória:** Task 0 → 1 antes de qualquer código. A Task 1 é a única referência objetiva do que "não mudou" significa neste bloco; sem ela, a Task 10 vira opinião.
