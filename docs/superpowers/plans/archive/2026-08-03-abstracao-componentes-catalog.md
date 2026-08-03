# Abstração de componentes de `catalog` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar as duas responsabilidades presas dentro do `CourseDialog` (251 linhas) para
componentes próprios e subir derivação e navegação para os hooks da feature, sem que a tela mude uma
única pixel de comportamento.

**Architecture:** Três extrações e dois movimentos para hook, na ordem que evita reescrever o mesmo
arquivo duas vezes: primeiro o fix de uma linha da tabela, depois a derivação de horas para o
`useCourseForm`, então o quadro de módulos (`ModuleFields` + `ModuleCard`, molde
`ContactFields`/`ContactCard`), então a navegação para o `useCourseRedatores` e por último a seção de
redatores. Cada extração é **movimento literal de markup**: nenhuma condicional muda de forma,
nenhum `key` muda de critério.

**Tech Stack:** React 19 + TS (Vite), PrimeReact via `shared/ui`, Tailwind v4 para layout,
TanStack Query, react-i18next, react-router-dom. Sem test runner no frontend.

## Global Constraints

- **Comportamento idêntico é o critério de aceite** (lei §8). Build verde não é aceite.
- **Componentes extraídos devolvem `Fragment` quando o original tinha irmãos diretos.** O
  `<section className="space-y-4">` do `CourseDialog` aplica espaçamento aos **filhos diretos** —
  um `<div>` wrapper novo mudaria o layout. Precedente: `ClientGeneralFields`.
- **`key={i}`, nunca `key={m.id}`** na lista de módulos (replace-total troca os ids a cada save).
- **Zero arquivo de `backend/`, de `frontend/src/shared/`, de `locales/` ou `generated.ts` no diff.**
  Nenhuma chave i18n nova: toda string que este plano move já existe.
- **Os `FormSection` continuam no `CourseDialog`** — ele é o dono da estrutura de seções do
  formulário; os componentes extraídos entregam só o conteúdo da seção.
- **Verificação de toda task de código:** `cd frontend && pnpm build && pnpm lint`, ambos verdes.
- Trabalho na branch `refactor/abstracao-componentes-catalog`, no main tree, sem worktree (D1).
- Commits em português, `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` ao final.

---

### Task 0: Branch do bloco

**Files:** nenhum arquivo alterado.

**Interfaces:**
- Consumes: nada.
- Produces: a branch onde as Tasks 1–7 commitam.

- [ ] **Step 1: Confirmar que o main tree está limpo do que interessa**

Run: `cd /home/jvbat/projetos/lotus && git status --short`
Expected: só ` D frontend/src/features/operation/components/.gitkeep` — WIP do João, **não tocar,
não commitar** (lição 9). Qualquer outro arquivo sujo em `frontend/src/features/catalog/` → PARE e
pergunte.

- [ ] **Step 2: Criar a branch a partir do main**

```bash
cd /home/jvbat/projetos/lotus
git checkout -b refactor/abstracao-componentes-catalog
```

- [ ] **Step 3: Confirmar o ponto de partida**

Run: `git log -1 --oneline && git branch --show-current`
Expected: `3bfe7ad docs(spec): abstração de componentes de catalog` e
`refactor/abstracao-componentes-catalog`.

---

### Task 1: C-3 + C-4 — a linha quebrada da `CoursesTable`

**Files:**
- Modify: `frontend/src/features/catalog/components/Course/CoursesTable.tsx:87` (mais o bloco de
  imports no topo)

**Interfaces:**
- Consumes: `BRAND_COLOR` de `@shared/config/brand` (já existe, valor `'#25A5E4'`).
- Produces: nada que outra task use.

- [ ] **Step 1: Ler a linha atual e confirmar o defeito**

Run: `cd frontend && sed -n 87p src/features/catalog/components/Course/CoursesTable.tsx`
Expected, exatamente:

```tsx
              <i className={`pi pi-book }`} style={{ color: '#25A5E4', fontSize: '1.25rem' }} />
```

O `}` dentro do template literal não fecha interpolação nenhuma — vai para o DOM como classe literal
`}`, que não casa com seletor algum. `'#25A5E4'` é cópia literal do `BRAND_COLOR`.

- [ ] **Step 2: Adicionar o import do `BRAND_COLOR`**

No topo de `CoursesTable.tsx`, logo depois do import de `@shared/types/generated` (linha 12),
acrescentar:

```tsx
import { BRAND_COLOR } from "@shared/config/brand";
```

