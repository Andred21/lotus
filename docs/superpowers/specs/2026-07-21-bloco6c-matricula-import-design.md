# Bloco 6c · Sprint 3 — Matrícula + importação de alunos (backend) — Design

> Data: 2026-07-21. Backend only. Main tree (P-03), não worktree.
> Fontes de regra (Drive `V2/Planejamento`, canônico): `entidade-matricula.md`, `tela-turmas.md`,
> `requisitos-negocio.md` (RF-ALU-02/04, RF-TUR-03, RN-10/12/15), DER `docs/der-fisico.md`
> (`enrollments` planejada). Decisões do João nesta sessão em §2.

## Papel na solução

Fecha o triângulo aluno↔turma: a Matrícula (`enrollment`) é a entidade associativa FORTE que
carrega o resultado acadêmico e da qual o certificado nasce (1:0..1). Este bloco entrega a
**criação** da matrícula por dois caminhos — individual e importação em massa xlsx/csv — orquestrando
o `StudentResolver` do 6a sobre a `Turma` do 6b. Notas/presença/aprovação são escritas no 6d.

## 1. Fronteira

**Dentro:**
- Migration `enrollments` + model `Enrollment` (+ enum `EnrollmentApprovalStatus`, morph alias,
  factory).
- `EnrollStudentAction` (fonte única da matrícula), `RemoveEnrollmentAction`,
  `ImportStudentsAction` + `SpreadsheetRowReader` (openspout).
