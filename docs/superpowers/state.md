---
schema_version: 1
active_feature: turma-habilitacao-listagem
active_work_item: turma-habilitacao-listagem
workflow_state: planning
next_owner: claude
next_action: continue_active_planning
resume_state: null
active_spec: docs/superpowers/specs/2026-08-10-turma-habilitacao-listagem-design.md
active_plan: null
context_packet: null
blocker: null
review_findings_approved: null
last_completed_work_item: certificacao-lote-e-snapshot
state_basis_commit: 4ae4c91
updated_at: 2026-08-10T15:45:00-03:00
---

# Estado operacional — Lotus v2

> Fonte única para descobrir a etapa atual e a próxima ação. `progress.md` registra histórico;
> `backlog.md` registra a fila. Nenhum dos dois autoriza iniciar uma fase.

## Estados válidos

| Estado | Próxima ação permitida |
|---|---|
| `idle` | escolher explicitamente um item do `backlog.md` |
| `context_required` | gerar/atualizar Context Packet com `lotus-context-packet` |
| `ready_for_planning` | executar `/planejar-bloco` para `active_work_item` |
| `planning` | continuar brainstorming/spec/plano; não implementar |
| `ready_for_execution` | executar `/executar-bloco` para `active_work_item` |
| `executing` | retomar a task pendente do plano; não replanejar |
| `ready_for_review` | solicitar code review do bloco |
| `reviewing` | tratar somente achados aprovados e repetir o review |
| `ready_for_closure` | executar `/fechar-sprint` |
| `blocked` | resolver `blocker`; depois retornar a `resume_state` |

## Invariantes

- Existe no máximo um `active_work_item`.
- `next_action` deve corresponder a `workflow_state`.
- `active_plan` é obrigatório a partir de `ready_for_execution`.
- Quando o trabalho depender de contexto externo, `context_packet` deve permanecer `null` em
  `context_required` e tornar-se obrigatório antes da transição para `ready_for_planning`.
- Mudanças de estado ocorrem somente em fronteiras duráveis e entram no mesmo commit do artefato
  que prova a transição.
- Divergência entre este arquivo, plano, spec, Git ou `progress.md` bloqueia a sessão; não escolha
  por heurística.
- O backlog nunca promove trabalho automaticamente.

## Bloco ativo — `turma-habilitacao-listagem` (2026-08-10)

**Item 4 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-10** (`/planejar-bloco`
com o item nomeado literalmente no argumento e o estado em `idle`; o comando não promove item
sozinho). Backend puro, aprofundamento do Operation nascido da **revisão de arquitetura de
2026-08-09**, com 5 decisões já tomadas por ele. Toca `backend/` → **main tree, sem worktree (P-03)**.

**Rota direta a `ready_for_planning`, sem packet, por ausência medida de fonte externa** (mesmo caso
de `profundidade-backend-b4-b7` e `profundidade-form-crud`): o item não cita Drive, Notion nem
Figma, e as fontes são o repositório mais as 5 decisões escritas. Dispensa confirmada pelo João na
abertura.

### Quatro medições contra o texto do item, feitas antes de desenhar

1. **O 2N+1 é real e o N foi medido na API:** `GET /api/turmas` no banco de dev custa **15 queries
   para 4 turmas** — 8 de carga (o `withListingData` faz o trabalho dele) e **7 em `files`**. Não é
   2N exato: `isHabilitada()` curto-circuita em `status !== EmAndamento`, então turma **em
   andamento** custa 2 queries (a mesma pergunta feita duas vezes, uma por `habilitada` e outra por
   `missing_document_types`) e turma **concluída** custa 1.
2. **A decisão 1, ao pé da letra, muda comportamento.** Hoje `isHabilitada()` é
   `status === EmAndamento && missingTypes() === []`; o item escreve "literalmente
   `missingTypes() === []`". Sem o gate de status, **toda turma concluída passaria a responder
   `habilitada: true`** (concluir exige documentação completa, então são todas), contra o teste vivo
   `TurmaHabilitacaoServiceTest::test_turma_concluida_nao_e_habilitada`.
3. **O front sobreviveria à mudança, mas o payload não:** `turmaDisplayStatus` checa `concluida`
   primeiro e `ConcludePanel`/`TurmaDocuments` guardam por `!concluida` antes de ler `habilitada` —
   nenhuma tela muda. O contrato HTTP mudaria de valor, e o item promete que nada muda.
4. **`preventLazyLoading` não enxerga este N+1** (a decisão 5 está certa): `$turma->files()->…` é
   query **na relação**, não lazy-load de relação, e é por isso que o `ContratanteEagerLoadTest`
   passa hoje com o 2N+1 vivo.

**Decisão do João na abertura (D-B1): `habilitada` de turma concluída continua `false`.** O VO
carrega o status junto e a pergunta segue sendo `status === EmAndamento && missing === []` — "uma
pergunta, uma resposta" passa a significar que a **resposta é o VO**, não que o gate de status
desaparece. Zero mudança de payload; o teste vivo continua sendo guarda de regressão.

### Brainstorming de 2026-08-10 — spec aprovada, duas decisões novas

As 5 decisões do item entraram sem reabertura. Três pontos estavam abertos e o João fechou os três:
**D-B1** (acima); **D-B2** — a guarda da decisão 5 é **contagem de queries** (`DB::listen` sobre
`from "files"` no `GET /api/turmas`, molde do `CertificateListingTest:368`), não
`preventLazyLoading`, porque contagem pega duas classes de regressão em vez de uma — perder o
eager-load **e** reintroduzir query por linha por outro caminho; **D-B3** — o
`?? $turma->enrollments()->count()` do `enrolled_count` **entra no corte** e morre, com
`loadListingData()` garantindo o `loadCount`. É a mesma classe de defeito do 2N+1 principal (query
por linha escondida atrás de um fallback), no mesmo `fromModel`.

**Uma medição a mais, achada ao ler o código e não prevista pelo item:** o `whereIn` dos três tipos
obrigatórios está soletrado em **dois** lugares — `TurmaHabilitacaoService::missingTypes()` e
`TurmaDocumentController::index()`. A relação nomeada da decisão 2 não serve só ao eager-load; ela
dá dono único à pergunta, e o `index` do controller de documentos passa a consumi-la.

Spec: `docs/superpowers/specs/2026-08-10-turma-habilitacao-listagem-design.md`. Review declarado
**BAIXO RISCO** (zero `generated.ts`, locales, auth/RBAC, schema, dinheiro e rota pública;
`executor: claude`) → só lente Claude, sem segunda frente do Codex. Backend puro → **main tree, sem
worktree (P-03)**; zero schema, ADR/DER não abrem.

## Último item fechado — 2026-08-10 (`certificacao-lote-e-snapshot`)

### Gate de fechamento — 2026-08-10

**O item 0 foi refeito contra a API real, não herdado do gate de execução:** as correções Q-1..Q-6
entraram em `d01c279`, depois do e2e da Task 6, e mexeram exatamente nos caminhos que o gate exercita
— `show`, listagem e `ProblemDetails`. `migrate:fresh --seed` no MySQL, sessão Sanctum por cookie +
CSRF (lição 12: `Origin` e `Accept` obrigatórios, `XSRF-TOKEN` reextraído do jar depois do login).

**A cadeia do §6 da spec, pela API:**

1. **Porta destravada pela própria API:** o seed fresco deixa a turma 3 com
   `emission_blocked: 'sin_plantilla'`; `PUT /api/courses/2` criando o template v1 com
   `layout_config.city = 'Santiago'` e `validity_months: 24` zerou o bloqueio (`null`). Os `modules`
   foram **omitidos** do payload de propósito — coleção nested `Optional`, ausente não mexe — e os 2
   voltaram intactos. O primeiro ensaio de emissão levou **422** por comportamento correto, não por
   defeito: `redator_id: 1` não é o designado da turma (`El redactor no está designado en esta
   clase.`), e o painel diz que o designado é o 3.
2. **Emissão individual** em `enrollments/21` → **201 `LOT-2026-1000`**, `snapshot_ok: true`.
3. **Lote `[22, 21, 23, 24]`** com a falha provocada (21 já tinha vigente) → **200** com relatório
   por item: `LOT-2026-1001`/`1002`/`1003` **contíguos**, sem buraco onde o item falho ficou — a
   recusa **não consumiu número de sequência** —, e a falha **nomeada** (`Ya existe un certificado
   vigente para esta matrícula.`). `[26, 26]` → **422** problem+json, o `distinct` vivo.
4. **`aluno.name` corrompido direto na coluna** do certificado 2 (`UPDATE … JSON_SET`), com o resto
   do JSON conferido por **MD5 antes e depois** como byte-idêntico (`JSON_REMOVE` do campo mexido dá
   o mesmo hash nos dois lados). As seis chamadas:

   | Chamada | Resultado |
   |---|---|
   | `GET /api/certificates` | **200**, `snapshot_ok: false` **só** na linha corrompida (as outras 3 em `true`) |
   | `GET /api/certificates/2` (corrompido) | **500** `application/problem+json`, `detail` nomeando `LOT-2026-1001` **e** o campo faltante |
   | `GET /api/certificates/2/pdf` | **500** problem+json, mesmo `detail` |
   | `GET /api/publico/certificados/{uuid}` **sem cookie** | **500** problem+json, mesmo `detail` |
   | `GET /api/certificates/1` (são) | **200**, `snapshot_ok: true` |
   | `GET /api/certificates/1/pdf` (são) | **200 `application/pdf`**, 40.119 bytes |

   Controle extra: a rota pública do certificado **são**, sem cookie, segue **200** com o payload
   completo. O gate único não fechou o caminho feliz.

