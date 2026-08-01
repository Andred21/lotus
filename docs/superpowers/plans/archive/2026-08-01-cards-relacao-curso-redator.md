# Cards da relação Curso ↔ Redator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as representações textuais da relação curso ↔ redator por cards — no curso, foto/nome/RUT/idoneidade do redator; no redator, nome/carga horária/módulos do curso — sem tocar backend.

**Architecture:** Um primitivo apresentacional novo (`AppSelectableCard`) em `shared/ui` dá moldura, hover e estado selecionado; dois componentes de feature (`RedatorCard` em `catalog`, `CourseCard` em `identity`) põem o conteúdo e a regra de domínio. A derivação de idoneidade sobe de `features/identity/lib` para `shared/lib` porque `catalog` não pode importar `identity` (lei §5.6). O botão "ver redator" navega para `/personas?redator=<id>` em vez de importar o diálogo do outro módulo.

**Tech Stack:** React 19 + TS (Vite), PrimeReact via `shared/ui`, Tailwind v4 (layout), TanStack Query, react-router-dom, i18next (3 locales).

**Spec:** `docs/superpowers/specs/2026-08-01-cards-relacao-curso-redator-design.md`

## Global Constraints

- **Nenhum arquivo de `backend/` é tocado neste plano.** Descobrir necessidade de campo novo é divergência da spec (D1): PARE e reporte.
- **Feature não importa outra feature, nem para tipo** (lei §5.6). `catalog` nunca importa de `features/identity/`, e vice-versa.
- **Feature não importa `primereact` direto** — só via `@shared/ui` (lei §5.6).
- **`shared/` nunca importa de `features/`.**
- **Tailwind é layout; cor vem de variável CSS do tema** (ADR-16): `var(--surface-card)`, `var(--surface-border)`, `var(--text-color)`, `var(--text-color-secondary)`, `var(--primary-color)`. Nada de `text-slate-500`/`bg-gray-200` em código novo.
- **Nenhum texto hardcoded no JSX.** Toda string vai para `pt-BR`, `es-CL` e `en` com **chaves idênticas**; `es-CL` é a referência de rótulo (cliente chileno).
- **`useEffect` com `setState` é proibido** (`react-hooks/set-state-in-effect`). Reset/derivação de estado usa "adjust state during render" (comparar valor em `useState` + set condicional no corpo do render).
- **Gate de verificação de toda task:** `pnpm build` e `pnpm lint`, ambos de `frontend/`. O frontend não tem test runner — não existe "rodar o teste" neste plano, e por isso cada task declara uma **verificação observável** própria além do build.
- **Comandos rodam de `frontend/`** (nativo no WSL, Node 22/pnpm). Backend não precisa subir para nada aqui.

---

## Estrutura de arquivos

**Criados**

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.tsx` | Moldura de card com estado selecionado. Apresentacional puro, zero domínio. |
| `frontend/src/shared/ui/AppSelectableCard/index.ts` | Reexport do componente e do tipo de props. |
| `frontend/src/shared/lib/redatorStatus.ts` | `docStatus`, `idoneidade`, `DocStatus` — movidos de `features/identity/lib/`. |
| `frontend/src/features/catalog/components/Course/RedatorCard.tsx` | Card do redator visto pelo curso: avatar, nome, RUT, tag de idoneidade, ação de ver. |
| `frontend/src/features/identity/components/Redator/CourseCard.tsx` | Card do curso visto pelo redator: nome, carga horária, contagem de módulos. |
| `frontend/src/features/identity/hooks/useEnabledFirstCourses.ts` | Ordena habilitados primeiro com a ordem congelada na abertura (D9). |

**Modificados**

| Arquivo | Mudança |
|---|---|
| `frontend/src/shared/ui/index.ts` | `export * from './AppSelectableCard'` |
| `frontend/src/shared/lib/index.ts` | `export * from './redatorStatus'` |
| `frontend/src/shared/hooks/useCrudPage.ts` | `openViewById(id)` |
| `frontend/src/features/identity/components/Redator/RedatoresTable.tsx` | import de `@shared/lib` |
| `frontend/src/features/catalog/components/Course/CourseDialog.tsx` | adota `RedatorCard` nos 3 modos + estados de loading/erro |
| `frontend/src/features/identity/components/Redator/RedatorDialog.tsx` | adota `CourseCard` nos 3 modos + estados de loading/erro |
| `frontend/src/features/identity/components/PeoplePage.tsx` | deep link `?redator=<id>` |
| `frontend/src/shared/config/locales/{pt-BR,es-CL,en}.json` | 4 chaves novas |

**Removido**

| Arquivo | Motivo |
|---|---|
| `frontend/src/features/identity/lib/redatorStatus.ts` | Movido para `shared/lib` (D2). Não deixar reexport. |

---

### Task 1: `AppSelectableCard` em `shared/ui`

**Files:**
- Create: `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.tsx`
- Create: `frontend/src/shared/ui/AppSelectableCard/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `AppSelectableCard`, `AppSelectableCardProps` pelo barrel `@shared/ui`.
  ```ts
  interface AppSelectableCardProps {
    selected?: boolean
    onToggle?: () => void
    disabled?: boolean
    action?: ReactNode
    className?: string
    children: ReactNode
  }
  ```

