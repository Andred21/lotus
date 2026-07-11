# Spec — Backend do Comercial: Orçamentos & Cotações (Sprint 2 · Notion 6.1.1–6.1.7)

> Ciclo **backend-only**. O frontend (6.2.1–6.2.4) é ciclo próprio depois, como na Sprint 1
> (cadastros/cursos: backend primeiro, front depois). Cada spec entrega software testável sozinho.

## Propósito

Implementar o núcleo comercial: **orçamento** (`budget`) como agrupador de **cotações**
(`quote`) independentes. Admin cria orçamento p/ cliente → adiciona cotações (1 curso cada) →
superadmin aprova/recusa cada cotação → orçamento aprovado quando ≥1 cotação aprovada, liberando a
Operação (turma) num ciclo futuro. Hoje o domínio `Commercial` só tem `Client`.

## Fonte de verdade

- Drive: `entidade-orcamento.md`, `entidade-cotacao.md`, `modulo-comercial.md`, fluxo
  `FluxoUI_UX-Fluxo 2 — Comercial`.
- ADR-17 (código de rastreio `Scap N` / `Cot N` + `seq_in_budget` atômico), ADR-02 (Actions/Domain
  Services, sem Repository), ADR-08 (auditoria na app, sem trigger), ADR-10 (morph map), ADR-07 (RBAC).
- DER `docs/der-fisico.md` — tabelas `budgets`/`quotes` **planejadas** (nomes PT/ES no rascunho,
  implementadas em inglês, como clients/courses).

## Decisões desta sessão (travadas com o João)

1. **Escopo:** só backend (6.1.x); frontend vira ciclo separado.
2. **`budget.status` e totais = DERIVADOS**, não persistidos. RN-06 (aprovado se ≥1 cotação
   aprovada) e RF-ORC-07 (totais = soma das cotações) são função pura das filhas → computados no
   `BudgetData`/Domain Service. Zero drift, sem trigger (ADR-08). Desvia do DER (que lista as
   colunas `status`/`valor_total`) — DER é planejado/PT e o schema não é final; dropa-se como se
   fez com `clients.rut_empresa`.
3. **Cotação recusada = reabrível:** editar uma cotação `rejected` volta o status a `pending`
   (superadmin reavalia). `seq_in_budget` e o código `Scap-Cot` são preservados. Auditoria registra
   as transições.
4. **Aprovação = procedural + `approved_at`:** aprovar é transição de status + carimbo de tempo; o
   ator vem da auditoria (owen-it). O "aceite do cliente" (RF-COT-06) é asserido pelo humano ao
   aprovar; a referência formal já mora em `purchase_order` (OC). Documento de aceite é **opcional**
   via anexos polimórficos (6.1.7) — não trava a aprovação.

## Schema — inglês (6.1.1)

"Scap"/"Cot" e "UF" preservados como **conteúdo** de dado; nomes de coluna em inglês.

### `budgets`
- `id` PK
- `client_id` FK → `clients` cascade
- `code` varchar UNIQUE — `"Scap {id}"`, imutável, gerado na Action a partir do `id` (ADR-17);
  nunca é FK.
- `payment_terms` varchar(255) nullable — forma de pagamento, **texto livre** (não enum).
- `deleted_at` + timestamps.
- **Sem** `status`, **sem** `valor_total` (derivados — ver Decisão 2).
- Sem índice explícito em `client_id`: o InnoDB já cria um para sustentar a FK
  (padrão das migrations da Sprint 1 — nenhuma indexa coluna de FK à mão).

### `quotes`
- `id` PK
- `budget_id` FK → `budgets` cascade
- `course_id` FK → `courses`
- `seq_in_budget` smallint — contador atômico por orçamento via `lockForUpdate()` em transação
  (ADR-17).
- `student_count` int — quantidade de alunos.
- `planned_start_date` date nullable · `planned_end_date` date nullable.
- `purchase_order` varchar(255) nullable — OC do cliente (ordem de compra).
- `value_uf` decimal(12,4) — valor em UF.
- `status` enum(`pending`,`approved`,`rejected`) default `pending`.
- `approved_at` timestamp nullable.
- `deleted_at` + timestamps.
- **UNIQUE(`budget_id`, `seq_in_budget`)** (defesa extra do contador — ADR-17); índices `budget_id`,
  `status`.