**A prova que nenhum gate anterior tinha feito, e que o Q-1 obrigou — `APP_DEBUG=false`.** O achado
existe porque `backend/.env` tem `APP_DEBUG=true` e não há `.env.testing`: suíte e e2e provavam a D8
num caminho que a produção não percorre. Com o `.env` posto em `APP_DEBUG=false` e `config:clear`,
medido **nos dois sentidos** (lição 10):

- `GET /api/certificates/2` e a rota pública sem cookie seguem devolvendo o `detail` **inteiro**
  (`El certificado LOT-2026-1001 no puede presentarse: su documento congelado no tiene los campos
  aluno.name.`) — o `PublicDetail` atravessa a máscara, que é a promessa da D8;
- um 500 **comum**, provocado parando o container `gotenberg` e pedindo o PDF do certificado **são**,
  continua **mascarado** com `Ocorreu um erro inesperado. Tente novamente.` — o default não foi
  afrouxado para todo mundo.

`gotenberg` religado e `.env` restaurado no mesmo passe, com o PDF são voltando a **200
`application/pdf`, 40.119 bytes**; `git status` limpo (o `.env` é ignorado, e foi conferido).

**Demais itens:** suíte **500 passed, 1 skipped (1858 assertions)** · frontend **13 arquivos / 47
testes**, `pnpm lint` e `pnpm build` verdes · `typescript:transform` **sem diff** em `generated.ts` ·
`git diff 7227d04..HEAD -- backend/database/` **vazio** (zero schema, como a spec previu) · código
morto zero (nenhum `.gitkeep`, nenhum `TODO`/`FIXME` novo; os 6 símbolos nascidos no bloco todos com
consumidor) · leis §5 limpas (zero `Repository`, zero import cross-feature, zero PrimeReact direto em
`features/`; o único `abort()` de `app/` é o 404 pré-existente do `PublicCertificateController`, que
o bloco não tocou).

**Pint com uma exceção honesta:** `passed` em 13 dos 14 `.php` do bloco. `ProblemDetails.php`
reprova, e **já reprovava na versão base** — conferido rodando `pint --test` sobre o arquivo extraído
de `7227d04`, com a mesma lista de 6 fixers (`ordered_imports`, `binary_operator_spaces`,
`single_blank_line_at_eof`, …). É dívida de estilo pré-existente num arquivo que o bloco só tocou em
8 linhas; reformatá-lo inteiro seria ruído de diff (lição 9).

**O que o gate NÃO provou, sem maquiagem:** **a tag da linha corrompida não foi vista renderizada.**
O host WSL não tem browser utilizável (Playwright sem as bibliotecas de sistema, limitação herdada de
2026-08-08). A prova aqui é o `snapshot_ok` na API real, o `pnpm build`/`pnpm lint` e a paridade das
três locales; **o checkpoint visual fica com o João.**

**Pendências revisadas:** nenhuma venceu gatilho (P-04 reavalia **2026-08-15**; P-03 segue sem dois
blocos de backend em paralelo; P-15, P-23, P-25 e P-26 revisam **2026-09-30**), nenhuma fechou,
nenhuma nasceu — o bloco não deixou doc nem mecanismo afirmando o que o código não faz. **Fica
anotado para decisão do João, sem virar pendência:** a suíte roda com `APP_DEBUG=true` herdado do
`.env`, e a única guarda do caminho mascarado é o `config(['app.debug' => false])` que o Q-1 escreveu
dentro do próprio teste; um `.env.testing` fixando o modo produção é decisão de infra dele, não do
agente.

**Arquivamento:** plano → `plans/archive/2026-08-10-certificacao-lote-e-snapshot.md`; spec →
`specs/archive/2026-08-10-certificacao-lote-e-snapshot-design.md` (não é compartilhada: o item 5 do
backlog, `turma-habilitacao-listagem`, tem decisões próprias e não a consome). Entrega registrada no
`progress.md` (a de 2026-08-02/`operation` desceu ao `progress-archive.md` para manter dez); item 4
removido do `backlog.md`, com o `turma-habilitacao-listagem` renumerado para 4.

**Estado do banco de dev:** `migrate:fresh --seed` do gate mais as mutações do e2e (template v1 do
curso 2 com `city: Santiago` e `validity_months: 24`, certificados `LOT-2026-1000`…`1003`, e o
`aluno.name` do `LOT-2026-1001` **deixado corrompido de propósito** para o checkpoint visual do João
encontrar a linha marcada). Nada é fixture de código; `migrate:fresh --seed` devolve o cenário
canônico.

**Item 4 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-10** (`/planejar-bloco`
com o item nomeado literalmente no argumento e o estado em `idle`; o comando não promove item
sozinho). O item nasceu da **revisão de arquitetura de 2026-08-09**, com as decisões já tomadas por
ele na entrevista — a edição do `backlog.md` que criou os itens 4 e 5 estava na árvore sem commit e
entra no commit da seleção, porque é o artefato que a prova.

**Rota direta a `ready_for_planning`, sem packet, por ausência medida de fonte externa** (mesmo caso
de `profundidade-backend-b4-b7` e `profundidade-form-crud`): o item não cita Drive, Notion nem
Figma, e as fontes são o repositório mais as decisões escritas. Dispensa confirmada pelo João na
abertura.

**Uma divergência do item foi levantada e fechada antes do desenho:** o texto diz "13 decisões já
tomadas na entrevista", e o backlog escreve 6 aqui (mais 5 no item 5, total 11). **Decisão do João:
as 6 escritas são tudo** — o "13" contava a entrevista inteira, incluindo o que virou recorte e
fora-de-escopo. Nenhuma decisão perdida; a spec desenha sobre as 6 mais o que o código mediu.

**Cinco medições contra o texto do item, feitas antes de desenhar:** (1) `missingRequiredFields()`
tem exatamente 2 consumidores, ambos com a política copiada — a D4 bate com o repo; (2) **`show` não
checa snapshot hoje**, então "falha alto" é comportamento novo, não refactor, e `index` idem; (3) a
D3 muda comportamento no lote (`->first()` vira `implode(' ')`; hoje as 6 portas lançam uma mensagem
cada, então a diferença só aparece com recusa de 2+ razões); (4) `App\Shared\Validation` não existe;
(5) o Action da D1 fica **sem `DB::transaction`** de propósito — exceção declarada à regra de Action
da `backend-ddd.md`, e é o ponto do bloco.

### Brainstorming de 2026-08-10 — spec aprovada, três decisões novas

As 6 decisões da entrevista entraram sem reabertura. Só três pontos estavam abertos, e o João
fechou os três: **D7** — `missingRequiredFields()` vira privado, com `isPresentable(): bool` e
`assertPresentable(string $codigo)` adjacentes no molde `assert*`/`constrain*` do
`CertificateEligibility` (B1); **D8** — a linha corrompida **mantém o botão Ver**, que cai no estado
de erro já existente do `CertificateViewDialog` — é onde o suporte lê quais campos faltam; **D9** —
a marcação é **tag de estado** (`AppTag severity="danger"` no lugar do Vigente/Vencido), porque com
o documento corrompido o estado da linha é justamente o que não dá para afirmar.

**Consequência declarada na spec, não descoberta depois:** "corrompido" **não** vira um quinto
`CertDerivedStatus` — promovê-lo contaminaria o dropdown de filtro, os quatro contadores do rodapé e
o `CertificateViewDialog`. Filtrar por "Vigente" continua trazendo a linha corrompida cujas datas
dizem vigente. Corrupção é defeito do documento, não estado dele.

Spec: `docs/superpowers/specs/archive/2026-08-10-certificacao-lote-e-snapshot-design.md`. Review declarado
**ALTO RISCO** (peso legal + rota pública + `generated.ts`) → duas frentes em `ready_for_review`.
Backend mais um arquivo de frontend → **main tree, sem worktree (P-03)**; zero schema, ADR/DER não
abrem.

### Plano escrito em 2026-08-10 — 7 tasks (0–6), `executor: claude`

`docs/superpowers/plans/archive/2026-08-10-certificacao-lote-e-snapshot.md`. Branch prevista:
`refactor/certificacao-lote-e-snapshot`, a partir de `eca31e4`.

A escrita do plano achou **quatro desvios contra a spec aprovada, declarados no §Desvios** em vez de
silenciados (lição 13):

- **D-P1** — o §6 da spec descreve "uma fixture, quatro provas"; medido, **duas já são testes
  vivos** (`CertificatePdfTest.php:398,416` e `PublicCertificateTest.php:184`, ambos em 500). O
  plano cria **dois** testes (`index` marcando, `show` em 500) e trata os dois existentes como
  regressão que tem de ficar verde **sem edição** — duplicá-los seria cobertura falsa.
- **D-P2** — o guard `test_falha_inesperada_no_meio_do_lote_preserva_o_que_ja_saiu` sobrevive à
  mudança de casa **por construção, conferido e não suposto**: o dublê entra por
  `$this->instance(IssueCertificateAction::class, …)` e o Action novo recebe o
  `IssueCertificateAction` pelo construtor, do container. Por isso o arquivo de teste fica com zero
  linhas de diff, e o mutante (`DB::transaction` em volta do laço) é reprovado no endereço novo.
- **D-P3** — `App\Shared\Validation` **não cria aresta** na matriz: o `DomainDependencyTest` governa
  só `App\Domains\* → App\Domains\*`; `App\Shared\*` é transversal e já é consumido por domínios
  (precedente `App\Shared\Data\ContratanteData`, do B4).
- **D-P4** — o teste de `squash()` estende `Tests\TestCase`, não o `PHPUnit\Framework\TestCase` do
  vizinho `RutTest`: `ValidationException::withMessages()` monta um validador pela facade e precisa
  do container. Sem `RefreshDatabase` — nada toca banco.