- `EnrollmentData` / `ImportResultData` (`#[TypeScript]`, regen `generated.ts`).
- Endpoints: individual, importar, remover, listar (rotas nested de `turmas`).
- Permissão `operation.turma.enroll` (catálogo + seeder).
- Prova e2e contra **MySQL** (lição #15).

**Fora (não implementar):**
- Escrita de notas/presença/aprovação, transições de status, blindagem RN-15 → 6d.
- Manual Blade → 6d. Telas → 6-frontend. `GET /turmas/{id}/redatores-habilitados` → 6-frontend.
- Persistir a planilha em `files` (insumo transitório, não documento de peso legal — decidido §2).

## 2. Decisões travadas (João, 2026-07-21)

| # | Decisão | Fundamento |
|---|---------|-----------|
| D1 | Planilha = colunas `RUT, Nombre, Email, Teléfono`, nessa ordem, com linha de cabeçalho; email/teléfono opcionais. | João. Formato usado pelo cliente. |
| D2 | Escopo = import em massa **+** matrícula individual **+** remoção. | tela-turmas ("OU adiciona individualmente"), RF-ALU-02. |
| D3 | `quote.student_count` **nunca bloqueia** matrícula. API expõe contratado vs matriculado; aviso é do front. | Lei §7 / espírito RN-18: registro não é gate. |
| D4 | Matrícula/remoção só com turma `em_andamento`; senão 422. | Antecipação coerente da blindagem (RN-15 completa é 6d). |
| D5 | Parser = **openspout/openspout** (xlsx+csv, streaming, leve). | Proporcionalidade (~10 usuários). maatwebsite = superdimensionado; csv-only contraria RF-ALU-02. |
| D6 | Duplicata (mesmo RUT 2× na planilha, ou reimport) = outcome `already_enrolled`, idempotente, não é erro. | Reimport de planilha corrigida precisa ser seguro. |
| D7 | Remoção = **soft-delete** do enrollment; re-matricular **restaura** o mesmo registro. | Unique composto + soft-delete (lição #8): o par removido ocupa o índice — restore, nunca 2º insert. Histórico não duplica. |
| D8 | Chaves i18n `perm.*` da permissão nova ficam como pendência para o 6-frontend. | Bloco backend-only não toca `frontend/`. |

## 3. Schema — `enrollments` (inglês, der-fisico)

```
enrollments
  id               bigint PK
  turma_id         FK → turmas, RESTRICT       -- turma com matrícula não some (peso legal)
  student_id       FK → students, RESTRICT     -- padrão 6a/6b
  grades           json NULL                   -- 6d escreve (redator)
  attendance_pct   decimal(5,2) NULL           -- 6d escreve
  approval_status  enum('pendiente','aprobado','reprobado') default 'pendiente'
  created_at, updated_at, deleted_at
  UNIQUE(turma_id, student_id)                 -- 1 matrícula por aluno por turma
```

- Unique **nomeado explicitamente e emitido fora do `constrained()`** (lição do 6b: `->unique()`
  encadeado após `->constrained()` não emite índice em MySQL).
- Sem coluna gerada → RESTRICT limpo no InnoDB.
- `pendiente` default: matrícula nasce sem resultado; enum em ES casa com `TurmaStatus`/domínio.

## 4. Domínio — `app/Domains/Operation/`

### `Models/Enrollment.php`
`Auditable` + `SoftDeletes` (resultado acadêmico tem peso legal). `$casts`: `grades` → `array`,
`attendance_pct` → `decimal:2`, `approval_status` → `EnrollmentApprovalStatus`. Relations:
`turma()`, `student()`. Morph alias `'enrollment'` no `AppServiceProvider`. `Turma` ganha
`enrollments()` hasMany. Factory.

### `Enums/EnrollmentApprovalStatus.php`
`Pendiente='pendiente'`, `Aprobado='aprobado'`, `Reprobado='reprobado'`.

### `Actions/EnrollStudentAction`
Fonte única da matrícula — individual E import (por linha) passam aqui. Assinatura:

```
execute(Turma $turma, string $rut, string $name, ?string $email, ?string $phone): EnrollOutcome
```

Dentro de `DB::transaction`:
1. Guard D4: `$turma->status === TurmaStatus::EmAndamento`, senão `ValidationException` (422,
   RFC 7807 — nunca `abort()`).
2. `$client = $turma->quote->budget->client` (RF-TUR-03: cliente da cotação).
3. `$resolution = StudentResolver::resolveByRut($rut, $name, $email, $phone, $client)` —
   `ValidationException` de RUT/tipo sobe (o import captura por linha; o individual devolve 422).
4. Enrollment `withTrashed()` por `(turma_id, student_id)`:
   - vivo → outcome `already_enrolled` (no-op);
   - trashed → `restore()` (D7);
   - ausente → `create` (`pendiente`).
5. Retorna `EnrollOutcome` readonly: `{ Enrollment $enrollment, StudentResolution $resolution,
   bool $alreadyEnrolled }`.

### `Actions/ImportStudentsAction`
```
execute(Turma $turma, UploadedFile $file): ImportResult
```
1. Guard D4 uma vez (fora do loop).
2. `SpreadsheetRowReader::rows($file)` — itera pulando cabeçalho e linhas vazias.
3. Por linha (`$row` 1-based contando o cabeçalho): try `EnrollStudentAction` → acumula por
   outcome (`created` / `relinked` / `moved` / `already_enrolled`); catch `ValidationException`
   → acumula `errors[] = {row, message}` e **continua**.
4. **Transação por linha** (a do `EnrollStudentAction`), nunca global — planilha não aborta
   inteira (tela-turmas: linha rejeitada é reportada no resumo).
5. Retorna `ImportResult` com contadores, `moved[]` detalhado, `errors[]`,
   `enrolled_total` (matrículas vivas da turma pós-import) e `contracted_count`
   (`quote.student_count`, D3).

### `Actions/RemoveEnrollmentAction`
Guard D4 → `$enrollment->delete()` — **model, nunca builder** (lição #5: builder não audita).

### `Services/SpreadsheetRowReader.php`
openspout. Detecta xlsx/csv por extensão. Yield de `{row: int, rut, name, email, phone}` mapeando
as 4 colunas de D1. Só leitura — sem regra de negócio.

## 5. HTTP

### Rotas (`Operation/routes.php`, sob `auth:sanctum`)
```
GET    /api/turmas/{turma}/alunos                       → array<EnrollmentData>
POST   /api/turmas/{turma}/alunos                       → 201 EnrollmentData
POST   /api/turmas/{turma}/alunos/importar              → 200 ImportResultData
DELETE /api/turmas/{turma}/alunos/{enrollment}          → 204   (scoped binding: enrollment ∈ turma)
```

### Controller `EnrollmentController` (`HasMiddleware`)
`operation.turma.view` → index · `operation.turma.enroll` → store/import/destroy. Fino: binding +
Action + `Data::fromModel`.

### Permissão
`operation.turma.enroll` no `PermissionCatalog` (+ descrição dev-facing) + seeder. Chaves
`perm.*` dos 3 locales = pendência do 6-frontend (D8) — registrar em `docs/pendencias.md`.

### DTOs
- **`EnrollmentData`** (`#[TypeScript]`): `id`, `turma_id`, `student_id`, achata user (`name`,
  `rut`, `email`, `phone`), `approval_status`, `attendance_pct`, `grades`. Entrada do individual:
  `rut` (`ValidRut`) + `name` required, `email` (email) / `phone` opcionais — campos de saída
  `Optional` (padrão dos DTOs bidirecionais).
- **`ImportResultData`** (`#[TypeScript]`, saída pura): `created`, `relinked`, `already_enrolled`
  (ints), `moved[]` (`{rut, name, previous_client, client}` — visibilidade RF-ALU-04),
  `errors[]` (`{row, message}`), `enrolled_total`, `contracted_count` (D3, front compara e avisa).
- Import valida o arquivo: `required|file|mimes:xlsx,csv,txt|max:10240`.
- Regen `php artisan typescript:transform`; sem consumidor front hoje — regen no mesmo commit
  (lição #11).

## 6. Casos de borda

| Caso | Comportamento |
|---|---|
| RUT inválido na linha | erro por linha no resumo; import segue |
| RUT de redator/admin/cliente | erro por linha (`StudentResolver`, tipo conflitante) |
| Mesmo RUT 2× na planilha | 1ª matricula, 2ª `already_enrolled` (D6) |
| Reimport da mesma planilha | tudo `already_enrolled`; estado final idêntico |
| Aluno vinculado a outro cliente | matricula E reporta em `moved[]` com cliente anterior |
| Aluno soft-deletado reimportado | 6a restaura user+student; enrollment novo/restaurado |
| Enrollment removido + re-matrícula | `restore()` do mesmo registro (D7) |
| Excede `student_count` | importa tudo; `contracted_count` no resumo (D3) |
| Turma habilitada/concluída | 422 em store/import/destroy (D4) |
| Planilha vazia / só cabeçalho | resumo zerado, 200 |
| Arquivo não-planilha | 422 na validação do upload |
| enrollment de outra turma na rota destroy | 404 (scoped binding) |

## 7. Definition of Done — provado contra MySQL (lição #15)

1. Individual RUT novo → 201; user `type=aluno` inativo sem role, vínculo aberto, enrollment
   `pendiente`.
2. Individual repetido → sem duplicata; unique provado por insert direto → `QueryException`.
3. Turma `habilitada`/`concluida` → 422 nas 3 escritas (D4).
4. Import **xlsx** (fixture 4 colunas D1) misto: novo + existente mesmo cliente + movido + RUT
   inválido + duplicado na planilha → resumo exato; linhas boas persistidas; erro não aborta.
5. Import **csv** → paridade com xlsx.
6. `moved[]` nomeia cliente anterior (RF-ALU-04).
7. Remoção → soft-delete auditado (via `$model->delete()`); re-matrícula restaura o mesmo `id`.
8. Excesso sobre `contracted_count` → importa e reporta, nunca 422 (D3).
9. **Regressão lição #10:** o teste "linha com erro não aborta as demais" precisa **reprovar**
   contra uma versão com transação global (stash/rode/pop).
10. `migrate` no MySQL de dev + prova e2e curl (lição #12: `Origin` + `Accept`).

## 8. Leis e ADRs tocados

ADR-02 (Actions/Services, testes integração), ADR-08 (auditoria app-only — `Enrollment` Auditable),
ADR-10 (morph alias `enrollment`), ADR-04 (tipos gerados). Leis §5 (aluno não loga — resolver do
6a), §7 (D3), §8 (DoD provado). Nenhuma lei exige quebra.

## 9. Follow-ups (não são 6c)

- Chaves `perm.*` de `operation.turma.enroll` nos 3 locales → 6-frontend (registrar em
  `pendencias.md`).
- `der-fisico.md`: mover `enrollments` para implementadas (inglês, colunas reais) — fechamento.
- 6d: escrita de notas/presença/aprovação + RN-15/16 + manual.