- [ ] **Step 1: Criar o componente**

Arquivo `frontend/src/shared/ui/AppSelectableCard/AppSelectableCard.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react'

export interface AppSelectableCardProps {
  /** Ausente (junto com `onToggle`) => card de leitura, sem semântica de botão. */
  selected?: boolean
  onToggle?: () => void
  disabled?: boolean
  /** Canto direito. Fica FORA do elemento clicável de propósito: botão dentro
   * de botão é HTML inválido, e o clique na ação não pode alternar a seleção. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * Moldura de card com estado selecionado. Apresentacional puro — não conhece
 * feature, rota nem regra de domínio (o conteúdo vem por `children`).
 *
 * Com `onToggle` renderiza um `<button aria-pressed>`; sem ele, uma `<div>` sem
 * papel interativo. Um card de leitura que se anuncia como botão mente ao
 * leitor de tela sobre o que ele faz.
 *
 * Cor por variável CSS do tema (ADR-16). O fundo do estado selecionado é
 * `color-mix` com `--surface-card`, que é o que mantém contraste nos dois temas
 * — os palette vars do Lara não invertem. O fundo do estado normal fica em
 * classe (não em `style`) para que o `hover:` consiga vencer: estilo inline tem
 * precedência sobre qualquer classe.
 */
export function AppSelectableCard({
  selected = false, onToggle, disabled = false, action, className, children,
}: AppSelectableCardProps) {
  const interactive = typeof onToggle === 'function'

  const style: CSSProperties = selected
    ? {
        background: 'color-mix(in srgb, var(--primary-color) 10%, var(--surface-card))',
        borderColor: 'color-mix(in srgb, var(--primary-color) 55%, var(--surface-border))',
        color: 'var(--text-color)',
      }
    : { borderColor: 'var(--surface-border)', color: 'var(--text-color)' }

  const classes = [
    'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
    selected ? '' : '[background:var(--surface-card)]',
    interactive && !selected && !disabled ? 'hover:[background:var(--surface-hover)]' : '',
    className,
  ].filter(Boolean).join(' ')

  const content = <div className="flex min-w-0 flex-1 items-center gap-3 text-left">{children}</div>

  return (
    <div className={classes} style={style}>
      {interactive ? (
        <button
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60"
        >
          {children}
        </button>
      ) : (
        content
      )}
      {action}
    </div>
  )
}
```

- [ ] **Step 2: Criar o index da pasta**

Arquivo `frontend/src/shared/ui/AppSelectableCard/index.ts`:

```ts
export { AppSelectableCard } from './AppSelectableCard'
export type { AppSelectableCardProps } from './AppSelectableCard'
```

- [ ] **Step 3: Registrar no barrel raiz**

Em `frontend/src/shared/ui/index.ts`, adicionar a linha em ordem alfabética, logo depois de `export * from './AppSkeleton'`:

```ts
export * from './AppSelectableCard'
```

- [ ] **Step 4: Verificar build e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: `tsc -b` sem erro, `vite build` termina com a linha `✓ built in …`, e `eslint .` sem saída.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui/AppSelectableCard frontend/src/shared/ui/index.ts
git commit -m "feat(ui): AppSelectableCard, moldura de card com estado selecionado"
```

---

### Task 2: Mover `redatorStatus` para `shared/lib`

Sem esta task, `catalog` teria de importar `features/identity/lib` para pintar a tag de idoneidade — proibido pela lei §5.6.

**Files:**
- Create: `frontend/src/shared/lib/redatorStatus.ts`
- Delete: `frontend/src/features/identity/lib/redatorStatus.ts`
- Modify: `frontend/src/shared/lib/index.ts`
- Modify: `frontend/src/features/identity/components/Redator/RedatoresTable.tsx:9`
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx:11`