Ordem das tasks: 0 baseline → 1 `ValidationMessages::squash()` com os dois adapters → 2
`BatchIssueCertificatesAction` → 3 gate único do snapshot → 4 `snapshot_ok` + `show` falhando alto +
docblock do D6 + `generated.ts` → 5 tag no `HistorialTable` + chave nas 3 locales → 6 gate do bloco
contra a API real.

### Execução iniciada em 2026-08-10 — `/executar-bloco`, `subagent-driven-development`

Branch `refactor/certificacao-lote-e-snapshot` a partir de `7227d04` — **não de `eca31e4`** como o
plano escreveu: `7227d04` é o próprio commit do plano, docs-only (plano + `state.md`, zero código),
e branchar antes dele deixaria o plano fora da branch que ele governa. Main tree, sem worktree
(P-03).

**Task 0** confirmou o baseline exato do plano: backend **493 passed, 1 skipped (1833 assertions)**;
frontend **13 arquivos / 47 testes**, `pnpm lint` e `pnpm build` verdes; `typescript:transform` sem
diff em `generated.ts`.

**O pré-flight do plano achou um conflito medido, decidido pelo João antes de qualquer edição
(D-E1).** O fixture do `CertificateListingTest` **não produz snapshot apresentável**: o default de
`createCertificate` é `['aluno' => ['name' => 'Juan Pérez']]`, sem a seção `curso`, e
`SnapshotCourseData::fromArray(null)` põe `name: ''` — medido no tinker,
`missingRequiredFields()` devolve `["curso.name"]`. Duas consequências contra o texto do plano: o
teste novo da Task 4 afirmaria `snapshot_ok === true` sobre um certificado que mede `false` (as duas
linhas dariam `false`, e o teste não distinguiria corrompido de são); e
`test_show_devolve_o_snapshot_persistido:84`, que passa outro snapshot igualmente sem `curso`,
viraria **500** assim que o `show` chamasse `assertPresentable()`.

**Não é uma quinta mudança de comportamento.** `show` em 500 sobre snapshot sem `curso.name` é o
item 1 da lista fechada do §5 — o fixture já era corrompido pela definição que o projeto tem hoje
(`CertificatePdfService` e `PublicCertificateData` já estouram nele; `CertificatePdfTest:43` monta a
seção `curso` justamente por isso). A listagem só nunca exercitou essas rotas. O único
`assertExactJson` do domínio é sobre `PublicCertificateData`, que não ganha campo.

**Decisão do João: reparar o fixture** — o default do `createCertificate` e o snapshot do
`test_show_devolve_o_snapshot_persistido` ganham `'curso' => ['name' => …]`. Edição **só de
fixture**: nenhuma asserção muda, os 9 testes existentes seguem provando o que provavam, e os 2
testes novos passam a isolar `aluno.name` como a única corrupção — que é a história da spec.

### Tasks 1–5 entregues — uma revisão de task por entrega

Commits, do base `7227d04`: `66e0911` (seam `ValidationMessages::squash()` com os dois adapters),
`c7fb9bf` (`BatchIssueCertificatesAction`), `8299921` (gate único do snapshot), `70c0167`
(`snapshot_ok` + `show` falhando alto + `generated.ts`) + `b2a5028` (fix do review da Task 4),
`144c857` (tag da linha corrompida no Historial + chave nas 3 locales).

**Dois mecanismos foram vistos reprovando em primeira mão, não aceitos por relatório (lição 10):**

1. **A ausência de `DB::transaction` no Action do lote.** O revisor da Task 2 foi barrado pelo
   classificador de permissão ao tentar reproduzir o mutante, e disse isso em vez de mascarar.
   Envolvi o laço do `BatchIssueCertificatesAction` num `DB::transaction` eu mesmo:
   `BatchIssueTest.php:299` reprovou com `Failed asserting that table [certificates] matches
   expected entries count of 1. Entries found: 0.` Mutante revertido, árvore limpa, verde de volta.
   O guard sobreviveu à mudança de casa com **zero linhas de diff** no arquivo de teste, que era o
   critério do refactor (D-P2 confirmado).
2. **A fonte do `snapshot_ok`.** Achado **Importante** do review da Task 4, provado pelo próprio
   revisor: com o certificado são `Revocado` e o corrompido `Emitido`, `status` era proxy
   **perfeito** de `snapshot_ok`, e o mutante `snapshot_ok: $certificate->status !==
   CertificateStatus::Emitido` — campo derivado de fonte inteiramente errada — deixava o teste **e a
   suíte inteira** verdes. É a "igualdade acidental" da `backend-ddd.md` §Testes, num campo que a
   Task 5 consome na UI. Corrigido em `b2a5028` com uma terceira linha **revogada E corrompida**, de
   modo que `Revocado` mapeia para os dois valores; mutante revisto **vermelho** (`Failed asserting
   that true is identical to false.` em `CertificateListingTest.php:145`), revertido em seguida.

**Um desvio forçado pelo schema (D-E2):** o cenário do `index` não pode ter dois `Emitido` na mesma
matrícula — `certificates_active_enrollment_unique`, sobre a coluna gerada `active_enrollment_id`,
recusa antes de a listagem responder (o primeiro RED foi `UniqueConstraintViolationException`). O
são virou `Revocado`, seguindo o precedente do próprio arquivo. Revogado produz `NULL` na coluna
gerada, e `NULL` não colide — é o que permite as duas linhas revogadas do fix acima.

### Task 6 — o gate do bloco (2026-08-10)

Executado por mim direto: é a prova do DoD do bloco, e o DoD pede comportamento contra a API real.

**Ferramentas.** Backend **498 passed, 1 skipped (1850 assertions)** — +5 testes / +17 asserções
sobre o baseline 493/1833. Frontend **13 arquivos / 47 testes**, `pnpm lint` limpo, `pnpm build`
verde. Pint `--test` **`passed`** nos **11** `.php` vivos do bloco (lista conferida antes, para o
`--test` nunca cair sem argumento — lição 9). `typescript:transform` rodado de novo: `generated.ts`
**sem diff** depois do commit da Task 4, e `git diff main...HEAD -- backend/database/` **vazio** —
zero schema, como a spec previu.

**E2e contra a API real**, `migrate:fresh --seed` no MySQL, sessão Sanctum por cookie + CSRF
(`Origin` e `Accept` obrigatórios, `XSRF-TOKEN` reextraído do jar depois do login, que o rotaciona).

1. **Portas destravadas pela própria API:** o seed fresco deixa a turma 3 com
   `emission_blocked: 'sin_plantilla'`; `PUT /api/courses/2` criando o template v1 com
   `layout_config.city = 'Santiago'` e `validity_months: 24` zerou o bloqueio (`null`). A turma é
   `online` com `local_aplicacao: null`, então a cidade do template era mesmo obrigatória. Os
   `modules` foram **omitidos** do payload de propósito — coleção nested `Optional`, ausente não
   mexe — e voltaram intactos.
2. **Emissão individual** em `enrollments/21` → **201 `LOT-2026-1000`**, `snapshot_ok: true`.
3. **Lote `[22, 21, 23, 24]`** com a falha provocada (21 já tinha vigente) → **200** com relatório
   por item: `LOT-2026-1001`/`1002`/`1003` **contíguos**, sem buraco onde o item falho ficou — a
   recusa **não consumiu número de sequência** —, e a falha **nomeada**
   (`Ya existe un certificado vigente para esta matrícula.`). `[25, 25]` → **422** problem+json, o
   `distinct` vivo.
4. **`aluno.name` corrompido direto na coluna** do certificado 2 (`UPDATE … JSON_SET`), com o resto
   do JSON conferido byte a byte como intacto. As seis chamadas:

   | Chamada | Resultado |
   |---|---|
   | `GET /api/certificates` | **200**, `snapshot_ok: false` **só** na linha corrompida |
   | `GET /api/certificates/2` (corrompido) | **500** `application/problem+json`, `detail` nomeando `LOT-2026-1001` **e o campo faltante** |
   | `GET /api/certificates/2/pdf` | **500** problem+json, mesmo `detail` |
   | `GET /api/publico/certificados/{uuid}` **sem cookie** | **500** problem+json, mesmo `detail` |
   | `GET /api/certificates/1` (são) | **200**, `snapshot_ok: true` |
   | `GET /api/certificates/1/pdf` (são) | **200 `application/pdf`** |

   Controle extra: a rota pública do certificado **são**, sem cookie, segue **200**. E a página 1 do
   PDF são foi inspecionada com `pdftoppm` — nome, RUT, cliente, curso, vigência, QR e assinatura
   todos impressos. O gate único não fechou o caminho feliz.

**O que o gate NÃO provou, sem maquiagem:** **a tag da linha corrompida não foi vista renderizada.**
O host WSL não tem browser utilizável (Playwright sem as bibliotecas de sistema, limitação herdada
de 2026-08-08). A prova aqui é o `snapshot_ok` na API real, o `pnpm build`/`pnpm lint` e a paridade
das três locales; **o checkpoint visual fica com o João.**

**Estado do banco de dev:** `migrate:fresh --seed` do gate mais as mutações do e2e (template v1 do
curso 2 com `city: Santiago`, certificados `LOT-2026-1000`…`1003`, e o `aluno.name` do
`LOT-2026-1001` **deixado corrompido de propósito** para o checkpoint visual do João encontrar a
linha marcada). Nada é fixture de código; `migrate:fresh --seed` devolve o cenário canônico.

### Três Minor abertos, dois deles decisão do João, para o review herdar