**`quotes.client_id` NÃO é persistido.** É sempre `= budget.client_id` (a cotação pertence ao mesmo
cliente do orçamento) → deriva-se via a relação `budget`, evitando drift. O DER lista a coluna; é
rascunho planejado, dropa-se como `rut_empresa`.

## Models + relações (6.1.2)

- `Budget` — `Model` + `SoftDeletes` + `Auditable`. `belongsTo client`, `hasMany quotes`,
  `morphMany files`.
- `Quote` — `Model` + `SoftDeletes` + `Auditable`. `belongsTo budget`, `belongsTo course`,
  `morphMany files`. Acessor `client` via `budget` (não coluna).
- Morph aliases `budget` e `quote` no `enforceMorphMap` do `AppServiceProvider` (ADR-10).
- **Soft-delete de `Budget` cascateia p/ `quotes`** (evento `deleting`, guard `isForceDeleting` —
  padrão codificado na Sprint 1). Deletar cotação individual não toca o orçamento.

## DTOs + enum (6.1.3)

- Enum `QuoteStatus` (`pending`/`approved`/`rejected`) com `#[TypeScript]`.
- `QuoteData`: `id`, `budget_id`, `course_id`, `seq_in_budget`, `student_count`,
  `planned_start_date`, `planned_end_date`, `purchase_order`, `value_uf`, `status`, `approved_at`,
  e `code` **calculado** `"Scap {budget.id} - Cot {seq_in_budget}"` (accessor/DTO, nunca persistido
  — ADR-17).
- `BudgetData` com derivados computados (via Domain Service):
  - `status`: `approved` se ≥1 quote `approved`; `rejected` se há quotes e **todas** `rejected`;
    senão `pending` (inclui orçamento sem cotações e com cotações pendentes).
  - `total_value_uf` = Σ `value_uf` de **todas** as quotes ativas (não deletadas), independentemente
    do status — reflete a proposta corrente inteira. Simplicidade a ~10 users; um `approved_total`
    separado é YAGNI hoje.
  - `total_students` = Σ `student_count` das quotes ativas.
  - `quotes`: `QuoteData[]` (eager-load p/ evitar N+1).
- Regenerar `frontend/src/shared/types/generated.ts` (`typescript:transform`) — contrato pronto p/
  o ciclo frontend, mesmo sem UI ainda (ADR-04).

## Actions + Domain Service (6.1.4–6.1.6)

- `CreateBudgetAction` — cria orçamento p/ cliente; gera `code = "Scap {id}"` **dentro da
  transação** (insert → set code). `payment_terms` opcional.
- `CreateQuoteAction` (**CriarCotacaoAction**, 6.1.4) — cria cotação sob um orçamento: 1 curso;
  `seq_in_budget` atômico via `lockForUpdate()` no `MAX(seq)+1` do orçamento, em transação. Cliente
  vem do orçamento (não é input). Status inicial `pending`.
- `UpdateQuoteAction` — edita cotação `pending` ou `rejected`; se `rejected`, o update **reabre p/
  `pending`** (Decisão 3). Cotação `approved` é **imutável** por esta Action (editar desincroniza a
  futura turma) — tentativa retorna 422 via `ValidationException::withMessages` (ADR-03), nunca
  `abort`.
- `ApproveQuoteAction` (**AprovarCotacaoAction**, 6.1.5) — `status = approved`, `approved_at = now()`.
- `RejectQuoteAction` — `status = rejected`, `approved_at = null`.
- **Domain Service (6.1.6)** — `BudgetSummaryService` (ou accessors do `Budget`): centraliza a
  derivação do status agregado (RN-06) e as somas (RF-ORC-07), consumida pelo `BudgetData`. Lado
  leitura, sem trigger (ADR-08). É a "regra de aprovação do orçamento + cálculo" da task.

## Controllers + rotas + RBAC (dentro de 6.1.4–6.1.5)

Controllers deixam exceções subirem ao handler global (RFC 7807 — ADR-03). RBAC via `HasMiddleware`
(`permission:` do spatie), padrão dos cadastros da Sprint 1.

- `BudgetController` — apiResource `budgets` (index/store/show/update/destroy).
  Middleware `commercial.budget.{view|create|update|delete}`.