**Interfaces:**
- Consumes: nada.
- Produces: `docStatus(validUntil: string | null): DocStatus`, `idoneidade(r: RedatorData): 'idoneo' | 'por_vencer' | 'no_idoneo'` e o tipo `DocStatus = 'sin_venc' | 'vigente' | 'por_vencer' | 'vencido'`, todos por `@shared/lib`.

- [ ] **Step 1: Mover o arquivo preservando o conteúdo**

```bash
cd /home/jvbat/projetos/lotus && git mv frontend/src/features/identity/lib/redatorStatus.ts frontend/src/shared/lib/redatorStatus.ts
```

O conteúdo **não muda**: ele já importa só de `@shared/types/generated`, então `shared` não passa a depender de feature. Não editar a lógica de `docStatus`/`idoneidade` nesta task.

- [ ] **Step 2: Exportar pelo barrel**

Em `frontend/src/shared/lib/index.ts`, adicionar depois de `export * from './enrollmentStatus'`:

```ts
export * from './redatorStatus'
```

- [ ] **Step 3: Reapontar os dois importadores**

Em `frontend/src/features/identity/components/Redator/RedatoresTable.tsx`, trocar:

```ts
import { idoneidade } from '../../lib/redatorStatus'
```

por (juntar ao import existente de `@shared/lib` se já houver um; caso contrário, linha nova):

```ts
import { idoneidade } from '@shared/lib'
```

Em `frontend/src/features/identity/components/Redator/RedatorDialog.tsx`, trocar:

```ts
import { docStatus, idoneidade, type DocStatus } from '../../lib/redatorStatus'
```

por:

```ts
import { docStatus, idoneidade, type DocStatus } from '@shared/lib'
```

- [ ] **Step 4: Provar que não sobrou referência ao caminho antigo**

```bash
cd frontend && grep -rn "lib/redatorStatus" src/ ; ls src/features/identity/lib/ 2>/dev/null
```

Esperado: o `grep` **não imprime nada** (exit 1) e o `ls` falha com `No such file or directory` ou lista uma pasta sem `redatorStatus.ts`. Se a pasta `lib/` ficou vazia, removê-la.

- [ ] **Step 5: Verificar build e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: ambos verdes. Um erro `Cannot find module '../../lib/redatorStatus'` aqui significa que ficou importador não reapontado.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src/shared/lib frontend/src/features/identity
git commit -m "refactor(shared): move redatorStatus para shared/lib

O card do lado do curso mostra idoneidade e CourseDialog e catalog;
importar features/identity de la quebraria a lei 5.6."
```

---

### Task 3: Chaves de i18n dos cards

Feita antes dos componentes para que eles nasçam sem texto hardcoded.

**Files:**
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Produces: as chaves `course.workloadShort`, `course.redatoresSelectNote`, `courseModule.countShort`, `redator.noCourses`. Chaves reaproveitadas (já existem, **não recriar**): `common.loadError`, `common.loadErrorHint`, `common.retry`, `common.view`, `course.empty`, `course.noRedatores`, `course.redatoresReadonlyNote`, `course.sectionRedatores`, `redator.sectionCourses`, `suitability.*`.

- [ ] **Step 1: `pt-BR.json`**

No objeto `course`, adicionar:

```json
    "workloadShort": "{{hours}} h",
    "redatoresSelectNote": "Selecione os redatores habilitados para este curso.",
```

No objeto `courseModule`, adicionar:

```json
    "countShort": "{{count}} módulo(s)",
```

No objeto `redator`, adicionar:

```json
    "noCourses": "Sem cursos habilitados.",
```

- [ ] **Step 2: `es-CL.json`** (referência de rótulo — cliente chileno)

`course`:

```json
    "workloadShort": "{{hours}} h",
    "redatoresSelectNote": "Seleccione los redactores habilitados para este curso.",
```

`courseModule`:

```json
    "countShort": "{{count}} módulo(s)",
```

`redator`:

```json
    "noCourses": "Sin cursos habilitados.",
```

- [ ] **Step 3: `en.json`**

`course`:

```json
    "workloadShort": "{{hours}} h",
    "redatoresSelectNote": "Select the writers enabled for this course.",
```

`courseModule`:

```json
    "countShort": "{{count}} module(s)",
```

`redator`:

```json
    "noCourses": "No enabled courses.",
```

- [ ] **Step 4: Provar que as 3 locales têm exatamente as mesmas chaves**

```bash
cd frontend && python3 -c "
import json
def flat(d, p=''):
    out=set()
    for k,v in d.items():
        out |= flat(v, p+k+'.') if isinstance(v,dict) else {p+k}
    return out