Aspas duplas e `;` de propósito: é o estilo deste arquivo, e reformatá-lo está fora do escopo.

- [ ] **Step 3: Corrigir a linha 87**

Substituir a linha inteira por:

```tsx
              <i className="pi pi-book" style={{ color: BRAND_COLOR, fontSize: '1.25rem' }} />
```

Sem template literal: não há nada a interpolar. Cor e tamanho não mudam — `BRAND_COLOR === '#25A5E4'`.

- [ ] **Step 4: Verificar**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: os dois verdes.

Run: `grep -n "pi-book }\|#25A5E4" src/features/catalog/components/Course/CoursesTable.tsx`
Expected: **sem saída**.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/catalog/components/Course/CoursesTable.tsx
git commit -m "$(cat <<'EOF'
fix(catalog): className quebrado e cor de marca hardcoded na tabela

O template literal da coluna de nome não interpolava nada e mandava a
classe lixo `}` para o DOM; a mesma linha repetia o valor do BRAND_COLOR
em vez de importá-lo. Sem efeito visual: a classe não casa com seletor
nenhum e a constante tem o mesmo valor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: B-1 — `modulesTotal` e `hoursMismatch` sobem para o `useCourseForm`

**Files:**
- Modify: `frontend/src/features/catalog/hooks/useCourseForm.ts` (bloco de retorno, ~linha 132)
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx:20-21,37-41,179,187`

**Interfaces:**
- Consumes: `form.modules` e `form.workload_hours`, já dentro do hook.
- Produces: `useCourseForm(...)` passa a devolver **`modulesTotal: number`** e
  **`hoursMismatch: boolean`**. A Task 3 consome os dois.

- [ ] **Step 1: Calcular no hook**

Em `useCourseForm.ts`, imediatamente antes da linha
`const { fieldErrors, generalError } = useMutationErrors([create.error, update.error, sync.error])`,
inserir:

```ts
  // Totais derivados: reagem ao que está sendo digitado, não ao último valor
  // salvo (o modules_total_hours do backend serve a consumidores de leitura).
  const modulesTotal = form.modules.reduce((sum, m) => sum + m.theory_hours + m.practice_hours, 0)
  // Curso sem módulo nenhum não é divergência — é curso sem módulo cadastrado.
  const hoursMismatch = form.modules.length > 0 && modulesTotal !== form.workload_hours
```

São os dois comentários que hoje vivem no `CourseDialog.tsx:37-41`, movidos junto com o cálculo.

- [ ] **Step 2: Expor no retorno**

No objeto de retorno do hook, acrescentar os dois campos logo depois de `moveModule`:

```ts
  return {
    form, set, toggleRedator, readOnly, submit,
    addModule, removeModule, patchModule, moveModule,
    modulesTotal, hoursMismatch,
    pending: create.isPending || update.isPending || sync.isPending,
    fieldErrors, generalError,
  }
```

- [ ] **Step 3: Consumir no `CourseDialog`**

Na desestruturação do hook (linhas 20-21), acrescentar os dois nomes:

```tsx
  const { form, set, toggleRedator, readOnly, submit, pending, fieldErrors, generalError,
          addModule, removeModule, patchModule, moveModule,
          modulesTotal, hoursMismatch } = useCourseForm(course, mode, onHide)
