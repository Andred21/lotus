# Bloco 4 · CR Curso: AppTextarea + módulos reordenáveis (frontend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar interface ao quadro de módulos do curso (add/remover/reordenar, horas, soma, aviso
não-bloqueante) e fechar o gate que o Bloco 3 deixou: o form não manda `modules` no `PUT`, e o
backend replace-total apaga todos os módulos em silêncio.

**Architecture:** Três camadas, nesta ordem: wrapper `AppTextarea` em `shared/ui` (ADR-05 — feature
nunca importa PrimeReact direto); `useCourseForm` ganha `modules` no tipo/payload e os quatro
helpers de array; `CourseDialog` renderiza um card por módulo com `NestedField`, totais derivados
no render e aviso âmbar. Nenhuma linha de backend.

**Tech Stack:** React 19 + TS (Vite), PrimeReact via `shared/ui`, Tailwind v4 (layout),
react-i18next (3 locales), TanStack Query. Sem test runner no front (CLAUDE.md §8).

**Spec:** `docs/superpowers/specs/2026-07-17-bloco4-course-modules-frontend-design.md`

## Global Constraints

- **Lei §5.6 / ADR-05:** features importam SÓ de `@shared/ui`, nunca de `primereact/*`, e nunca de
  outra feature. O barrel `shared/ui/index.ts` tem um `export * from './X'` por pasta — nunca
  caminho fundo (`'./X/X'`).
- **Lei §5.3 / ADR-04:** `shared/types/generated.ts` é gerado do backend. **Não editar à mão.**
  Este bloco não muda DTO nenhum, logo **não roda `typescript:transform`**.
- **Lei §5.7:** o aviso de divergência de horas **nunca** bloqueia o salvar.
- **`key={i}` nas listas de módulo, JAMAIS `module.id`** — o replace do backend troca os ids a
  cada save.
- **`sort_order` e `total_hours` nunca vão no payload** — o backend os deriva.
- **Backend: zero linha.** Se parecer necessário, PARE e pergunte.
- **Todos os textos novos nos 3 locales** (`es-CL`, `pt-BR`, `en`) — `es-CL` é o fallback.
- **Namespace `courseModule.*`** para os textos de módulo: `course.module` já existe e significa
  outra coisa (o módulo "Cursos" do sistema).
- Estilo: sem `dark:` nos wrappers Prime (ADR-16); comentário só para constraint que o código não
  mostra.
- Commits frequentes, um por task. `git add` só os caminhos da task.

---

### Task 1: `AppTextarea` em `shared/ui` + CR.2.1 no `CourseDialog`

Fecha o card CR.2.1 inteiro: wrapper, descrição em textarea, orientação de UX nome/nome técnico,
i18n.

**Files:**
- Create: `frontend/src/shared/ui/AppTextarea/AppTextarea.tsx`
- Create: `frontend/src/shared/ui/AppTextarea/index.ts`
- Modify: `frontend/src/shared/ui/index.ts`
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx` (linhas 43-63)
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: `AppTextarea` (`forwardRef<HTMLTextAreaElement, AppTextareaProps>`, onde
  `AppTextareaProps extends InputTextareaProps`), exportado pelo barrel `@shared/ui`. A Task 3
  usa para `learnings` e `contents`.

- [ ] **Step 1: Criar o wrapper**

`frontend/src/shared/ui/AppTextarea/AppTextarea.tsx`:

```tsx
import { forwardRef } from 'react'
import { InputTextarea } from 'primereact/inputtextarea'
import type { InputTextareaProps } from 'primereact/inputtextarea'

export type AppTextareaProps = InputTextareaProps

/** Wrapper do InputTextarea. Cores vêm da folha de tema do Prime (ADR-16) — não
 * empilhe `dark:` aqui: o estado inválido (.p-invalid) precisa vencer. */