- **Minor-2 (decisão do João — o plano manda o texto).**
  `CorruptedSnapshotException.php:18` afirma "**A listagem é a exceção deliberada, e é a única.**" A
  frase é **falsa**: `store()` e `revoke()` também projetam `CertificateData` sem passar pelo gate.
  O texto está mandado **verbatim pelo plano, na linha 793**, então a contradição é do plano, não da
  implementação — não corrigi unilateralmente.
- **Minor-4 (decisão do João — escopo).** `certificatesApi.ts:68-71` / `IssuedDialog` consomem o
  certificado por um caminho que **não passa pelo `show` gateado**. Fechar isso seria uma **quinta**
  mudança de comportamento, e o §5 da spec é lista **fechada** de quatro.
- **Minor-3 (técnico, sem decisão pendente).** `CertificateData.php:49-50` acessa
  `$certificate->snapshot` duas vezes; com `withoutObjectCaching` no cast, são dois decodes do JSON
  por certificado listado.

Evidência task a task em `.superpowers/sdd/progress.md`. Review **ALTO RISCO** pela spec (peso legal
+ rota pública + `generated.ts`) → duas frentes: lente Claude com o gabarito do projeto + Codex
read-only sobre `7227d04..HEAD`.

### Review de sprint — 2026-08-10: duas frentes, 6 achados, todos aprovados e corrigidos

**ALTO RISCO** conforme a spec → lente Claude com o gabarito do projeto + `mcp__codex__codex`
read-only sobre `7227d04..HEAD`. Órfãos **zero** (`missingRequiredFields` privado com 2 chamadores
internos, `isPresentable` 1, `assertPresentable` 3, `ValidationMessages` 2, o Action do lote 1, e os
imports `Redator`/`Enrollment` do controller seguem usados pelo `store`). Leis §5 limpas. **Sem
divergência de fato entre os revisores**: o Codex viu 5 dos 6 e eu confirmei cada um no código antes
de aceitar — com o escopo do Q-3 corrigido (ele disse "`curso.name` ou `emissor.name`"; medi, e
`emissor.name` já tem quem o mate). O Q-1 nenhuma das duas lentes tinha visto antes desta rodada.

**O achado que o gate não podia ter pego (Q-1 🟡)** — `ProblemDetails::detailFor()` troca o `detail`
de **todo 500** por `'Ocorreu um erro inesperado. Tente novamente.'` quando `app.debug` é falso. A
D8 promete o contrário: a linha corrompida mantém **Ver**, o `CertificateViewDialog` imprime
`error.detail` no `AppErrorState`, "é onde o suporte lê quais campos faltam". Em produção o suporte
lia "erro inesperado" — sem código, sem campo. **Nem a suíte nem o e2e viam**, e o motivo foi
medido: `backend/.env` tem `APP_DEBUG=true` e **não existe `.env.testing`**, então os dois provaram a
D8 num caminho que a produção não percorre. Nasce `App\Shared\Exceptions\PublicDetail`, interface
marcadora para a exceção cuja mensagem foi escrita para quem lê a resposta; o default segue
mascarando e só quem declara passa. No mesmo achado, a mensagem saiu de **PT-BR** para **es-CL** —
ela agora chega à tela de um usuário chileno, e todas as recusas irmãs deste diff já estavam em
espanhol. Guarda nova com `config(['app.debug' => false])`, **vista vermelha primeiro**, com o
diff literal `+'Ocorreu um erro inesperado. Tente novamente.'`.

**Os outros cinco:**

- **Q-2 🟡** (lição 13, o Minor-2 herdado) — o docblock afirmava "**a listagem é a exceção
  deliberada, e é a única**", e `store()`/`revoke()` também projetam `CertificateData` sem gate. O
  texto vinha **verbatim do plano, linha 793**; com a aprovação do João foi corrigido, nomeando os
  dois e o motivo de ficarem fora (são eco de escrita, não apresentação do documento — quem
  apresenta é `show`, o PDF e o QR), sem virar a quinta mudança de comportamento.
- **Q-3 🟡** — a política obrigatória tem três campos e **`curso.name` não tinha quem o matasse**:
  `aluno.name` morre em 3 testes, `emissor.name` no `CertificatePdfTest:384`, e remover `curso.name`
  deixava a **suíte inteira** verde. A terceira linha do teste da listagem (a revogada **e**
  corrompida, que existe para quebrar a correlação `status`×`snapshot_ok`) passa a corromper
  `curso.name` em vez de `aluno.name` — fecha o buraco sem teste novo e sem perder o poder
  discriminante. Mutante **visto vermelho** (`Failed asserting that true is identical to false.`),
  revertido em seguida.
- **Q-4 🟢** (o Minor-3 herdado) — `CertificateData::fromModel` lia `$certificate->snapshot` duas
  vezes; com `withoutObjectCaching` no cast são dois decodes de JSON por linha de uma listagem que
  não pagina. Variável local; não reabre o bug do cache de casts, que era do Eloquent e não da
  variável.
- **Q-5 🟢** — `test_show_de_snapshot_corrompido_falha_alto` afirmava só status e content-type;
  passa a afirmar o `detail` que nomeia o certificado e o campo, que é exatamente o texto de que a
  D8 depende.
- **Q-6 🟢** — o seam `ValidationMessages::squash()` tinha unit test, a **fiação** dele no Action do
  lote não tinha nenhuma: voltar para `->first()` ficava verde. Teste novo com recusa de duas
  razões; mutante **visto vermelho** (`-'La clase no está concluida. El redactor no está designado
  en esta clase.'` / `+'La clase no está concluida.'`), revertido em seguida. Não é bug vivo — as
  seis portas emitem uma mensagem cada —, é guarda contra a regressão.

**Não viraram achado, por serem decisão consciente registrada:** o **Minor-4** (o `IssuedDialog` lê
o certificado por caminho não-gateado, porque `useIssueCertificate` semeia `detailKey` com a resposta
do POST — fechar seria a quinta mudança de comportamento); a **tag não vista renderizada**, que é
limitação declarada do gate e segue com o João; e o corrompido **não** virar um quinto
`CertDerivedStatus`, com filtro e contadores continuando a classificar a linha pelas datas —
consequência declarada na spec.

**Placar pós-correção: 500 passed, 1 skipped (1858 assertions)** — +2 testes / +8 asserções sobre os
498/1850 do gate, que eu reconferi antes de revisar em vez de herdar do relatório. Pint `passed` nos
5 arquivos novos/editados do fix. **Uma exceção honesta:** `ProblemDetails.php` reprova no Pint, e
**já reprovava antes desta edição** — conferido rodando `pint --test` sobre a versão de `HEAD`, com a
mesma lista de fixers. É dívida de estilo pré-existente num arquivo que o bloco não tinha tocado;
reformatá-lo inteiro seria ruído de diff (lição 9), então ficou. `pnpm lint`, `pnpm build` e
`pnpm test` (13 arquivos / 47 testes) verdes; `typescript:transform` **sem diff** em `generated.ts` —
nenhum DTO mudou de forma. Correções no commit `d01c279`.

## Penúltimo item fechado — 2026-08-08 (`certificacao-frontend`)

### Gate de fechamento — 2026-08-08

**O item 0 foi refeito contra a API real, não herdado do gate de execução:** as correções
Q-1..Q-9 entraram depois do e2e da Task 11 e mexeram exatamente nos caminhos do painel e do lote
(o Q-3 reapontou os testes de invariante para o `EmissionPanelQuery`; o Q-5 mudou o contrato do
batch). `migrate:fresh --seed` no MySQL — desta vez sem a negação de permissão que travou a
Task 11 —, sessão Sanctum por cookie + CSRF (lição 12: `Origin` e `Accept` obrigatórios, XSRF
reextraído do cookie jar pós-login).

**A cadeia inteira do §5 da spec, pela API:**

1. **As portas do painel destravadas uma a uma:** o seed fresco não tem template no curso 2 e o
   painel respondeu `emission_blocked: 'sin_plantilla'` com a turma 3 **visível** (o contrato
   D-P3); `POST /api/courses/2/templates` moveu o bloqueio para `plantilla_sin_ciudad` (porta 5);
   `layout_config.city = 'Santiago'` zerou (`null`). Motivo sempre calculado no servidor (D-P1) —
   o cliente nunca re-derivou porta. Os 15 alunos no painel, todos com RUT string não-nulo (Q-3).
2. **Resultado acadêmico:** `PUT /api/turmas/4/alunos/36/resultado` com `"6,9"` → **200** com a
   vírgula chilena de volta na resposta; `grades.final = []` → **422** RFC 7807 es-CL
   (`La nota final debe ser un número o un texto no vacío.`); e a turma **concluída** recusando
   com **RN-15** — o primeiro ensaio contra a turma 3 levou 422 por comportamento correto, não
   por defeito.
3. **Emissão individual** com `redator_id` (D11) → **201 `LOT-2026-1000`**, snapshot congelado
   com a razão social (`Enel Distribución`).
4. **PDF com `description` de 3.689 chars** (alongada pela própria API de curso, preservando o
   template — coleção `Optional` intocada): **200 `application/pdf`, 2 páginas, A4
   (594.96 × 841.92 pts)**; `pdftoppm` da página 1 inspecionada — descrição clampada com
   reticências visíveis, QR + assinatura (Ana Reyes) + disclaimer ancorados na página 1.
5. **Historial → Revocar → Reemitir:** listagem 200; `POST .../revoke` com motivo → **200
   revocado**; a rota pública passou a dizer `revocado` com `revoked_at` presente e
   `revocation_reason` **ausente**; reemissão no mesmo enrollment → **201 `LOT-2026-1002`**,
   uuid novo — só possível por ser revocado (D8).
