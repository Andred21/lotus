# Spec — Arquivados e restauração nos roots restantes

**Work item:** `arquivados-roots-restantes` · **Data:** 2026-08-18 · **Branch:** `feat/arquivados-roots-restantes` (de `feat/arquivados-e-restauracao@6fd0ad8`)
**Context Packet:** `context-packets/2026-08-18-arquivados-e-restauracao.md` (herdado — cobre os 8 aggregate roots)
**Molde:** `specs/archive/2026-08-18-arquivados-e-restauracao-design.md` (D1–D11 valem e não se reabrem)
**Fontes externas:** Notion H.5.1–H.5.4 e H.3.1; pasta Drive `1ulKEELHIUIyAnpmqzsthzxeFwBZIVUu3` (sem documento funcional do bloco)

## 1. O que este bloco é

Replicação do molde nos seis roots restantes — **e os gates que a replicação revelou.**

O item 1 de "Próximos blocos" (`backlog.md:101`) previa "ligar os hooks, a Action, o endpoint e a
tela, não reescrever a semântica". A medição sobre `6fd0ad8` confirmou isso para `Budget`, `User` e
`Redator`, e o derrubou para os outros três:

- **`Turma`** tem um conflito de UNIQUE **alcançável** no restore, **não tem cascata nenhuma** e
  exige mudar um caminho de leitura que decide **emissão de certificado**.
- **`Quote`** e **`Enrollment`** não têm lista de topo: vivem dentro do detalhe do pai, superfície
  que o molde não tem.
- **`Redator`** não tem Action nenhuma — o controller chama `$redator->delete()` cru.

O lado do arquivar existe em cinco dos seis; o que não existe, em nenhum, é o **restore**.

## 2. Escopo

**Dentro, em três fases:**

| Fase | Módulo | Roots |
|---|---|---|
| 1 | Commercial | `Budget`, `Quote` |
| 2 | Identity | `User` (staff), `Redator` |
| 3 | Operation | `Turma`, `Enrollment` |

Um DoD no fim, não um por fase. As fases ordenam a execução; não são blocos.

**Fora, declarado:**

- **`Student`** — não tem `destroy` hoje (`Identity/routes.php:46` é `apiResource` com
  `index/store/show/update`). Dar-lhe um é superfície nova com regra a inventar, não replicação.
  Declarado fora pela própria linha 101 do backlog.
- `forceDelete` e exclusão permanente (não-goal da H.5.1–H.5.4).
- Painel de histórico de auditoria por registro.
- **Renomear as Actions `Delete*` para `Archive*`.** O molde criou `ArchiveCourseAction` enquanto
  `DeleteClientAction`, `DeleteBudgetAction`, `DeleteQuoteAction`, `DeleteTurmaAction` e
  `DeleteStaffUserAction` mantiveram o nome antigo. A inconsistência fica **registrada e não
  corrigida**: são cinco Actions mais os testes delas, e renomear não muda comportamento.
- **`Student::deleting`** segue com `$student->user?->delete()` cru, sem marca. `Student` não ganha
  restore neste bloco, então a marca no filho não teria consumidor.

## 3. Decisões

### D1 — o restore de `Turma` tem gate de conflito, e ele é de banco

`turmas.active_quote_id` é coluna **gerada STORED** `CASE WHEN deleted_at IS NULL THEN quote_id END`,
com `UNIQUE`. O comentário da migration diz o desenho em texto: *"turma deletada (NULL) não bloqueia
recriar"*. E `CreateTurmaAction:25` checa `$quote->turma()->exists()` sobre um `hasOne` **sem
`withTrashed`** (`Quote.php:81`).

Sequência alcançável hoje:

```
arquivo turma A (cotação Q) → crio turma B da mesma Q (permitido) → restauro A
    → active_quote_id = Q nas duas → SQLSTATE[23000] → 500
```

`RestoreTurmaAction` checa `$turma->quote->turma()->exists()` **antes** de restaurar e recusa com
`ValidationException` → 422.

