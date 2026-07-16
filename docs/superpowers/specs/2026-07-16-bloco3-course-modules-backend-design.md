# Bloco 3 · CR Curso: entidade `course_modules` 1:N (backend) — Design

> Data: 2026-07-16 · Escopo canônico: Notion CR.2.2 · ADR ref: ADR-02, ADR-04, ADR-08.
> Origem: solicitação do contratante (2026-07-15), item 6 do Curso. **Altera o modelo de dados.**
> Consome o Bloco 4 (CR.2.3, frontend) — não o inverso.

## Objetivo

Modelar o quadro de módulos da proposta comercial Lotus como entidade 1:N de `courses`:
item (ordem), nome, aprendizagens, conteúdos, horas teóricas e práticas. **Nenhum total
persistido** — horas do módulo e soma do curso são derivadas em runtime.

Escopo = backend + tipos gerados + DER. A UI (lista reordenável, aviso de divergência) é o
Bloco 4.

---

## 1. Schema

Migration **nova** (`course_modules`). A migration `2026_07_08_172639_courses.php` já rodou —
não se edita.

```php
Schema::create('course_modules', function (Blueprint $table) {
    $table->id();
    $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
    $table->unsignedSmallInteger('sort_order');       // o "Item" (1..N)
    $table->string('name');
    $table->text('learnings')->nullable();            // Aprendizajes
    $table->text('contents')->nullable();             // Contenidos (texto livre)
    $table->unsignedSmallInteger('theory_hours')->default(0);
    $table->unsignedSmallInteger('practice_hours')->default(0);
    $table->timestamps();
    $table->softDeletes();

    $table->index(['course_id', 'sort_order']);
});
```

**Decisões de modelagem (fechadas com o João):**

- **`name` separado de `contents`.** Na proposta o número+nome vem embutido no texto
  ("Módulo 1: …"). Guardar separado e remontar (`"Módulo {sort_order}: {name}"`) na geração do
  documento — reordenar não exige reescrever texto.
- **`contents` é texto livre**, não lista estruturada. A numeração 1.1/1.2 é conteúdo autoral,
  não dado consultável (CLAUDE.md §6 — sem abstração de uso único).
- **`learnings`/`contents` nullable**: módulo pode nascer só com nome e horas.
- **Nenhuma coluna de total** — nem por módulo, nem no curso. Precedente: `BudgetSummaryService`,
  código composto `Scap 100 - Cot 2`.
- **`courses.workload_hours` permanece como está**: é a carga contratada, independente da soma
  dos módulos. Divergência é **aviso não-bloqueante no front** (Bloco 4), nunca gate — §5.7
  (registro não bloqueia ação). Backend **não** valida a igualdade.
- **Sem `unique(course_id, sort_order)`**: o replace apaga e recria dentro da transação; a
  unicidade seria uma restrição a defender sem ameaça real (só o curso inteiro edita módulos).

## 2. Model

`App\Domains\Catalog\Models\CourseModule` — `Auditable` + `SoftDeletes`.

- `$fillable`/`$auditInclude`: `sort_order`, `name`, `learnings`, `contents`, `theory_hours`,
  `practice_hours` (`course_id` entra pela relação).
- Morph map (`AppServiceProvider`): alias `course_module` — obrigatório para todo model
  Auditable (ADR-10).
- `Course::modules(): HasMany` — `hasMany(CourseModule::class)->orderBy('sort_order')`.
- **Cascata de soft-delete:** o `static::deleting` de `Course` já apaga `certificateTemplates`
  instância-a-instância; `modules` entra na mesma forma, sob a mesma guarda `isForceDeleting`.
  Soft-delete pelo query builder **não audita** (ADR-08).

## 3. DTOs (contrato → `generated.ts`)

`CourseModuleData` (`#[TypeScript]`, nested):

| Campo | Entrada | Saída |
|---|---|---|
| `id` | `Optional` | id do módulo |
| `name` | `#[Required]` string | idem |
| `learnings`, `contents` | nullable | idem |
| `theory_hours`, `practice_hours` | int, default 0 | idem |
| `sort_order` | **ausente** — não é entrada | 1..N |
| `total_hours` | `Optional` (saída pura) | `theory_hours + practice_hours` |