```

- [ ] **Step 4: Apagar o cálculo local**

Remover do `CourseDialog.tsx` as linhas 37-41 — os dois comentários e as duas `const`
(`modulesTotal` e `hoursMismatch`). O JSX que os lê (linhas 179 e 187) **não muda**: os nomes são os
mesmos, agora vindos do hook.

- [ ] **Step 5: Verificar que nenhum `reduce` sobrou em componente**

Run: `cd frontend && grep -rn "reduce(" src/features/catalog/components/`
Expected: **sem saída**.

Run: `pnpm build && pnpm lint`
Expected: os dois verdes.

- [ ] **Step 6: Conferir na tela antes de commitar**

Com `pnpm dev` rodando, abrir Cursos → um curso com módulos → **edit**. Digitar num campo de horas de
módulo: o rodapé "total de módulos" acompanha a digitação e o aviso âmbar aparece/some exatamente
como antes. O submit **não** é bloqueado pelo aviso (§5.7).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/catalog/hooks/useCourseForm.ts frontend/src/features/catalog/components/Course/CourseDialog.tsx
git commit -m "$(cat <<'EOF'
refactor(catalog): total e divergência de horas saem do CourseDialog

useCourseForm já é dono de form.modules e form.workload_hours, as duas
entradas do cálculo, então o reduce e a comparação sobem para lá. O JSX
lê os mesmos nomes, agora vindos do hook. Componente de feature volta a
ser declarativo (frontend-fsliced.md).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: C-1 — `ModuleFields` + `ModuleCard`

**Files:**
- Create: `frontend/src/features/catalog/components/Course/ModuleCard.tsx`
- Create: `frontend/src/features/catalog/components/Course/ModuleFields.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx:89-189` (substituídas por
  um `<ModuleFields …/>`), mais o bloco de imports

**Interfaces:**
- Consumes: `modulesTotal`/`hoursMismatch` do `useCourseForm` (Task 2); `CourseModuleData` de
  `@shared/types/generated`.
- Produces:
  - `ModuleCard({ module, index, isFirst, isLast, readOnly, fieldErrors, onPatch, onMoveUp, onMoveDown, onRemove })`
  - `ModuleFields({ modules, readOnly, fieldErrors, workloadHours, modulesTotal, hoursMismatch, onAdd, onRemove, onPatch, onMove })`

- [ ] **Step 1: Criar o `ModuleCard`**

Arquivo `frontend/src/features/catalog/components/Course/ModuleCard.tsx`, conteúdo completo:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton, AppInputText, AppTextarea, NestedField } from '@shared/ui'
import type { CourseModuleData } from '@shared/types/generated'

/** Um módulo do curso. `index` entra porque a chave do erro é posicional
 * (`modules.<i>.<campo>`), como o 422 do backend a devolve — mesmo motivo do
 * `index` no `ContactCard`. Os botões de mover vêm desabilitados nas pontas;
 * o no-op de faixa mora no `moveModule` do `useCourseForm`. */
export function ModuleCard({
  module, index, isFirst, isLast, readOnly, fieldErrors, onPatch, onMoveUp, onMoveDown, onRemove,
}: {
  module: CourseModuleData
  index: number
  isFirst: boolean
  isLast: boolean
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  onPatch: (patch: Partial<CourseModuleData>) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-start gap-2">
        <span className="mt-2.5 text-xs font-semibold text-slate-500">{t('courseModule.itemLabel', { n: index + 1 })}</span>
        <NestedField error={fieldErrors?.[`modules.${index}.name`]?.[0]}>
          <div className="flex-1">
            <AppInputText
              placeholder={t('courseModule.namePlaceholder')}
              aria-label={t('courseModule.name')}
              value={module.name}
              disabled={readOnly}
              onChange={(e) => onPatch({ name: e.target.value })}
              className="w-full"
            />
          </div>
        </NestedField>
        {!readOnly && (
          <div className="flex gap-1">
            <AppButton icon="pi pi-arrow-up" text aria-label={t('courseModule.moveUp')} tooltip={t('courseModule.moveUp')} disabled={isFirst} onClick={onMoveUp} />
            <AppButton icon="pi pi-arrow-down" text aria-label={t('courseModule.moveDown')} tooltip={t('courseModule.moveDown')} disabled={isLast} onClick={onMoveDown} />
            <AppButton icon="pi pi-trash" text aria-label={t('courseModule.remove')} tooltip={t('courseModule.remove')} onClick={onRemove} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <NestedField error={fieldErrors?.[`modules.${index}.theory_hours`]?.[0]}>
          <span className="mb-1 block text-xs text-slate-500">{t('courseModule.theoryHours')}</span>
          <AppInputText
            aria-label={t('courseModule.theoryHours')}
            value={String(module.theory_hours)}
            disabled={readOnly}
            onChange={(e) => onPatch({ theory_hours: Number(e.target.value.replace(/\D/g, '')) || 0 })}
            className="w-full"
          />
        </NestedField>
        <NestedField error={fieldErrors?.[`modules.${index}.practice_hours`]?.[0]}>
          <span className="mb-1 block text-xs text-slate-500">{t('courseModule.practiceHours')}</span>
          <AppInputText
            aria-label={t('courseModule.practiceHours')}
            value={String(module.practice_hours)}
            disabled={readOnly}
            onChange={(e) => onPatch({ practice_hours: Number(e.target.value.replace(/\D/g, '')) || 0 })}
            className="w-full"
          />
        </NestedField>
        <span className="pb-2 text-sm text-slate-500">
          {t('courseModule.total', { hours: module.theory_hours + module.practice_hours })}
        </span>
      </div>

      <NestedField error={fieldErrors?.[`modules.${index}.learnings`]?.[0]}>
        <span className="mb-1 block text-xs text-slate-500">{t('courseModule.learnings')}</span>
        <AppTextarea
          aria-label={t('courseModule.learnings')}
          value={module.learnings ?? ''}
          disabled={readOnly}
          rows={2}
          onChange={(e) => onPatch({ learnings: e.target.value })}
          className="w-full"
        />
      </NestedField>

      <NestedField error={fieldErrors?.[`modules.${index}.contents`]?.[0]}>
        <span className="mb-1 block text-xs text-slate-500">{t('courseModule.contents')}</span>
        <AppTextarea
          aria-label={t('courseModule.contents')}
          value={module.contents ?? ''}
          disabled={readOnly}
          rows={3}
          onChange={(e) => onPatch({ contents: e.target.value })}
          className="w-full"
        />
      </NestedField>
    </div>
  )
}
```