6. **Batch `[26, 23, 31]`** com a falha provocada (31 já tinha vigente) → **200** com relatório
   por item: os dois emitidos com números **contíguos** `LOT-2026-1003`/`1004` (a falha não
   consumiu número — invariante §4.5) e a falha **nomeada**
   (`Ya existe un certificado vigente para esta matrícula.`); `[26, 26]` → **422** — o
   `distinct` do Q-5 vivo na API.
7. **Validação pública sem cookie, sem CSRF e sem `Origin`:** 200 para emitido e para revocado;
   **404 RFC 7807** para uuid inexistente.
8. **Manual da turma 3:** **200 `application/pdf`, 1 página, A4** — a dívida do Letter segue paga.

**Demais itens:** suíte **493 passed, 1 skipped (1833 assertions)**, idêntica ao placar declarado
· frontend **13 arquivos / 47 testes**, `pnpm lint` e `pnpm build` verdes · Pint `passed` nos
**26** `.php` vivos do bloco · `typescript:transform` **sem diff** em `generated.ts` · código
morto zero (sem `.gitkeep`/TODO novos; `/certificados` não referencia mais `ModulePlaceholder`) ·
leis §5 limpas (o único hit do grep cross-feature é docblock; zero import real).

**O que o gate NÃO provou, herdando a decisão do João:** os Steps 1 (tela real) e 5 (checkpoint
visual) seguem não executados — nenhuma tela do módulo foi vista renderizada por ninguém. O
conteúdo do QR (`frontend_url + /validar/{uuid}`) fica com a prova do gate de execução: não há
decodificador de QR no host (`zbarimg`/`cv2` ausentes) e nenhum Q tocou o Blade.

**Pendências revisadas:** a **P-15 teve o gatilho vencido e foi reescrita** — o bloco entregou o
módulo próprio e **não tocou** listagem/detalhe do aluno; a decisão de expor coluna/card lá segue
com o João (revisar 2026-09-30). Nenhuma outra venceu (P-04 reavalia 2026-08-15; P-03 sem dois
backends em paralelo), nenhuma fechou, nenhuma nasceu.

**Arquivamento:** plano → `plans/archive/2026-08-08-certificacao-frontend.md`; spec do bloco →
`specs/archive/2026-08-08-certificacao-frontend-design.md`; e a spec base
`2026-08-05-certificacao-sprint-4-design.md` **arquivada junto** — este bloco era o último
consumidor dela, fechando o arquivamento assimétrico de 2026-08-07. Entrega registrada no
`progress.md` (a de 2026-08-02/redator desceu ao `progress-archive.md` para manter dez); item 1
removido do `backlog.md` com renumeração dos seguintes, e a linha "Certificados" dos módulos
marcada entregue.

**Estado do banco de dev:** `migrate:fresh --seed` do gate + mutações do e2e (template v1 do
curso 2 com `city: Santiago`, `description` do curso 2 alongada para 3.689 chars, resultado da
matrícula 36, certificados `LOT-2026-1000`…`1004` com o 1000 revocado). Nada é fixture de código;
o cenário canônico volta com `migrate:fresh --seed`.

**Item 1 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-08** (`/planejar-bloco`
com o item nomeado literalmente no argumento — "Certificação · frontend (módulo próprio)" — e o
estado em `idle`; o comando não promove item sozinho). É o que sobrou do Bloco 7 depois do D-P8:
as Tasks 9–13 do plano arquivado migraram inteiras e serão **replanejadas**, não copiadas —
certificados ganham módulo próprio na interface.

**Rota direta a `ready_for_planning`, sem regeração de packet — motivo medido, não pressa:** o
próprio item do backlog fixa o contexto obrigatório, e as quatro fontes estão disponíveis sem
varredura nova. (1) A spec `2026-08-05-certificacao-sprint-4-design.md` **segue ativa** — este
bloco é o último consumidor dela (a invariante §4.2 migrou junto). (2) Os **prints do protótipo
Figma** — a única fonte `unavailable` do packet, e gatilho de staleness declarado — entraram na
própria seleção: o João anexou 5 telas ao argumento do comando (Emisión vazia; Emisión com turma
concluída e tabela de alunos com nota/asistencia/estado acadêmico/ação Emitir + botão de lote
"Emitir todos los pendientes"; diálogo "Confirmar emisión"; diálogo "Certificado emitido" com
Descargar PDF; Historial com busca, filtro de estado e estados Vigente/Por vencer/Vencido/Revocado
com ações Ver/Revocar/Reemitir). São instrução vigente de topo de hierarquia; a spec/plano do bloco
fixa o que deles vira contrato. (3) O packet `certificacao-sprint-4.md` (`status: partial`) é
**reutilizado por ponteiro**, como o backlog manda, para não repetir a varredura de Drive/Notion.
(4) O `Libro de Control de Clases` não é espelhado no repo; o packet o registra como
`D-OFFICIAL-MANUAL` (Drive `1VE89_MEiRlY574NqPaWvB7IkdAA0zo0T`), consultável se o desenho precisar.

**Dívidas com prazo que o bloco herda (do próprio backlog):** DTOs de certificação em
`generated.ts` sem consumidor; Manual de Classe saindo em **Letter** (Blade sem `@page`); rodapé/QR
absolutos transbordando de página com `courses.description` longa.

**Toca `frontend/` e Blades de `backend/resources/views` → main tree, sem worktree (P-03).**

### Brainstorming de 2026-08-08 — decisões do João e spec aprovada

**Cinco decisões explícitas do João:** as **4 frentes num bloco** (módulo `/certificados`,
validação pública + D19, resultado acadêmico na turma, Blades herdados); **Reemitir só para
Revocado** — Vencido fica sem reemissão (o botão do protótipo colide com o índice único do D8;
renovação de vencido é capacitação nova); **"Por vencer" = 30 dias**; **lote = endpoint batch no
backend com relatório por item** (cada matrícula na própria transação); e **validação/resultado
sem print** — composição sem referência, checkpoint dele cobre.

**Nove medições moldaram o desenho antes dele existir** (destaques): `issuable` não sustenta a
tela do protótipo (só emissíveis, 3 campos) e vira `emission-panel` com todos os alunos e os DTOs
`Issuable*` mortos no mesmo commit; turma **não tem código** — o "TR-43" do protótipo não existe
no schema; `IssueCertificateData` exige `redator_id` e o protótipo omite o seletor que a D11
manda existir; o "Confirmar emisión" mostra código pré-emissão que a D9 torna impossível; e a
`frontend-fsliced.md` ainda afirma "validação QR fora da SPA", contra a D14 aprovada — a rule é
corrigida no bloco (lição 13).

Design aprovado em 8 seções em 2026-08-08. Spec:
`docs/superpowers/specs/archive/2026-08-08-certificacao-frontend-design.md`.

### Plano escrito em 2026-08-08 — 12 tasks (0–11), `executor: claude` (SDD)

`docs/superpowers/plans/archive/2026-08-08-certificacao-frontend.md`. A escrita do plano achou **quatro
desvios contra a spec aprovada, declarados no §Desvios** (lição 13): D-P1 — o motivo de bloqueio
da turma no painel é **calculado no servidor** (`emission_blocked`), porque as portas 5/6 (cidade,
redator) não são deriváveis do payload que a spec listou, e re-derivar porta no cliente é a classe
de bug que o docblock do `CertificateEligibility` documenta; D-P2 — as portas são **6, não 4** (a
spec base envelheceu); D-P3 — os 3 testes de **ocultação** do `issuable` migram de contrato: turma
não emissível agora **aparece bloqueada**, mudança deliberada; D-P4 — `problemFromBlob` não existe
(a task antiga que o extrairia migrou para cá) — o PDF reusa o padrão do `useTurmaManual` e a
extração só acontece se virar duplicação. Review de bloco declarado **alto risco** (peso legal +
rota pública + `generated.ts`) → duas frentes quando chegar em `ready_for_review`.

### Execução de 2026-08-08 — Tasks 0–10 entregues, Task 11 parada no checkpoint do João

Branch `feature/certificacao-frontend`, a partir de `3d7ee5c`. As **onze primeiras tasks estão
entregues e revisadas** (uma revisão de task por entrega, fix dispatchado para todo Critical e
Important, Minor acumulado para o review final). Placar: backend **492 passed, 1 skipped (1831
assertions)**; frontend **13 arquivos / 47 testes**, `pnpm lint` limpo, `pnpm build` verde. Pint
`passed` nos 23 `.php` vivos do bloco, `typescript:transform` **sem diff** em `generated.ts`, e os
seis greps de lei do Step 4 do gate todos limpos.

**Task 10 adotou o WIP do João em vez de reescrever.** Os cinco arquivos do resultado acadêmico já
estavam na working tree sem commit quando a task abriu; a disciplina do `/executar-bloco` manda o
working tree existente vencer, então o subagente completou o que estava lá. O commit `1023c5b` sai
assinado por ele.

**Dois defeitos de peso legal foram achados por review e vistos falhando antes do fix** (lição 10):
o relatório do lote perdia o **nome** de exatamente quem recebeu o certificado, porque `pendientes`
era derivado da turma viva e a invalidação do painel repintava por baixo do diálogo aberto
(`6c57888`); e `grades` vazio ia como `{}` em vez de `null`, gravando `[]` na coluna e escrevendo
uma mudança de nota que não houve na auditoria da matrícula (`b85b736`).

**O mutante que o plano previu para o lote não mata.** Envolver o loop do
`CertificateController::batch` num `DB::transaction` deixa os nove testes do `BatchIssueTest`
verdes — o teste de número contíguo fala de contiguidade, não de isolamento. O comentário do
controller afirma "não há transação externa" e nada guardava isso. Guarda nova em `be58466`: item
já emitido tem de sobreviver a uma falha inesperada no item seguinte; contra o mutante,
`Entries found: 0`.

