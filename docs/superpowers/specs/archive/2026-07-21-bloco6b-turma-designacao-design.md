# Bloco 6b · Sprint 3 — Turma + designação de redator (backend) — Design

> Data: 2026-07-21. Backend only. Main tree (P-03), não worktree.
> Fontes de regra (Drive `V2/Planejamento`, canônico): `entidade-turma.md`,
> `modulo-operacao.md`, `requisitos-negocio.md` (RF-TUR-01..07, RN-07/08/09/15/16, RF-RED-08).
> Decisões de negócio do João nesta sessão registradas em §2.

## Papel na solução

Transforma **cotação aprovada** em **turma** — a instância operacional de um curso. A turma
nasce por ação explícita do admin sobre uma cotação aprovada (não no ato do approve), liga
curso e período, e recebe um ou mais redatores por designação com gate de idoneidade (RN-09).
É a fundação da fase operacional: 6c (matrícula/import) e 6d (conclusão/manual) constroem sobre ela.

## 1. Fronteira do bloco

**Dentro:**
- Migration `turmas` + pivot `turma_redator`.
- `Turma` model (satisfaz o placeholder do morph map já fiado em `AppServiceProvider`).
- Enums `TurmaStatus`, `TurmaModalidade`.
- Criar turma a partir de cotação aprovada (config: modalidade, local, datas).
- Designar / remover redator com gate RN-09 (`RedatorIdoneidadeService`).
- REST + `TurmaData` tipado (`#[TypeScript]`, regen `generated.ts`).
- Prova e2e contra **MySQL** (lição #15).

**Fora (outros blocos — não implementar):**
- Import / matrícula de alunos → 6c.
- Manual Blade sob demanda (RF-TUR-04) → 6d.
- Transições `habilitada` / `concluida` + blindagem RN-15/RN-16 → 6d.
- Qualquer tela → 6-frontend.
- Feedbacks (RF-FBK) → sprint futura.

## 2. Decisões de negócio (fonte + João, 2026-07-21)

| # | Decisão | Fundamento |
|---|---------|-----------|
| D1 | **Turma nasce por passo manual**, não no approve. Cotação aprovada sem turma fica numa fila de "pendências de configuração". | RF-TUR-01 + `modulo-operacao.md`. RN-07 lido como "fica pronta para configurar", não "cria sozinha". |
| D2 | **Designação é passo separado.** Turma pode existir sem redator. | 2 telas distintas em `modulo-operacao.md` (Config vs Designação). |
| D3 | **Gate RN-09 = REUF válido + habilitação ao curso.** CV/TÍTULO não bloqueiam designação. | João, 2026-07-21. REUF é o regulatório de habilitação elétrica. |
| D4 | **`valid_until` nulo = vale sempre.** Válido = doc presente E (`valid_until` null OU `>= today`). Só vencido reprova. | João, 2026-07-21. |
| D5 | **N:N redator↔turma** (pivot `turma_redator`), não FK simples. | João, 2026-07-21. Cobre a premissa "ocasionalmente mais de 1 redator". **Diverge do der-fisico** (`redator_id` FK) — reconciliar na doc-sync. |

## 3. Schema (migration)

```
turmas
  id                bigint PK
  quote_id          FK → quotes, UNIQUE, RESTRICT      -- 1:1, cotação não some com turma viva
  course_id         FK → courses                       -- derivado da quote no servidor
  modalidade        enum('presencial','online')
  local_aplicacao   varchar(255) NULL                  -- exigido só se presencial (validação DTO)
  start_date        date                               -- prevista; própria da turma (RF-TUR-02)
  end_date          date                               -- prevista
  status            enum('em_andamento','habilitada','concluida') default 'em_andamento'
  created_at, updated_at, deleted_at
  índice: status

turma_redator                                          -- N:N (D5)
  id                bigint PK
  turma_id          FK → turmas, CASCADE
  redator_id        FK → redatores, RESTRICT           -- redator com turma não some (lição #15)
  created_at, updated_at
  UNIQUE(turma_id, redator_id)
```

Notas:
- `course_id` **nunca vem do payload** — o servidor lê `quote->course_id` no `CreateTurmaAction`
  (integridade: a turma aplica o curso da cotação, ponto).
- `RESTRICT` no `redator_id` do pivot e no `quote_id`: espelha a lição #15 (coluna/FK de peso
  operacional não cascateia). Sem coluna gerada aqui, então o RESTRICT é limpo no InnoDB.