Cópia literal das linhas 97-170 do `CourseDialog`, com `m` → `module`, `i` → `index`,
`patchModule(i, …)` → `onPatch(…)`, `moveModule(i, -1)` → `onMoveUp`, `moveModule(i, 1)` →
`onMoveDown`, `removeModule(i)` → `onRemove`, `i === 0` → `isFirst` e
`i === form.modules.length - 1` → `isLast`. O `key={i}` **não** vem: ele fica no `.map` do
`ModuleFields`.

- [ ] **Step 2: Criar o `ModuleFields`**

Arquivo `frontend/src/features/catalog/components/Course/ModuleFields.tsx`, conteúdo completo:

```tsx
import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import type { CourseModuleData } from '@shared/types/generated'
import { ModuleCard } from './ModuleCard'

/** Quadro de módulos do curso. Devolve Fragment, não `<div>`: os filhos são
 * irmãos diretos do `<section className="space-y-4">` do CourseDialog, e um nó
 * novo mudaria o espaçamento (mesmo motivo do ClientGeneralFields).
 *
 * `key={i}`, nunca `key={m.id}`: o backend faz replace dos módulos, então os
 * ids trocam a cada save — um id como key remontaria as linhas e perderia o
 * foco. A ordem só muda por ação explícita do usuário (onMove). */
export function ModuleFields({
  modules, readOnly, fieldErrors, workloadHours, modulesTotal, hoursMismatch,
  onAdd, onRemove, onPatch, onMove,
}: {
  modules: CourseModuleData[]
  readOnly: boolean
  fieldErrors?: Record<string, string[]> | null
  workloadHours: number
  modulesTotal: number
  hoursMismatch: boolean
  onAdd: () => void
  onRemove: (i: number) => void
  onPatch: (i: number, patch: Partial<CourseModuleData>) => void
  onMove: (i: number, dir: -1 | 1) => void
}) {
  const { t } = useTranslation()

  return (
    <>
      {modules.length === 0 && (
        <p className="text-sm text-slate-500">{t('courseModule.empty')}</p>
      )}

      {modules.map((m, i) => (
        <ModuleCard
          key={i}
          module={m}
          index={i}
          isFirst={i === 0}
          isLast={i === modules.length - 1}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          onPatch={(patch) => onPatch(i, patch)}
          onMoveUp={() => onMove(i, -1)}
          onMoveDown={() => onMove(i, 1)}
          onRemove={() => onRemove(i)}
        />
      ))}

      {!readOnly && (
        <AppButton label={t('courseModule.add')} icon="pi pi-plus" text onClick={onAdd} />
      )}

      {modules.length > 0 && (
        <p className="text-right text-sm text-slate-500">
          {t('courseModule.modulesTotal', { hours: modulesTotal })}
        </p>
      )}

      {/* Aviso, não erro: âmbar e sem role="alert" (o FormErrorBanner é vermelho e
          para 422). NUNCA bloqueia o submit — §5.7, registro não bloqueia ação. */}
      {hoursMismatch && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          {t('courseModule.hoursMismatch', { modules: modulesTotal, workload: workloadHours })}
        </p>
      )}
    </>
  )
}
```

A ordem dos blocos é a de hoje: vazio → lista → botão add → total → aviso.

- [ ] **Step 3: Ligar no `CourseDialog`**

Acrescentar o import, depois do de `RedatorCard`:

```tsx
import { ModuleFields } from './ModuleFields'
```

Substituir tudo entre `<FormSection title={t('courseModule.section')} spaced />` e
`<FormSection title={t('course.sectionRedatores')} spaced />` (as linhas 89-189 do arquivo original)
por:

```tsx
        <ModuleFields
          modules={form.modules}
          readOnly={readOnly}
          fieldErrors={fieldErrors}
          workloadHours={form.workload_hours}
          modulesTotal={modulesTotal}
          hoursMismatch={hoursMismatch}
          onAdd={addModule}
          onRemove={removeModule}
          onPatch={patchModule}
          onMove={moveModule}
        />
```

Os dois `FormSection` **ficam** — o diálogo continua dono da estrutura de seções.

- [ ] **Step 4: Limpar imports órfãos do `CourseDialog`**

`NestedField` e `AppTextarea` ainda são usados? `AppTextarea` **sim** (o campo `description`, linha
84). `NestedField` **não** — sai do import de `@shared/ui`. O `pnpm lint` reprova import não usado,
então o Step 5 pega qualquer erro aqui.

- [ ] **Step 5: Verificar**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: os dois verdes.

Run: `grep -c "" src/features/catalog/components/Course/CourseDialog.tsx`
Expected: por volta de **150** (de 251; a Task 5 leva o arquivo ao alvo final).

Run: `grep -n "key={i}" src/features/catalog/components/Course/ModuleFields.tsx`
Expected: uma linha. Se aparecer `key={m.id}` em qualquer lugar → regressão, corrija.

- [ ] **Step 6: Conferir na tela antes de commitar**

Com `pnpm dev`: Cursos → **create**. Adicionar 3 módulos, preencher nome e horas, mover o do meio
para cima e para baixo, remover um. Conferir: numeração `itemLabel` renumera, o foco não salta ao
digitar, os botões de mover ficam desabilitados nas pontas, o total por linha e o total geral batem,
o aviso âmbar aparece quando a soma difere da carga horária. Abrir um curso em **view**: nenhum
botão de add/mover/remover, todos os campos desabilitados.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/catalog/components/Course/ModuleCard.tsx frontend/src/features/catalog/components/Course/ModuleFields.tsx frontend/src/features/catalog/components/Course/CourseDialog.tsx
git commit -m "$(cat <<'EOF'
refactor(catalog): quadro de módulos vira ModuleFields + ModuleCard

Molde ContactFields/ContactCard do ClientDialog: a lista sabe de key,
add e totais; o card sabe de um módulo. Markup movido literal — a mesma
ordem de blocos, o mesmo key={i} (replace-total troca os ids) e as
mesmas chaves de erro posicionais modules.<i>.<campo>.

ModuleFields devolve Fragment: os filhos são irmãos diretos do section
com space-y-4, e um nó novo mudaria o espaçamento.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: B-2 — navegação sobe para o `useCourseRedatores`

**Files:**
- Modify: `frontend/src/features/catalog/hooks/useCourseRedatores.ts`
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx:1,5,22-32,241`

**Interfaces:**
- Consumes: `usePermissions` de `@shared/hooks`, `useNavigate` de `react-router-dom`.
- Produces: `useCourseRedatores(enabledIds: number[], onClose: () => void)` devolve, além do que já
  devolvia, **`canOpenRedator: boolean`** e **`openRedator: (id: number) => void`**. A Task 5 consome
  os dois.

- [ ] **Step 1: Reescrever o hook**

Conteúdo completo de `frontend/src/features/catalog/hooks/useCourseRedatores.ts`:

```ts
import { useNavigate } from 'react-router-dom'
import { redatoresApi } from '@shared/api/redatoresApi'
import { usePermissions } from '@shared/hooks'

/** Redatores da seção do diálogo de curso. Molde: `useRedatorCourses` de
 * `identity` — o hook devolve o derivado e os estados, nunca o objeto de query.
 *
 * `isError` fica exposto SEPARADO do `?? []`: um 403 não pode se disfarçar de
 * "curso sem redatores habilitados" num curso que tem três (D11 do bloco de
 * cards). Os três estados da tela dependem disso.
 *
 * A navegação mora aqui, não no componente: o olho leva ao módulo dono do
 * redator, e `catalog` não pode importar o RedatorDialog de `identity`
 * (lei §6) — composição cruzada mora na rota. Sem `identity.user.view` a
 * página de destino não serviria de nada, então o olho não aparece.
 * `onClose` fecha o diálogo ANTES de navegar; inverter deixaria o diálogo
 * aberto sobre a rota nova. */