**O que o gate provou sem browser:** manual em **A4, 1 página** com os 15 participantes (dívida de
Letter paga); certificado em **2 páginas A4** com `description` de 3.814 caracteres, descrição
clampada com **reticências visíveis** e QR/assinatura/disclaimer todos ancorados na página 1;
validação pública **sem cookie, sem CSRF e sem `Origin`** devolvendo 200 para emitido e para
revogado, com `revoked_at` presente e `revocation_reason` **ausente** do DTO público, e 404 para
uuid inexistente; e o QR do PDF codificando `frontend_url + /validar/{uuid}`, a rota que a Task 9
criou.

**Task 11 não fecha nesta sessão, e o motivo não é escolha:**

1. `migrate:fresh --seed`, pré-requisito do Step 1, foi **negado pelo classificador de permissão**.
   Não foi contornado. O banco de dev segue com o estado acumulado da execução.
2. O Step 1 na tela real e o Step 5 inteiro precisam de browser, e o host WSL **não tem as
   bibliotecas de sistema** dos browsers do Playwright (`libasound.so.2` ausente; firefox e webkit
   reprovam no mesmo check; não há Chrome de sistema). Instalar exige root.
3. O Step 5 sempre foi **não delegável** — é o checkpoint visual do João, escrito assim no plano.

**Duas questões para o checkpoint visual, além do roteiro do plano:** o botão **Revocar** não
aparece para o admin do seed, porque `certification.certificate.revoke` é superadmin-only no
`RolePermissionSeeder` — se a intenção era o admin revogar, é decisão de permissão, não de
frontend; e o ramo **expirado** da página pública mostra só o cabeçalho, sem curso nem aluno, o que
é leitura literal do brief mas pode não ser o que um fiscalizador precisa ver.

Evidência completa, task a task, com os Minor acumulados para o review final:
`.superpowers/sdd/progress.md`.

### Review de sprint — 2026-08-08: duas frentes, 9 achados aprovados e corrigidos

**ALTO RISCO declarado no plano** (documento de peso legal + rota pública + `generated.ts`) →
lente Claude com o gabarito do projeto + Codex read-only sobre `3d7ee5c..bbe1f39`. Da fusão saíram
**9 achados (3 🟡, 6 🟢)** — 6 vistos primeiro pelo Codex, todos verificados no código antes de
entrar — e **3 achados do Codex rejeitados com evidência** (relógio do `certStatus` no render é o
design literal do plano; DST só desloca o badge `por_vencer` ±1 dia na direção conservadora;
`generated.ts` antes dos consumidores era o agendamento do plano com zero consumidor existente).
O accent-bottom deduplicou com o item 3 do ledger — decisão de negócio já registrada, não achado
novo. Órfãos: zero, fora a face morta que virou o Q-3. O João aprovou **exatamente Q-1..Q-9**,
mantendo as rejeições.

**As correções (commits `c02f29e` backend, `3884101` frontend):**

- **Q-1 🟡** `IssuedDialog` lia nome vivo do painel mesmo com o snapshot carregado — 4ª ocorrência
  da classe vivo×congelado. Agora lê `certificate.snapshot.aluno/curso.name` e o canal de dado
  vivo morreu inteiro: props `studentName`/`courseName` e o estado `Viewing` do `EmissionPanel`
  saíram do código.
- **Q-2 🟡** `useIssueBatch` invalidava só em `onSuccess`; o 500 no meio do lote (o caminho que
  `be58466` prova existir) deixava o painel prometendo `sin_emitir` para matrícula já
  certificada. `onSettled`.
- **Q-3 🟡** A face de lista morta (`issuableTurmas` + 6 `constrain*`) saiu do
  `CertificateEligibility`, com o `enrollmentIdsComVigente` que só ela consumia. Os 3 testes de
  invariante migraram para o alvo de produção real: o que o `EmissionPanelQuery` apresenta como
  emissível (bloqueio nulo + `aprobado` + sem vigente — o espelho do `rowCertKind` do front)
  passa nas portas, e o que as portas recusam nunca aparece emissível. As cadeias reprovadas do
  setUp ganharam RUT de aluno próprio: o painel projeta toda turma concluída e
  `EmissionPanelEnrollmentData::$student_rut` é `string` não-nulo.
- **Q-4 🟢** `useHistorial` só dispara `emission-panel` com permissão de `issue` (`enabled`) — o
  usuário só-`view` não colhe mais um 403 no mount da aba.
- **Q-5 🟢** `enrollment_ids.*` ganhou `distinct` + teste novo (id duplicado → 422).
- **Q-6 🟢** Os 3 docblocks que citavam o contrato morto do `issuable` reescritos para o painel
  real (lição 13).
- **Q-7 🟢** `STATUS_SEVERITY` unificado em `lib/certStatus.ts`; chave `fieldRelator` →
  `fieldRedator` nas 3 locales e nos 2 diálogos (vocabulário do backend).
- **Q-8 🟢** `RegisterResultDialog` trava fechar durante o PUT em voo (gate do
  `ConfirmIssueDialog`), matando o `onSuccess` velho que fechava o diálogo reaberto para outra
  matrícula.
- **Q-9 🟢** Fallback do `problemFromBlob` traduzido pelo i18n (`common.unexpectedError` +
  `unexpectedErrorHint`, chave nova nas 3 locales) — era pt-BR fixo herdado do `useTurmas`, agora
  em `shared/` com 2 consumidores e usuário-alvo chileno.

**Placar pós-correção: backend 493 passed, 1 skipped (1833 assertions)** — +1 teste (+2
asserções), o do `distinct`. Frontend 13 arquivos / 47 testes, `pnpm lint` e `pnpm build` verdes.
Pint `passed` nos 7 `.php` tocados. `typescript:transform` **sem diff** em `generated.ts`.

**Decisões do João — 2026-08-08, fecham o review:** a regra proposta para o padrão
vivo×congelado (tela que exibe certificado emitido lê `certificate.snapshot`, nunca projeção
viva — 4ª ocorrência) **não se aplica, por decisão explícita dele** — `frontend-fsliced.md` fica
intocada e a proposta fica registrada aqui como decisão consciente, não como pendência. As 4
decisões de negócio fecharam todas em "ok como está": a elisão da descrição longa fica; o
penhasco dos 68 chars no nome do curso + accent-bottom fica sem guard-rail; `revoke` segue
superadmin-only; e o ramo `expired` da página pública segue só com o cabeçalho. Nada foi
deferido para `backlog.md` nem para `pendencias.md` — não há trabalho pendente nem divergência
documental nascendo aqui. O checkpoint visual do módulo segue como limitação declarada do gate,
herdada pelo fechamento.

**Fechamento do gate — 2026-08-08, decisão do João.** Ele aprovou o bloco com os Steps 1 (tela
real) e 5 (checkpoint visual) **não executados**, pelas três razões acima. Fica registrado sem
maquiagem: o bloco entra em `ready_for_review` com a prova visual pendente, e nenhuma tela deste
módulo foi vista renderizada por ninguém até aqui — a evidência é de API real, PDF inspecionado
página a página, suíte e lint. Quem fizer o review de sprint herda isso como limitação declarada,
não como item silenciosamente cumprido. O review é **alto risco** por decisão do plano (documento
de peso legal + rota pública + `generated.ts`) → duas frentes, lente Claude + Codex read-only.

## Antepenúltimo item fechado — 2026-08-08 (`profundidade-backend-b4-b7`)

### Gate de fechamento — 2026-08-08

**O item 0 foi refeito, não herdado.** O e2e da Task 9 provou uma árvore que deixou de existir: as
correções Q-1..Q-7 entraram depois dele e mexeram exatamente nos caminhos de listagem. O gate rodou
contra `migrate:fresh --seed` no MySQL, com sessão Sanctum por cookie + CSRF (lição 12; `Origin` e
`Accept` obrigatórios, e o `XSRF-TOKEN` reextraído do cookie jar depois do login, que o rotaciona).

**Os três itens do §Gate da spec:**

1. `PUT /api/turmas/1/alunos/1/resultado` com `grades.final = "6,9"` → **200**, e a resposta devolve
   `"final":"6,9"` — a vírgula chilena sobrevive à escrita. Com `grades.final = []` → **422** RFC
   7807 es-CL, `"La nota final debe ser un número o un texto no vacío."`
2. Emissão `LOT-2026-1000` **201** com o seam conferido em **SQL cru**, não pela projeção do model:
   `snapshot.cliente.name` = `clients.legal_name` = `Enel Distribución`, enquanto `users.name` do
   mesmo cliente é `USUARIO-EMPRESA Enel`. **Os dois textos foram diferenciados à mão antes do teste**
   — o `OperationDemoSeeder` grava `name == legal_name` de propósito, e com eles iguais o e2e passaria
   mesmo se o regresso A-1 tivesse voltado (a mesma armadilha registrada no gate da Task 9).
   `GET /api/certificates/{id}/pdf` → **200 `application/pdf`**, `pdfinfo` 2 páginas, **A4
   (594.96 × 841.92 pts)**, e a página 1 imprime `Enel Distribución`.
3. `GET /api/turmas/3/alunos` → **200**, 15 matrículas, **todas** com o aluno aninhado — o
   `EnrollmentQueryBuilder` em produção.

**Os 4 sítios do Q-1 exercitados na API real, que é o que faltou no gate anterior:**
`GET /api/turmas` **200** (4 turmas, `client_name` = razão social), `GET
/api/turmas/pendientes-configuracion` **200**, `GET /api/certificates/issuable` **200** e `GET
/api/turmas/3/manual` **200 `application/pdf`** (25.880 bytes). **O Q-4 foi provado no mesmo passe:**
`users.rut` posto em **NULL** num cliente que aparece nas duas listagens, e nenhuma delas estourou —
era exatamente o `TypeError` que o `?string` fechou.