- `status` nasce `em_andamento`. As outras transições são 6d — este bloco não as implementa.

## 4. Domínio — `app/Domains/Operation/`

### `Models/Turma.php`
- `SoftDeletes` + `Auditable` (owen-it), `$auditInclude` com todas as colunas de negócio.
- `$casts`: `modalidade` → `TurmaModalidade`, `status` → `TurmaStatus`, datas → `date`.
- Relations: `quote()` (belongsTo), `course()` (belongsTo), `redatores()` (belongsToMany via
  `turma_redator`, `withTimestamps`), `files()` (morphMany — manual futuro, morph key `turma`).
- Satisfaz o placeholder já registrado em `AppServiceProvider::enforceMorphMap` (`'turma'`).

### `Enums/TurmaStatus.php`
`EmAndamento='em_andamento'`, `Habilitada='habilitada'`, `Concluida='concluida'`.

### `Enums/TurmaModalidade.php`
`Presencial='presencial'`, `Online='online'`.

## 5. Gate de idoneidade — `Services/RedatorIdoneidadeService`

Fonte única de "este redator pode assumir esta turma". Reusável pelo picker do 6-frontend
(listar só os elegíveis). Método:

```
assertEligible(Redator $r, Course $c): void
  1. Habilitação (course_redator): $c->redatores()->whereKey($r->id)->exists()?
     senão → lança RedatorNaoElegivelException (422, RFC 7807)
  2. RN-09 (D3/D4): REUF ativo?
     $r->documents()
       ->where('type', RedatorDocumentType::REUF->value)   -- soft-delete já filtra os removidos
       ->where(fn($q) => $q->whereNull('valid_until')->orWhereDate('valid_until','>=',today()))
       ->exists()?
     senão → lança RedatorNaoElegivelException (422)
```

- Exceção de domínio dedicada; mensagem distinta por causa (não-habilitado vs REUF ausente/vencido)
  para o front diferenciar. Sobe pelo handler global RFC 7807 — **nunca `abort()`** (lei §4).
- Método-espelho `isEligible(Redator, Course): bool` (sem throw) para o futuro filtro do picker.

## 6. Actions — `app/Domains/Operation/Actions/`

### `CreateTurmaAction`
```
execute(Quote $quote, TurmaData $data): Turma
  - guard: $quote->status === QuoteStatus::Approved       senão → 422 (cotação não aprovada)
  - guard: $quote->turma()->doesntExist()                 senão → 422 (turma já existe)
  - course_id := $quote->course_id                        (ignora qualquer course_id do payload)
  - cria Turma { quote_id, course_id, modalidade, local_aplicacao, start_date, end_date,
                 status: EmAndamento }
  - DB::transaction
```
`quote->turma()` = hasOne inverso; adicionar a relation em `Quote` (`hasOne(Turma::class)`).

### `DesignateRedatorAction`
```
execute(Turma $turma, Redator $redator): Turma
  - $idoneidade->assertEligible($redator, $turma->course)
  - $turma->redatores()->syncWithoutDetaching([$redator->id])   -- unique protege duplicata
  - retorna $turma->load('redatores')
```
1 redator por chamada. Multi-redator = múltiplas chamadas. `syncWithoutDetaching` é idempotente.

### `RemoveRedatorAction`
```
execute(Turma $turma, Redator $redator): Turma
  - $turma->redatores()->detach($redator->id)
  - retorna $turma->load('redatores')
```

## 7. HTTP