export function useCourseRedatores(enabledIds: number[], onClose: () => void) {
  const redatores = redatoresApi.useList()
  const allRedatores = redatores.data ?? []
  const navigate = useNavigate()
  const { can } = usePermissions()

  return {
    isLoading: redatores.isLoading,
    isError: redatores.isError,
    errorDetail: redatores.error?.detail,
    refetch: () => {
      void redatores.refetch()
    },
    allRedatores,
    // Leitura (view/edit): só os já habilitados, derivados da lista viva.
    enabledRedatores: allRedatores.filter((r) => enabledIds.includes(r.id as number)),
    canOpenRedator: can('identity.user.view'),
    openRedator: (id: number) => {
      onClose()
      navigate(`/personas?redator=${id}`)
    },
  }
}
```

- [ ] **Step 2: Passar o `onHide` no `CourseDialog`**

```tsx
  const redatores = useCourseRedatores(form.redator_ids, onHide)
```

- [ ] **Step 3: Apagar a navegação local**

Remover do `CourseDialog.tsx`: o import de `useNavigate` (linha 1), o import de `usePermissions`
(linha 5), as linhas `const navigate = useNavigate()` e `const { can } = usePermissions()`, os três
comentários das linhas 25-27, e as `const canOpenRedator` / `const openRedator`.

No JSX (hoje a linha 241), trocar as duas referências pelas do hook:

```tsx
                    onView={redatores.canOpenRedator ? () => redatores.openRedator(r.id as number) : undefined}
```

- [ ] **Step 4: Verificar**

Run: `cd frontend && grep -n "useNavigate\|usePermissions" src/features/catalog/components/Course/CourseDialog.tsx`
Expected: **sem saída**.

Run: `pnpm build && pnpm lint`
Expected: os dois verdes.

- [ ] **Step 5: Conferir na tela antes de commitar**

Com `pnpm dev`: abrir um curso que tenha redator habilitado em **view**. Clicar no olho de um card:
o diálogo **fecha** e a rota vira `/personas?redator=<id>`, com o redator selecionado — mesma ordem
de antes. Em **create** o olho não existe.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/catalog/hooks/useCourseRedatores.ts frontend/src/features/catalog/components/Course/CourseDialog.tsx
git commit -m "$(cat <<'EOF'
refactor(catalog): navegação do olho sobe para useCourseRedatores

O hook que já serve a seção passa a expor canOpenRedator e openRedator;
o CourseDialog perde useNavigate e usePermissions. onClose antes do
navigate, como antes — inverter deixaria o diálogo sobre a rota nova.
Os comentários da lei §6 (composição cruzada mora na rota) viajam junto.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: C-2 — `CourseRedatoresSection`

**Files:**
- Create: `frontend/src/features/catalog/components/Course/CourseRedatoresSection.tsx`
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx` (o bloco da seção de
  redatores e os imports que ele levava)

**Interfaces:**
- Consumes: o retorno de `useCourseRedatores` (Task 4); `RedatorCard` (já existe).
- Produces: `CourseRedatoresSection({ redatores, isCreate, enabledIds, onToggle })`, onde `redatores`
  é o retorno inteiro do hook.

- [ ] **Step 1: Criar o componente**

Arquivo `frontend/src/features/catalog/components/Course/CourseRedatoresSection.tsx`, conteúdo
completo:

```tsx
import { useTranslation } from 'react-i18next'
import { AppErrorState, AppSkeleton } from '@shared/ui'
import { RedatorCard } from './RedatorCard'
import type { useCourseRedatores } from '../../hooks/useCourseRedatores'

/** Seção de redatores do diálogo de curso. Três estados distintos, de propósito
 * (spec D11): antes, um GET com 403 caía em `?? []` e a tela dizia "sem
 * redatores habilitados" num curso que tem três — afirmação falsa sobre o banco.
 *
 * A cadeia é loading > erro > create > view/edit, na ordem de sempre. O terceiro
 * ramo é MODO DE DIÁLOGO, não estado de carga: achatar os dois eixos numa lista
 * de guardas mudaria o significado do código sem mudar a tela. */
export function CourseRedatoresSection({
  redatores, isCreate, enabledIds, onToggle,
}: {
  redatores: ReturnType<typeof useCourseRedatores>
  isCreate: boolean
  enabledIds: number[]
  onToggle: (id: number) => void
}) {
  const { t } = useTranslation()

  return redatores.isLoading ? (
    <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
      <AppSkeleton height="4.5rem" />
      <AppSkeleton height="4.5rem" />
    </div>
  ) : redatores.isError ? (
    <AppErrorState
      title={t('common.loadError')}
      detail={redatores.errorDetail ?? t('common.loadErrorHint')}
      retryLabel={t('common.retry')}
      onRetry={redatores.refetch}
    />
  ) : isCreate ? (
    // Exceção do produto: habilitar redatores pelo lado do curso só no cadastro.
    <div className="space-y-2">
      <p className="text-xs" style={{ color: 'var(--text-color-secondary)' }}>
        {t('course.redatoresSelectNote')}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {redatores.allRedatores.map((r) => (
          <RedatorCard
            key={r.id}
            redator={r}
            selected={enabledIds.includes(r.id as number)}
            onToggle={() => onToggle(r.id as number)}
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
      {redatores.enabledRedatores.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('course.noRedatores')}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {redatores.enabledRedatores.map((r) => (
            <RedatorCard
              key={r.id}
              redator={r}
              onView={redatores.canOpenRedator ? () => redatores.openRedator(r.id as number) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

Cada ramo produz **um** elemento, exatamente como o ternário de hoje — o componente não acrescenta
nó ao DOM.

- [ ] **Step 2: Ligar no `CourseDialog`**

Acrescentar o import:

```tsx
import { CourseRedatoresSection } from './CourseRedatoresSection'
```

Substituir todo o ternário que hoje segue o `<FormSection title={t('course.sectionRedatores')} spaced />`
por:

```tsx
        <CourseRedatoresSection
          redatores={redatores}
          isCreate={isCreate}
          enabledIds={form.redator_ids}
          onToggle={toggleRedator}
        />