**Demais itens:** suíte **477 passed, 1 skipped (1698 assertions)** · `pnpm lint` e `pnpm build`
verdes · Pint `passed` nos 16 `.php` do commit de correção · `typescript:transform` **sem diff** em
`generated.ts` (D-P1 segue valendo) · `git diff main...HEAD` vazio em `frontend/` e em
`backend/database/` (zero schema, como a spec previu) · leis §5 sem violação (zero `Repository`, o
único `abort()` de `app/` é o 404 pré-existente do `PublicCertificateController`).

**Triagem dos 6 Minor acumulados nas Tasks 4–8:** cinco fecharam no review — o `$rotulo` morto (Q-7),
os 5 sítios de `LISTING` (Q-3), o label `'reprovada'` (Q-5), o footgun de ordem do builder (Q-6) e o
desvio do Pint na Task 7, que era desvio documentado e não defeito. **O sexto não foi corrigido e não
virou débito:** "o comentário do teste poderia explicar melhor a ordem turma→student" é cosmético e
não faz doc nem mecanismo divergir da realidade, que é o critério do `pendencias.md`.

**Pendências revisadas:** nenhuma venceu gatilho, nenhuma fechou, nenhuma nasceu. P-04 segue com
reavaliação marcada para **2026-08-15** (§5.1 e §5.2 continuam sem mecanismo — este bloco entregou
catraca de cadeia e de eager-load, que são outra fronteira). P-03 ganha mais um bloco de backend em
main tree sem atrito, mas o gatilho dela é dois blocos de backend em paralelo, que não ocorreu.

**Estado do banco de dev:** ficou com o `migrate:fresh --seed` do gate mais as mutações do e2e
(template do curso 2, resultado da matrícula 1, certificado `LOT-2026-1000`, `users.name` do cliente 3
diferenciado e `users.rut` do cliente 1 nulo). Nada disso é fixture de código; quem precisar do
cenário canônico roda `migrate:fresh --seed` de novo.


**Item 2 do `backlog.md`, selecionado explicitamente pelo João em 2026-08-07** (`/planejar-bloco`
com o item nomeado literalmente no argumento e o estado em `idle`; o comando não promove item
sozinho). Rota direta a `ready_for_planning` **sem packet, por ausência medida de fonte externa**
(mesmo caso do bloco `profundidade-form-crud`): as fontes são o repositório e o relatório local do
review de arquitetura de 2026-08-07 — nada de Drive/Notion/Figma. O João declarou a dispensa no
próprio argumento do comando.

