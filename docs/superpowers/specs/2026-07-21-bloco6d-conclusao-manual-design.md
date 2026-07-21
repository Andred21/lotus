# Bloco 6d · Sprint 3 — Conclusão + manual (backend) — Design

> Data: 2026-07-21. Backend only. Main tree (P-03), não worktree.
> Fontes de regra (Drive `V2/Planejamento`, canônico): `entidade-turma.md`,
> `modulo-operacao.md`, `requisitos-negocio.md` (RF-TUR-04/06/07, RF-RED-07, RN-15/16, RN-02).
> Decisões de negócio do João nesta sessão registradas em §2.

## Papel na solução

Fecha o ciclo operacional da turma: a documentação obrigatória **habilita** (RN-16, estado
derivado), o admin **confirma a conclusão** (ato terminal, com rastro), e a turma encerrada fica
**blindada** contra escrita acadêmica (RN-15, mecanismo). Também entrega o manual de classe sob
demanda (RF-TUR-04) — HTML Blade → PDF via Gotenberg, estreando o caminho que a Certificação
(Sprint 4) reusa. Turma `concluida` é o pré-requisito da emissão de certificados (RN-08).

## 1. Fronteira do bloco

**Dentro:**
- Migration: enum `turmas.status` → `('em_andamento','concluida')` + `concluded_at`.
- Documentos da turma: upload / listagem / remoção (`files` polimórfica, tipo por enum).
- `TurmaHabilitacaoService` (RN-16 derivada) + `assertAcademicallyWritable` (RN-15 mecanismo).
- `ConcludeTurmaAction` (terminal) + rota `POST turmas/{turma}/conclude`.
- Manual PDF sob demanda: Blade única + `ManualPdfService` (Gotenberg).
- 2 permissões novas (`operation.turma.docs_manage`, `operation.turma.conclude`) no
  catálogo/seeder.
