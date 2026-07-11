# Spec — Frontend do Catálogo de Cursos (Sprint 1 · Notion 5.2.1 + 5.2.2)

> Fecha a Sprint 1. Backend do Catalog já pronto (`apiResource courses` + nested
> templates + `PUT courses/{course}/redatores`). Este spec cobre só o frontend.

## Propósito

Construir a interface do módulo Catálogo (`/cursos`): listagem de cursos e
formulário de cadastro/edição, espelhando o formato das features já feitas
(`commercial`/Client, `identity`/Redator). Sem inventar padrão novo.

- **5.2.1** — hook `useCoursesPage` + tela de listagem (catálogo).
- **5.2.2** — formulário de curso + habilitação de redatores (com a regra do produto).

## Fonte de verdade (Drive: `2-intermediario/telas/tela-cursos.md`)

- Curso **não tem valor** (preço vive na cotação). Campos: nome, nome técnico,
  descrição, carga horária.
- Habilitação de redatores no catálogo é **só leitura**; a edição mora em Pessoas
  (perfil do redator, já implementado). "Editar habilitação aqui → ação não existe
  nesta tela (por design)."
- **Exceção decidida pelo João:** no **cadastro de curso novo** (create) é permitido
  habilitar redatores. Create não é "visualização", então não fere a regra de
  leitura. Em view/edit permanece só leitura.

Isso alinha produto + backend: `CourseData.redator_ids` é read-only na escrita; a
habilitação só se grava pelo endpoint dedicado, que aqui usamos **exclusivamente no
create**.

## Fora de escopo (entram quando os módulos existirem)

- **Templates de manual/certificado** — config versionada, endpoint próprio. Não é
  5.2.x.
- **Exibição de turmas** no curso — Operação ainda não existe.

## Arquitetura & arquivos

Espelha `features/commercial` e `features/identity`.

```
shared/api/redatoresApi.ts            MOVER de features/identity/api → shared/api
                                        (catalog precisa listar redatores; feature não
                                        importa feature — ADR-05, mesmo precedente do
                                        coursesApi). identity re-importa de @shared/api.

features/catalog/
  api/useCourseRedatores.ts           hook de sync da habilitação (espelho de
                                        useRedatorDocuments): PUT /api/courses/{id}/redatores
                                        body { redator_ids }, onSuccess invalida
                                        coursesApi.keys.all.
  hooks/useCoursesPage.ts             useCrudPage(coursesApi)   [coursesApi já em shared]
  hooks/useCourseForm.ts              useEntityForm + create/update + sync (só no create)
  components/CatalogPage.tsx          ModulePage + ModuleTabs + CoursesTable + CourseDialog
  components/Course/CoursesTable.tsx  AppDataTable + busca (espelho ClientsTable)
  components/Course/CourseDialog.tsx  CrudDialog + campos + painel/multiselect redatores

app/router/AppRouter.tsx              /cursos: ModulePlaceholder → CatalogPage
shared/config/locales/{es-CL,pt-BR,en}.json   namespace course.*
```

`coursesApi` (shared) já existe. Nav já tem a entrada `cursos` (`catalog.course.view`).

## Contrato de dados (do backend, já gerado)

- `CourseData`: `id`, `name` (req), `technical_name?`, `description?`,
  `workload_hours` (req, int), `templates[]` (read-only aqui), `redator_ids[]`
  (read-only na escrita — sync só via endpoint dedicado).
- `CourseRedatorData` (sync): `redator_ids: int[]` (`present|array`, cada id
  `exists:redatores`).

## `useCourseForm` (o núcleo)

Espelha `useRedatorForm`, com a assimetria tratada.

- **Campos do form:** `id, name, technical_name, description, workload_hours,
  redator_ids`. `redator_ids` fica no estado local e **não** vai no payload do curso
  (o DTO ignora); vai pelo sync.
- **Mutações:** `coursesApi.useCreate()`, `coursesApi.useUpdate()`, e o hook de sync
  `useCourseRedatores()`.
- **`toggleRedator(id)`** — updater funcional (espelho de `toggleCourse`).
- **`submit()`:**
  - **create:** `create.mutate(cursoPayload)` → `onSuccess(created)`: se
    `redator_ids` vazio → `onDone()`; senão `sync.mutate({ id: created.id, redator_ids })`
    → `onSuccess: onDone`.
  - **edit:** `update.mutate(cursoPayload)` → `onSuccess: onDone`. **Sem sync** — em
    edit a habilitação é só leitura.