`CourseData` ganha:

- `modules: array<CourseModuleData>` (`#[DataCollectionOf]`), default `[]` — entrada **e** saída.
- `modules_total_hours` — `Optional` na entrada, saída pura: soma de `total_hours` dos módulos.

Ambos derivados em `fromModel` (a projeção única — INSTRUÇÕES, `from()` vs `fromModel()`).
`modules_total_hours` é redundante com o cálculo ao vivo do form do Bloco 4 (que soma em JS
antes de salvar), e assumido: são ~4 linhas, atendem o aceite do Notion e dão ao front o valor
salvo sem varrer o array (lista de cursos, tela de view); consumidores futuros (PDF da proposta,
certificado) não reimplementam a soma.

## 4. Actions (sync nested)

`CreateCourseAction` e `UpdateCourseAction` sincronizam módulos dentro da transação que já
existe. **`CreateX` sincroniza TUDO que `UpdateX` sincroniza** — esquecer no create já descartou
dados em silêncio neste projeto.

- **`sort_order` é derivado do índice do array**, nunca do payload: a Action grava `$i + 1` na
  ordem em que `modules` chega. Reordenar no front = mandar o array na ordem nova. Impossível
  gap/duplicata; nenhuma validação de sequência necessária.
- **Sync = replace**, idêntico a `addresses`/`contacts` em `UpdateClientAction`:
  `$course->modules()->get()->each(fn (CourseModule $m) => $m->delete())` (instância a instância —
  auditoria registra o que saiu) + recriar pela ordem do array.

## 5. Rotas e RBAC

**Nenhuma rota nova, nenhuma permissão nova.** Módulos são nested do `CourseData`, como
`addresses`/`contacts` do Client — quem tem `catalog.course.update` edita módulos. Não há caso
de uso de editar módulo isolado fora do diálogo do curso.

`CourseController` muda só nos eager loads: `with(['certificateTemplates', 'redatores', 'modules'])`
em `index` e `show` (evita N+1 na projeção).

## 6. Testes (integração, sqlite `:memory:` — ADR-02, sem mock)

Em `tests/Feature/Cadastros/` (junto de `CourseCrudTest`/`CourseModelTest`):

1. **Create com N módulos** — POST curso com 3 módulos → persistidos com `sort_order` 1,2,3 na
   ordem do array; `sort_order` enviado no payload é ignorado.
2. **Reordenação** — PUT com o array invertido → `sort_order` reescrito 1..N na ordem nova;
   nenhum módulo ativo órfão sobra (contagem estável).
3. **Soma derivada** — `total_hours` por módulo e `modules_total_hours` do curso batem na
   resposta; módulo 100% teórico ou 100% prático (o outro = 0) é válido, sem erro.
4. **Cascata de soft-delete** — `$course->delete()` → módulos soft-deletados **e** com registro
   em `audits` (a prova de que não passou pelo query builder).
5. **Schema** — `SchemaTest` de Cadastros ganha `course_modules` (colunas + FK cascade).

## 7. Definition of Done

- Suíte verde no container (`docker compose exec -T app php artisan test`).
- `php artisan typescript:transform` → `generated.ts` traz `CourseModuleData` e os campos novos
  de `CourseData` (arquivo gerado, nunca editado à mão — ADR-04).
- `docs/der-fisico.md`: `course_modules` documentada (em inglês, 1:1 com a migration) e a
  contagem de tabelas implementadas atualizada.
- **Comportamento provado end-to-end contra a API real** (CLAUDE.md §4): curso criado com
  módulos e reordenado via HTTP, não só teste verde.
- `pint` nos arquivos tocados.

## Fora de escopo

- UI dos módulos, `AppTextarea`, aviso de divergência (Bloco 4 · CR.2.1/CR.2.3).
- Qualquer mudança em `courses.workload_hours`.
- Remontagem `"Módulo {sort_order}: {name}"` na geração de documento (Sprint 4 · Certificação).