export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>((props, ref) => (
  <InputTextarea ref={ref} {...props} />
))
AppTextarea.displayName = 'AppTextarea'
```

`frontend/src/shared/ui/AppTextarea/index.ts`:

```ts
export * from './AppTextarea'
```

- [ ] **Step 2: Exportar no barrel**

Em `frontend/src/shared/ui/index.ts`, adicionar a linha logo abaixo de `export * from './AppTag'`
(a lista está agrupada, não é estritamente alfabética — mantenha o agrupamento existente):

```ts
export * from './AppTextarea'
```

- [ ] **Step 3: i18n — as chaves do CR.2.1 nos 3 locales**

Em cada arquivo, dentro do objeto `"course"` já existente, adicionar duas chaves.

`es-CL.json`:
```json
"namePlaceholder": "ej.: Riesgos Eléctricos",
"technicalNamePlaceholder": "ej.: Prevención de Riesgos Eléctricos en Alta Tensión"
```

`pt-BR.json`:
```json
"namePlaceholder": "ex.: Riscos Elétricos",
"technicalNamePlaceholder": "ex.: Prevenção de Riscos Elétricos em Alta Tensão"
```

`en.json`:
```json
"namePlaceholder": "e.g.: Electrical Hazards",
"technicalNamePlaceholder": "e.g.: High Voltage Electrical Hazard Prevention"
```

- [ ] **Step 4: `CourseDialog` — importar, trocar a descrição, pôr os placeholders**

Na linha 2, adicionar `AppTextarea` ao import de `@shared/ui`:

```tsx
import { CrudDialog, AppInputText, AppTextarea, FormField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

Campo `name` (linha 43-45) — só ganha `placeholder`:

```tsx
<FormField label={t('course.name')} error={fieldErrors?.name?.[0]}>
  <AppInputText value={form.name} disabled={readOnly} placeholder={t('course.namePlaceholder')} onChange={(e) => set('name', e.target.value)} className="w-full" />
</FormField>
```

Campo `technical_name` (linha 48-50) — só ganha `placeholder`:

```tsx
<FormField label={t('course.technicalName')} error={fieldErrors?.technical_name?.[0]}>
  <AppInputText value={form.technical_name ?? ''} disabled={readOnly} placeholder={t('course.technicalNamePlaceholder')} onChange={(e) => set('technical_name', e.target.value)} className="w-full" />
</FormField>
```

Campo `description` (linha 61-63) — `AppInputText` vira `AppTextarea`:

```tsx
<FormField label={t('course.description')} error={fieldErrors?.description?.[0]}>
  <AppTextarea value={form.description ?? ''} disabled={readOnly} rows={3} onChange={(e) => set('description', e.target.value)} className="w-full" />
</FormField>
```

`autoResize` NÃO é usado: dentro de um dialog de altura fixa, o textarea crescendo empurra o
resto do form. `rows={3}` e o usuário rola.

- [ ] **Step 5: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```
Expected: eslint sem erro; `tsc -b && vite build` → `✓ built in ...`.

Os JSON de locale são carregados por `import` tipado — chave faltando num locale **não** quebra o
build. Confira as três à mão:

```bash
cd frontend && python3 -c "
import json
for f in ['es-CL','pt-BR','en']:
    d = json.load(open('src/shared/config/locales/%s.json' % f))
    ks = d['course']
    print(f, 'namePlaceholder' in ks, 'technicalNamePlaceholder' in ks)
"
```
Expected: `es-CL True True`, `pt-BR True True`, `en True True`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/ui/AppTextarea frontend/src/shared/ui/index.ts \
        frontend/src/features/catalog/components/Course/CourseDialog.tsx \
        frontend/src/shared/config/locales/es-CL.json \
        frontend/src/shared/config/locales/pt-BR.json \
        frontend/src/shared/config/locales/en.json
git commit -m "feat(ui): AppTextarea em shared/ui; descrição do curso em textarea (CR.2.1)"
```

---

### Task 2: `useCourseForm` — `modules` no payload + helpers de array

**A task que fecha o gate.** Hoje o `PUT` sai sem `modules` e o backend apaga todos os módulos do
curso em silêncio — curso é registro de peso legal.

**Files:**
- Modify: `frontend/src/features/catalog/hooks/useCourseForm.ts`

**Interfaces:**
- Consumes: nada da Task 1.
- Produces, para a Task 3 consumir do retorno do hook:
  - `form.modules: CourseModuleData[]`
  - `addModule(): void`
  - `removeModule(i: number): void`
  - `patchModule(i: number, patch: Partial<CourseModuleData>): void`
  - `moveModule(i: number, dir: -1 | 1): void`
  - `EMPTY_MODULE: CourseModuleData` — **exportado**, a Task 3 não redefine.

- [ ] **Step 1: `modules` entra no tipo, no EMPTY e no toFields**

Em `frontend/src/features/catalog/hooks/useCourseForm.ts`, substituir o bloco das linhas 15-27.
O comentário de `redator_ids`/`templates` é preservado, com a frase de `modules` somada:

```ts
/**
 * Só os campos que o formulário edita. `redator_ids` fica aqui para o multiselect
 * do create, mas NÃO vai no payload do curso (o backend ignora na escrita): é
 * sincronizado pelo endpoint dedicado. `templates` fica de fora (config à parte).
 * `modules` PRECISA estar aqui: o backend faz replace-total, então um payload sem
 * o campo apaga todos os módulos do curso.
 */
export type CourseFormFields = Pick<
  CourseData,
  'id' | 'name' | 'technical_name' | 'description' | 'workload_hours' | 'redator_ids' | 'modules'
>

/** Módulo novo do formulário. `sort_order`/`total_hours` ficam undefined: o
 * backend os deriva (do índice do array e da soma) e ignora o que vier. */
export const EMPTY_MODULE: CourseModuleData = {
  id: undefined, name: '', learnings: null, contents: null,
  theory_hours: 0, practice_hours: 0, sort_order: undefined, total_hours: undefined,
}

const EMPTY: CourseFormFields = {
  id: undefined, name: '', technical_name: null, description: null, workload_hours: 0,
  redator_ids: [], modules: [],
}

const toFields = (c: CourseFormFields): CourseFormFields => {
  const { id, name, technical_name, description, workload_hours, redator_ids, modules } = c
  return structuredClone({ id, name, technical_name, description, workload_hours, redator_ids, modules })
}
```

Ajustar o import da linha 3 para trazer o tipo do módulo:

```ts
import type { CourseData, CourseModuleData } from '@shared/types/generated'
```

- [ ] **Step 2: Os quatro helpers**

Inserir logo abaixo do `toggleRedator` (linha 48), antes do `function submit()`. Todos com
updater funcional — dois eventos no mesmo tick precisam ver o array já atualizado pelo anterior
(mesmo motivo do `toggleRedator`):

```ts
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
```

- [ ] **Step 3: `modules` no payload**

Substituir o bloco do payload (linhas 51-57). O comentário existente de `redator_ids` fica:

```ts
// redator_ids NÃO entra: o backend ignora na escrita do curso.
// modules entra SEMPRE: o backend faz replace-total, então omitir o campo
// apagaria todos os módulos. Só os campos editáveis — sort_order e total_hours
// são derivados no backend (do índice do array e da soma) e descartados no
// except() da Action.
const payload = {
  name: form.name,
  technical_name: form.technical_name,
  description: form.description,
  workload_hours: form.workload_hours,
  modules: form.modules.map((m) => ({
    name: m.name,
    learnings: m.learnings,
    contents: m.contents,
    theory_hours: m.theory_hours,
    practice_hours: m.practice_hours,
  })),
}
```

- [ ] **Step 4: Exportar os helpers**

Substituir o `return` final (linhas 85-89):

```ts
return {
  form, set, toggleRedator, readOnly, submit,
  addModule, removeModule, patchModule, moveModule,
  pending: create.isPending || update.isPending || sync.isPending,
  fieldErrors, generalError,
}
```

- [ ] **Step 5: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```
Expected: verde. `CourseDialog` ainda não usa os helpers — não há erro de não-uso, são
propriedades de um objeto retornado.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/catalog/hooks/useCourseForm.ts
git commit -m "fix(catalog): form do curso manda modules no payload (PUT sem o campo apagava os módulos)"
```

---

### Task 3: `CourseDialog` — cards de módulo, totais e aviso

**Files:**
- Modify: `frontend/src/features/catalog/components/Course/CourseDialog.tsx`
- Modify: `frontend/src/shared/config/locales/es-CL.json`
- Modify: `frontend/src/shared/config/locales/pt-BR.json`
- Modify: `frontend/src/shared/config/locales/en.json`

**Interfaces:**
- Consumes: `AppTextarea` de `@shared/ui` (Task 1); `addModule`/`removeModule`/`patchModule`/
  `moveModule`/`form.modules` de `useCourseForm` (Task 2).
- Produces: nada (última task de código).

- [ ] **Step 1: i18n — namespace `courseModule` nos 3 locales**

**Namespace NOVO, no topo de cada arquivo** (irmão de `course`, não dentro dele):
`course.module` já existe e significa o módulo "Cursos" do sistema — não colidir.

`es-CL.json`:
```json
"courseModule": {
  "section": "Módulos",
  "itemLabel": "Módulo {{n}}",
  "add": "Agregar módulo",
  "remove": "Eliminar módulo",
  "moveUp": "Mover hacia arriba",
  "moveDown": "Mover hacia abajo",
  "name": "Nombre del módulo",
  "namePlaceholder": "ej.: Introducción a los Riesgos Eléctricos",
  "learnings": "Aprendizajes",
  "contents": "Contenidos",
  "theoryHours": "Horas teóricas",
  "practiceHours": "Horas prácticas",
  "total": "Total: {{hours}} h",
  "modulesTotal": "Total de los módulos: {{hours}} h",
  "hoursMismatch": "La suma de los módulos ({{modules}} h) difiere de la carga horaria del curso ({{workload}} h). Puedes guardar de todas formas.",
  "empty": "Sin módulos registrados."
}
```

`pt-BR.json`:
```json
"courseModule": {
  "section": "Módulos",
  "itemLabel": "Módulo {{n}}",
  "add": "Adicionar módulo",
  "remove": "Remover módulo",
  "moveUp": "Mover para cima",
  "moveDown": "Mover para baixo",
  "name": "Nome do módulo",
  "namePlaceholder": "ex.: Introdução aos Riscos Elétricos",
  "learnings": "Aprendizagens",
  "contents": "Conteúdos",
  "theoryHours": "Horas teóricas",
  "practiceHours": "Horas práticas",
  "total": "Total: {{hours}} h",
  "modulesTotal": "Total dos módulos: {{hours}} h",
  "hoursMismatch": "A soma dos módulos ({{modules}} h) difere da carga horária do curso ({{workload}} h). Você pode salvar assim mesmo.",
  "empty": "Nenhum módulo cadastrado."
}
```

`en.json`:
```json
"courseModule": {
  "section": "Modules",
  "itemLabel": "Module {{n}}",
  "add": "Add module",
  "remove": "Remove module",
  "moveUp": "Move up",
  "moveDown": "Move down",
  "name": "Module name",
  "namePlaceholder": "e.g.: Introduction to Electrical Hazards",
  "learnings": "Learnings",
  "contents": "Contents",
  "theoryHours": "Theory hours",
  "practiceHours": "Practice hours",
  "total": "Total: {{hours}} h",
  "modulesTotal": "Modules total: {{hours}} h",
  "hoursMismatch": "The modules sum ({{modules}} h) differs from the course workload ({{workload}} h). You can save anyway.",
  "empty": "No modules registered."
}
```

- [ ] **Step 2: Imports e derivações**

Linha 2 — o import de `@shared/ui` fica (já tem `AppTextarea` da Task 1; somar `AppButton` e
`NestedField`):

```tsx
import { CrudDialog, AppButton, AppInputText, AppTextarea, FormField, NestedField, FormErrorSummary, FormErrorBanner } from '@shared/ui'
```

Linha 17-18 — pegar os helpers novos do hook:

```tsx
const { form, set, toggleRedator, readOnly, submit, pending, fieldErrors, generalError,
        addModule, removeModule, patchModule, moveModule } = useCourseForm(course, mode, onHide)
```

Depois de `enabledRedatores` (linha 24), as derivações. Nada disso vai a estado — tudo recalcula
no render:

```tsx
// Totais derivados: reagem ao que está sendo digitado, não ao último valor salvo
// (o modules_total_hours do backend serve a consumidores de leitura).
const modulesTotal = form.modules.reduce((sum, m) => sum + m.theory_hours + m.practice_hours, 0)
// Curso sem módulo nenhum não é divergência — é curso sem módulo cadastrado.
const hoursMismatch = form.modules.length > 0 && modulesTotal !== form.workload_hours
```

- [ ] **Step 3: `excludePrefixes` no resumo de erros**

Linha 38 — cada módulo já mostra o próprio erro num `NestedField`:

```tsx
<FormErrorSummary
  errors={fieldErrors}
  mapped={['name', 'technical_name', 'description', 'workload_hours']}
  excludePrefixes={['modules.']}
/>
```

- [ ] **Step 4: A seção de módulos**

Inserir **entre** o campo `description` (que termina na linha 63) e o
`<h3>{t('course.sectionRedatores')}</h3>` (linha 65):

```tsx
<h3 className="pt-2 text-xs font-semibold uppercase text-slate-500">{t('courseModule.section')}</h3>

{form.modules.length === 0 && (
  <p className="text-sm text-slate-500">{t('courseModule.empty')}</p>
)}

{/* key={i}: o backend faz replace dos módulos, então os ids trocam a cada save —
    um id como key remontaria as linhas e perderia o foco. A ordem só muda por
    ação explícita do usuário (moveModule). */}
{form.modules.map((m, i) => (
  <div key={i} className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-700">
    <div className="flex items-start gap-2">
      <span className="mt-2.5 text-xs font-semibold text-slate-500">{t('courseModule.itemLabel', { n: i + 1 })}</span>
      <NestedField error={fieldErrors?.[`modules.${i}.name`]?.[0]}>
        <AppInputText
          placeholder={t('courseModule.namePlaceholder')}
          value={m.name}
          disabled={readOnly}
          onChange={(e) => patchModule(i, { name: e.target.value })}
          className="w-full"
        />
      </NestedField>
      {!readOnly && (
        <div className="flex gap-1">
          <AppButton icon="pi pi-arrow-up" text aria-label={t('courseModule.moveUp')} tooltip={t('courseModule.moveUp')} disabled={i === 0} onClick={() => moveModule(i, -1)} />
          <AppButton icon="pi pi-arrow-down" text aria-label={t('courseModule.moveDown')} tooltip={t('courseModule.moveDown')} disabled={i === form.modules.length - 1} onClick={() => moveModule(i, 1)} />
          <AppButton icon="pi pi-trash" text aria-label={t('courseModule.remove')} tooltip={t('courseModule.remove')} onClick={() => removeModule(i)} />
        </div>
      )}
    </div>

    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
      <NestedField error={fieldErrors?.[`modules.${i}.theory_hours`]?.[0]}>
        <span className="mb-1 block text-xs text-slate-500">{t('courseModule.theoryHours')}</span>
        <AppInputText
          value={String(m.theory_hours)}
          disabled={readOnly}
          onChange={(e) => patchModule(i, { theory_hours: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          className="w-full"
        />
      </NestedField>
      <NestedField error={fieldErrors?.[`modules.${i}.practice_hours`]?.[0]}>
        <span className="mb-1 block text-xs text-slate-500">{t('courseModule.practiceHours')}</span>
        <AppInputText
          value={String(m.practice_hours)}
          disabled={readOnly}
          onChange={(e) => patchModule(i, { practice_hours: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          className="w-full"
        />
      </NestedField>
      <span className="pb-2 text-sm text-slate-500">
        {t('courseModule.total', { hours: m.theory_hours + m.practice_hours })}
      </span>
    </div>

    <NestedField error={fieldErrors?.[`modules.${i}.learnings`]?.[0]}>
      <span className="mb-1 block text-xs text-slate-500">{t('courseModule.learnings')}</span>
      <AppTextarea
        value={m.learnings ?? ''}
        disabled={readOnly}
        rows={2}
        onChange={(e) => patchModule(i, { learnings: e.target.value })}
        className="w-full"
      />
    </NestedField>

    <NestedField error={fieldErrors?.[`modules.${i}.contents`]?.[0]}>
      <span className="mb-1 block text-xs text-slate-500">{t('courseModule.contents')}</span>
      <AppTextarea
        value={m.contents ?? ''}
        disabled={readOnly}
        rows={3}
        onChange={(e) => patchModule(i, { contents: e.target.value })}
        className="w-full"
      />
    </NestedField>
  </div>
))}

{!readOnly && (
  <AppButton label={t('courseModule.add')} icon="pi pi-plus" text onClick={addModule} />
)}

{form.modules.length > 0 && (
  <p className="text-right text-sm text-slate-500">
    {t('courseModule.modulesTotal', { hours: modulesTotal })}
  </p>
)}

{/* Aviso, não erro: âmbar e sem role="alert" (o FormErrorBanner é vermelho e
    para 422). NUNCA bloqueia o submit — §5.7, registro não bloqueia ação. */}
{hoursMismatch && (
  <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
    {t('courseModule.hoursMismatch', { modules: modulesTotal, workload: form.workload_hours })}
  </p>
)}
```

- [ ] **Step 5: Verificar**

```bash
cd frontend && pnpm lint && pnpm build
```
Expected: verde.

Nenhum import de `primereact` na feature (lei §5.6):
```bash
cd frontend && grep -rn "from 'primereact" src/features/ || echo "OK: nenhum"
```
Expected: `OK: nenhum`.

As 16 chaves de `courseModule` nos 3 locales:
```bash
cd frontend && python3 -c "
import json
base = set(json.load(open('src/shared/config/locales/es-CL.json'))['courseModule'])
for f in ['es-CL','pt-BR','en']:
    ks = set(json.load(open('src/shared/config/locales/%s.json' % f))['courseModule'])
    print(f, len(ks), 'faltando:', base - ks, 'sobrando:', ks - base)
"
```
Expected: cada locale com 16 chaves, `faltando: set()` e `sobrando: set()`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/catalog/components/Course/CourseDialog.tsx \
        frontend/src/shared/config/locales/es-CL.json \
        frontend/src/shared/config/locales/pt-BR.json \
        frontend/src/shared/config/locales/en.json
git commit -m "feat(catalog): módulos reordenáveis no CourseDialog com soma de horas e aviso (CR.2.3)"
```

---

### Task 4: Roteiro de verificação manual

O front não tem test runner nem browser automation (decisão do João: não instalar Playwright no
meio de um bloco de UI — é decisão de stack, merece bloco próprio). O DoD do bloco é
comportamento de tela, então a prova é o João executando o roteiro. **Esta task escreve o
roteiro; ela NÃO o executa e NÃO marca o bloco como provado.**

**Files:**
- Create: `docs/superpowers/plans/2026-07-17-bloco4-roteiro-verificacao.md`

- [ ] **Step 1: Confirmar que o ambiente sobe**

```bash
docker compose up -d && curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/user
```
Expected: `401` (API viva, sem sessão). Se vier `500`, checar o dono de
`storage/logs/laravel.log` — achado do Bloco 3: o arquivo fica `www-data` e o PHP-FPM roda como
`appuser`, e toda exceção vira 500 genérico.

- [ ] **Step 2: Escrever o roteiro**

Criar `docs/superpowers/plans/2026-07-17-bloco4-roteiro-verificacao.md` com exatamente estes 6
cenários — cada um com passos numerados e resultado esperado, na ordem abaixo. O cenário 5 é o
que importa: é a regressão do gate que o Bloco 3 deixou aberto.

1. **Criar curso com 2 módulos.** `/cursos` → Novo curso. Nome `GATE B4`, carga horária `40`.
   Adicionar módulo 1: nome `Riscos`, teóricas `8`, práticas `0`, aprendizagens
   `Identificar riscos`, conteúdos `1.1 Perigos\n1.2 Barreiras`. Adicionar módulo 2: nome
   `Terreno`, teóricas `4`, práticas `8`.
   **Esperado:** módulo 1 mostra `Total: 8 h`, módulo 2 `Total: 12 h`, rodapé
   `Total dos módulos: 20 h`, aviso âmbar (40 ≠ 20), **e o botão de salvar funciona**.
2. **Reabrir em view.** **Esperado:** `Riscos` em 1º, `Terreno` em 2º; textos e horas conferem;
   campos desabilitados; sem botões de mover/remover/adicionar; totais e aviso ainda visíveis.
3. **Reordenar.** Editar → `↓` no `Riscos` → salvar → reabrir.
   **Esperado:** `Terreno` em 1º, `Riscos` em 2º. `↑` desabilitado no 1º item, `↓` no último.
4. **Divergência resolvida.** Editar → carga horária `20` → **Esperado:** o aviso âmbar some
   (20 = 20). Módulo 100% teórico (`Riscos`, 8/0) **não** gera aviso nenhum.
5. **REGRESSÃO DO GATE.** Editar → mudar **só** o nome para `GATE B4 renomeado` → salvar →
   reabrir. **Esperado: os 2 módulos continuam lá, na ordem certa.** Antes deste bloco, este
   passo apagava todos os módulos em silêncio.
6. **Remover.** Editar → remover o `Riscos` → salvar → reabrir. **Esperado:** só o `Terreno`,
   rotulado `Módulo 1`.

Fechar o arquivo com um bloco para o João anotar o resultado de cada cenário
(`✅ / ❌ + o que viu`).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-17-bloco4-roteiro-verificacao.md
git commit -m "docs: roteiro de verificação manual do Bloco 4"
```

---

## Fechamento (fora das tasks — o controlador faz, após o review final da branch E o roteiro
executado pelo João)

Não é task de subagente: arquivar antes da prova marcaria como "Entregue" o que ninguém provou.

- Mover spec para `docs/superpowers/specs/archive/` e plano + roteiro para
  `docs/superpowers/plans/archive/`.
- `docs/superpowers/progress.md`: linha do Bloco 4 → `Entregue`, caminhos → `archive/`, desfecho
  em 1 linha priorizando o que evita retrabalho; **tirar o Bloco 4 do backlog junto com os dois
  gates herdados** (ambos fechados aqui).
- `docs/der-fisico.md` **não muda** — o bloco não toca schema.