- `TurmaData` estendido (`habilitada`, `missing_document_types`, `concluded_at`) +
  `TurmaDocumentData`; regen `generated.ts` com consumidores ajustados no mesmo commit (lição #11).
- Prova e2e contra **MySQL + Gotenberg reais** (lição #15).

**Fora (não implementar):**
- Endpoint de escrita de notas/presença/`approval_status` → sprint do redator (D3). Nasce já
  protegido pelo guard RN-15.
- Reversão de conclusão (D5 — terminal; caso raro se resolve via suporte/BD com auditoria).
- Feedbacks (RF-FBK) → sprint futura.
- Template de manual por curso (RF-CUR-04) → divergência registrada em §8; a stack do módulo
  fechou "padronizado" (`modulo-operacao.md`).
- Qualquer tela → 6-frontend.

## 2. Decisões de negócio (fonte + João, 2026-07-21)

| # | Decisão | Fundamento |
|---|---------|-----------|
| D1 | **Escopo A**: 6d entrega upload de doc da turma agora, agnóstico de quem chama — hoje o admin secretaria o redator; a sprint do redator só muda quem tem a permissão. | João. Sem isso, RN-16 nasceria improvável (interface do redator é sprint futura). |
| D2 | **RN-16 exige 3 tipos**: `MANUAL`, `PRUEBAS`, `EVALUACION_REDATOR` — ≥1 arquivo ativo de **cada**. Feedback do cliente fica fora (é da OS, módulo futuro). | RF-RED-07 literal; João. |
| D3 | **`habilitada` é derivada em runtime, não persistida.** Coluna `status` guarda só `em_andamento`/`concluida`. | João. Mesmo padrão do Budget (status derivado, Bloco 0) — sem 2ª fonte de verdade que dessincroniza quando um doc some. |
| D4 | **Endpoint de notas fica fora**; 6d entrega só o guard RN-15 e o aplica nos caminhos existentes. Admin não ganha caminho de nota (RN-02). | João. |
| D5 | **Conclusão é terminal** — sem endpoint de reversão. | João. Blindagem RN-15 em setor regulado > conveniência de undo. |
| D6 | **Manual = Blade única padronizada no repo**, não template por curso. | João + `modulo-operacao.md` ("de forma padronizada"). |
| D7 | **Saída do manual = PDF via Gotenberg**, stream, não materializado. | João. Manual é impresso/assinado em campo e volta escaneado; Sprint 4 reusa o caminho. |
| D8 | **N arquivos por tipo; remoção individual.** Sem replace-por-tipo (molde do redator não se aplica: provas dos alunos são plural real). | João. |

## 3. Schema (migration)

```
turmas (ALTER)
  status        enum('em_andamento','concluida') default 'em_andamento'   -- sai 'habilitada' (D3)
  concluded_at  timestamp NULL                                            -- rastro do ato do admin
```

Notas:
- Nenhum registro tem `habilitada` (o valor nunca foi escrito — 6b só criava `em_andamento`);
  o ALTER do enum é seguro. `down()` restaura o enum de 3 valores e derruba `concluded_at`.
- Documentos da turma **não têm tabela própria**: vão na `files` polimórfica existente
  (`fileable_type='turma'`, morph alias já registrado; `Turma::files()` já existe do 6b).
- Prova contra MySQL real obrigatória (lição #15): `ALTER` de enum é DDL que o sqlite finge.

## 4. Domínio — `app/Domains/Operation/`

### `Enums/TurmaDocumentType.php`
`MANUAL='MANUAL'`, `PRUEBAS='PRUEBAS'`, `EVALUACION_REDATOR='EVALUACION_REDATOR'`.
Caixa alta espelha `RedatorDocumentType`. Vive no domínio — o `type` da `files` é string livre;
o enum só rotula/restringe os docs de turma.

### `Services/TurmaHabilitacaoService.php` — fonte única RN-16
```
isHabilitada(Turma): bool      -- status EmAndamento && missingTypes() vazio
missingTypes(Turma): array     -- tipos (value) sem nenhum file ativo; soft-deletados não contam
```
Consumida por `ConcludeTurmaAction` (gate) e `TurmaData::fromModel` (projeção pro front).
1 query (`files()` agrupado por type), não N.

### `Models/Turma.php` — mecanismo RN-15
```
assertAcademicallyWritable(): void
  status === Concluida → ValidationException::withMessages(['turma' => ...])  (422, RFC 7807)
```
Chamado por **toda** escrita acadêmica: `StoreTurmaDocumentAction`, `DeleteTurmaDocumentAction`
(6d) e o futuro endpoint de notas (sprint do redator — já nasce protegido). Matrícula/import/
remoção já são bloqueados pelo gate D4 do 6c (só `em_andamento`), que continua como está.
Ganha também `concluded_at` em `$casts` (`datetime`) e no `$auditInclude` (junto com `status`).

### `Actions/StoreTurmaDocumentAction.php`
```
execute(Turma, TurmaDocumentType, UploadedFile): File
  - $turma->assertAcademicallyWritable()
  - return $uploads->execute($turma, $file, $type->value)      -- UploadFileAction (Shared)
```
Append puro — sem replace (D8). Sem `valid_until` (doc de turma não vence).

### `Actions/DeleteTurmaDocumentAction.php`
```
execute(Turma, File): void
  - $turma->assertAcademicallyWritable()
  - $file->delete()        -- por instância (lição #5: builder->delete() não audita)
```
O pertencimento file↔turma é resolvido na rota (scoped binding) — a Action confia no binding.

### `Actions/ConcludeTurmaAction.php`
```
execute(Turma): Turma      -- DB::transaction
  - guard: status === EmAndamento          senão 422 ("já concluída")
  - guard: habilitacao->isHabilitada()     senão 422 com missingTypes() na mensagem/errors
  - status := Concluida; concluded_at := now(); save
```
Terminal (D5). Auditado pelo owen-it (update de `status`/`concluded_at`).

## 5. Manual — RF-TUR-04

### `Services/ManualPdfService.php`
```
render(Turma): string   -- bytes do PDF
  1. view('operation.manual-turma', [dados]) → HTML
  2. POST multipart p/ {GOTENBERG_URL}/forms/chromium/convert/html (Http::attach, files[]=index.html)
  3. retorna o corpo (PDF); falha do Gotenberg → exceção → 500 RFC 7807 (sem retry — ~10 users)
```
`GOTENBERG_URL` novo no `config/services.php` + `.env`/`.env.example`
(`http://gotenberg:3000` no compose).

### `resources/views/operation/manual-turma.blade.php`
Blade única versionada (D6). Dados **atuais** no ato do GET (não materializado, D7 — mesmo
racional do RF-CER-03): turma (modalidade, local, datas, status), curso (nomes, carga horária,
módulos ordenados com objetivos/tópicos/horas), cliente (via `quote->budget->client`), redatores
designados, alunos matriculados ativos (nome + RUT formatado, sem trashed). CSS inline
print-friendly. Sem asset externo (Gotenberg renderiza isolado).

### Endpoint
`GET turmas/{turma}/manual` → `application/pdf` inline (`manual-turma-{id}.pdf`). Sem
`#[TypeScript]` — resposta binária. Disponível em qualquer status (manual serve durante a
aplicação; concluída ainda pode reimprimir).

## 6. HTTP

### Permissões (novas no `PermissionCatalog` + seeder)
- `operation.turma.docs_manage` — upload/remoção de documentos da turma.
- `operation.turma.conclude` — confirmar conclusão. **Segregada do `update` de propósito**: é o
  ato de peso legal (RN-16); role customizada pode dar update sem dar conclude.
- Chaves i18n `perm.*`/`permGroup.*` das 2 → **pendência** (junta com P-07, entrega no
  6-frontend).

### `Http/Controllers/TurmaDocumentController.php` (`HasMiddleware`)
```
GET    turmas/{turma}/documents           operation.turma.view          → array<TurmaDocumentData>
POST   turmas/{turma}/documents           operation.turma.docs_manage   → TurmaDocumentData (201)
DELETE turmas/{turma}/documents/{file}    operation.turma.docs_manage   → 204
```
- POST multipart: `type` (`in:` valores do enum) + `file` (`mimes:pdf`, max 10MB — molde do
  upload do redator). Validação via FormRequest/inline no controller como o
  `RedatorDocumentController` fizer (seguir o molde existente).
- DELETE com `scopeBindings()`: `{file}` resolvido por `$turma->files()` — cross-turma → 404
  (padrão 6c). File de outro fileable nunca aparece.

### `TurmaController` (existente) — adições
```
POST turmas/{turma}/conclude              operation.turma.conclude      → TurmaData (200)
GET  turmas/{turma}/manual                operation.turma.view          → PDF stream
```
`conclude` retorna 200 com `TurmaData` atualizado (padrão do `designateRedator` 6b: ação sobre
recurso existente → 200, não 201).

### DTOs
- `TurmaData` (existente) ganha: `habilitada: bool`, `missing_document_types: string[]`,
  `concluded_at: ?string` — projetados no `fromModel` via `TurmaHabilitacaoService`.
- `TurmaDocumentData` (`#[TypeScript]`): `id`, `type`, `name` (original), `size`, `created_at`.
- Regen `generated.ts` + consumidores ajustados no mesmo commit (lição #11) + `pnpm build` verde.

## 7. Definition of Done — comportamento provado

### Suíte (sqlite `:memory:`)
1. Upload de cada um dos 3 tipos → 201, file com `type` correto ligado à turma.
2. Tipo fora do enum → 422; não-PDF → 422.
3. Listagem devolve só docs ativos da turma.
4. Delete individual → 204 soft; **doc soft-deletada não conta** pra RN-16.
5. `missing_document_types` no `TurmaData` reflete o que falta; some ao completar.
6. Concluir com doc incompleta → 422 apontando os tipos faltantes.
7. Concluir habilitada → 200, `status=concluida`, `concluded_at` preenchido.
8. Concluir 2ª vez → 422.
9. **RN-15**: upload e delete pós-conclusão → 422 — regressão vista **falhar** contra o código
   sem o guard (lição #10).
10. DELETE cross-turma → 404 (scoped binding).
11. Sem permissão (`docs_manage`/`conclude`) → 403.
12. Manual: service renderiza com Gotenberg fake (`Http::fake`) e o request contém o HTML; o
    conteúdo do Blade (curso, módulos, alunos) é asserido no HTML renderizado.

### Prova real (gate — MySQL + Gotenberg + nginx/Sanctum)
- `migrate` do ALTER de enum passa no MySQL 8 (lição #15) e `SHOW CREATE` confirma o enum de 2
  valores + `concluded_at`.
- e2e cookie/CSRF: upload 3 tipos → `GET turmas/{id}` com `habilitada=true` → `conclude` 200 →
  upload extra 422 (RN-15) → `GET manual` devolve bytes `%PDF` com **Gotenberg real** do compose.

## 8. Divergências a registrar (pendencias.md, não fechar aqui)

- **RF-CUR-04** ("curso cadastrado com seu template de Manual") vs implementado (Blade única
  padronizada, D6; schema só tem `course_certificate_templates`). Gatilho: se o contratante pedir
  manual por curso.
- Chaves i18n das 2 permissões novas → **anexar à P-07** (mesmo gatilho: 6-frontend).