L={n: flat(json.load(open(f'src/shared/config/locales/{n}.json'))) for n in ['pt-BR','es-CL','en']}
base=L['pt-BR']
for n,s in L.items():
    print(n, 'faltando:', sorted(base-s), 'sobrando:', sorted(s-base))
"
```

Esperado: as três linhas com `faltando: [] sobrando: []`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/config/locales
git commit -m "feat(i18n): chaves dos cards de curso e redator nas 3 locales"
```

---

### Task 4: `RedatorCard` (feature `catalog`)

**Files:**
- Create: `frontend/src/features/catalog/components/Course/RedatorCard.tsx`

**Interfaces:**
- Consumes: `AppSelectableCard` (Task 1), `idoneidade` de `@shared/lib` (Task 2), chaves `suitability.*` e `common.view` (Task 3).
- Produces:
  ```ts
  function RedatorCard(props: {
    redator: RedatorData
    selected?: boolean
    onToggle?: () => void
    /** Ausente => sem botão de ver (create, ou usuário sem identity.user.view). */
    onView?: () => void
  }): JSX.Element
  ```

- [ ] **Step 1: Criar o componente**

Arquivo `frontend/src/features/catalog/components/Course/RedatorCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppAvatar, AppButton, AppSelectableCard, AppTag } from '@shared/ui'
import { idoneidade } from '@shared/lib'
import type { RedatorData } from '@shared/types/generated'

/** Mesmo mapa usado no cabeçalho do RedatorDialog — não inventar uma segunda
 * convenção de cor para o mesmo conceito (spec D5). */
const SEVERITY = {
  idoneo: 'success',
  por_vencer: 'warning',
  no_idoneo: 'danger',
} as const

/**
 * Card do redator visto pelo lado do curso. A idoneidade é derivada no front
 * (regra do projeto: não vive no DTO) a partir de `documents` + `course_ids`,
 * que o `GET /api/redatores` já entrega.
 */
export function RedatorCard({
  redator, selected, onToggle, onView,
}: {
  redator: RedatorData
  selected?: boolean
  onToggle?: () => void
  onView?: () => void
}) {
  const { t } = useTranslation()
  const status = idoneidade(redator)

  return (
    <AppSelectableCard
      selected={selected}
      onToggle={onToggle}
      action={
        onView ? (
          <AppButton
            icon="pi pi-eye"
            text
            rounded
            aria-label={t('common.view')}
            tooltip={t('common.view')}
            onClick={onView}
          />
        ) : undefined
      }
    >
      <AppAvatar name={redator.name} image={redator.photo_url} size="large" />
      <div className="min-w-0">
        <p className="truncate font-medium">{redator.name}</p>
        <p className="truncate font-mono text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {redator.rut}
        </p>
        <AppTag
          className="mt-1"
          value={t(`suitability.${status}`)}
          severity={SEVERITY[status]}
        />
      </div>
    </AppSelectableCard>
  )
}
```

- [ ] **Step 2: Verificar build e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes. O componente ainda não tem consumidor — `tsc` não reclama de export não usado, mas o eslint reclamaria de import não usado dentro do arquivo, então qualquer erro aqui é erro real.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/catalog/components/Course/RedatorCard.tsx
git commit -m "feat(catalog): RedatorCard com foto, RUT e idoneidade"
```

---

### Task 5: `openViewById` em `useCrudPage`

**Files:**
- Modify: `frontend/src/shared/hooks/useCrudPage.ts:47`

**Interfaces:**
- Produces: `openViewById(id: number): void` no retorno de `useCrudPage`, consumido pela Task 7.

- [ ] **Step 1: Adicionar o método**

Em `frontend/src/shared/hooks/useCrudPage.ts`, logo depois da linha de `openView`:

```ts
    openView: (item: T) => setDialog({ mode: 'view', id: item.id ?? null }),
```

adicionar:

```ts
    /** Abre `view` a partir de um id solto (deep link vindo de outro módulo).
     * A entidade continua derivada da lista viva, então ela chega sozinha
     * quando o GET terminar — não há objeto para congelar aqui. */
    openViewById: (id: number) => setDialog({ mode: 'view', id }),
```

- [ ] **Step 2: Verificar build e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/shared/hooks/useCrudPage.ts
git commit -m "feat(shared): openViewById no useCrudPage para deep link por id"
```

---

### Task 6: `CourseDialog` adota os cards e para de disfarçar falha de lista