**Isto escreve a primeira mensagem de validação nova do bloco e reabre a D-07** (idioma canônico de
mensagem de erro, travado em decisão do João). O molde tinha ficado fora dela de propósito; aqui não
dá — deixar o banco recusar significa 500 numa operação de usuário sobre dado com peso legal.

**Contraste medido, e ele importa:** `seq_in_budget` da cotação **não** tem esse problema.
`CreateQuoteAction:22` deriva com `Quote::withTrashed()->max('seq_in_budget') + 1`, então cotação
arquivada continua ocupando o número e o restore nunca colide. A D4 do molde ("conflito de
unicidade não é alcançável") continua verdadeira para `Client`, `Course` e `Quote`; é falsa só para
`Turma`.

### D2 — `Turma` ganha a cascata que nunca teve

`Turma` e `Enrollment` **não têm `booted()`**, ao contrário de `Client`, `Course`, `Budget`,
`Redator` e `Student`. Arquivar uma turma hoje deixa matrículas e documentos **ativos** sob um pai
que ninguém mais alcança — o mesmo modo de falha que a `DeleteClientAction` existe para impedir.

`Turma` ganha `deleting`/`restored` com `markAndDelete`/`restoreAndUnmark` sobre `enrollments` e
`files`.

**O pivot `turma_redator` fica fora.** Ele não tem `deleted_at`, e designação não é registro com
ciclo de vida próprio: desfazê-la e refazê-la faria o `auditSync` da designação registrar remoção
que ninguém pediu.

### D3 — `Redator` ganha gate, e a relação de turma muda

`RedatorController:53-58` chama `$redator->delete()` cru. Nasce `ArchiveRedatorAction`, que recusa
com 422 se o redator tiver turma **em andamento** — trabalho pendente não some da operação sem aviso.

**E `Turma::redatores()` passa a `withTrashed()`.** Sem isso o arquivamento de um redator é uma falha
silenciosa com peso legal. O pivot não tem `deleted_at` e a relação é `belongsToMany` sem
`withTrashed` (`Turma.php:82`), então a linha do pivot fica viva e o redator **desaparece** de três
sítios:

| Sítio | Efeito |
|---|---|
| `TurmaQueryBuilder::LISTING:26` (`redatores.user`) | turma passa a exibir sem redator |
| `EmissionPanelQuery:94` (`$turma->redatores->isEmpty()`) | painel trata a turma como sem redator |
| `CertificateEligibility:118` (`redatores()->whereKey(...)->exists()`) | **emissão de certificado é recusada** |

O gate cobre turma em andamento; o `withTrashed` cobre turma **concluída**, que é exatamente onde a
emissão acontece. Os dois são necessários — nenhum resolve o caso do outro.

**Correção medida na execução (2026-08-19): são TRÊS peças, não duas.** O `withTrashed` da relação
sozinho não salva a emissão. `CertificateController::store` e `BatchIssueCertificatesAction`
resolvem o redator com `Redator::query()->findOrFail($data->redator_id)`, escopado por
`SoftDeletes`: o **404** sai antes de `CertificateEligibility` chegar a rodar, e a tabela acima nem
é alcançada. Os dois sítios passam a `Redator::withTrashed()->findOrFail(...)` — nada é afrouxado,
porque quem autoriza continua sendo a porta 6 (designação na turma) e `turma_redator` não tem
`deleted_at`. No lote o estrago era maior: o redator é resolvido **fora** do `try` por item, então a
`ModelNotFoundException` derrubava o request inteiro e escondia os itens já commitados. Decisão do
João no dia 19, sobre report de bloqueio da Task 7 — nenhuma task do plano tocava Certification.

### D4 — os dois restores automáticos ficam automáticos

`StudentResolver:71-79` restaura `User` e `Student` ao reencontrar o RUT na importação;
`EnrollStudentAction:38` restaura a matrícula ao re-matricular. **Nenhum passa a exigir `*.restore`.**

A permissão guarda a **ação Restaurar da tela de Arquivados**, que é intenção explícita de trazer um
registro de volta. Re-matricular e re-importar são outra intenção, que por acaso reaproveita a linha.
Exigir a permissão faria a importação falhar com 403 para um operador que tem
`operation.enrollment.manage` — e o motivo não seria legível na tela.

Exceção declarada, com teste que a prova (§5.4).

Não há interação com a D2: turma arquivada dá 404 no binding de rota, então `EnrollStudentAction`
não alcança matrícula arquivada pela cascata.

### D5 — `Quote` e `Enrollment` têm Arquivados dentro do detalhe do pai

Os dois não têm lista de topo — vivem em `BudgetDetailPage` (`QuotesList`) e `TurmaDetailPage`. E os
dois **têm rota `DELETE` própria hoje** (`DELETE /quotes/{quote}`,
`DELETE /turmas/{turma}/alunos/{enrollment}`), então dá para arquivá-los individualmente. Sem
superfície de restauração própria o registro fica inalcançável para sempre — a assimetria que este
bloco existe para fechar.

| Rota | Permissão |
|---|---|
| `GET /api/budgets/{budget}/quotes/archived` | `commercial.quote.view` |
| `POST /api/quotes/{quote}/restore` | `commercial.quote.restore` |
| `GET /api/turmas/{turma}/alunos/archived` | `operation.turma.view` |
| `POST /api/turmas/{turma}/alunos/{enrollment}/restore` | `operation.enrollment.restore` |

As listas são **escopadas pelo pai**, o que casa com o `onlyTrashed` por root e módulo do packet
(fato 5). O `ArchiveSwitch` é local: no `QuotesList` e na lista de alunos, não na página.

**O binding do restore não pode ser o binding padrão, e isso vale para os seis roots.** O molde já
resolve `restore` por `onlyTrashed()` (D5 do molde) porque o binding normal não enxerga registro
soft-deletado. No aninhado o problema dobra: `->scopeBindings()` resolve `{enrollment}` por
`$turma->enrollments()`, que é escopada por `deleted_at IS NULL` — uma matrícula arquivada daria
**404 antes de chegar à Action**. A rota de restore de `Enrollment` resolve por
`$turma->enrollments()->onlyTrashed()`, explicitamente, e o guardrail `NestedRouteOwnershipTest`
continua satisfeito porque a posse segue declarada. `whereNumber` nas duas pontas, pelo mesmo motivo
do Q-6 do review anterior (`int $id` estoura `TypeError` → 500 antes de qualquer consulta).

### D6 — três fases por módulo, um DoD

Commercial → Identity → Operation. A ordem sobe a dificuldade: a fase 1 é replicação quase pura e
valida a marca em `quotes` e `files`; a fase 3 concentra os dois gates novos e a mudança de leitura.

### D7 — o RBAC espelha o guard do arquivar

Cinco permissões novas, **não seis**:

| Root | `destroy` guardado por | `restore` guardado por |
|---|---|---|
| `Budget` | `commercial.budget.delete` | **`commercial.budget.restore`** (nova) |
| `Quote` | `commercial.quote.delete` | **`commercial.quote.restore`** (nova) |
| `Redator` | `identity.user.delete` | **`identity.user.restore`** (nova) |
| `Turma` | `operation.turma.delete` | **`operation.turma.restore`** (nova) |
| `Enrollment` | `operation.enrollment.manage` | **`operation.enrollment.restore`** (nova) |
| `User` (staff) | `identity.access.manage` | **`identity.access.manage`** — sem permissão nova |

**`User` é a exceção, e o motivo é medido.** Seu `destroy` é guardado por `identity.access.manage`,
que está em `PermissionCatalog::SEGREGATED` — exclusiva do superadmin, não compõe role customizada
(ADR-07, 5.2b). Um `identity.user.restore` normal deixaria **restaurar mais frouxo que arquivar**:
alguém poderia devolver um usuário staff que nunca teria podido arquivar.

**`identity.user.restore` cobre `Redator`, não o staff user.** O módulo Identity já usa
`identity.user.*` para os três tipos de ator — `identity.user.delete` diz "Remover (soft delete)
usuários" e guarda o `destroy` do `RedatorController`. Criar `identity.redator.*` inventaria um
namespace que não existe.

As cinco entram no `PermissionCatalog`, concedidas a `admin` e `superadmin`, **fora** de
`SEGREGATED`. Ver a lista de arquivados exige a `*.view` do módulo, como no molde (D6).

O guard é declarado por `HasMiddleware` no controller, que é como todo o projeto faz — não por
`middleware()` na rota.

### D8 — três colunas novas

`archived_with_parent` (boolean, default `false`) em **`quotes`**, **`files`** e **`enrollments`**.
`users` já tem, do molde, e é reaproveitada pela cascata de `Redator`.

Mesmas regras do molde (D2): **sem índice** (a coluna só é lida dentro de relação já escopada por
FK), **fora do `$fillable`** (quem escreve é hook, nunca payload), cast `boolean`.

**`files` é polimórfica**, então a coluna vale de uma vez para os morphs de `budget`, `quote`,
`redator` e `turma`.

**Sem backfill**, pelo mesmo motivo da migration original (Q-7): não há backfill correto possível.
Cada tabela nova amplia o alcance da **D-34**, cujo gatilho é o primeiro deploy — registrar, não
resolver aqui.

### D9 — as cascatas passam a marcar, e três delas ganham transação

| Model | Cascateia para | Hoje | Depois |
|---|---|---|---|
| `Budget` | `quotes`, `files` | `$q->delete()` cru, files não entram | `markAndDelete` nos dois + `restored` |
| `Quote` | `files` | **sem hook** | hook novo, `markAndDelete` + `restored` |
| `Redator` | `documents` (files), `user` | `delete()` cru | `markAndDelete` + `restored` |
| `Turma` | `enrollments`, `files` | **sem hook** | hook novo (D2) |
| `User`, `Enrollment` | — | folhas | folhas |

Arquivar orçamento encadeia sozinho: cada `$quote->delete()` dispara o hook da cotação, que arquiva
os anexos dela. O restore desce na mesma ordem inversa — `restored` do orçamento devolve as cotações
marcadas, e o `restored` de cada cotação devolve os anexos marcados.

**Consequência que a cascata nova traz: quem cascateia precisa de transação.** O enumera-e-apaga sem
transação é check-then-act (nota de `Client::booted()`).

- `DeleteQuoteAction` **ganha `DB::transaction`** — hoje é escrita única e não tem.
- `DeleteTurmaAction` **ganha `DB::transaction`** — hoje é escrita única e não tem.
- `ArchiveRedatorAction` **nasce com transação** (D3).
- `DeleteBudgetAction` e `DeleteStaffUserAction` já têm.
- `RemoveEnrollmentAction` não precisa: `Enrollment` é folha.

O restore é simétrico: toda `Restore*Action` roda em `DB::transaction`, com restauração dos filhos
instância a instância — restore pelo builder não audita (ADR-08).

### D10 — a lista de arquivados de `User` filtra `type === 'admin'`

`UserController::destroy:60` faz `abort_unless($user->type === 'admin', 404)`: a rota de staff só
lida com admin. O `archived` espelha isso.

Sem o filtro, usuários de **cliente**, **redator** e **aluno** arquivados pelas cascatas de `Client`,
`Redator` e `Student` vazariam na lista de staff — registros que aquela tela nem sabe representar, e
cuja restauração isolada quebraria a consistência com o agregado pai.

### D11 — a dívida de copy é paga

`budget.confirmDeleteBody` e `quote.confirmDeleteBody` dizem *"Esta acción no se puede deshacer."*
Isso era **verdade** enquanto o restore de orçamento e cotação não existia, e o molde deixou o texto
de propósito, com gatilho no bloco que trouxesse `Budget`/`Quote`.

O gatilho vence aqui. As duas chaves passam à forma do molde (*"Podrás restaurarlo desde
Archivados."*), nos três locales.

### D12 — o frontend não migra nada

`useArchivedPage` aceita `ArchivableResource<TArchived>` — contrato **estrutural**
(`useArchivedList(enabled)` + `useRestore()`), não a fábrica `createCrudResource`. Então:

- `Budget`, `User` e `Redator` ganham o segundo genérico em `budgetsApi`, `usersApi` e
  `redatoresApi` — a fábrica já expõe `useArchivedList`/`useRestore`.
- **`Turma` não migra.** `features/operation/api/useTurmas.ts` é artesanal (tem `pending`, `manual`,
  `conclude`) e ganha `useTurmasArchived` + `useRestoreTurma` ao lado, satisfazendo o contrato à mão.
- **`Quote` e `Enrollment`** ganham hooks escopados pelo pai, no molde do `useTurmaDocuments`. O
  `mutate(id)` do contrato basta: o id do pai é fechado no hook.

`ArchiveSwitch` e `SearchableTableFrame.viewSwitch` já existem e não mudam.

## 4. Arquitetura

**Backend**

```
database/migrations/   archived_with_parent em quotes, files, enrollments

Fase 1 — Commercial
  Models/Budget.php            markAndDelete em quotes+files, hook restored
  Models/Quote.php             hook deleting+restored (novo), files
  Actions/DeleteQuoteAction    ganha DB::transaction
  Actions/RestoreBudgetAction · RestoreQuoteAction
  Data/ArchivedBudgetData · ArchivedQuoteData
  Http/Controllers/BudgetController   archived + restore + middleware
  Http/Controllers/QuoteController    archived (por budget) + restore + middleware
  routes.php                   budgets/archived ANTES do apiResource; whereNumber

Fase 2 — Identity
  Models/Redator.php           markAndDelete em documents+user, hook restored
  Actions/ArchiveRedatorAction (gate D3) · RestoreRedatorAction · RestoreStaffUserAction
  Data/ArchivedRedatorData · ArchivedUserData
  Http/Controllers/{Redator,User}Controller   archived + restore; User filtra type=admin (D10)
  routes.php                   redatores/archived e users/archived ANTES do apiResource

Fase 3 — Operation
  Models/Turma.php             hook deleting+restored (novo, D2); redatores() → withTrashed (D3)
  Actions/DeleteTurmaAction    ganha DB::transaction
  Actions/RestoreTurmaAction   gate de conflito (D1) · RestoreEnrollmentAction
  Data/ArchivedTurmaData · ArchivedEnrollmentData
  Http/Controllers/{Turma,Enrollment}Controller   archived + restore + middleware
  routes.php                   turmas/archived ANTES de turmas/{turma}

Transversal
  Identity/Support/PermissionCatalog.php   5 permissões (D7)
  database/seeders/RolePermissionSeeder.php
```

`ArchivesChildren` e `LoadsCascadedChildren` (`App\Shared\Concerns\`) e `ArchiveTrailQuery`
(`App\Shared\Audit\`) já existem e **não mudam** — a guarda do filho já arquivado (Q-1) mora no
trait e vale para os roots novos de graça.

**Frontend**

```
shared/api/{budgetsApi,usersApi,redatoresApi}.ts   segundo genérico
features/operation/api/useTurmas.ts                useTurmasArchived + useRestoreTurma
features/commercial/api/useBudgetQuotes.ts         cotações arquivadas por orçamento
features/operation/api/useEnrollments.ts           alunos arquivados por turma
features/*/hooks/                                  aliases de página sobre useArchivedPage
BudgetsTable · UsersTable · RedatoresTable · TurmasTable   ArchiveSwitch + coluna arquivado
QuotesList · lista de alunos                       ArchiveSwitch local (D5)
shared/config/locales/{es-CL,pt-BR,en}.json        chaves novas + D11
```

Lei §6 respeitada: features consomem PrimeReact só via `shared/ui` e não se importam entre si.

## 5. Testes e DoD

**Backend** — `docker compose exec -T app php artisan test`

Por root, o par obrigatório do molde: filho pré-arquivado **não** volta no restore do pai; restore
sobre registro **ativo** → 404; sem a `*.restore` → 403, com ela → 200; `restored` gravado em
`audits` para o pai e cada filho.

Os testes que só este bloco tem:

1. **D1 — o conflito:** arquivar turma → criar turma nova da mesma cotação → restaurar a primeira →
   **422**, não 500. Sem este teste o defeito só aparece em produção.
2. **D3 — a emissão:** arquivar redator com turma **concluída** → `CertificateEligibility`
   **continua** habilitando a emissão para aquele redator.
3. **D3 — o gate:** arquivar redator com turma **em andamento** → **422**.
4. **D4 — a exceção:** re-matricular aluno arquivado com um usuário que tem
   `operation.enrollment.manage` e **não** tem `operation.enrollment.restore` → **funciona**.
5. **D9 — a cadeia:** arquivar orçamento → cotações **e os anexos delas** arquivados com a marca;
   restaurar o orçamento devolve os três níveis; anexo pré-arquivado sozinho **não** volta.
6. **D10 — o vazamento:** arquivar um cliente (cascata arquiva o `User` dele) →
   `GET /users/archived` **não** devolve esse usuário.
7. **D9 — o rollback:** falha no meio da cascata de `Turma` não deixa matrícula arquivada sob turma
   ativa (mesmo molde do teste da `ArchiveCourseAction`).

**Frontend** — `pnpm test`

8. Cada alias de página não dispara a query em modo `active` e dispara ao trocar para `archived`
   — a regra do `enabled` sob demanda (D10 **do molde**, não a D10 desta spec).
9. O restore aninhado invalida a lista do **pai correto** — cotações do orçamento `X` não invalidam
   as do `Y`.

**DoD end-to-end, no navegador** — um por fase, não por `curl` e não por teste verde isolado:

- **Fase 1:** arquivo um orçamento com cotação e anexo → some da lista → aparece em Arquivados com
  data e autor → restauro → volta com cotação e anexo.
- **Fase 2:** arquivo um redator com documento → restauro → documento volta. E um redator com turma
  em andamento recusa com mensagem legível.
- **Fase 3:** arquivo uma turma com duas matrículas, uma delas **já arquivada antes** → restauro →
  volta só a que a cascata arquivou.

Antes do navegador, em cada fase: `php artisan test`, `pnpm test`, `pnpm lint`, `pnpm build`,
`./vendor/bin/pint <arquivos>` e `php artisan typescript:transform` com o manifesto no mesmo commit.

**Verificar no banco de dev antes de provar**, porque a suíte roda em sqlite `:memory:` e não diz
nada sobre o MySQL: `php artisan migrate` e
`php artisan db:seed --class=RolePermissionSeeder`. Foram exatamente os dois defeitos que o DoD do
bloco anterior achou no navegador.

## 6. Riscos

- **Toca emissão de certificado** (D3). É o caminho de maior peso legal do sistema, e a mudança é
  num `belongsToMany` lido por três sítios — listagem, painel de emissão e elegibilidade.
- **Primeira `ValidationException` nova desde a D-07** (D1). O débito de idioma canônico está travado
  em decisão do João; este bloco escreve uma mensagem antes dela, por necessidade medida.
- **`files` é polimórfica e compartilhada.** A coluna nova vale para budget, quote, redator e turma
  de uma vez; um erro na marca alcança quatro agregados.
- **Três Actions passam a ter transação onde não tinham.** `DeleteQuoteAction` e `DeleteTurmaAction`
  eram escrita única; a cascata nova muda isso. Em sqlite o lock é no-op, então errar ali só
  apareceria em MySQL.
- **`Turma` é o root com mais superfície nova:** hook que não existia, gate que não existia, mudança
  de leitura e migração de contrato no frontend.
- **Risco de review projetado: ALTO** — schema, RBAC, `generated.ts` e dado com peso legal. A
  classificação final é do `/revisar-sprint`.