**Passo 0 executado antes da seleção, na mesma sessão:** a skill `improve-codebase-architecture`
não existe nesta máquina (o João a rodou fora), então a re-verificação foi manual, alegação por
alegação, contra o código real. Resultado: B1–B3 confirmados resolvidos (`CertificateEligibility`,
`Data/Snapshot/` com `schema_version`, `App\Shared\Pdf`); **B4–B7 todos ainda válidos** — B4 com 8
sítios medidos da cadeia em 3 domínios, B5 com o lazy load do `result` confirmado, B6 com `grades`
ainda `['nullable','array']` e action pass-through, B7 com setUps de 40–98 linhas em 8 arquivos
(cresceu desde o relatório). Nada novo material no backend. O merge do bloco anterior já estava
feito pelo João (PR #31); `main` local avançou por fast-forward para `9ed46cc`.

**Brainstorming de 2026-08-07 — decisões do João:** B6 fica **declarada pelo admin** (derivar
exigiria inventar regra de corte sem fonte; a leitura futura da nota do docx de evaluación é
deferred com bloco próprio, muda ADR/RN); B4 ganha **catraca da cadeia** (teste-grep, não
reflection — mini-framework rejeitado); B5 cobre **os 4 models medidos** (Enrollment, Quote,
Client, Course — nem só o bug, nem todos os models). Corte e ordem definidos por ele na abertura:
B4 → catraca → B5 → B6 → B7 → gate, um bloco. Design aprovado em 6 seções; spec em
`docs/superpowers/specs/archive/2026-08-07-profundidade-backend-b4-b7-design.md`.

**Backend-only, main tree (P-03), zero schema — ADR/DER não abrem.**

**Plano escrito em 2026-08-07 — 10 tasks (0–9), `executor: claude` (SDD).**
`docs/superpowers/plans/archive/2026-08-07-profundidade-backend-b4-b7.md`. A escrita do plano achou
**quatro desvios contra a spec aprovada, declarados no §Desvios em vez de silenciados** (lição 13):
D-P1 — `ContratanteData` não pode morar em `Commercial/Data` como a spec D2 pedia, porque a Regra A
do `DomainDependencyTest` só expõe `Models/Enums/Services`; vai para `App\Shared\Data`, a D12 mora
em `Client::contratante()` e a dependência Certification→Commercial some por mediação (Operation)
em vez de virar aresta — e `generated.ts` **não muda**. D-P2 — `AcademicResult` vai para
`Operation\Services` (mesma Regra A; precedente `IssuanceContext`), com a aresta
`Certification → Operation\Services\AcademicResult` declarada na matriz. D-P3 — os sítios da cadeia
são 10, não 8: `EnrollStudentAction:31` precisa do **model** (`Turma::contratanteClient()` nasce) e
`manual-turma.blade.php:21` está fora de `app/` (a catraca varre blades; strings de eager-load
ficam fora por serem carga, não projeção). D-P4 — o builder de cenário não tem `->jaEmitido()`:
emissão é ato do teste, não setup.

### Execução iniciada em 2026-08-07 — `/executar-bloco`, `subagent-driven-development`

Branch `refactor/profundidade-backend-b4-b7` a partir de `main` (`1474f6b`). **Task 0** confirmou o
baseline exato do plano: 457 passed, 1 skipped (1655 assertions). **Task 1** (`ContratanteData` +
`Client::contratante()`) entregue e aprovada no review de task, com um achado Importante do próprio
brief: o caminho do teste (`tests/Feature/Commercial/`, grafia inglesa) criava uma segunda pasta
para o domínio Comercial, que já tem 40+ testes em `tests/Feature/Comercial/` (grafia portuguesa).
**Decisão do João:** o teste migra para a pasta existente — `Comercial/`, não `Commercial/`. Fix
aplicado e re-review aprovado. Placar: 458 passed, 1 skipped (1658 assertions). Commits
`d926faf`…`06f869b`.

**Task 2** (seams `Turma::contratanteClient()`/`contratante()`, `Quote::contratante()`) aprovada
sem achados. Placar: 461 passed, 1 skipped (1665 assertions). Commit `55ccb1d`.

**Task 3** (migração dos 8 sítios) expôs um gap real: `Client::contratante()` exige `user->rut`
não-nulo, e ~8 arquivos de teste em `tests/Feature/Operation/` nunca setavam `rut` (só liam
`legal_name`/`client_name`) porque a decisão Q-4 (2026-08-04) deixa o trait compartilhado
`CreatesDomainRecords::makeClientWithUser` sem default de `rut` de propósito. O subagente parou
(`BLOCKED`) em vez de escolher sozinho entre nullable na VO, accessor mais leve ou default no
trait. **Decisão do João: fixtures explícitas** — os ~8 arquivos de teste passam a setar `rut` via
`$userOverrides`, mesmo padrão que Q-4 já estabelece; `ContratanteData`, `Client`, `Turma`, `Quote`
e o trait compartilhado ficam intocados. Fix aplicado, re-review aprovado, placar de volta ao
baseline exato: 461 passed, 1 skipped (1665 assertions). Commits `3f8b671`…`4f89f2f`.

**Task 4** (catraca `ContratanteSeamTest`) aprovada. O regex varre acesso a propriedade
`->budget->client` em `app/Domains/**` (comentários strippados por `token_get_all`, mesma técnica do
`DomainDependencyTest`) e em `resources/views/**` (RAW — Blade não passa pelo tokenizer do PHP puro),
com allowlist dos dois donos do seam. String de eager-load (`'quote.budget.client'`) fica fora de
propósito (D-P3): é carga de query, concern dos builders, não travessia de código. Placar: 462/1/1666.
Commit `efeda0a`.

**Task 5** (`EnrollmentQueryBuilder` + o lazy-load do `result`) aprovada com um desvio de RED
documentado e verificado duas vezes. A abordagem literal do brief (`Model::preventLazyLoading(true)` +
`putJson`) **não conseguia reproduzir o bug**: `Illuminate\Database\Eloquent\Builder::hydrate()` só
liga o flag `preventsLazyLoading` por instância quando `count($items) > 1`, e busca singular
(route-model-binding, `find`, `firstOrFail`) nunca satisfaz isso. O subagente investigou em vez de
chutar, provou no `tinker`, e passou a chamar `EnrollmentController::result()` direto contra um
`Enrollment` hidratado com 2 linhas. Conferido de forma independente por mim contra o fonte real do
vendor, e de novo pelo revisor. Placar: 463/1/1668. Commit `f10e3ee`.

**Task 6** (builders de Quote/Client/Course) aprovada, refactor puro, placar idêntico ao da Task 5.
Commit `90deba0`.

**Task 7** (`AcademicResult` + `PrintableGrade` na escrita + snapshot lendo do VO) aprovada com um
segundo desvio documentado, este imposto pelo Pint: a forma literal do brief (`$resultado =
$enrollment->academicResult();` como variável solta) deixava o `use ...\AcademicResult` sem nenhum
type-hint no arquivo, e o fixer `no_unused_imports` **removeria o import — quebrando em silêncio
justamente a aresta que o `DomainDependencyTest` precisa provar**. Resolvido extraindo um método
privado tipado `resultadoSnapshot(AcademicResult $resultado)`. O revisor reproduziu o conflito num
arquivo de sonda isolado antes de aceitar. Placar: 473/1/1690. Commit `cedb633`.

**Task 8** (`IssuableEnrollmentBuilder` + migração dos 8 setUps de Certification) aprovada, com
contagem antes/depois idêntica em cada um dos 8 arquivos. `->jaEmitido()` **não** entrou no builder
(D-P4 respeitado). Duas colisões de índice único apareceram só em `CertificateEligibilityTest`, que
materializa 7 cadeias no mesmo `setUp`: `budgets.code` (resolvido com `null` no builder, que nunca
expõe o Budget) e `users.rut` (resolvido **no arquivo consumidor**, com um helper local que anula os
RUTs das 6 cadeias reprovadas — sem expandir a interface do builder). O efeito colateral (cada
cenário reprovado deixa de compartilhar client/course/redator com o emitível) foi verificado como são
contra a ordem real de execução das portas do `CertificateEligibility`. Placar: 473/1/1690, idêntico
ao da Task 7. Commit `5787f94`.

### Task 9 — o gate (2026-08-07)

Executado por mim direto, não por subagente: é a prova do DoD do bloco inteiro, e o DoD pede
comportamento provado contra a API real, não mais uma camada de alegação reportada.

**Ferramentas.** Suíte backend **473 passed, 1 skipped (1690 assertions)**. Frontend sem regressão:
`pnpm test` 10 arquivos / 35 testes, `pnpm lint` limpo, `pnpm build` OK. Pint `passed` nos **44**
`.php` tocados do bloco, zero reescrita. `typescript:transform` rodou e `generated.ts` ficou **sem
diff** — a prova do **D-P1**: `ContratanteData` e `AcademicResult` são VOs internos e **não vazaram**
para o front.

**Mecanismos vistos reprovando (lição 10), com sondas frescas.** A catraca foi provada nos **dois**
modos de varredura, em arquivos diferentes dos da Task 4: `EnrollStudentAction.php:22` (PHP) e
`certificate.blade.php:262` (Blade). Reprovou nomeando os dois com a linha exata; sondas removidas,
árvore limpa, verde de novo. A aresta do B6 foi provada removendo a linha
`'Operation\Services\AcademicResult'` da matriz — reprova nomeando `CertificateSnapshotBuilder.php`
— e repondo.

**E2e contra a API real**, `migrate:fresh --seed` no MySQL, sessão Sanctum por cookie + CSRF
(lição 12). Duas armadilhas que valem para o próximo e2e: sem `Origin: http://localhost:5173` o
`statefulApi()` não liga a sessão e o login devolve **500 "Session store not set on request."**; e o
`XSRF-TOKEN` **rotaciona no login** (regeneração de sessão anti session-fixation), então reusar o
token do `/sanctum/csrf-cookie` depois do `POST /api/login` dá **419 "CSRF token mismatch"** — tem
que reextrair do cookie jar.

1. `PUT .../resultado` com `grades.final = "6,9"` → **200**; com `grades.final = []` → **422** RFC
   7807, `"La nota final debe ser un número o un texto no vacío."` (es-CL).
2. `GET /api/certificates/issuable` → turma listada, `client_name` = razão social.
3. `POST /api/enrollments/{id}/certificate` → **201**. **A prova viva do seam foi conferida no MySQL
   com SQL cru**, não pela projeção do model: `snapshot.cliente.name` = `clients.legal_name`
   (`Enel Distribucion Chile S.A.`), enquanto o `users.name` do mesmo cliente é `USUARIO-EMPRESA
   Enel`. **Os dois textos precisaram ser deixados diferentes à mão no fixture** — o
   `OperationDemoSeeder` grava `name == legal_name` de propósito (comentário no próprio seeder), e
   com eles iguais o e2e passaria mesmo se o regresso A-1 tivesse voltado. Nota para o próximo gate
   que tocar esse caminho: **o cenário de demo não distingue as duas colunas; quem for provar o seam
   tem que diferenciá-las antes.**
4. `GET /api/certificates/{id}/pdf` → **200 `application/pdf`**, `pdfinfo` 2 páginas, **A4**
   (594.96 x 841.92 pts). Inspeção visual da página 1: o documento **imprime a razão social**, não o
   `user.name` — o seam chega intacto ao papel com peso legal.
5. `GET /api/turmas/{id}/alunos` → **200**, 15 matrículas, todas com o aluno aninhado — o
   `EnrollmentQueryBuilder` em produção, sem lazy-load. (A rota real é `/alunos`; o brief a chamava
   de `/enrollments`.)

Placar task a task, os desvios e os **6 achados Minor** acumulados nas Tasks 4–8 ficam registrados em
`.superpowers/sdd/progress.md`, para triagem do review final whole-branch. Nenhum Minor foi corrigido
por decisão própria: o review final decide o que entra antes do merge.

### Review de sprint — 2026-08-08, 7 achados aprovados e corrigidos

**ALTO RISCO** (documento de peso legal, matriz de domínios, validação RFC 7807): duas frentes
independentes — lente Claude + `mcp__codex__codex` read-only. Suíte reconferida na abertura do
review, não aceita por relatório: 473 passed, 1 skipped (1690 assertions), idêntico ao gate.

**O Codex viu dois achados que a lente Claude não viu, e nenhum dos dois foi aceito por relatório —
os dois foram provados por MUTAÇÃO aqui, nos dois sentidos** (versão migrada verde, versão do `main`
vermelha sob o mesmo mutante). É o argumento vivo para a segunda lente em bloco de alto risco.

**Q-1 🔴 — o seam do B4 introduziu N+1 em 4 listagens.** `Client::contratante()` lê `user->rut`, e
nenhum dos sítios carregava `client.user`: `TurmaQueryBuilder`, `TurmaController::pending`,
`CertificateEligibility::issuableTurmas` e `ManualPdfService`. Medido no MySQL de dev com
`DB::listen`: 4 turmas custavam **11 queries**, sendo 4 `select * from users` — com `.user` no
eager-load, **7**. Ironia registrada: o bloco cujo B5 existe para matar lazy-load silencioso
**adicionou** quatro, e o gate provou `/alunos` sem nunca medir `/turmas`. Guarda nova:
`tests/Feature/Shared/ContratanteEagerLoadTest.php`, companheiro de runtime da catraca estática —
visto RED nos 3 cenários com a mensagem exata (`lazy load [user] on model [Client]`) antes do fix.

**Q-2 🔴 — a migração do B7 apagou o poder discriminante de dois testes de peso legal.** Mesma
causa raiz, duas ocorrências:
(A) `CertificateEligibilityTest` só exigia `errors()` não-vazio, nunca qual porta recusou. Como o
builder dá **redator próprio** a cada reprovada, a porta 6 passou a recusar todas. Mutante
(porta 1 fora do `assert()`): migrado **4 passed**, `main` **1 failed**. Corrigido com
`MENSAGEM_DA_PORTA` — a porta nomeada tem de ser a que recusou; mutante agora reprova dizendo
"A recusa não veio da porta: turma não concluída".
(B) `PublicCertificateTest` — os defaults do builder ficaram byte-idênticos ao snapshot congelado.
Mutante (rota pública do QR lendo `$certificate->course->name` vivo em vez de
`$snapshot->curso->name`): migrado **5 passed**, `main` **1 failed**. Corrigida a cadeia viva para
voltar a divergir campo a campo; o mutante agora reprova com o diff `-"Seguridad en Alta Tensión"
+"Curso Vivo"`.

**Q-3 🟡 — `LISTING` não era fonte única:** 5 sítios ainda soletravam o array (`Create/UpdateClientAction`,
`Create/UpdateCourseAction`, `CourseRedatorController`) e migraram para `loadListingData()`. O 6º
(`CertificateEligibility`, `student.user`) fechou por `withListingData()` — **chamada de método, não
import**: a Regra A do `DomainDependencyTest` não expõe `QueryBuilders`, e aqui não precisa expor.

**Q-4 🟡 — `ContratanteData::$rut` virou `?string`.** `users.rut` é nullable no schema e as cinco
projeções que leem só o `name` passaram a estourar `TypeError` com RUT ausente — provado no MySQL
em transação com rollback. `SnapshotPartyData::$rut` já era nullable, então nada foi empurrado
para a emissão.

**Q-5/Q-6/Q-7 🟢:** a chave `'matrícula reprovada'` virou `'matrícula não aprovada'` (o desvio grava
`Pendiente`; `Reprobado` segue coberto em outro teste do mesmo arquivo); o builder perdeu o método
órfão `enrollment()` (zero consumidores) e ganhou `assertSemColisaoDePorta()`, que transforma
`->turmaNaoConcluida()->turma(['status' => …])` em `LogicException` alta em vez de override
silencioso — **visto disparando** nos dois casos por sonda temporária, removida depois; e o
`$rotulo` morto saiu do `ContratanteSeamTest`.

**Padrão reincidente virou regra, não só refactor** (3ª ocorrência da mesma classe): três parágrafos
novos em `.claude/rules/backend-ddd.md` §Testes — guarda de snapshot com cadeia viva distinta,
guarda de porta múltipla asserindo qual porta recusou, e seam que lê relação nova atualizando o
eager-load no mesmo commit.

**Placar depois das correções: 477 passed, 1 skipped (1698 assertions)** — +4 testes e +8 asserções
sobre 473/1690, exatamente os testes novos (3 do eager-load + 1 do RUT ausente). Pint `passed` nos
16 `.php` tocados, zero reescrita. `typescript:transform` sem diff em `generated.ts` (D-P1 segue
valendo: `?string` num VO interno não vaza para o front). `frontend/` sem uma linha de diff.