```

`form.redator_ids` direto — o alias `const enabledIds = form.redator_ids` (B-3) some aqui.

- [ ] **Step 3: Limpar o que ficou órfão**

Do import de `@shared/ui` no `CourseDialog`, saem `AppErrorState` e `AppSkeleton`. Sai também o
import de `RedatorCard`. Sai a `const enabledIds`. `AppButton` continua? **Não** — o botão de add
foi com o `ModuleFields` na Task 3 e os botões do diálogo vêm do `CrudDialog`; confirme com o lint.

- [ ] **Step 4: Verificar**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: os dois verdes. Import não usado reprova no lint — é o gate desta limpeza.

Run: `grep -c "" src/features/catalog/components/Course/CourseDialog.tsx`
Expected: **abaixo de 100**.

Run: `wc -l src/features/catalog/components/Course/*.tsx`
Expected: nenhum acima de ~110.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/catalog/components/Course/CourseRedatoresSection.tsx frontend/src/features/catalog/components/Course/CourseDialog.tsx
git commit -m "$(cat <<'EOF'
refactor(catalog): seção de redatores vira CourseRedatoresSection

Os 4 ramos saem do return do CourseDialog na ordem de sempre —
loading > erro > create > view/edit. Não vira guarda sequencial: o
terceiro ramo é modo de diálogo, não estado de carga. Cada ramo produz
um elemento, como o ternário de hoje, então o DOM não ganha nó.

CourseDialog fecha em menos de 100 linhas, de 251.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Checkpoint visual (D10)

**Files:** nenhum. Esta task é a prova de aceite, não uma mudança.

**Interfaces:**
- Consumes: o estado final das Tasks 1–5.
- Produces: a aprovação do João, sem a qual o bloco não fecha (lei §8).

- [ ] **Step 1: Subir o ambiente**

```bash
docker compose up -d
cd frontend && pnpm dev
```

- [ ] **Step 2: Apresentar o roteiro ao João e AGUARDAR o veredito**

Não marque esta task sem resposta explícita dele. Roteiro:

1. **Cursos (tabela):** ícone do livro na cor de marca e no tamanho de sempre; busca por nome e por
   nome técnico; empty state "sem cursos" e empty state de busca sem resultado (com "limpar busca");
   contagem no rodapé; ordenação pela coluna Nome.
2. **Diálogo · create:** adicionar 3 módulos, mover o do meio para cima e para baixo, remover um;
   numeração renumera; foco não salta ao digitar; mover desabilitado nas pontas; total por linha e
   total geral; aviso âmbar quando a soma difere da carga horária — e o **submit continua liberado**
   com o aviso na tela; grid de redatores selecionável, com o texto de nota.
3. **Diálogo · view:** campos desabilitados, sem botões de módulo, redatores em leitura com o olho;
   clicar no olho fecha o diálogo e leva a `/personas?redator=<id>`.
4. **Diálogo · edit:** campos e módulos editáveis, redatores em leitura (sem seleção).
5. **Curso sem redator habilitado:** mensagem "sem redatores", não erro.
6. **Erro de redatores:** com o backend derrubado (`docker compose stop app`), abrir o diálogo — tem
   de aparecer `AppErrorState` com Reintentar, **nunca** "sem redatores habilitados". Subir de volta
   (`docker compose start app`) e clicar em Reintentar: a lista carrega.

- [ ] **Step 3: Registrar o resultado**

Aprovado → anote a data no `state.md` na transição da próxima task. Reprovado → **não** siga para a
Task 7: corrija, e refaça o checkpoint inteiro.

---

### Task 7: Gate automatizado e fechamento do plano

**Files:**
- Modify: `docs/superpowers/state.md` (transição para `ready_for_review`)

**Interfaces:**
- Consumes: o checkpoint aprovado na Task 6.
- Produces: o estado que autoriza o `/revisar-sprint`.

- [ ] **Step 1: Build e lint**

Run: `cd frontend && pnpm build && pnpm lint`
Expected: os dois verdes.

- [ ] **Step 2: Diffs que têm de estar vazios**

```bash
cd /home/jvbat/projetos/lotus
git diff --name-only main...HEAD -- backend/
git diff --name-only main...HEAD -- frontend/src/shared/
git diff --name-only main...HEAD -- frontend/src/shared/config/locales/
git diff --name-only main...HEAD -- frontend/src/shared/types/generated.ts
```
Expected: **as quatro sem saída**.

- [ ] **Step 3: Greps que têm de vir vazios**

```bash
cd frontend
grep -rnE "use(Query|Mutation)\b|Api\.use" src/features/catalog/components/
grep -rn "from 'primereact\|from \"primereact" src/features/catalog/
grep -rn "@features/" src/features/catalog/
grep -rn "#25A5E4" src/features/
grep -rn "pi-book }" src/features/
grep -rn "reduce(" src/features/catalog/components/
```
Expected: **todos sem saída**. O quarto pode devolver `src/shared/config/brand.ts`? Não — o escopo é
`src/features/`; se devolver qualquer linha, o C-4 não fechou.

- [ ] **Step 4: Tamanho dos arquivos**

Run: `cd frontend && wc -l src/features/catalog/components/Course/*.tsx src/features/catalog/hooks/*.ts`
Expected: `CourseDialog.tsx` abaixo de 100; nenhum arquivo acima de ~110.

- [ ] **Step 5: Nenhum órfão (D9)**

```bash
cd frontend
grep -rn "ModuleFields\|ModuleCard\|CourseRedatoresSection" src/ | grep -v "components/Course/ModuleFields.tsx\|components/Course/ModuleCard.tsx\|components/Course/CourseRedatoresSection.tsx"
grep -rn "modulesTotal\|hoursMismatch\|canOpenRedator\|openRedator" src/features/catalog/
```
Expected: cada componente novo com **exatamente um** consumidor; cada campo novo do hook com leitor
na tela. Campo sem leitor → apague o campo, não o teste.

- [ ] **Step 6: Regressão do backend**

Run: `docker compose exec -T app php artisan test`
Expected: **372 passed (1360 assertions)** — a baseline dos dois blocos anteriores. Bloco 100%
frontend: qualquer número diferente é sinal de que algo fora do escopo entrou.

Pint: **n/a** (zero arquivo de `backend/` no diff). `typescript:transform`: **n/a** (nenhum DTO
tocado).

- [ ] **Step 7: Transicionar o estado e commitar**

Em `docs/superpowers/state.md`, no frontmatter:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
```

E atualize a seção `## Estado atual` com: as 5 tasks de conteúdo entregues, a data da aprovação do
checkpoint da Task 6, os números do gate e a branch.

```bash
git add docs/superpowers/state.md
git commit -m "$(cat <<'EOF'
docs(estado): abstracao-componentes-catalog vai a ready_for_review

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Parar**

O review é passo explícito (`/revisar-sprint`), nunca automático. Não abra PR, não faça merge, não
siga para o fechamento sem instrução do João.

---

## Handoff de execução

**`executor: claude`**

Sem task delegada ao Codex. Critério: o frontend não tem test runner, então nenhuma task deste plano
tem verificação executável que prove o DoD — o aceite é comportamento idêntico julgado na tela
(Task 6), que é exatamente o tipo de julgamento fora do plano que o contrato reserva ao Claude. Além
disso, cada extração exige decidir, no momento da escrita, se um trecho de markup é cópia literal ou
mudou de forma — as invariantes da §4 da spec são o roteiro dessa decisão, não um script.

`paths_autorizados`: n/a.