- `pending = create.isPending || update.isPending || sync.isPending`.
- `useMutationErrors([create.error, update.error, sync.error])`.

## `CourseDialog`

`CrudDialog` no mesmo shape do `ClientDialog`/`RedatorDialog`.

- **Seção "Dados do curso"** (editável em create/edit, `disabled={readOnly}` em view):
  `name`, `technical_name`, `description` (textarea/`AppInputText`), `workload_hours`
  (numérico). Erros por campo via `Field` + `UnmappedErrors`
  (mapeados: `name, technical_name, description, workload_hours`).
- **Seção "Redatores habilitados":**
  - **create:** lista de checkboxes dos redatores (espelho da seção de cursos do
    `RedatorDialog`), controlada por `toggleRedator`. Fonte: `redatoresApi.useList()`
    (agora em `@shared/api`).
  - **view/edit:** **painel de leitura** — lista só dos redatores habilitados
    (derivada de `redator_ids` cruzada com a lista de redatores), sem checkbox. Nota
    curta apontando que a edição é em Pessoas.

## Erros & falha parcial

- 422 do curso: esquema `Field`/`UnmappedErrors` do `ClientDialog`.
- **Falha parcial no create** (curso criado, sync falha — só rede/500, pois o
  multiselect só oferece redatores existentes): dialog **não fecha**, `generalError`
  mostra o erro do sync. O curso já persistiu e aparece na lista após invalidação;
  usuário edita/reabre e reaplica a habilitação **em Pessoas**. Nunca falha em
  silêncio (peso legal). Sem rollback — proporcional a ~10 usuários.

## `CoursesTable`

Espelho exato de `ClientsTable`: `AppInputText` de busca + `AppDataTable`
(`globalFilter`) + contagem de linhas.

- Colunas: `name` (sortable), `technical_name`, `workload_hours` (carga horária),
  redatores habilitados (`redator_ids.length`), e a coluna de ação (`pi pi-eye` →
  `onView`).
- `globalFilterFields`: `['name', 'technical_name']`.

## `CatalogPage`

Espelho de `CommercialPage`: `ModulePage` (título/descrição via i18n) + botão
"Novo curso" (`AppButton variant="brandIcon"`) + `ModuleTabs` com **uma** aba
(Cursos) — sem placeholders inventados. Dialog controlado por `useCoursesPage`
(`openCreate/openView/startEdit/close`).

## Router & i18n

- `AppRouter`: rota `/cursos` passa de `ModulePlaceholder` para `CatalogPage`.
- i18n: namespace `course.*` nos **3** locales (es-CL, pt-BR, en) com o mesmo
  conjunto de chaves (o review final exige paridade). Chaves previstas: `module`,
  `moduleDescription`, `new`, `create`, `name`, `technicalName`, `description`,
  `workloadHours`, `sectionGeneral`, `sectionRedatores`, `enabledRedatores`,
  `redatoresReadonlyNote`, `searchPlaceholder`, `empty`, `count`. Reusa `common.*`.

## Leis / ADRs relevantes

- **ADR-05:** catalog não importa identity; por isso `redatoresApi` vai pra `shared`.
  Nenhum import de PrimeReact fora de `shared/ui`.
- **ADR-04:** `generated.ts` não se edita; os tipos já existem.
- **ADR-06/03:** mutações passam pelo axios compartilhado (cookie Sanctum + CSRF já
  no bootstrap); erros seguem RFC 7807 via `useMutationErrors`.

## Testes / DoD

Sem test runner no front (CLAUDE.md §8). DoD =
1. `cd frontend && pnpm build` (tsc) e `pnpm lint` limpos.
2. Verificação manual no browser contra a API real:
   - criar curso **com** redatores habilitados no create → persiste e sincroniza;
   - criar curso **sem** redatores → não dispara o sync;
   - editar campos do curso (habilitação some do form, vira leitura);
   - view mostra painel de leitura dos redatores habilitados;
   - listagem com busca filtrando por nome/nome técnico;
   - redator habilitado via Pessoas reflete na leitura do curso.