- `QuoteController` — nested `budgets/{budget}/quotes` (index/store) + `quotes/{quote}`
  (show/update/destroy). Middleware `commercial.quote.{view|create|update|delete}`.
- Aprovação — `POST quotes/{quote}/approve` e `POST quotes/{quote}/reject`. Middleware
  `commercial.quote.approve`.
- Rotas no `app/Domains/Commercial/routes.php` existente.

**Seeder (`RolePermissionSeeder`):** adiciona
`commercial.budget.{view,create,update,delete}` + `commercial.quote.{view,create,update,delete,approve}`.
- **superadmin:** todas (inclui `approve`).
- **admin:** todas **menos** `commercial.quote.approve`.
- **redator:** nenhuma.
- `forgetCachedPermissions()` após o seed (ADR-07).

*(Doc `[CONFIRMADO]`: superadmin aprova cotações/orçamentos; admin configura os aprovados na
Operação.)*

## Anexos polimórficos (6.1.7)

Reusa a tabela `files`, `UploadFileAction` e o padrão de endpoint nested de documento da Sprint 1
(replace + soft-delete + checagem de posse `fileable_type`/`fileable_id`).
- `budgets/{budget}/files` — tipos `invoice` (fatura) e `receipt` (comprovante).
- `quotes/{quote}/files` — tipo `quote_document` (documento da cotação / aceite).
- Financeiro é **registro/histórico — NUNCA bloqueia ação** (RN-14, lei §7 do CLAUDE.md). A
  aprovação de cotação não exige anexo.
- Task **independente** das demais — última do ciclo.

## Erros

RFC 7807 via handler global (ADR-03). Validação = `ValidationException::withMessages([...])`, nunca
`abort(422)` nem erro à mão. Casos: cotação aprovada imutável (422); recurso inexistente (404 via
SubstituteBindings); sem permissão (403 via middleware).

## Testes / DoD (ADR-02)

Integração sqlite `:memory:` (não mock). Cobrir:
- `CreateBudgetAction` → `code == "Scap {id}"`.
- `CreateQuoteAction` → `seq_in_budget` incrementa 1,2,3…; UNIQUE(`budget_id`,`seq`) barra
  duplicata; cliente derivado do orçamento.
- `ApproveQuoteAction` (superadmin) → cotação `approved`, `approved_at` setado, e o `BudgetData`
  derivado vira `approved`.
- `RejectQuoteAction` em todas as cotações → `BudgetData` vira `rejected`.
- `UpdateQuoteAction` sobre `rejected` → volta a `pending`; sobre `approved` → 422.
- Somas: `total_value_uf` / `total_students` corretos.
- `code` calculado do `QuoteData` = `"Scap {id} - Cot {seq}"`.
- RBAC: admin → 403 em `approve`; redator → 403 em todas; superadmin → OK.
- Anexo: upload em budget/quote persiste em `files` com o `type` certo; delete cross-recurso → 404.
- Soft-delete de budget cascateia p/ quotes.

**DoD** = suíte verde no container (`docker compose exec -T app php artisan test`) + `pint` limpo
(só arquivos tocados) + `generated.ts` regenerado. **Sem verificação de browser** — é o ciclo
frontend.

## Fora de escopo (ciclos futuros)

- Frontend 6.2.1–6.2.4 (hooks `useBudgets`/`useQuotes`, tela de orçamento, wizard de cotação, UI de
  aprovação).
- Turma / Operação (a cotação aprovada vira turma) — módulo não existe.
- `approved_total` separado no `BudgetData` (YAGNI).

## Leis / ADRs relevantes

- **ADR-02:** Actions + Domain Service; sem Repository; testes de integração.
- **ADR-17:** `code` gerado do `id` na Action; `seq_in_budget` atômico com `lockForUpdate`; código
  composto calculado, nunca persistido; `id` continua a FK.
- **ADR-08:** derivação e mutação pela app; sem trigger; models `Auditable` mudam via
  `$model->delete()`.
- **ADR-10:** morph aliases `budget`/`quote`.
- **ADR-07:** RBAC via seeder + middleware; `forgetCachedPermissions()`.
- **ADR-03:** erros RFC 7807; `ValidationException::withMessages`.
- **ADR-04:** DTOs = fonte dos tipos; `generated.ts` regenerado, nunca editado à mão.
- **Lei §7:** financeiro nunca bloqueia ação.