**Files:**
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx:1-6` (imports), `:179-207` (bloco de redatores)

**Interfaces:**
- Consumes: `RedatorCard` (Task 4), `AppErrorState`/`AppSkeleton` de `@shared/ui`, chaves da Task 3.
- Produces: nada para tasks seguintes.

- [ ] **Step 1: Ajustar os imports do topo do arquivo**

Trocar as 5 primeiras linhas de import por:

```tsx
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CrudDialog, AppButton, AppInputText, AppTextarea, AppErrorState, AppSkeleton, FormField, FormSection, NestedField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'
import { redatoresApi } from '@shared/api/redatoresApi'
import { usePermissions } from '@shared/hooks'
import { useCourseForm, type CourseDialogMode } from '../../hooks/useCourseForm'
import { RedatorCard } from './RedatorCard'
```

- [ ] **Step 2: Declarar navegação e permissão dentro do componente**

Logo depois da linha `const redatores = redatoresApi.useList()`, adicionar:

```tsx
  const navigate = useNavigate()
  const { can } = usePermissions()
  // O olho leva ao módulo dono do redator. `catalog` não pode importar o
  // RedatorDialog de `identity` (lei §5.6) — composição cruzada mora na rota.
  // Sem `identity.user.view` a página de destino não serviria de nada.
  const canOpenRedator = can('identity.user.view')
  const openRedator = (id: number) => {
    onHide()
    navigate(`/personas?redator=${id}`)
  }