### `Data/TurmaData.php` (spatie/laravel-data, `#[TypeScript]`)
- Campos: `id`, `quote_id`, `course_id`, `modalidade`, `local_aplicacao`, `start_date`,
  `end_date`, `status`, `redatores` (lista tipada mínima — `id` + nome via user, read-only).
- `rules()` / atributos de validação:
  - `modalidade` `in:presencial,online` required.
  - `local_aplicacao` `required_if:modalidade,presencial`, senão nullable opcional (João:
    não forçar `null` no `online` — valor eventual sobrando é aceitável).
  - `start_date` / `end_date` date required; `end_date >= start_date`.
  - **sem** `course_id` no input (derivado). `quote_id` vem da rota, não do corpo.
- `fromModel(Turma)` para saída.
- Regen: `php artisan typescript:transform` → `generated.ts` (lei §3, não editar à mão).

### `Http/Controllers/TurmaController.php` (`HasMiddleware`)
```
middleware:
  operation.turma.view          → index, show
  operation.turma.create        → store
  operation.turma.update        → update
  operation.turma.delete        → destroy
  operation.turma.assign_redator→ designateRedator, removeRedator

index()                         → array<TurmaData>          (lista turmas)
store(TurmaData, Quote, Create) → TurmaData                 (POST quotes/{quote}/turma)
show(Turma)                     → TurmaData
update(TurmaData, Turma, Update)→ TurmaData                 (dados básicos: modalidade/local/datas)
destroy(Turma, Delete)          → 204
designateRedator(Turma, Redator, Designate) → TurmaData
removeRedator(Turma, Redator, Remove)       → TurmaData
```
`UpdateTurmaAction` cobre só os campos básicos (modalidade/local/datas) — não mexe em status
(6d) nem em course/quote (imutáveis pós-criação).

### `routes.php` (novo — auto-carregado pelo glob de `routes/api.php`)
```php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('turmas', [TurmaController::class, 'index']);
    Route::get('turmas/{turma}', [TurmaController::class, 'show']);
    Route::post('quotes/{quote}/turma', [TurmaController::class, 'store']);
    Route::put('turmas/{turma}', [TurmaController::class, 'update']);
    Route::delete('turmas/{turma}', [TurmaController::class, 'destroy']);
    Route::post('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'designateRedator']);
    Route::delete('turmas/{turma}/redatores/{redator}', [TurmaController::class, 'removeRedator']);
});
```

## 8. Definition of Done — comportamento provado contra MySQL (lição #15)

Feature test roda **no container contra MySQL** (não só sqlite `:memory:` — a lição #15 do 6a
mostrou que só o MySQL real pega constraint de FK). Cobre:

1. Criar turma de quote aprovada → 201 + persistida `em_andamento`.
2. `course_id` da turma = `course_id` da quote, **mesmo se o payload mandar outro** (ignora input).
3. Quote **não aprovada** → 422.
4. Quote que **já tem turma** → 422 (viola unique 1:1).
5. `local_aplicacao` ausente com `modalidade=presencial` → 422.
6. Designar redator idôneo (habilitado + REUF válido) → pivot criado.
7. **Redator sem REUF** → 422.
8. **Redator com REUF vencido** (`valid_until` no passado) → 422.
9. Redator com REUF `valid_until` **nulo** → passa (D4).
10. Redator **não habilitado** ao curso (sem `course_redator`) → 422.
11. Designação idempotente (2ª chamada não duplica no pivot).
12. Remover redator → detach.
13. Deletar turma (soft) não apaga o redator (RESTRICT respeitado / redator sobrevive).

## 9. Divergências a reconciliar (doc-sync futura)

João (2026-07-21): **registrar em `pendencias.md`, não fechar a doc no 6b.** O plano inclui uma
task que adiciona a pendência:
- **der-fisico**: `turmas.redator_id` FK → agora é pivot `turma_redator` N:N (D5). Atualizar a
  linha de `turmas` e a relação `redatores 1:N → turmas`.
- **der-fisico** lista `turmas` em "PLANEJADAS"; mover para implementadas com nomes em inglês
  finais e colunas reais.