```

- [ ] **Step 3: Substituir o bloco inteiro de redatores**

Trocar tudo entre `<FormSection title={t('course.sectionRedatores')} spaced />` e o `</section>` final por:

```tsx
        <FormSection title={t('course.sectionRedatores')} spaced />

        {/* Três estados distintos, de propósito (spec D11): antes, um GET com 403
            caía em `?? []` e a tela dizia "sem redatores habilitados" num curso
            que tem três — afirmação falsa sobre o banco. */}
        {redatores.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
            <AppSkeleton height="4.5rem" />
            <AppSkeleton height="4.5rem" />
          </div>
        ) : redatores.isError ? (
          <AppErrorState
            title={t('common.loadError')}
            detail={redatores.error?.detail ?? t('common.loadErrorHint')}
            retryLabel={t('common.retry')}
            onRetry={() => { void redatores.refetch() }}
          />
        ) : isCreate ? (
          // Exceção do produto: habilitar redatores pelo lado do curso só no cadastro.
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('course.redatoresSelectNote')}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(redatores.data ?? []).map((r) => (
                <RedatorCard
                  key={r.id}
                  redator={r}
                  selected={enabledIds.includes(r.id as number)}
                  onToggle={() => toggleRedator(r.id as number)}
                />
              ))}
            </div>
          </div>
        ) : (
          // View/edit: leitura. A edição da habilitação mora em Pessoas.
          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
              {t('course.redatoresReadonlyNote')}
            </p>
            {enabledRedatores.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
                {t('course.noRedatores')}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {enabledRedatores.map((r) => (
                  <RedatorCard
                    key={r.id}
                    redator={r}
                    onView={canOpenRedator ? () => openRedator(r.id as number) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
```

- [ ] **Step 4: Verificar build e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes.

- [ ] **Step 5: Verificação observável (dev server)**

```bash
cd frontend && pnpm dev
```

Com o backend em pé (`docker compose up -d`), em `http://localhost:5173/cursos`:

1. Abrir um curso com redatores habilitados: cada redator aparece como card com avatar (ou iniciais), nome, RUT em fonte monoespaçada e tag de idoneidade.
2. Comparar a tag com a do mesmo redator em `/personas` → tem de ser a mesma palavra e a mesma cor.
3. Em "Novo curso", a seção lista **todos** os redatores como card clicável; clicar alterna a borda/fundo de selecionado.
4. Em DevTools → Network, marcar `Offline` e reabrir o diálogo: a seção mostra o erro com botão Reintentar — **nunca** "sem redatores habilitados".

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/catalog/components/Course/CourseDialog.tsx
git commit -m "feat(catalog): cards de redator no CourseDialog

Falha de GET deixa de se disfarcar de lista vazia: quem tem
catalog.course.view sem identity.user.view lia 'sem redatores
habilitados' num curso que tem tres."
```

---

### Task 7: Deep link `/personas?redator=<id>`

**Files:**
- Modify: `frontend/src/features/identity/components/PeoplePage.tsx`

**Interfaces:**
- Consumes: `openViewById` (Task 5); o link é emitido pela Task 6.
- Produces: nada para tasks seguintes.

- [ ] **Step 1: Imports**

No topo de `frontend/src/features/identity/components/PeoplePage.tsx`, adicionar:

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
```

- [ ] **Step 2: Consumir o parâmetro**

Dentro do componente, logo depois de `const students = useStudentsPage()`:

```tsx
  const [params, setParams] = useSearchParams()
  const deepLinkId = params.get('redator')
  const [consumed, setConsumed] = useState<string | null>(null)

  // Abrir o diálogo é mudança de estado: vai no corpo do render (o padrão da
  // casa), nunca num useEffect — `react-hooks/set-state-in-effect` proíbe.
  if (deepLinkId !== null && deepLinkId !== consumed) {
    setConsumed(deepLinkId)
    const id = Number(deepLinkId)
    if (Number.isInteger(id) && id > 0) page.openViewById(id)
  }

  // Limpar a URL é efeito colateral de navegação, não setState: aqui o effect é
  // o lugar certo. `replace` para o botão Voltar não reabrir o diálogo.
  useEffect(() => {
    if (deepLinkId === null) return
    const next = new URLSearchParams(params)
    next.delete('redator')
    setParams(next, { replace: true })
  }, [deepLinkId, params, setParams])
```

- [ ] **Step 3: Não renderizar diálogo sem entidade**

O deep link chega com a lista possivelmente ainda carregando, e `page.dialog.entity` é derivada dela. Trocar a condição de render do `RedatorDialog`:

```tsx
      {page.dialog && (
```

por:

```tsx
      {/* Em `view` sem entidade (deep link enquanto o GET não voltou, ou id
          inexistente) não há o que mostrar: um diálogo de campos vazios é pior
          que nenhum. `create` não tem entidade por definição. */}
      {page.dialog && (page.dialog.mode === 'create' || page.dialog.entity) && (
```

- [ ] **Step 4: Verificar build e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes. Erro de `react-hooks` aqui significa que algum `setState` foi parar no effect.

- [ ] **Step 5: Verificação observável**

Com `pnpm dev` rodando, abrir direto no navegador `http://localhost:5173/personas?redator=1`:

1. A aba Redatores abre com o redator 1 em modo view.
2. A barra de endereços fica em `/personas`, sem o parâmetro.
3. Voltar no histórico **não** reabre o diálogo.
4. `http://localhost:5173/personas?redator=99999` (id inexistente): a página carrega normal, sem diálogo e sem tela branca.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/components/PeoplePage.tsx
git commit -m "feat(identity): deep link /personas?redator=<id>"
```

---

### Task 8: `CourseCard` (feature `identity`)

**Files:**
- Create: `frontend/src/features/identity/components/Redator/CourseCard.tsx`

**Interfaces:**
- Consumes: `AppSelectableCard` (Task 1), chaves `course.workloadShort` e `courseModule.countShort` (Task 3).
- Produces:
  ```ts
  function CourseCard(props: {
    course: CourseData
    selected?: boolean
    onToggle?: () => void
  }): JSX.Element
  ```

- [ ] **Step 1: Criar o componente**

Arquivo `frontend/src/features/identity/components/Redator/CourseCard.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { AppSelectableCard } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

/**
 * Card do curso visto pelo lado do redator.
 *
 * A carga horária exibida é `workload_hours` — a **contratada**, que é o número
 * com valor comercial e que vai ao certificado (spec D6). O curso também tem
 * `modules_total_hours` (soma dos módulos), e as duas divergem de propósito: o
 * aviso de divergência é do formulário de módulos, onde dá para agir sobre ele.
 *
 * `modules` é opcional no tipo gerado; nas listagens o backend sempre preenche.
 */
export function CourseCard({
  course, selected, onToggle,
}: {
  course: CourseData
  selected?: boolean
  onToggle?: () => void
}) {
  const { t } = useTranslation()
  const moduleCount = course.modules?.length ?? 0

  return (
    <AppSelectableCard selected={selected} onToggle={onToggle}>
      <div className="min-w-0">
        <p className="truncate font-medium">{course.name}</p>
        <p className="truncate text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('course.workloadShort', { hours: course.workload_hours })}
          {' · '}
          {t('courseModule.countShort', { count: moduleCount })}
        </p>
      </div>
    </AppSelectableCard>
  )
}
```

- [ ] **Step 2: Verificar build e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/identity/components/Redator/CourseCard.tsx
git commit -m "feat(identity): CourseCard com carga horaria e contagem de modulos"
```

---

### Task 9: Ordem congelada dos cursos habilitados

**Files:**
- Create: `frontend/src/features/identity/hooks/useEnabledFirstCourses.ts`

**Interfaces:**
- Consumes: `CourseData` de `@shared/types/generated`.
- Produces:
  ```ts
  function useEnabledFirstCourses(
    courses: CourseData[],
    enabledIds: number[],
    resetKey: string,
  ): CourseData[]
  ```
  Consumido pela Task 10 com `resetKey = \`${redator?.id ?? 'new'}:${mode}\``.

- [ ] **Step 1: Criar o hook**

Arquivo `frontend/src/features/identity/hooks/useEnabledFirstCourses.ts`:

```ts
import { useState } from 'react'
import type { CourseData } from '@shared/types/generated'

/**
 * Ordena os cursos com os habilitados primeiro, **congelando** quais eram os
 * habilitados no momento em que o diálogo abriu (spec D9).
 *
 * Reordenar a cada toggle faria o card recém-clicado saltar para o outro grupo
 * sob o ponteiro — dois cliques seguidos acertariam o curso errado. A ordem se
 * recalcula na próxima abertura, que é o que `resetKey` identifica
 * (`<id>:<mode>`).
 *
 * O congelado é o conjunto de **ids**, não o array ordenado: a lista de cursos
 * costuma chegar depois do primeiro render, e ela precisa ser ordenada pelo
 * mesmo critério quando chegar.
 *
 * Ajuste de estado durante o render é o padrão do projeto para "resetar quando
 * uma prop muda" — `useEffect` com `setState` é proibido pelo lint.
 */
export function useEnabledFirstCourses(
  courses: CourseData[],
  enabledIds: number[],
  resetKey: string,
): CourseData[] {
  const [snapshot, setSnapshot] = useState({ key: resetKey, enabled: enabledIds })

  if (snapshot.key !== resetKey) setSnapshot({ key: resetKey, enabled: enabledIds })

  const frozen = snapshot.key === resetKey ? snapshot.enabled : enabledIds
  const wasEnabled = (c: CourseData) => frozen.includes(c.id as number)

  // `Array.prototype.sort` é estável: dentro de cada grupo a ordem que a API
  // devolveu se mantém. Introduzir ordenação alfabética aqui seria decisão nova.
  return [...courses].sort((a, b) => Number(wasEnabled(b)) - Number(wasEnabled(a)))
}
```

- [ ] **Step 2: Verificar build e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/identity/hooks/useEnabledFirstCourses.ts
git commit -m "feat(identity): useEnabledFirstCourses com ordem congelada na abertura"
```

---

### Task 10: `RedatorDialog` adota os cards

**Files:**
- Modify: `frontend/src/features/identity/components/Redator/RedatorDialog.tsx:1-11` (imports), `:243-256` (bloco de cursos)

**Interfaces:**
- Consumes: `CourseCard` (Task 8), `useEnabledFirstCourses` (Task 9), `AppErrorState`/`AppSkeleton`, chaves da Task 3.
- Produces: nada para tasks seguintes.

- [ ] **Step 1: Ajustar imports**

Adicionar `AppErrorState` e `AppSkeleton` à lista importada de `@shared/ui` (a linha já existe, só estender), e acrescentar:

```tsx
import { useEnabledFirstCourses } from '../../hooks/useEnabledFirstCourses'
import { CourseCard } from './CourseCard'
```

- [ ] **Step 2: Derivar as duas listas**

Logo depois de `const courseIds = form.course_ids`, adicionar:

```tsx
  // Em leitura só os habilitados; em seleção todos, com os habilitados primeiro
  // e a ordem congelada na abertura (spec D9).
  const allCourses = courses.data ?? []
  const enabledCourses = allCourses.filter((c) => courseIds.includes(c.id as number))
  const orderedCourses = useEnabledFirstCourses(
    allCourses,
    courseIds,
    `${redator?.id ?? 'new'}:${mode}`,
  )
```

- [ ] **Step 3: Substituir o bloco de cursos**

Trocar tudo entre `<FormSection title={t('redator.sectionCourses')} spaced />` e o `</section>` final por:

```tsx
        <FormSection title={t('redator.sectionCourses')} spaced />

        {/* Mesmos três estados do lado do curso (spec D11): `?? []` fazia falha
            de GET virar "sem cursos habilitados". */}
        {courses.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
            <AppSkeleton height="3.5rem" />
            <AppSkeleton height="3.5rem" />
          </div>
        ) : courses.isError ? (
          <AppErrorState
            title={t('common.loadError')}
            detail={courses.error?.detail ?? t('common.loadErrorHint')}
            retryLabel={t('common.retry')}
            onRetry={() => { void courses.refetch() }}
          />
        ) : allCourses.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
            {t('course.empty')}
          </p>
        ) : readOnly ? (
          enabledCourses.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
              {t('redator.noCourses')}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {enabledCourses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {orderedCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                selected={courseIds.includes(c.id as number)}
                onToggle={() => toggleCourse(c.id as number)}
              />
            ))}
          </div>
        )}
      </section>
```

- [ ] **Step 4: Verificar build e lint**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: verdes.

- [ ] **Step 5: Verificação observável**

Com `pnpm dev` e o backend em pé, em `http://localhost:5173/personas`:

1. Abrir um redator em view: só os cursos habilitados aparecem, cada um com nome, `N h` e `N módulo(s)`.
2. Conferir o número de horas contra o campo "Carga horária" do mesmo curso em `/cursos` — tem de ser igual (não a soma dos módulos).
3. Clicar em Editar: a lista passa a mostrar **todos** os cursos, com os habilitados no topo.
4. Desmarcar o primeiro card: ele **não** muda de posição. Marcar outro: idem.
5. Salvar, reabrir em edit: agora sim a ordem reflete a habilitação nova.
6. Com Network `Offline`, reabrir: erro + Reintentar, nunca "sem cursos habilitados".

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/identity/components/Redator/RedatorDialog.tsx
git commit -m "feat(identity): cards de curso no RedatorDialog com habilitados primeiro"
```

---

### Task 11: Gate de verificação do bloco (DoD)

Nenhum código novo. Esta task existe porque build verde não é o Definition of Done do projeto.

**Files:** nenhum.

- [ ] **Step 1: Provar que nenhum arquivo de backend foi tocado (D1)**

```bash
cd /home/jvbat/projetos/lotus && git diff --name-only main...HEAD -- backend/
```

Esperado: **saída vazia**. Qualquer linha aqui é divergência da spec.

- [ ] **Step 2: Provar que a lei §5.6 não foi quebrada**

```bash
cd frontend && grep -rn "@features/identity" src/features/catalog/ ; grep -rn "@features/catalog" src/features/identity/ ; grep -rn "from 'primereact" src/features/
```

Esperado: os três comandos **sem nenhuma saída**.

- [ ] **Step 3: Gate técnico**

```bash
cd frontend && pnpm build && pnpm lint
```

Esperado: `✓ built in …` e `eslint .` silencioso.

- [ ] **Step 4: Suíte do backend como regressão**

```bash
cd /home/jvbat/projetos/lotus && docker compose exec -T app php artisan test
```

Esperado: `Tests: 347 passed` (ou mais, se outro trabalho tiver somado testes). Nenhum arquivo de backend mudou — isto é regressão, não prova do bloco.

- [ ] **Step 5: Prova visual do João**

Apresentar ao João, **nos dois temas**, em **1400px e 768px**, os 6 critérios comportamentais do DoD da spec §7:

1. `CourseDialog` view: foto/iniciais, nome, RUT e tag de idoneidade coerente com o `RedatorDialog` do mesmo redator.
2. `CourseDialog` create: todos os redatores como card selecionável; o curso criado volta com os `redator_ids` escolhidos.
3. Olho: fecha o diálogo, abre o redator em `/personas`, URL sem parâmetro depois.
4. `RedatorDialog` view: só habilitados, com `workload_hours` e contagem de módulos.
5. `RedatorDialog` edit: todos, habilitados primeiro, sem reordenar ao clicar; salvar persiste.
6. GET de redatores derrubado: erro + Reintentar no `CourseDialog`, nunca "sem redatores habilitados".

- [ ] **Step 6: Só depois da aprovação do João, seguir para o review**

Não fechar o bloco antes do `/revisar-sprint`. A transição de estado é do `/executar-bloco`.

---

## Handoff de execução

**executor: claude**

**Motivo:** todas as tasks tocam a lei §5.6 (fronteira entre `catalog` e `identity` — é literalmente o que a D2 e a D8 resolvem) e a verificação é **visual**, não executável: o frontend não tem test runner, então nenhuma task tem o par "comando que reprova antes / aprova depois" que justificaria delegar ao Codex. As duas decisões mais fáceis de errar em silêncio (ordem congelada da Task 9, setState no render da Task 7) exigem julgamento fora do texto do plano.

**Worktree:** nenhum arquivo de `backend/` é tocado, então a pendência P-03 (que obriga main tree em toque de backend) não se aplica. A escolha entre main tree e worktree fica com o gate do `/executar-bloco`.
