---
schema_version: 1
active_feature: null
active_work_item: null
workflow_state: idle
next_owner: joao
next_action: select_backlog_item
resume_state: null
active_spec: null
active_plan: null
context_packet: null
blocker: null
last_completed_work_item: rastro-unicidade-e-gates
state_basis_commit: bd769f8
updated_at: 2026-08-13T02:40:00-03:00
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

## Último item fechado — 2026-08-13 (`rastro-unicidade-e-gates`)

### Seleção — 2026-08-12

**BD-8 do `backlog.md:208`, promovido explicitamente pelo João.** Ele abriu com
`/planejar-bloco BD-8 · Rastro, unicidade e gate no eixo de peso legal (achados 1+2+3)` e o gate do
comando **reprovou por dois motivos**, como em BD-1, BD-2 e BD-7:

1. Argumento é **título de seção**, não slug promovido, com o estado em `idle` e `active_work_item`
   `null`. O comando pode mostrar o backlog e pedir seleção; não pode promover.
2. Existia **item ativo em paralelo**: a worktree `/home/jvbat/projetos/fix-frontend`, na branch
   `feat/dialogos-faixa-visivel-acessibilidade`, carrega `faixa-visivel-e-acessibilidade-dos-dialogos`
   em `executing` (`updated_at` 14:48). A invariante de um `active_work_item` só precisava da mesma
   exceção declarada de 12-08.

**Três decisões do João fecharam o gate**, e as três ficam registradas porque nenhuma é default:
promover o BD-8 com o **paralelismo autorizado** (a outra frente é frontend, então a P-03 não
dispara contra este bloco de backend); **rota direta a `ready_for_planning`, sem Context Packet**,
por ausência medida de fonte externa — o bloco nasceu de revisão do próprio repositório e cita só
arquivos, ADR-17 e o relatório da revisão, sem Drive, Notion ou Figma; e o slug
`rastro-unicidade-e-gates`.

**A proposta foi commitada antes da promoção** (`e6c831f`, que passa a ser o `state_basis_commit`),
precedente de BD-1 e da estilização: BD-8 e BD-9 estavam só no working tree. Aquele commit carrega
junto o item 4 (Login) que o João já tinha pendente no mesmo arquivo — declarado na mensagem, não
misturado em silêncio.

**Toca backend e schema → main tree, sem worktree (P-03).** Branch `feat/rastro-unicidade-e-gates`,
criada de `18cf90a`.

### Terreno medido antes de desenhar (fato, não desenho)

1. **Os call-sites crus de pivot são exatamente cinco** — o grep de
   `->(sync|syncWithoutDetaching|attach|detach|toggle|updateExistingPivot)\(` em `app/` devolve as
   cinco linhas do achado e mais nada. A guarda estática nasce verde, sem allowlist além do próprio
   helper.
2. **O rastro de pivot não é fraco: não existe.** As 14 asserções sobre `audits` em `tests/` cobrem
   6 `auditable_type` e **dois** eventos (`deleted` 8×, `updated` 3×). Zero `sync`/`attach`/`detach`,
   zero sobre `turma` ou `redator`.
3. **A armadilha do `$auditInclude` do bloco anterior NÃO se aplica a pivot.**
   `Auditable.php:262` desvia para `getCustomEventAttributes()` quando `isCustomEvent`, então o
   filtro de atributos não zera o diff da relação.
4. **Mas existe outra, oposta:** `auditSync` com diff vazio zera os dois lados e **ainda dispara**
   (`Auditable.php:831-840`), e `config/audit.php:104` tem `empty_values => true`. Como
   `UpdateRedatorAction:66` roda `courses()->sync` em toda edição de redator, a `audits` ganharia
   linha vazia por salvada. É o que a D12 mata.
5. **O `version` tem três caminhos de escrita, não um:** `CourseTemplateController::store` (controller
   cru, sem Action nem transação), `CreateCourseAction:28-32` e `UpdateCourseAction:35-40`.
6. **O replace nested obriga `withTrashed()` na derivação.** `UpdateCourseAction:36` soft-deleta
   todos e recria; com `unique(course_id, version)` cru, `MAX` sobre vivos voltaria a 1 e o banco
   recusaria a segunda salvada.
7. **Um quarto caminho sem gate, que o relatório não listou e o código autodenuncia:**
   `DeleteTurmaAction.php:8-9` — "Home para futuras guardas do 6d (blindagem pós-conclusão RN-15) —
   hoje sem gate".
8. **Trocar a chave do erro é inerte na tela.** `FormErrorSummary.tsx:62-67` renderiza qualquer
   chave sem input mapeado e `useMutationErrors` cai no primeiro valor do mapa. Só um teste afirma
   texto literal de gate (`EnrollmentResultTest:150-151`), e é a mensagem que **fica**.

### Brainstorming e spec — 2026-08-12

O João aprovou o desenho por seções (§1+§2, depois §3+§4). Oito decisões novas entram na spec como
D9–D16; as D1–D8 vêm fechadas do grilling e não foram reabertas.

**Quatro são escolha dele entre alternativas apresentadas:** `version` **imutável** com PUT editando
in-place (contra versionamento por linha nova); **Action única como escritor exclusivo** mais
`version` fora do `$fillable` (contra service solto e contra evento `creating`, que rodaria a trava
fora de transação e viraria no-op silencioso em SQLite); **`UpdateTurmaAction` fecha total sem
caminho de correção novo** — a pergunta que o backlog deixou aberta, respondida com o precedente da
conclusão terminal; e **helper que não grava audit em no-op** (contra aceitar o ruído e contra
curto-circuitar só a designação).

**Uma amplia o escopo por decisão dele:** o `DeleteTurmaAction` entra no gate, que passa de dez para
**onze** caminhos.

**Três são consequência declarada, não escolha:** a audit cai no model que o usuário tocou, então
`course_redator` passa a ter dois `auditable_type`; o gate mantém nome e mensagem **verbatim**
para não churnar os dois testes que afirmam o texto; e a sonda de concorrência MySQL fica **fora**,
porque aqui o `unique` é a defesa de integridade e a corrida degrada para 500, não para duplicata —
o `seq_in_budget`, mesmo padrão do mesmo ADR-17, também não tem sonda.

**Risco de review declarado ALTO** (§5 da spec): schema, peso legal e `generated.ts`.

O estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até o João ler a
spec escrita e autorizar o `writing-plans`.

### Plano — 2026-08-12

**João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-12-rastro-unicidade-e-gates.md`: **sete tasks**, uma por commit, na
ordem helper → call-sites → guarda → índice → derivação → gate → fechamento. O índice vem **antes**
da derivação de propósito: sem ele, o `withTrashed()` não teria o que provar.

**Baseline medido antes de escrever (não herdado do bloco anterior):** 548 passed, 5 skipped, 2025
assertions. Projeção do plano: **+21 casos → 569**; assertions ficam para o gate medir.

**Duas coisas que só apareceram ao escrever o plano, e que mudam trabalho:**

1. **Tirar `version` do `$fillable` quebra sete sítios de teste** que criam template por mass
   assignment (`CourseModelTest`, `IssueCertificateTest`, `CertificateListingTest`,
   `CertificateEligibilityTest` e o `IssuableEnrollmentBuilder`). O vermelho é ruidoso
   (`NOT NULL constraint failed`), não silencioso, e a Task 5 traz o trait
   `Tests\Support\CreatesCertificateTemplates` para resolvê-lo por atribuição explícita.
2. **A recusa do `RemoveEnrollmentAction` nunca teve teste** — é um dos sete caminhos que a prova 11
   afirma cobrir. A Task 6 escreve o caso que falta, e ele nasce vermelho pela mensagem PT-BR antiga.

`executor: claude`, sem `paths_autorizados`: três gatilhos de lei do §5 (auditoria, schema com peso
legal, `generated.ts`) e quatro pontos que fecham por prova de mutação.

### Execução — 2026-08-12, via Subagent-Driven Development

O João escolheu **SDD (subagentes)** quando o `/executar-bloco` levantou o conflito entre a
prioridade do comando e a configuração de sessão. Cada task virou um agente implementador isolado
(brief extraído do plano, report próprio) seguido de um agente revisor dedicado. As seis tasks com
código fecharam **todas Approved**; a sétima é gate, sem commit.

- **Task 1** (`9ba3615`) — `App\Shared\Audit\PivotAudit` como fonte única da escrita de pivot
  auditada, comparando antes de delegar (D12).
- **Task 2** (`e67cbf4`) — os cinco call-sites convertidos, nas duas portas (`turma_redator` e
  `course_redator`).
- **Task 3** (`5ed6ed9`) — guarda estática: escrita crua de pivot em `app/` reprova, com allowlist
  de exatamente um arquivo.
- **Task 4** (`673cb25`) — migration `UNIQUE(course_id, version)` em `course_certificate_templates`.
- **Task 5** (`4aa077b`) — `CreateCertificateTemplateAction` derivando `MAX(version)+1` sob
  `lockForUpdate` com `withTrashed()`, `version` fora do `$fillable`, DTO em `int|Optional` e
  `generated.ts` regenerado.
- **Task 6** (`4586e6f`) — `assertAcademicallyWritable()` nos onze caminhos, nome e mensagem
  **verbatim**.
- **Task 7** — gate, verificação pura.

**Dois vermelhos de audit não discriminavam, e um deles teria passado falso.** As contagens literais
do brief incluíam a linha `created` que a própria fixture grava (`makeCourse()`, `Turma::create()`).
Na Task 1 isso reprovou o teste bom (`Failed asserting that 2 is identical to 1`); na Task 2 o
`assertSame(1, …)` **casava com a linha `created`** e passava contra o código velho. Corrigido nos
**testes**, filtrando por evento — `PivotAudit.php` não foi tocado para caber em asserção.

**Um vermelho da Task 5 não era o esperado.** Entre as 90 falhas do Step 8, 89 eram o
`NOT NULL constraint failed: course_certificate_templates.version` previsto; a de
`test_derivacao_conta_os_arquivados` era 422 do `required` pré-existente sobre `layout_config => []`.
Corrigido o **payload do teste**, não a regra de validação — afrouxar `required` seria mudança de
contrato não pedida.

**Gate (Task 7):** backend **569 passed, 5 skipped (2092 assertions)** — exatamente a projeção do
plano (548+21). Frontend 27 arquivos/131 testes, lint limpo, build verde; o diff de `frontend/`
contra a `main` são **só** os dois arquivos gerados, conferido — os 17/86 do registro anterior são do
gate do `last-login`, antes de merges posteriores na main. Pint `passed` nos 33 `.php` do bloco;
`typescript:transform` regenera com diff **zero**.

**E2E contra a API real: 7/7**, com sessão Sanctum viva. `version: 99` no payload produziu **3**;
MySQL recusou o par repetido (`Duplicate entry '8-90'`); designação real gravou audit com
`new_values` populado e a repetida gravou **zero** linhas (D12 provada onde precisa valer); D13
confirmada com os dois `auditable_type`; os quatro caminhos da RN-15 devolveram 422 +
`application/problem+json` + mensagem exata, sem mutar nada. Dois casos além do brief foram escritos
porque o status sozinho não provaria a afirmação: designar redator **já anexado** (se o gate rodasse
depois do `PivotAudit`, o diff vazio curto-circuitaria para 200) e redator **não habilitado**.

**Mutação declarada no banco de dev**, append-only e nomeada no ledger (course 8, budget 7, quote 9,
turma 5 criada para o gate, templates, dois `course_redator`, um `turma_redator`, files 20-22,
audits 460-481). **Nenhuma turma semeada foi concluída, apagada ou tocada.** Uma única linha
pré-existente mudou, aditiva e reversível: `course_ids` do redator 2 de `[2,3]` para `[2,3,8]`.
`LOT-2026-1001` reconferido corrompido, intocado. Nenhum `migrate:fresh`, `refresh`, `reset` ou
seeder rodou.

**O que o gate NÃO provou, sem maquiagem:** a derivação não tem prova de concorrência MySQL (D16,
escolha declarada — `lockForUpdate` é no-op em SQLite, onde a suíte roda, e o `unique` é a defesa de
integridade); 7 dos 11 caminhos da RN-15 só foram exercitados em SQLite; a cadeia
template → certificado não foi percorrida ponta a ponta, então "o resolver escolhe o template certo"
segue não provado; nenhuma tela vista renderizada (bloco de backend); **sem backfill (D2)** — o
rastro dos dois pivots começa aqui e o passado não é recuperável; a retenção de `audits` segue aberta
(P-02/P-30) e este bloco aumenta o volume.

### Achados abertos, para triagem do review — 2026-08-12

Os reviews de task fecharam Approved; estes seis ficaram registrados no ledger como Minor ou como
achado do próprio gate, e **nenhum foi corrigido**. Entram no `/revisar-sprint` como entrada, não
como pendência resolvida.

1. **Achado do gate, o mais grave da lista:** a audit de `sync` registra o **delta, não o conjunto**.
   O redator 2 já tinha os cursos 2 e 3 e `old_values` veio `{"courses":[]}` — o **estado** anterior
   não é reconstruível a partir da `audits`. Numa tabela de peso legal, é o que este bloco existia
   para consertar e consertou pela metade.
2. `HabilitacaoTest.php:267-284` —
   `test_edicao_de_redator_sem_mudar_curso_nao_grava_audit_de_sync` **não discrimina**: `sync()` cru
   também não grava audit, então ele passa contra os dois códigos. Texto veio verbatim do plano; a
   D12 está provada de fato em `PivotAuditTest` e no e2e.
3. `PersistenceLawsTest` — a regex da guarda nova não tem o modificador `i`, e o dispatch de método
   em PHP é case-insensitive: `->Attach(` passaria. A guarda irmã do mesmo arquivo tem a mesma
   lacuna, então é estilo da casa, não defeito novo.
4. `tests/Support/CreatesCertificateTemplates.php:19-24` — engole chave desconhecida em silêncio;
   um `makeTemplate($id, ['validityMonths' => 24])` futuro gravaria o default e o teste passaria
   contra o default. Nenhum chamador atual está errado.
5. `CreateQuoteAction` ainda escreve `seq_in_budget` por mass assignment enquanto este bloco tirou
   `version` do `$fillable` — os dois consumidores do mesmo padrão do ADR-17 passam a defender a
   coluna derivada em profundidades diferentes.
6. Duas dívidas pré-existentes achadas e deliberadamente não corrigidas: validação `required` sobre
   o `redator_ids` read-only, e ~80 avisos de `Optional` no `typescript:transform`.

**Dois erros de ponteiro na spec, conferidos por mim no código, que não são defeito de código:** a
D14 afirma que **dois** testes congelam a string da RN-15, mas `IssueCertificateTest:107` afirma a
mensagem da **RN-08** (outro gate, condição oposta) — só o `EnrollmentResultTest:151` congela a
RN-15; e a spec justifica a troca de chave `status` → `turma` citando `FormErrorSummary.tsx:62-67`,
**arquivo que não existe** no repositório. A conclusão da spec sobrevive pelo mecanismo real:
`useMutationErrors` (`frontend/src/shared/hooks/useEntityForm.ts:54-63`) cai no primeiro valor do
mapa **independentemente da chave**, e `useConclusionSection.ts:15` consome esse `message`.

Ledger fino task-a-task em `.superpowers/sdd/progress.md` (local, não versionado).

**Estado: `ready_for_review`.** O review final de branch inteira **não foi rodado** — o João recusou
o despacho. Este comando não inicia review; a próxima instrução dele aciona `/revisar-sprint` sobre
o trabalho ativo, com a lista de seis achados acima como entrada.

### Review de sprint — 2026-08-12: ALTO risco, duas lentes, 6 achados

**ALTO RISCO pelo gate da skill, e a escala da spec (§5) concorda:** schema (índice novo),
auditoria/peso legal e `generated.ts`. Duas lentes — Claude com o gabarito do projeto mais revisão
independente do Codex (read-only, `mcp__codex__codex`, `model_reasoning_effort: high`).

**Gate reproduzido, não herdado do relatório de execução:** backend **569 passed, 5 skipped (2092
assertions)**; frontend **27 arquivos / 131 testes**, `pnpm lint` limpo e `pnpm build` verde; Pint
`{"tool":"pint","result":"passed"}` nos 33 `.php` do bloco; `typescript:transform` **sem diff**
(`git status --porcelain frontend/` vazio depois de rodar); nenhuma sonda `dd(`/`dump(`/
`console.log`/`SONDA` no diff de `backend/app` e `frontend/src`.

**Órfãos: zero.** `PivotAudit` tem os cinco call-sites previstos; `CreateCertificateTemplateAction`
tem os três (controller, `CreateCourseAction`, `UpdateCourseAction`); `CreatesCertificateTemplates`
é usada por cinco arquivos de teste; `assertAcademicallyWritable()` é chamada por **onze** Actions,
conferido por grep.

**Dois achados foram provados por sonda, não por leitura** (lição 10), com o controle rodado nos
dois sentidos e a árvore restaurada em seguida (`git status --porcelain` limpo).

**Os seis achados:**

1. **Q-1 🟡** *(Claude)* — a guarda nova do `PersistenceLawsTest` é **cega para a forma maiúscula**:
   o regex não tem `i` e o dispatch de método em PHP é case-insensitive. Sonda: um arquivo em
   `app/Shared/Audit/` com `->Sync([1, 2])` faz o caso **passar**; a mesma linha em minúscula o faz
   **reprovar**. E a varredura cobre só `app/`, enquanto a guarda irmã do mesmo arquivo varre
   `app/` **e** `database/` — correção feita no review de 2026-08-11 (Q-3) pelo argumento de que a
   lei não tem escopo. Medido: `database/` tem **zero** escrita de pivot hoje, então ampliar mantém
   verde. O docblock da guarda irmã escreve que "guarda que promete cobrir uma forma e não cobre é o
   defeito que este bloco existe para não repetir" — pelo gabarito (§lição institucionalizada) o
   argumento é de 🔴; fica 🟡 porque a forma que escapa (`->Sync(`) ninguém escreve.
2. **Q-2 🟡** *(Claude + gate)* — a audit de pivot grava o **delta, não o conjunto**.
   `PivotAudit` delega ao `auditSync`, e `Auditable::dispatchRelationAuditEvent`
   (`vendor/owen-it/laravel-auditing/src/Auditable.php:827-829`) grava `old->diff(new)` e
   `new->diff(old)`. Conferido no fonte do pacote, não presumido. Consequência: numa habilitação que
   só acrescenta, `old_values` vem `{"courses":[]}` e o estado anterior **não é reconstruível** a
   partir da linha; e com a D2 (sem backfill) também não é pela soma das linhas, porque o ponto de
   partida dos pivots que já existiam nunca foi gravado. Corrigir exige **não** usar o `auditSync`
   (o pacote calcula o diff dentro de método privado) — custo M/G, decisão do João.
3. **Q-3 🟢** *(Codex, verificado)* — pivot e audit **não são atômicos** nos três call-sites sem
   transação externa (`DesignateRedatorAction`, `RemoveRedatorAction`, `CourseRedatorController`):
   o pacote grava o pivot e só depois dispara o `AuditCustom`, então falha na escrita da audit deixa
   o pivot mudado sem rastro. Os dois de `Identity` já correm dentro de transação. Correção
   proporcional: `DB::transaction` dentro do próprio helper (aninha sem efeito nos dois que já têm).
4. **Q-4 🟢** *(Claude)* — `HabilitacaoTest.php:267-284`
   (`test_edicao_de_redator_sem_mudar_curso_nao_grava_audit_de_sync`) **não discrimina** o mutante
   que mais importa. Sonda: devolvendo `->courses()->sync()` cru ao `UpdateRedatorAction:67`, o caso
   **passa** (2 assertions), enquanto o irmão `test_habilitacao_pelo_lado_do_redator_grava_audit_no_redator`
   **reprova**. Ele guarda a remoção da comparação (D12), não a remoção do helper. Correção P: no
   mesmo caso, um PUT que **muda** os cursos primeiro (1 audit) e o PUT idêntico depois (segue 1).
5. **Q-5 🟢** *(Claude)* — `tests/Support/CreatesCertificateTemplates.php:19-24` engole chave
   desconhecida em silêncio: `makeTemplate($id, ['validityMonths' => 24])` gravaria o default e o
   teste passaria contra o default. É a classe do `IssuableEnrollmentBuilder` (rule
   `backend-ddd.md` §Testes). Nenhum chamador atual está errado.
6. **Q-6 🟢** *(Claude)* — o gate pergunta `status === Concluida`, e as quatro grafias inline que ele
   substituiu perguntavam `status !== EmAndamento`. Hoje é a mesma condição (o `TurmaStatus` tem
   exatamente dois casos, conferido), mas a forma passou de fail-closed para **fail-open**: um
   terceiro estado futuro (`cancelada`) abriria os onze caminhos sem ninguém ver. A forma é anterior
   ao bloco (D14 congelou o método verbatim); o que o bloco fez foi estendê-la a mais quatro
   caminhos.

**Achados do Codex recusados, com a razão:**

- *"`lockForUpdate()` não cria mutex confiável quando ainda não há template — duas primeiras
  criações derivam versão 1 e uma termina em 500"* — em InnoDB/REPEATABLE READ o `SELECT … FOR
  UPDATE` com `where course_id = X` toma gap lock no índice, então a segunda transação bloqueia em
  vez de correr; e, mesmo se corresse, a **D16 declara exatamente essa degradação** ("aqui o
  `unique` é a defesa de integridade: sem lock a corrida vira 500, não duplicata"). Decisão
  consciente registrada não é achado.
- *"o gate lê o status sem travar a turma — corrida entre check e escrita"* — TOCTOU real em tese,
  mas a forma do `assertAcademicallyWritable()` é **anterior** ao bloco (D14 a congelou) e exigiria
  conclusão simultânea a uma escrita, com ~10 usuários internos e concorrência declarada baixa no
  `CLAUDE.md`. Não é defeito introduzido aqui; fica como nota, não como achado.

**Triagem do João — 2026-08-13: "aprovado de Q-1 à Q-6".** Os seis entraram; nenhum foi deferido.

### Correção dos achados — 2026-08-13

Cada correção foi provada por sonda, com a árvore restaurada em seguida (`git status` limpo entre
elas). O que a sonda mostrou, e não o que o código parecia dizer:

- **Q-1** — regex com `i` e varredura de `app/` **e** `database/` em `PersistenceLawsTest:145`.
  Duas sondas ao mesmo tempo (`app/Shared/Audit/SondaCaixa.php` com `->Sync([1,2])` e
  `database/seeders/SondaEscopo.php` com `->attach(1)`): a guarda corrigida reprova nomeando as
  duas; a guarda anterior, com as MESMAS sondas no lugar, passa verde.
- **Q-2** — `PivotAudit` deixou de delegar ao `auditSync` e passou a montar o `AuditCustom` à mão,
  com o CONJUNTO dos dois lados lido do banco antes e depois da escrita. Sonda: com o payload de
  volta na forma do delta, os três casos novos de conjunto reprovam e os dois casos de no-op (D12)
  seguem verdes — eles medem coisa diferente.
- **Q-3** — escrita e audit na mesma `DB::transaction`, dentro do helper: cobre os cinco call-sites
  de uma vez, e quem já abria transação (as duas Actions de redator) só ganha savepoint.
- **Q-4** — `HabilitacaoTest` passou a fazer duas edições, a segunda idêntica à primeira. Sonda:
  com `$redator->courses()->sync(...)` cru de volta na Action, o caso reprova (antes passava).
- **Q-5** — `makeTemplate()` estoura `InvalidArgumentException` em chave desconhecida.
- **Q-6** — o gate voltou à forma fail-closed `!== EmAndamento`. Sonda: com um terceiro caso no
  `TurmaStatus` (`cancelada`), a forma `=== Concluida` deixa a escrita acadêmica passar e a forma
  corrigida recusa. `TurmaCrudTest` ganhou uma guarda que varre `TurmaStatus::cases()`, então o
  status que alguém acrescentar amanhã cai nela sozinho.

**A Q-6 revelou um buraco anterior a ela, e é o achado desta rodada:** `Turma::create([...])` sem
`status` deixa a instância em memória com `status` NULO — o default `em_andamento` é do INSERT, não
do objeto. Enquanto o gate perguntava `=== Concluida`, esse nulo passava batido; com o fail-closed,
**sete casos da suíte reprovaram**, nenhum deles falando de conclusão. Corrigido no model
(`protected $attributes = ['status' => 'em_andamento']`), com guarda própria em `TurmaCrudTest`. A
forma antiga não estava só latente: escondia um caminho em que a RN-15 já não valia.

`.claude/rules/migrations.md` dizia "Pivot não audita sozinho: use `auditSync`" — a Q-2 tornou a
linha falsa e ela é carregada por quem tocar em schema. Reescrita apontando para o `PivotAudit`,
com a razão (delta vs. conjunto) junto.

**Gate reproduzido após as correções:** backend **573 passed, 5 skipped (2104 assertions)** — os 569
anteriores mais os quatro casos novos; Pint `passed` nos 7 arquivos tocados; `typescript:transform`
sem diff (nenhum DTO mudou); frontend intocado nesta rodada, então lint/build seguem valendo da
medição de 12-08.

**Estado: `ready_for_closure`.** O fechamento não roda sozinho — é chamada do João.

### Fechamento — 2026-08-13

**As correções do review estavam no working tree, não commitadas** — o último commit da branch era o
handoff para review (`bcac2d5`). O fechamento começou por commitá-las (`bd769f8`), que passa a ser o
`state_basis_commit`; a árvore ficou limpa antes de qualquer arquivamento.

**O item 0 foi refeito contra a API real, não herdado do review** — as correções entraram depois do
e2e de execução e mexeram exatamente no que ele mediu (helper, gate e model). Sessão Sanctum por
cookie + CSRF, `Origin` e `Accept` nos dois lados.

**O conjunto provado nas três portas, com o `auditable_type` do model tocado (D13):** designar o
redator 3 na turma 4 gravou `old {"redatores":[1]}` → `new [1,3]` (com o `auditSync` o `old` viria
`[]`, que é o defeito da Q-2); o `detach` gravou `[1,3]` → `[1]`; a habilitação pelo lado do curso
gravou em `course` (`[1,3,4]` → `[1,3,4,6]`); e o `PUT /api/redatores/2` gravou em `redator`
(`[2,3,8]` → `[1,2,3,8]`) **de dentro da transação externa da Action** — o savepoint da Q-3 não
quebrou o caminho. **As três repetições idênticas gravaram zero linha** (D12). Os pivots tocados
foram devolvidos ao estado original.

**A derivação foi discriminada, não só exercitada:** `version: 99` no payload produziu **92**; e o
`withTrashed()` foi medido arquivando a v92 e criando de novo — deu **93**, quando sem ele daria 92
e o `unique` estouraria. `INSERT` direto do par repetido recusado pelo banco
(`Duplicate entry '8-92'`).

**Seis caminhos da RN-15** em turma concluída devolveram **422 `application/problem+json`** com a
mensagem exata sob a chave `turma` (designar, `DELETE` da turma, `PUT` da turma, matricular, remover
matrícula e resultado acadêmico). O sétimo tentado, a importação, para na validação de `file` antes
do gate. **E o fail-closed não fechou o caminho normal:** a turma 6, criada da cotação 1 no próprio
gate, aceitou designação, matrícula e remoção de matrícula.

**Placar:** backend **573 passed, 5 skipped (2104 assertions)**; frontend **`pnpm lint` limpo e
`pnpm build` verde**; Pint `{"tool":"pint","result":"passed"}` nos **33** `.php` do bloco;
`typescript:transform` **sem diff** em `generated.ts`; nenhuma sonda no diff; órfãos zero
(`PivotAudit` com cinco call-sites, `assertAcademicallyWritable()` em onze Actions,
`CreatesCertificateTemplates` em cinco testes, `CreateCertificateTemplateAction` nos três caminhos);
resíduo de `auditSync` só em comentário.

**Mutação declarada no banco de dev**, append-only: turma 6, templates 9 e 11 (v92 arquivado, v93
vivo), audits 482-497 e um aluno de gate. `LOT-2026-1001` segue corrompido de propósito, intocado.

**Duas decisões do João no gate**, nenhuma default: a segunda `P-30` — a do `ámbar-aviso`, que veio
da branch de estilização e colidiu com a retenção de `login_logs` sem o merge acusar — foi
**renumerada para P-33**, mesma forma do P-32 em 12-08; e das três coisas abertas oferecidas para
registro, só a assimetria do `seq_in_budget` entrou, como **P-34**. O backfill (D2) e os avisos de
`Optional` do `typescript:transform` ficam sem linha própria por decisão dele.

**O que o fechamento NÃO provou, sem maquiagem:** a derivação segue sem prova de concorrência MySQL
(D16, escolha declarada); 5 dos 11 caminhos da RN-15 só foram exercitados em SQLite; a cadeia
template → certificado não foi percorrida ponta a ponta; nenhuma tela vista renderizada; e **sem
backfill** — o rastro dos dois pivots começa aqui.

**Estado:** `idle`. Nada foi promovido — a escolha do próximo item é do João, no `backlog.md`.

## Penúltimo item fechado — 2026-08-12 (`last-login`)

### Seleção e o paralelismo autorizado — 2026-08-12

**BD-7 do `backlog.md:140`, promovido explicitamente pelo João.** Ele abriu a sessão com
`/planejar-bloco ### BD-7 · last_login`; o gate do comando **reprovou por dois motivos**, não um. O
primeiro é o de sempre — argumento que é título de seção, não slug promovido, com o estado em `idle`
e `active_work_item` `null`, igual a BD-1 e BD-2.

**O segundo motivo é mais grave e foi o que exigiu decisão: existiam dois `state.md` com verdades
diferentes.** O do main tree (em `397548c`) dizia `idle` / `active_work_item: null`, com
`updated_at` de 2026-08-11T17:58. O da worktree `/home/jvbat/projetos/fix-frontend`, na branch
`feat/estilizacao-adr16-shell-tipografia` (`3acff29`), dizia `reviewing` /
`estilizacao-adr16-shell-tipografia`, com `updated_at` de 2026-08-12T11:55 — quase 18 horas mais
novo. O commit `397548c`, escrito hoje, ainda registra uma **terceira** redação (`executing`), que a
branch já superou.

**Duas decisões do João fecharam a divergência**, e as duas ficam registradas porque nenhuma delas é
o default do fluxo:

1. **Paralelismo autorizado por ele**, relaxando a invariante "existe no máximo um
   `active_work_item`". `estilizacao-adr16-shell-tipografia` (frontend, worktree, `reviewing`) e
   `last-login` (backend, main tree) correm ao mesmo tempo. A invariante segue escrita como está e
   esta é uma exceção declarada, não uma revogação silenciosa dela.
2. **A branch é a verdade.** O `state.md` do main não foi sincronizado à mão para refletir
   `estilizacao` — ele está atrasado por construção do fluxo de worktree, e o estado real daquele
   item chega ao main no merge. Cada árvore carrega o estado do seu próprio item.

**Consequência conhecida e aceita:** `feat/estilizacao` já mexe em `docs/superpowers/state.md` (+287
linhas) e `docs/superpowers/backlog.md` (+20), então os dois estados **vão conflitar no merge** e a
resolução é manual. No código a colisão é pequena e foi medida: de `features/identity/` aquela branch
tocou só `LoginPage.tsx` (2 linhas), e este bloco não toca `shared/ui/` nem as duas folhas de tema de
~7.000 linhas que ela trouxe.

**Toca backend e schema → main tree, sem worktree (P-03).** Branch `feat/last-login`, criada de
`397548c`, que passa a ser o `state_basis_commit`. **A P-03 não vence:** o gatilho dela exige dois
`active_work_item` de **backend** em paralelo, e `estilizacao` é frontend.

**Rota direta a `ready_for_planning`, sem Context Packet, mas por decisão e não por ausência de
fonte** — diferente dos blocos anteriores. Aqui existia fonte externa real: o `backlog.md:319`
escreve que "o protótipo mostra na tela de Usuários", o que é Figma. A dependência foi medida e é
estreita: coluna, captura, DTO e `generated.ts` são todos internos ao repositório, e só o **formato
do que a tela mostra** vivia no protótipo. Diante da escolha entre gerar o packet pelo Codex e
responder direto, **o João optou por decidir o formato ele mesmo no brainstorming**.
`context_packet: null`.

### Terreno medido antes de planejar (não é desenho, é fato)

1. **`last_login` é zero em toda parte, reconferido e não herdado do backlog:** nenhuma ocorrência em
   `backend/app/`, `backend/database/` e `frontend/src/`. `users` no `docs/der-fisico.md:24` não tem
   a coluna; `UserData` tem 12 campos e nenhum é ele.
2. **O caminho de captura tem uma ordem obrigatória, e ela é medida.** O gate de `is_active` do
   `AuthController.php:43-48` roda **depois** do `attempt()`. Qualquer captura anterior a ele grava
   acesso de usuário inativo com senha certa — login que a API recusa com 422.
3. **O evento `Login` do Laravel não serve, e o argumento a favor dele está morto.** Ele dispara no
   `attempt()` bem-sucedido, antes do gate. O que o justificaria — pegar portas que não passam pelo
   controller — não existe hoje: o frontend **nunca** envia `remember` (zero ocorrência em
   `features/identity/` e `shared/api/`), então o cookie "remember me" está morto, e o repo não tem
   um único listener de evento de auth.
4. **A auditoria é uma armadilha de default, documentada no próprio model.** `User.php:53-68` diz que
   `$auditInclude` **filtra o diff**: atributo de fora da lista gera audit com `old_values`/
   `new_values` vazios. `last_login` não está na lista, então `save()` comum produziria uma linha
   inútil de audit **por login, para sempre**, numa tabela de peso legal cuja política de retenção
   (P-02) ainda está aberta.
5. **`saveQuietly` sozinho não basta** — ele ainda toca `updated_at`, o que faria "última edição do
   cadastro" mentir a cada login. Precisa de `timestamps = false` junto.
6. **`RedatorData::fromModel` já achata campos do `user`** (`name`/`rut`/`email`/`phone`), então
   incluir a tela de Redatores entra pela **mesma relação já percorrida** — sem eager-load novo e sem
   o N+1 que o seam do B4 custou em 2026-08-08.
7. **O frontend já tem as duas metades do formatter:** `shared/lib/datetime.ts` carrega `formatDate`
   (curto do locale ativo, `dd-mm-aaaa` em es-CL) e `formatTime` (HH:MM). E `config/app.php` tem
   `timezone => 'UTC'`, com precedente de projeção em `CertificateData:54`
   (`revoked_at?->toISOString()`).

### Brainstorming e spec — 2026-08-12

O João aprovou o desenho com uma alteração de escopo e a instrução `o restante está aprovado`. O
estado entra em `planning` no mesmo commit da spec; `active_plan` segue `null` até a leitura humana
do documento e a escrita posterior do plano.

**Três decisões dele, respondidas antes de a spec existir:** a coluna mostra **data + hora**
(`12-08-2026 14:32`, travessão para quem nunca acessou), contra data seca e contra tempo relativo; a
captura é **escrita silenciosa** (`saveQuietly` com `timestamps` desligado), contra pôr o campo no
`$auditInclude` e contra uma tabela `login_logs` própria; e a captura vive numa
**`RecordLoginAction`**, contra inline no controller e contra listener de evento.

**A quarta é alteração dele sobre o desenho apresentado:** a spec propunha só a tela de Usuários e ele
**incluiu `RedatoresTable`** — redator autentica (RN-01) e o campo entra pela relação que
`RedatorData` já atravessa.

### A spec foi revisada no mesmo dia — o mecanismo mudou, o parágrafo acima fica

O João leu a spec e fez duas perguntas que mudaram o desenho. O parágrafo anterior **não é apagado**:
ele registra o que foi decidido na primeira passada, e a segunda decisão só se entende contra ela.

**Pergunta 1 — "não existe nada nativo do Laravel, tipo a tabela `sessions`?"** Medido antes de
responder: Laravel **não** tem `last_login` nativo (nem core, nem Fortify/Jetstream), e a `sessions`
**existe neste repo** — nativa, em `0001_01_01_000000_create_users_table.php:39-46`, com
`SESSION_DRIVER=database`, viva com 5 linhas na hora da medição (4 do `user_id=1`, uma com `user_id`
`NULL` de visitante). Ela **não** fecha o requisito: `last_activity` é última *atividade* e é
reescrito a cada request; `session()->invalidate()` no logout **apaga a linha**, então quem sai apaga
a própria evidência; e o dado expira em `SESSION_LIFETIME=120` minutos, além de morrer inteiro se o
driver virar `redis`/`file` — feature de negócio pendurada em config de infra.

**Pergunta 2 — ele quer histórico de logins, em tabela própria.** Duas decisões novas: o log guarda
**só logins bem-sucedidos** (tentativa falha e logout recusados, com razão registrada na spec) e o
"último acesso" é **derivado** do histórico — **`users.last_login` não existe mais**, contra
denormalizar a coluna em paralelo.

**O schema não copia o da `sessions`, embora tenha nascido dela na conversa.** Três colunas de lá são
artefato do driver: `id` string primary é o ID da sessão, `payload longText` é a sessão serializada
(peso morto e passivo de privacidade num log) e `last_activity integer` é unix timestamp cru, contra
o `timestamp` com cast `datetime` que o projeto usa em todo lugar.

**A revisão simplificou metade do bloco e complicou a outra.** Como nunca mais se escreve em `users`
no login, **morreram juntos** a armadilha do `$auditInclude` (item 4 do terreno), o `saveQuietly` e o
`timestamps = false` (item 5) — o desenho anterior existia inteiro para contornar uma escrita que
deixou de existir. Os dois itens medidos continuam verdadeiros; apenas pararam de se aplicar.

**Em troca, a leitura virou travessia de relação, que é onde este repo tem cicatriz.** A escolha do
mecanismo foi por **modo de falha**, não por custo: `withMax('loginLogs', 'created_at')` é mais
barato (subselect, zero query extra) mas **falha em silêncio** — controller que esqueça a carga
projeta `null` e a tela diz "nunca acessou" para todos. `hasOne(...)->latestOfMany()` custa uma
query e **falha alto**, estourando no `Model::preventLazyLoading()`. Ficou `latestOfMany`, na mesma
direção da D-B3 de `turma-habilitacao-listagem`, que matou um `??` por esconder query atrás de
fallback silencioso. O N+1 do seam do B4 (Q-1 de 2026-08-08, quatro listagens) é o precedente que
torna isso risco declarado, com guarda de runtime própria na §4 da spec.

**Risco de review continua ALTO**, com os três gatilhos intactos — auth, schema (agora tabela nova em
vez de coluna) e `generated.ts`.

### Aprovação da spec e plano — 2026-08-12

O João aprovou a spec revisada com a instrução literal `aprovado`. O plano ativo
(`docs/superpowers/plans/archive/2026-08-12-last-login.md`) decompõe o bloco em **7 tasks (0–6)**: baseline;
tabela `login_logs` mais model e relações; a captura no login; a projeção nos dois DTOs; a guarda de
N+1; o frontend; gate.

**A guarda de N+1 é task própria, não passo da projeção**, porque é o risco central declarado da §5.1
da spec e um revisor pode reprová-la aprovando a projeção.

**Baseline medido, não herdado:** backend **538 passed, 5 skipped (1999 assertions)** e frontend
**16 arquivos / 82 testes**. O registro de fechamento do BD-1 dizia **79** testes de frontend; o real
é 82, e o plano parte do medido. Projeção: **547 passed / 5 skipped** no backend e **17 arquivos / 86
testes** no frontend; o total de assertions é declarado como **registrado no gate, não projetado**.

O handoff fixa **`executor: claude`**: as Tasks 2, 3 e 4 fecham por prova de mutação, e ler o vermelho
certo (ordem de captura, `oldestOfMany`, `LazyLoadingViolationException`) é julgamento, não passo
mecânico. Nada é delegado ao Codex, então não há `paths_autorizados`.

**A escrita do plano mediu o terreno e achou dois defeitos no próprio rascunho, os dois corrigidos
antes de gravar:**

1. **`latestOfMany()` ordena por `id`, não por `created_at`** — conferido no vendor
   (`CanBeOneOfMany::latestOfMany($column = 'id')`). Num log append-only os dois quase sempre
   coincidem, mas o campo se chama "último ACESSO" e a justificativa do índice composto depende de
   `created_at`. Além disso `MAX` numa coluna só devolve **duas** linhas quando dois logins caem no
   mesmo segundo, o que acontece em retry. Ficou `latestOfMany(['created_at', 'id'])`.
2. **O teste da projeção seria falso-positivo por mass assignment.** O rascunho backdatava com
   `loginLogs()->create(['created_at' => ...])`, e `created_at` **não** está no `$fillable` — a chave
   seria descartada em silêncio, as duas linhas nasceriam com a mesma data e o caso que existe para
   discriminar `latestOfMany` de `oldest` passaria por acidente. Ficou `forceFill(...)->save()`, com
   a razão escrita ao lado. O `$fillable` **segue** sem `created_at` de propósito: a data do acesso
   não se forja por mass assignment.

Duas instruções do rascunho que eram "confira se…" viraram fato medido: o barrel
`shared/lib/index.ts:1` já é `export * from './datetime'` (não muda uma linha), e
`RedatoresTable.tsx:6` já importa de `@shared/lib` enquanto `UsersTable.tsx` não importa — os dois
passos passaram a dizer exatamente o que editar. O ID da pendência de retenção também foi fixado em
**P-30** (maior em uso é P-29), com a nota de não mexer na duplicidade conhecida do P-28.

**Estado:** `ready_for_execution`. `/executar-bloco last-login` exige instrução posterior do João.

**Fora de escopo, declarado na spec:** `SessionUserData` não ganha o campo (a captura precede a
montagem do payload, então `/me` diria "último acesso = agora" — campo que mente por construção); sem
backfill; alunos e clientes não entram porque não autenticam.

**Risco de review declarado ALTO** (§5 da spec), e desta vez a escala da spec e o gate do
`/revisar-sprint` **concordam**: três gatilhos se aplicam — auth, schema e `generated.ts`. O risco
próprio é que escrita silenciosa é, por definição, escrita que a auditoria não enxerga: `saveQuietly`
no model errado ou fora do gate não produz audit, não move `updated_at` e não levanta exceção.

### Execução — 2026-08-12, via Subagent-Driven Development

O João instruiu **`USE SDD para execução`** a meio da Task 2 (que tinha começado inline), o que
redirecionou todo o resto do bloco: cada task passou a ser um agente implementador isolado
(brief extraído do plano, report próprio) seguido de um agente revisor dedicado (spec compliance +
qualidade), com loop fix→re-review quando necessário. As seis tasks fecharam, todas Approved:

- **Task 1** (`656175c`) — tabela `login_logs`, model, `User::latestLogin()`.
- **Task 2** (`66bc72e`) — `RecordLoginAction`, captura depois do gate de `is_active`. Mutation-proof
  da ORDEM registrado (`Failed asserting that 1 is identical to 0.`).
- **Task 3** (`feef5e3`) — projeção `last_login` em `UserData`/`RedatorData`, eager-load em
  index/show. **Execução atípica:** o agente implementador foi interrompido pelo João antes de
  escrever o report (o código já estava commitado e correto); um segundo agente verificou
  retroativamente Steps 7-10. O primeiro review apontou um achado Important puramente procedural —
  o Step 2 ("ver vermelho" contra o código antigo) nunca tinha sido registrado — fechado por um fix
  que reproduziu o vermelho retroativo contra o commit pai, sem tocar o commit já aprovado.
  Re-review: Approved.
- **Task 4** (`7abbc3c`) — guarda de N+1, `LazyLoadingViolationException` provada nos dois
  controllers. Approved de primeira.
- **Task 5** (`c84173a`) — `formatDateTime`, coluna nas duas tabelas, 3 locales. Approved de
  primeira.
- **Task 6** — gate final, verificação pura (nenhum arquivo de produção, nenhum commit). Suíte 547
  passed/5 skipped; frontend 17 arquivos/86 testes; Pint limpo nos 12 arquivos `.php` do bloco;
  `generated.ts` sem diff; sem sonda; as três leis do §5 confirmadas; **E2E contra a API real do
  DoD** (lição 12) fechou os 6 sub-itens — login via Sanctum cookie/CSRF real, `login_logs` grava
  IP/UA reais, `users.updated_at`/`audits` inalterados, `/api/users` e `/api/redatores` projetam
  `last_login` certo, segundo login grava segunda linha e atualiza a projeção. `LOT-2026-1001`
  seguiu corrompido de propósito, intocado.

**O que o gate NÃO provou, registrado sem maquiagem:** nenhuma tela foi vista renderizada (WSL sem
browser) — o checkpoint visual das duas colunas fica com o João; login falho e logout continuam fora
de escopo (D2 da spec); a retenção de `ip_address`/`user_agent` segue aberta em P-30; o preenchimento
de `last_login` após um login de redator real não foi reexercitado ponta-a-ponta (só o estado `null`
foi confirmado via `/api/redatores` — o mecanismo é o mesmo já coberto pela suíte nas Tasks 3/4).

Ledger fino task-a-task (branch, commits, achados de review) em `.superpowers/sdd/progress.md`
(local, não versionado).

**Estado: `ready_for_review`.** Este comando não inicia review — a próxima instrução do João aciona
`/revisar-sprint` (ou equivalente) sobre o trabalho ativo.

### Review de sprint — 2026-08-12: ALTO risco, duas lentes, 3 achados

**ALTO RISCO pelo gate da skill, e desta vez a escala da spec e a do `/revisar-sprint` concordam** —
os três gatilhos que a §5 da spec declara se aplicam: auth (`AuthController`), schema (tabela nova) e
`generated.ts`. Duas lentes: Claude mais revisão independente do Codex (read-only, `codex` MCP).

**Gate reproduzido, não herdado do relatório de execução:** backend **547 passed, 5 skipped (2021
assertions)**; frontend **17 arquivos / 86 testes**, `pnpm lint` limpo e `pnpm build` verde;
`typescript:transform` **sem diff** em `generated.ts` (`git status --porcelain` vazio depois de
rodar); Pint `{"tool":"pint","result":"passed"}` nos 12 `.php` do bloco. Nenhuma sonda
`dd(`/`dump(`/`console.log`/`SONDA` no diff de `backend/app` e `frontend/src`.

**Órfãos: zero.** `LoginLog` tem os consumidores previstos (`User::loginLogs`/`latestLogin` e os três
testes); `RecordLoginAction` está fiada no `AuthController`; `latestLogin()` é consumida pelos dois
DTOs e pelos dois controllers; `formatDateTime` tem os dois consumidores mais o teste co-locado e sai
pelo barrel `shared/lib` que já era `export *`; `common.lastLogin` existe nos três locales e é lida
pelas duas tabelas.

**As duas lentes convergiram no Q-1 e no Q-2.** O Q-3 só o Codex viu, e foi verificado no código
antes de entrar. **Três sub-afirmações do Codex foram recusadas**, registradas abaixo dos achados.

**Uma medição que NÃO virou achado, porque o código está certo.** A conferência do
`latestOfMany(['created_at', 'id'])` contra o vendor (`CanBeOneOfMany`) confirma o desempate: a forma
com array vira `['created_at' => 'MAX', 'id' => 'MAX']` e aplica os agregados em cadeia, então dois
logins no mesmo segundo desempatam por `id`, que é exatamente o que a D-P1 do plano pretendia.

**Os três achados:**

1. **Q-1 🟡** *(Claude + Codex)* — `AuthController.php:32` segue passando
   `$request->boolean('remember')` ao `attempt()`. A D3 da spec recusou o listener do evento `Login`
   afirmando que "o caminho de cookie remember me está morto", mas a medição que sustenta isso varreu
   `features/identity/` e `shared/api/` — ou seja, o **frontend**, não a superfície da API, que aceita
   o parâmetro de qualquer cliente. Conferido no vendor: com o recaller no request,
   `SessionGuard::user()` chama `userFromRecaller()` e `updateSession()` e **reconstrói a sessão sem
   passar pelo `AuthController`**, então aquele acesso não gera linha em `login_logs` e a coluna
   "Último acceso" envelhece numa conta em uso diário — exatamente a pergunta que a D5 diz que a
   coluna existe para responder. **RN-01 (§5.5) NÃO é ferida, e isso foi verificado, não presumido:**
   o `logout()` do gate de `is_active` (linha 45) chama `clearUserDataFromStorage()`, que faz
   `unqueue` do recaller **incondicionalmente**, e ainda cicla o `remember_token`, então o usuário
   inativo não sai com cookie válido. Correção mais barata: apagar o argumento `remember` (uma
   linha), já que nenhum cliente o envia — o que torna a justificativa da D3 verdadeira em vez de
   aproximada.
2. **Q-2 🟡** *(Claude + Codex)* — `LastLoginEagerLoadTest.php:33-45`: o caso de **usuários** afirma
   só `assertOk()`, sem fixar quantas linhas foram hidratadas. O docblock do próprio arquivo escreve
   que `Model::preventLazyLoading()` só marca a instância quando `Builder::hydrate()` vê
   `count($items) > 1`; o caso de **redatores**, dez linhas abaixo, fecha essa ponta com
   `assertJsonCount(2)`. Se `actingAsAdmin()` deixar de criar um `type=admin` (hoje cria, conferido em
   `tests/TestCase.php:29`) ou o filtro do `index` mudar, a listagem cai para ≤1 linha e o teste segue
   verde guardando nada. É o padrão "teste que para de discriminar" que este repo já puniu duas vezes
   (A-1 e o `IssuableEnrollmentBuilder`). Correção: `->assertJsonCount(3)` — os dois criados mais o
   admin que autentica.
3. **Q-3 🟢** *(Codex, verificado)* — `LoginLog.php:23`: `user_id` está no `$fillable` e nenhum
   escritor o usa — o único é `RecordLoginAction`, que grava por `$user->loginLogs()->create([...])`,
   e a relação define a FK. Num log de segurança é porta sem consumidor, e contrasta com a decisão
   deliberada do mesmo bloco de manter `created_at` **fora** do `$fillable` ("a data do acesso não se
   forja por mass assignment"): o mesmo argumento vale para de quem foi o acesso.

**Sub-afirmações do Codex recusadas, com a razão:**

- *"`created_at` aceita NULL na migration"* — `$table->timestamp('created_at')->nullable()` é
  exatamente o que `$table->timestamps()` gera, e o model tem timestamps ligados (só `UPDATED_AT` é
  `null`), então todo insert por Eloquent preenche a coluna. Não é defeito.
- *"`LoginLogTest` aceita qualquer IP não nulo"* — o `user_agent` é asserido pelo valor exato
  (`SondaAgent/1.0`), o que já reprovaria uma troca de argumentos entre IP e user-agent, que é o único
  defeito que a asserção frouxa de IP deixaria passar.
- *"`store`/`update` pagam consulta extra"* — o próprio Codex classificou como aceitável e a
  conferência concorda: modelo único, `Builder::hydrate()` não marca a instância com
  `count($items) <= 1`, o valor projetado sai correto e o custo é um `SELECT` num caminho de escrita.
  Não é o N+1 que a D4 existe para impedir.

**Decisão do João (2026-08-12): os três entram.** Corrigidos na mesma sessão do review.

**Como cada correção foi provada:**

| Achado | Correção | Prova de que o teste discrimina |
|---|---|---|
| Q-1 | `attempt($credentials)` sem o segundo argumento; teste novo `test_remember_nao_abre_porta_de_reautenticacao_fora_do_controller` | com `$request->boolean('remember')` de volta só naquela linha: `assertCookieMissing` reprova — o recaller está na resposta |
| Q-2 | `->assertJsonCount(3)` no caso de usuários | com a listagem degradada a **um** staff criado: reprova (2 linhas contra 3) — a guarda deixa de valer e a asserção acusa |
| Q-3 | `user_id` sai do `$fillable` de `LoginLog` | **sem teste próprio, e isso é declarado:** é estreitamento de superfície, não mudança de comportamento. A prova é `test_login_ok_grava_uma_linha_com_ip_e_user_agent` seguir afirmando `$log->user_id === $user->id` — o escritor real continua gravando a FK pela relação |

**Um erro de método corrigido dentro da própria correção, registrado sem maquiagem.** A primeira
versão do teste do Q-1 afirmava `assertNull($user->fresh()->remember_token)` e foi vista reprovar —
mas pelo motivo **errado**: a `UserFactory:38` já semeia `remember_token`, e o
`ensureRememberTokenIsSet()` só escreve quando a coluna está vazia, então ela fica idêntica nos dois
estados do código e não discrimina nada. O vermelho era da factory, não do defeito. A asserção
passou para o **cookie recaller** (`Auth::guard('web')->getRecallerName()`), que é o que
`queueRecallerCookie()` de fato produz, e só então o vermelho passou a acusar a linha certa. A razão
está escrita ao lado da asserção para não se reintroduzir.

**Gate depois das correções:** backend **548 passed, 5 skipped (2025 assertions)** — um teste a mais
que o gate de execução, como esperado. Pint `passed` nos 4 arquivos tocados. Nenhum DTO mudou, então
`typescript:transform` não era necessário e `frontend/` ficou intocado pelas correções (`git diff`
vazio), o que preserva os 17 arquivos / 86 testes já medidos.

**O que continua NÃO provado, sem maquiagem:** nenhuma tela foi vista renderizada (WSL sem browser) —
o checkpoint visual das duas colunas segue com o João; login falho e logout continuam fora de escopo
(D2); a retenção de `ip_address`/`user_agent` segue aberta na P-30. E o Q-1 fecha a porta na origem,
mas **não** instala gate de `is_active` em requisição já autenticada: sessão comum também não
re-checa o flag, o que é anterior a este bloco e permanece aberto.

### Gate de fechamento — 2026-08-12

**O item 0 foi refeito contra a API real, não herdado do review** — as correções dos três achados
entraram depois do e2e de execução e uma delas (Q-1) mudou a chamada de `attempt()`. Sessão Sanctum
por cookie + CSRF contra `localhost:8080`, com o banco de dev **intocado** (`migrate:fresh --seed`
**não** foi rodado: o `LOT-2026-1001` segue corrompido de propósito para o checkpoint visual do João).

Estado do banco **antes** do gate: `login_logs` com **5** linhas, `users.updated_at` do admin em
`2026-08-10 17:29:30`, `audits` com **435** linhas.

- **Login real grava uma linha e nada mais.** `POST /api/login` → **200**; `login_logs` passa a 6, a
  linha nova com IP (`172.20.0.1`) e user-agent (`curl/8.5.0`) reais. `users.updated_at` **inalterado**
  em `2026-08-10 17:29:30` e `audits` **inalterado** em 435 — a escrita silenciosa medida onde ela
  precisa valer, não só na suíte.
- **`GET /api/users` projeta o valor certo:** `last_login = 2026-08-12T17:06:12.000000Z`, byte a byte a
  `created_at` da linha recém-gravada.
- **A lacuna que o gate de execução declarou aberta foi fechada aqui: o redator foi exercitado
  ponta-a-ponta.** O seed cria redator com `is_active=false` ("até o fluxo de ativação", que ainda não
  existe), então o login dele exigiu **mutação temporária e reversível** do usuário 2: senha conhecida
  e `is_active=true`, os dois por `saveQuietly()` com `timestamps` desligado. `POST /api/login` do
  `juan.morales@lotus.cl` → **200**, e `GET /api/redatores` passa a mostrar
  `last_login = 2026-08-12T17:08:00.000000Z` **só naquela linha**, com os outros seis em `null`.
  Estado restaurado no mesmo passe, conferido: hash idêntico ao original, `is_active=false` de volta,
  `updated_at` ainda em `2026-08-10 17:29:34`.
- **Segundo login avança a projeção:** `login_logs` chega a **8** linhas (três logins reais) e
  `GET /api/users` passa de `17:06:12` para `17:08:13` — o `latestOfMany` lendo a linha nova.
- **O Q-1 provado na superfície onde ele vivia.** O segundo login foi enviado com
  `"remember": true` **no corpo**, que é exatamente o que a API aceitava de qualquer cliente: resposta
  **200** devolvendo só `XSRF-TOKEN` e `laravel-session`, **zero** cookie `remember_web_*`. A porta de
  reautenticação fora do `AuthController` não existe mais na API real, não apenas na suíte.
- **`SessionUserData` continua sem o campo**, como a spec declarou fora de escopo: a resposta do login
  traz `id`/`uuid`/`name`/`email`/`type`/`is_active`/`roles`/`permissions` e nada mais.

**Higiene:** backend **548 passed, 5 skipped (2025 assertions)**; frontend **17 arquivos / 86 testes**,
`pnpm lint` limpo e `pnpm build` verde; Pint `{"tool":"pint","result":"passed"}` nos 12 `.php` do
bloco; `typescript:transform` **sem diff** (`git status --porcelain` vazio depois de rodar — os dois
avisos de `Optional` em `UserData` são anteriores ao bloco, `main` já tem as mesmas 9 ocorrências);
nenhuma sonda no diff de `backend/app` e `frontend/src`. **Órfãos: zero** — `LoginLog`,
`latestLogin`, `formatDateTime` e `common.lastLogin` têm todos os consumidores previstos. **Leis do
§5 conferidas:** as duas tabelas importam só de `@shared/*` (zero PrimeReact direto, zero
cross-feature), `generated.ts` é gerado e não editado, e a auth segue cookie de sessão Sanctum.

**O que o gate NÃO provou, sem maquiagem:** nenhuma tela foi vista renderizada — o WSL segue sem
browser utilizável, então o **checkpoint visual das duas colunas continua com o João**, e a prova
aqui é de API real, suíte, lint e build. Login falho e logout seguem fora de escopo (D2). A retenção
de `ip_address`/`user_agent` fica aberta na **P-30**, atada à P-02. E o gate de `is_active` em
requisição **já autenticada** continua não existindo — anterior a este bloco e não fechado por ele.

**Mutação declarada no banco de dev:** as três linhas de `login_logs` do gate (ids 7, 8 e 9) ficam —
o log é append-only e apagá-las seria falsificar evidência. A do usuário 2 é login real do gate, não
de uso.

### O merge com a `main` — 2026-08-12, o conflito previsto aconteceu e como foi resolvido

A seção de seleção, lá em cima, declarou que os dois estados **iam conflitar no merge** e que a
resolução seria manual. Aconteceu exatamente assim, e o registro fica porque a previsão é o que dá
valor ao fato. `main` recebeu a `estilizacao-adr16-shell-tipografia` pelo PR #41 (`0b72dba`) antes
deste bloco; `merge-tree` mediu antes de qualquer escrita: **conflito só nos quatro docs de estado**
(`state.md`, `backlog.md`, `progress.md`, `progress-archive.md`), **zero conflito de código** — os
três `locales/*.json` auto-mergearam, e a colisão medida na abertura (só `LoginPage.tsx`, 2 linhas)
não se materializou.

**Como cada arquivo fechou:** neste `state.md`, `last-login` fica como **Último** (fechou 17:25) e
`estilizacao` desce a **Penúltimo** (fechou 14:05) com a seção inteira vinda da `main`;
`integridade-e-concorrencia-backend` vai a **Antepenúltimo**, conferida idêntica nos dois lados por
diff, e `guardas-que-faltam` sai pelo limite de três fechados. A chave `review_findings_approved`
some do frontmatter, porque a `main` não a carrega depois de um fechamento. `progress.md` fica com as
duas entregas do dia na ordem cronológica e a de 2026-08-07 desce para o `progress-archive.md`,
convertida para as sete colunas de lá.

**O defeito que a resolução por hunk produziu, e que só uma medição pegou:** a primeira passada do
`backlog.md` **ressuscitou três débitos já fechados** — "Toggle da sidebar abaixo de 1024px" e
"Shell fora de conformidade com o ADR-16 §4" (da estilização) e **"`last_login` não existe"** (deste
bloco) —, deixando o arquivo em contradição com os próprios parágrafos que, 260 linhas acima, dizem
que os três blocos os entregaram. Não foi achado por leitura: foi por **contagem de linhas apagadas
de cada lado contra a base**, cruzada com o disco (17 apagadas do lado `main`, 14 ressuscitadas; 12
do lado `last-login`, 4 ressuscitadas). Fechado com os três bullets removidos e a mesma medição
repetida até dar zero nos dois lados. **A lição é do repositório, não deste bloco:** resolver merge
de doc de estado por hunk perde deleção em silêncio, e o único jeito de saber é medir os dois lados
contra a base — o mesmo repositório já perdeu um `state.md` inteiro num merge (`0ccee01`).

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

## Antepenúltimo item fechado — 2026-08-12 (`estilizacao-adr16-shell-tipografia`)

### Seleção — 2026-08-11

**Item 4 de "Próximos blocos" do `backlog.md`, promovido explicitamente pelo João** via
`/planejar-bloco item 4 — Estilização · tema custom (ADR-16), shell e tipografia` com o estado em
`idle` — o precedente é o de `turma-habilitacao-listagem` (item nomeado literalmente no argumento;
o comando não promove sozinho). Como no BD-1, o item era proposta ainda não commitada, nascida na
mesma sessão por instrução literal dele (`quero melhorar a estilização … e depois adicionamos no
backlog e seguimos`): **a proposta foi commitada antes da promoção** (`b29f3b9`), sobre a base
fresca de `origin/main` (`09a11d9`) — a edição original estava sobre base velha na branch
`fix/detalhes-tabelas-interface` e foi portada, não mesclada (guardada em stash).

**Escopo:** fechar o ADR-16 com tema custom sobre o Lara nos dois modos; shell com dono único de
título, sidebar navy fixa, header responsivo, toggle oculto em compact; tipografia em 3 papéis;
neutros numa família só e fim dos hex hardcoded. Evidência: review de UI do AppLayout de
2026-08-11 (`.artifacts/ui-review/2026-08-11T12-58-51-applayout-shell/report.txt`, 2 C + 5 B) +
análise de estilização com a lente `frontend-design`. **O item é a decisão que faltava** aos
débitos "Shell fora de conformidade com o ADR-16 §4" e "Toggle da sidebar sem efeito abaixo de
1024px" (seção "Fora dos BDs" ganhou o ponteiro; as linhas de origem ficam até o fechamento).

**Rota direta a `ready_for_planning`, sem packet, por ausência medida de fonte externa:** as
fontes são o repositório, o report em `.artifacts/`, o ADR-16 em `docs/adrs.md` e a direção
registrada na memória da sessão de 2026-08-11 — o item não cita Drive, Notion nem Figma. O Figma
**não** é fonte deste bloco de propósito: a direção é identidade própria aceita pelo João em
2026-08-11, não implementação de protótipo. Dispensa a confirmar por ele na abertura do
brainstorming, como nos precedentes.

**Isolamento:** bloco frontend-only (+ docs) — a P-03 não dispara. Worktree `fix-frontend`,
branch `feat/estilizacao-adr16-shell-tipografia` criada de `origin/main` (`09a11d9`). A branch
`fix/detalhes-tabelas-interface` (a6522b5, pushed, sem PR) ficou intocada e segue com o João.

### Brainstorming e spec — 2026-08-11

Dispensa do packet confirmada pelo João na abertura (D1). Entrevista fechou 8 decisões (D1–D8 da
spec): fontes self-hosted em 3 famílias via `@fontsource`; UI-06 fica no BD-3; UI-07 entra;
mecanismo do tema = `brand-theme.css` estático sobre o Lara (abordagem A, contra tema compilado e
runtime JS); botão primário celeste com texto azul-poste por AA medido (~2.6:1 de branco sobre
celeste reprova); radius 6→4px; review em duas frentes por tocar `locales/`. O João aprovou o
design por seções (§1+§2, depois §3+§4) com a instrução literal `APROVADO — gravar spec`. A spec
ativa materializa a paleta de 6 tokens, os 3 papéis tipográficos, as 5 mudanças de shell mapeadas
1:1 aos achados do review e o DoD que reprova pelas mesmas medições que reprovaram na abertura.
O estado entra em `planning` no mesmo commit da spec; `active_plan` permanece `null` até o João
revisar a spec escrita e autorizar o `writing-plans`.

### Spec aprovada e plano escrito — 2026-08-11

O João aprovou a spec com a instrução literal `aprovado`. **A escrita do plano achou um defeito na
spec aprovada e ele foi corrigido com decisão dele, não silenciado (lição 13):** o Lara compila as
cores inline (97 ocorrências de `#3b82f6` nas regras de componente) e as vars de `:root` são um
conjunto paralelo que as regras não consomem — a D5 original (override puro de tokens) **não**
restilizaria botão, foco nem highlight. Nasce a **D5'**, aprovada pelo João: script versionado
`frontend/scripts/generate-brand-theme.mjs` gera cópias dos 2 Lara com a escala celeste, os neutros
gray→slate (corpo em grafite, ground dark em noche), radius 4px e `"Inter var"→"Inter"`, saída
versionada em `src/shared/styles/themes/lara-{light,dark}-lotus.css` (em `shared/`, não `app/` —
a seta de dependência não sobe até `primeTheme.ts`), com teste vitest de drift; o
`brand-theme.css` fica fino (D6, humo via `--surface-ground`, `tabular-nums`). A adenda D5' foi
gravada na própria spec (§4) com a correção do §9.6.

Plano em 8 tasks (0–7): baseline → fontes `@fontsource` + tokens Tailwind → temas gerados +
guarda de drift → `brand-theme.css` + higiene de hex + foco (UI-03) → sidebar navy + toggle +
aria i18n (UI-02/04/07) → header barra utilitária + tokens no shell (UI-01/05) → enmenda ADR-16 →
gate pelas mesmas medições do report. Três desvios declarados no §Desvios do plano (focus ring
tingido em vez de anel novo; humo por var e noche por mapa; neutros unificados em slate).
Handoff: `executor: claude` — bloco de julgamento visual, sem task mecânica de paths fechados;
o Codex entra na segunda lente do review (spec §10). O estado transiciona para
`ready_for_execution` no mesmo commit do plano.

### Execução iniciada — 2026-08-11: o plano foi revisado contra o Lara instalado, e mudou

O João autorizou com `/executar-bloco estilizacao-adr16-shell-tipografia`, com a instrução literal
`Mas antes revise o plano e spec, verificando se esta de acordo`. O gate passou (spec, plano,
branch e Git coerentes); a revisão pedida **não** foi de coerência documental — foi do plano contra
o `node_modules/primereact` instalado, e achou **seis defeitos**, gravados como emenda no plano
(D-P4..D-P9). É a mesma mecânica da lição 13 que produziu a D5': defeito achado na fase seguinte se
corrige com decisão, não se silencia.

Quatro entraram declarados por serem defeito ou implementação literal da spec: o script tinha de
**remover** os `@font-face` do Lara (o rename `"Inter var"→"Inter"` os transformava numa face com
`src` 404 competindo com a do `@fontsource`); a escala `--primary-50..900` não era tocada por
nenhum dos dois mapas, então o arquivo afirmaria "sem azul Lara" carregando 20 hexes azuis; a
guarda de drift conferia 3 hexes em vez da família; e sobravam cinzas (`#1f2937` no light,
`#030712` no dark) contra a D-P3.

**Duas mudavam o construído e foram decididas pelo João antes de qualquer linha de código.**
**D-P8** — medi 9 blocos no Lara light pintando a primária com texto branco (`.p-button`, `.p-tag`
2×, `.p-badge`, `.p-selectbutton`, `.p-togglebutton`, `.p-overlaypanel-close`, `.p-steps`,
`.p-stepper`); depois do mapa isso é **2,77:1**, reprovando AA, e a cadeia de `:not()` do plano
cobria só o botão — com `AppTag` usado em 9+ arquivos de feature. Ele escolheu tornar a D6
propriedade do **tema gerado** (transform block-aware), matando a cadeia de `:not()`. **D-P9** — o
anel de foco da D-P1 media ~1,4:1 sobre branco e o DoD §9.3 passaria verde com o foco invisível,
que é o próprio UI-03; ele escolheu **restaurar a spec §4** com `:focus-visible` de 2px celeste.

O estado entra em `executing` neste commit, junto da emenda do plano — a etapa que o bloco anterior
pulou e registrou como falha de processo.

### Tasks 0–7 executadas — 2026-08-11: o código fechou, o checkpoint do João não

As sete tasks estão implementadas e commitadas na `feat/estilizacao-adr16-shell-tipografia`:
`f76ba67` (baseline), `c12a3bc` (fontes), `f54f6ff` (temas gerados), `b029ea8` (camada fina),
`59e6e1d` (sidebar/i18n), `87442f4` (header/shell), `df781c6` (ADR-16 ponto 5), `6eead8e` (correção
achada pelo próprio gate). Evidência task a task em `.superpowers/sdd/progress.md`.

**Mais duas emendas nasceram DURANTE a execução, gravadas no plano** — nenhuma reabre decisão do
João, as duas são a decisão dele aplicada onde ela vale. **D-P10**: a regra "mesmo bloco" da D-P8
pega 9 blocos, mas o Lara pinta o fundo num bloco e a cor do ícone em outro — mais 7 declarações
ficavam brancas sobre celeste. **D-P11**: o Step 6 da Task 3 esperava que o grep de `#25A5E4`
devolvesse só o `SidebarItem`; devolveu três — `AppAvatar.tsx` pintava `#25A5E4`/`#fff` inline e o
`brandOutline` mandava `dark:text-white` sobre celeste. Os dois são o par de 2,77:1 que a spec D6
nomeia, dentro do bloco que existe para matá-lo.

**Duas vezes a inspeção pegou o que os testes verdes não pegaram**, e é o padrão que a lição 13
combate: 96 verdes não provam o arquivo certo. Na Task 2, `--primary-400` e `--primary-500` saíram
com o mesmo hex e `--primary-color-text` ficou branco. Na Task 7, o grep de `ring-0` reprovou por um
motivo que virou correção: o scanner do Tailwind lê comentário, achou o token no `//` que explicava
a remoção da classe e **emitia a utility morta no bundle**.

**Gate do bloco, medido no navegador com sessão real** (não mock): UI-01 `rightEdge` 378 e
`scrollWidth` == 390; UI-02 zero `aside button` a 390, um a 1440, com a pref persistida intacta nos
dois; UI-03 Tab real casando `:focus-visible` com `outline: solid 2px rgb(37,165,228)` **somado** ao
anel do tema; UI-05 um heading por página. Mais: corpo em `Inter, sans-serif`, título em `Archivo`,
`--surface-ground` humo/noche, sidebar `rgb(15,43,61)` nos dois temas, `--primary-color-text`
azul-poste, radius 4px, `tabular-nums` nas células. Suíte **17 arquivos / 96 testes**, build e lint
verdes, `generated.ts` sem diff, os quatro greps de higiene vazios.

**O bloco PARA aqui, e o plano é quem manda parar.** O Step 4 da Task 7 é o checkpoint visual do
João, declarado **bloqueante** ("sem aprovação dele o bloco não segue"), e o Step 5 é o re-run do
`/lotus-ui-review`, que é invocação dele. Nada foi promovido a `ready_for_review`.

**Três coisas para a decisão dele, achadas olhando as telas — a medição verde não pegaria nenhuma:**

1. **O wordmark ficou ilegível (regressão do Step 4 da Task 4).** O asset é retrato **335×466**; com
   o `h-8 w-auto` que o plano escreveu ele renderiza **23×32 px**. O `on-dark` resolveu a cor, que
   era a UI-04; o tamanho errou para o outro lado do `h-30` anterior. Decisão de marca.
2. **O toggle da sidebar é uma caixa branca sobre a navy no tema claro** (`rgb(255,255,255)`
   medido). O `brandOutline` acompanha o tema; a sidebar deixou de acompanhar na Task 4. Contraste
   passa, coerência não.
3. **Celeste como traço ou texto sobre superfície clara segue reprovando.** A D6/D-P8 resolveu uma
   direção — texto **sobre** celeste. A outra não tem decisão: o outline de foco mede **2,77:1**
   sobre branco (e 5,29:1 sobre a navy, onde passa), o `brandOutline` claro mede 2,77:1, e as
   variantes `outlined`/`text` do tema caíram de 3,68:1 (Lara stock) para 2,77:1. A D-P9 continua
   certa — 1,4:1 → 2,77:1 é a diferença entre invisível e visível —; falta a decisão de cor.
   Proposta: azul-poste como traço de foco no claro (13,4:1 sobre humo), celeste mantido no escuro.

### Este arquivo foi reconstruído — 2026-08-12 (perda no merge `c9fb188`)

**Não é reescrita de história: é conserto de uma perda medida, com os dois lados recuperáveis no
Git.** O merge `c9fb188` ("fix: tailwind css applayout"), que trouxe a `origin/main` para dentro da
branch, resolveu o `state.md` num híbrido que **nenhum dos dois pais tinha**: ficou com o
frontmatter da main (`last_completed_work_item: integridade-e-concorrencia-backend`,
`state_basis_commit: e2a251c`) e, ao mesmo tempo, apagou **as duas** narrativas — a seção
`## Item ativo` deste bloco (144 linhas, vindas de `421e1c0`) **e** a seção do
`integridade-e-concorrencia-backend` que a main tinha acabado de escrever (358 linhas, de
`eca0e34`). O arquivo caiu de ~1170 para 812 linhas e passou a se contradizer: dizia no frontmatter
que o último fechado era o `integridade` enquanto a seção "Último item fechado" era o
`guardas-que-faltam`, e não havia registro nenhum do bloco em execução.

Reconstrução, sem escolha por heurística — cada peça veio de um pai identificado:

| Campo/seção | Origem | Por quê |
|---|---|---|
| `active_work_item`, `workflow_state`, `next_action`, `active_spec`, `active_plan` | branch (`421e1c0`) | é o bloco em execução; a main estava `idle` |
| `last_completed_work_item: integridade-e-concorrencia-backend` | main (`eca0e34`) | fechou 18:00, depois do `guardas-que-faltam` — é o fato mais novo |
| `state_basis_commit: b29f3b9` | branch (`421e1c0`) | é a base **deste** bloco, citada na própria seção Seleção; o `e2a251c` que o merge deixou é a base do bloco de backend |
| `## Item ativo` (144 linhas) | branch (`421e1c0`) | restaurada literal |
| `## Último item fechado — integridade` (358 linhas) | main (`eca0e34`) | restaurada literal, e a cadeia voltou a `Último → Penúltimo → Antepenúltimo` |

Nenhuma linha foi reescrita de memória. O único texto novo é esta seção e a de baixo.

### Checkpoint visual respondido — 2026-08-12: duas emendas, o bloco segue parado no João

O João respondeu ao Step 4 da Task 7. **Aprovou a navy no header e na sidebar** ("o jeito que está
atualmente está legal") e **fechou o achado nº 1** (logo): fica como está. Do retorno saíram duas
emendas, executadas e commitadas em `1a0279d`, declaradas no plano:

- **D-P12 — regressão de comportamento, achada por ele, não por teste.** Trocar o idioma parou de
  reformatar hora e data; só mudava no reload. O `Clock` nunca se inscreveu no i18n — quem
  re-renderizava era o `Header`, que tinha `t()` no título até a UI-05 dar essa posse ao
  `PageHeader`. A suíte não tinha como ver: o formato continuava certo, só congelado. Corrigido na
  origem (inscrição em quem depende dela) e coberto por `Clock.test.tsx`, que **foi rodado contra a
  versão sem inscrição e reprovou** com a data congelada — o sintoma literal do relato.
- **D-P13 — altura, texto branco e responsividade do header navy.** Altura real era 94px por causa
  das margens de user-agent dos `<p>` (o projeto não carrega Preflight): 42px mortos em cada bloco.
  Zeradas, o teto vira o avatar e a altura vira escolha — **o João fixou 80px no working tree
  durante a execução, e o valor dele ficou**. Texto branco cravado no lugar dos tokens de tema, que
  mediam 1,42:1 (nome) e 3,08:1 (relógio) sobre a navy; agora 14,65:1. 7 larguras medidas, de 1440
  a 320: zero overflow horizontal.
- **O `AppButton` fica como estava — decisão dele, contra a minha proposta.** Eu tinha entregue
  variantes `onNavy*` para os controles sobre a navy; ele **aprovou o visual e mandou reverter só o
  `AppButton`**. Revertido por inteiro (zero referências a `onNavy` no `src/`), gate refeito.
  **O achado nº 2 volta a ficar aberto por escolha dele:** a caixa branca sobre a navy passa a ser
  estética assumida, não defeito pendente. Contraste ali sempre passou; o que eu argumentava era
  coerência de superfície, e essa é chamada dele.
- **Reincidência da armadilha da UI-03 no mesmo bloco:** um comentário meu citou a classe de altura
  antiga e o scanner do Tailwind emitiu a regra morta no bundle. Segunda vez. Reescrito e conferido
  no `dist`.

**Step 4 APROVADO** — "visual aprovado", com a única ressalva do `AppButton`, já atendida. É a
primeira transição do bloco que não é minha de decidir e saiu: o checkpoint bloqueante caiu.

**O bloco continua em `executing` e continua em `next_owner: joao`, agora no Step 5:** o re-run do
`/lotus-ui-review AppLayout (sidebar, header e page)` é invocação dele, não minha. Só depois disso o
bloco pode ir a `ready_for_review`. Nada foi promovido.

**Achado nº 2 fechado por decisão de não-agir dele** (ver acima). **Achado nº 1** (logo) fechado:
fica como está.

### Achado nº 3 executado — 2026-08-12 (D-P14)

João: *"Faça o achado nº 3 e deixe papel do usuário em branco no lugar do celeste."* Feito, e o
achado se partiu em duas metades que **não aceitam a mesma cor**:

- **traço de foco → azul-poste** (13,37:1 no humo, contra 2,77:1). Traço não é marca; nada da
  identidade se perde.
- **texto → degrau 700 da rampa** (`#186b94`, 5,88:1 no branco), **não** azul-poste. Azul-poste no
  texto apagaria o celeste de toda a aplicação — botões `text`/`outlined`, abas, links — para
  consertar contraste. **Desvio da proposta original, declarado.**

**A proposta escrita continha uma armadilha que só a execução revelou:** "azul-poste no claro,
celeste no escuro" quebraria o foco na sidebar e no header, que são navy nos DOIS temas — traço navy
sobre navy é foco invisível, pior que o defeito original. O token nasce celeste e o claro o
sobrescreve; as duas superfícies navy o redeclaram. Medido com Tab real: 5,29:1 dentro do shell,
14,65:1 fora, 5,28:1 no escuro.

**Encontrado fora do pedido, no caminho:** um azul do Tailwind sobreviveu à Task 2 por quatro dias
sem guarda nenhuma ver. O `#dbeafe` está mapeado pela forma **hex**, que o Lara nunca escreve — ele
só aparece como `rgba(219, 234, 254, 0.7)`, o fundo das três mensagens `info`. A guarda passava
porque confere ausência do hex, e o hex não estava lá. Corrigido; a guarda agora cobre a forma rgba
da família inteira.

**Papel do usuário:** branco a 75% (8,84:1), o mesmo tratamento da segunda linha do relógio.

Gate: build, lint e **18 arquivos / 101 testes** verdes.

### Step 5 rodado e os achados corrigidos — 2026-08-12 (D-P15)

O João rodou o re-run do `/lotus-ui-review` (report em
`.artifacts/ui-review/2026-08-12T10-58-10-applayout-shell-rerun/report.txt`): **1 A + 6 B + 0 C**. O
A é agrupado e é o placar do bloco — os **sete** achados de 2026-08-11 fecharam e D-P12/D-P13/D-P14
se confirmaram no navegador (foco medido nas três superfícies, relógio reformatando ao vivo, header
80px sem overflow em 8 larguras). Ele então mandou resolver os achados. **Cinco entraram; o sexto
não é deste bloco.** Detalhe e medições na D-P15 do plano.

- **UI-01** — o 2,77:1 que a D-P14 matou no tema **gerado** sobrevivia no visual de marca do
  `AppButton`, que é Tailwind e o transform não enxerga: 22 call sites pintando rótulo e borda de
  celeste sobre branco, incluindo a ação primária de quase todo módulo. Nasce `--brand-ink` — celeste
  na raiz, degrau 700 no claro, lido de `--primary-700` para haver uma fonte só da tinta. Medido:
  `rgb(37,165,228)` → `rgb(24,107,148)`, **5,88:1**; escuro intacto.
- **UI-02** — a varredura achou **quatro** donos de título, não um: além do `PageHeader` do report,
  o `DetailHeader` e as duas páginas do shell que escreviam o cabeçalho à mão (`DashboardPage`,
  `ModulePlaceholder`). Os dois primeiros passam a `h1`; as duas páginas passam a **usar o
  `PageHeader`** — corrigir só a tag nelas manteria o defeito de fundo, que é a posse dividida do
  título que a UI-05 existiu para fechar.
- **UI-03** — `<html lang>` passa a acompanhar o i18n, no próprio `i18n.ts` e não num efeito de
  React. Não era regressão deste bloco.
- **UI-04** — **desvio declarado da recomendação do report**, decidido por medição: o chevron
  **fica**. O que devolvia os 18px cortados era o padding do botão, não o ícone; com o avatar dentro
  do mesmo controle o gatilho termina em 308 contra a viewport de 320. De quebra, o avatar e o nome
  deixam de ser decoração ao lado de um controle mudo.
- **UI-06** — a marca volta ao rail colapsado como glifo, asset **gerado por script versionado** no
  molde da D5' (`scripts/generate-logo-glyph.mjs` + guarda de drift). Abaixo de 1024px o colapso é
  imposto, então isto é a marca voltando a existir em tablet e mobile.
- **UI-05 — fora, por decisão anterior:** é o UI-06 de 2026-08-11, parqueado no **BD-3** pela spec
  deste bloco; o próprio report o registra como não-novo.

**Quatro mecanismos vistos reprovar contra o código antigo** antes de aceitos (lição 10). Gate:
**22 arquivos / 112 testes**, build e lint verdes, `dist` sem a utility morta, console limpo e zero
mutação — só o `POST /api/login` com a credencial de seed, o mesmo desvio que o João escolheu no
re-run.

**Estado: `ready_for_review`.** O Step 5 caiu e a Task 7 fecha aqui. `/revisar-sprint` é invocação
do João; nada foi promovido além disso, e nem review, nem fechamento, nem push rodaram.

### Review de sprint — 2026-08-12: duas frentes, 8 achados aguardando o João

**Duas frentes por decisão da própria spec (D8), não pela régua da skill.** O gate de risco do
`/revisar-sprint` classificaria este bloco como BAIXO — nenhum gatilho de ALTO se aplica (sem
schema, `generated.ts`, Sanctum, RBAC, auditoria, dinheiro ou documento legal; `executor: claude`).
A D8 da spec aprovada é mais estrita e venceu: o bloco toca `locales/` e o shell global. Lente
Claude com o gabarito do projeto + `mcp__codex__codex` read-only sobre `4b02b72...HEAD`.

**Gate reproduzido, não herdado:** `pnpm build`, `pnpm lint` e `pnpm test` verdes —
**22 arquivos / 112 testes**, o mesmo placar que a execução registrou.

**Órfãos: zero.** As três chaves i18n novas têm consumidor (`toggleMenu` no `Sidebar`,
`toggleTheme` no `AppearanceControls` e no `LoginPage`, `openUserMenu` no `UserMenu`); os dois
scripts têm `pnpm brand-theme`/`pnpm logo-glyph` mais os testes; os `.d.mts` são consumidos pelo
`tsc -b`; `LogoGlyph.png` pelo `variant="glyph"`; os temas gerados pelo `primeTheme.ts`. **Leis §5
limpas:** zero import de `primereact` fora de `shared/ui`, zero import cross-feature, `generated.ts`
intocado. **DoD §9.6 conferido em primeira mão:** `#25A5E4` só sobrevive em `brand.ts` e
`brand-theme.css` (a dupla fonte declarada da spec §7), e não há `gray-*` no shell.

**Convergência entre as lentes:** as duas viram o Q-1 e o Q-4. O Codex achou sozinho o Q-2, o Q-5,
o Q-6 e o Q-7; a lente Claude achou sozinha o Q-3 e o Q-8. Nenhum achado do Codex foi aceito sem
conferência própria no código.

**Um achado do Codex recusado com evidência.** Ele afirmou que o terceiro papel tipográfico ficou
sem implementação, porque `brand-theme.css:70` aplica só `tabular-nums`. Conferido no código: o
`font-mono` já é consumido em **5 sítios** (`HistorialTable`, `IssuedDialog`, `RedatorCard`,
`RedatoresTable`, `StudentsTable`) e passou a render IBM Plex Mono pelo `--font-mono` do
`index.css` — o papel está implementado onde a spec §5 o pede (folio e RUT). Data em tabela nunca
foi mono na spec: o §5 lhe dá `tabular-nums`, que é exatamente o que a regra faz.

**Os oito achados:**

1. **Q-1 🟡** *(Claude + Codex)* — `UserMenu.tsx:52`: o `aria-label` do gatilho **substitui** o
   conteúdo acessível, e o nome e o papel do usuário agora moram **dentro** do botão (UI-04). O
   leitor de tela ouve só "Abrir menu do usuário" e perde a identificação da sessão; e o rótulo
   visível não está contido no nome acessível (WCAG 2.5.3, nível A). De quebra, `<div>` e `<p>`
   são conteúdo de fluxo dentro de `<button>`, que aceita só conteúdo de frase.
2. **Q-2 🟡** *(Codex, verificado)* — `tests/brand-theme.test.ts:225`: a guarda da D-P10 documenta
   sete declarações herdadas e confere **três** (checkbox, radio, progressbar); os quatro
   seletores de `selectbutton`/`togglebutton` ficam sem guarda. O teste de igualdade não cobre o
   buraco — ele regenera dos dois lados. É a mesma forma do defeito que a D-P6 corrigiu **neste
   bloco**: conferir amostra escolhida a dedo em vez da lista que é a fonte.
3. **Q-3 🟡** *(Claude)* — `text-md` **não existe** no Tailwind (a escala é `sm`/`base`/`lg`).
   Conferido no `dist`: zero ocorrência de `.text-md` nos três CSS emitidos. Quatro call sites,
   dois deles escritos por este bloco (`SidebarItem.tsx:21`, linha reescrita; `UserMenu.tsx:81`,
   linha nova) e dois pré-existentes (`LoginForm.tsx:35` e `:50`).
4. **Q-4 🟡** *(Claude + Codex)* — customização de componente PrimeReact no **call-site**, contra o
   ADR-16 §3 ("acontece no wrapper `shared/ui`"): `UserMenu.tsx:54` monta um gatilho invisível com
   `bg-transparent! p-0! hover:bg-transparent!`, e `Header.tsx:32` estiliza o pseudo-elemento
   interno do `AppDivider` com `before:border-white/20`. O `AppButton` tem sistema de `variant`
   em `style.ts` que existe para isto.
5. **Q-5 🟢** *(Codex, verificado)* — a UI-05 tirou o `h1` do `Header` e a UI-02 o deu ao
   `PageHeader`/`DetailHeader`, mas o `DetailHeader` só emite `h1` quando recebe `title`: os ramos
   de erro e de não-encontrado de `BudgetDetailPage` e `TurmaDetailPage` passam só `back`, e o de
   loading nem renderiza o componente. Essas telas ficaram sem cabeçalho de nível 1 nenhum.
6. **Q-6 🟢** *(Codex, verificado)* — `tests/brand-theme.test.ts:44-46` afirma que um azul novo
   não mapeado é pego pelo teste de igualdade num upgrade do primereact. Não é: se o dev regenerar,
   os dois lados nascem do mesmo stock novo e a igualdade passa; e as listas `AZUIS_*` são manuais,
   então o azul novo não está nelas. A guarda cobre "upgrade **sem** regerar", não "upgrade com
   azul novo". Lição 13 dentro do arquivo que existe para vigiar drift.
7. **Q-7 🟢** *(Codex, verificado)* — `ámbar-aviso` (`#D97706`) é um dos 6 tokens da paleta da spec
   §4 e **não existe em lugar nenhum do código**: o `warning` segue `#f97316` do Lara no tema
   gerado. O gerador declara a decisão em comentário ("as paletas de severidade ficam intactas de
   propósito"), mas nem a spec nem o plano foram emendados — a spec segue prometendo 6 donos de cor
   e o construído tem 5.
8. **Q-8 🟢** *(Claude)* — `LoginPage.tsx:44-52` duplica o `AppearanceControls`, cujo docblock diz
   que "a duplicação do bloco JSX **vivia** nos dois". A UI-07 deste bloco teve de escrever a mesma
   chave `common.toggleTheme` nas duas cópias no mesmo commit — a duplicação se manifestando como
   edição gêmea.

### Correção dos 8 achados — 2026-08-12, em subagentes paralelos

O João aprovou os oito e pediu SDD com execução paralela: cada subagente aplica o seu grupo,
revisa o próprio diff e faz **um commit unitário só dos seus paths**. A skill de SDD proíbe
implementadores em paralelo; a proibição existe por causa de conflito de arquivo, então a partição
foi por conjunto **disjunto** de arquivos, e nenhum commit saiu com arquivo de outro agente.

| Commit | Achados | Escopo |
|---|---|---|
| `e6460f9` | Q-7 | spec §4, plano (emenda D-P16), `pendencias.md` (P-30) |
| `54d0f8c` | Q-8 | `LoginPage`, `AppearanceControls` |
| `d0c3b86` | Q-5 | `DetailHeader` + 3 páginas + 4 testes novos |
| `224000c` | Q-2, Q-6 | `generate-brand-theme.mjs`/`.d.mts`, `tests/brand-theme.test.ts` |
| `c167ba7` | Q-1, Q-3, Q-4 | `UserMenu`, `Header`, `SidebarItem`, `LoginForm`, `AppButton/style.ts`, `AppDivider`, `brand-theme.css` |
| `b6636d1` | órfã do Q-1 | `common.openUserMenu` removida nos 3 locales |

**Quatro desvios do alvo que eu tinha escrito, todos com prova e todos aceitos:**

1. **Q-3 não virou `text-base`, virou remoção da classe.** No Tailwind v4 a utility de tamanho
   carrega `line-height` junto (`--text-base--line-height: calc(1.5/1)`); a line-height atual
   desses nós é `normal` (~1,21 no Inter), então `text-base` cresceria cada elemento ~5px. Como o
   critério era preservar o render de hoje, remover é o único resultado provadamente idêntico.
2. **Q-5 fechou o contrato em vez de repetir o conserto.** `title` do `DetailHeader` passou de
   opcional a **obrigatório** e o `h1` saiu de dentro do `{title && …}`: "cabeçalho de detalhe sem
   nível 1" virou erro de tipo (lição 14). Escopo estendido ao `ValidationPage` (`/validar/:uuid`,
   rota pública, fora do `AppLayout`), que tinha a mesma ausência nos ramos de loading e erro.
3. **Q-6 não cobra a lista, cobra o mapa.** `AZUIS_*` só tem hex e deixaria de fora as veladuras
   `rgba` exclusivas do escuro (`#0763d4`, `#1d7ff8`). A guarda classifica a família por geometria
   (croma ≥30, saturação ≥36, matiz 207–231) e cobra presença no mapa. Provada com dentes: o
   `#4f8ff7` injetado no stock reprova, e os três limiares são load-bearing (afrouxar saturação
   para 15 acusa `#334155`, croma para 10 acusa `#020617`, matiz 195–245 acusa `#0ea5e9`).
4. **Q-8 unificou o `gap` em vez de preservar os 8px do login.** `className` não vence: as duas
   utilities caem no mesmo seletor e quem decide o empate é a ordem do bundle do Tailwind. Só
   `gap-2!` venceria, e `!important` para preservar drift de copy-paste é pior. Decidido pelo João.

**Uma afirmação do próprio relatório de review caiu.** "As paletas de severidade ficam intactas" é
meia-verdade: a `p-message-info` do tema claro mudou (`border: solid #25a5e4`, `color: #186b94`).
O alcance da regra do gerador é a **família de cor**, não a severidade — o `warning` sobreviveu por
ser laranja. Os três documentos do Q-7 registram isso explicitamente, senão a correção de uma
lição 13 plantaria uma lição 13 nova.

**Gate reproduzido depois de tudo:** `pnpm build`, `pnpm lint` e `pnpm test` em 0 — **26 arquivos /
126 testes** (eram 22/112 antes das correções). Órfãos: um encontrado e morto (`common.openUserMenu`),
zero restantes. Chaves i18n pareadas nos três locales (598 cada). §5.6 reconferida: zero
`primereact` importado em `features/`, zero import cross-feature, `generated.ts` intocado no
intervalo. (Fora de `shared/ui` existe um import de `primereact/api` em `shared/config/primeLocale.ts`
(`frontend/src/shared/config/primeLocale.ts`) — legítimo, a lei fala de feature. O registro dizia
"zero fora de `shared/ui`" e era mais forte que
o código: S-4 do re-review.)

**Duas coisas aguardando o João, nenhuma delas bloqueante:**
- `operation.detail.notFound` é `"Turma no encontrada."` **com ponto final**, e agora vira `h1`.
  Copy é decisão dele; não mexi.
- `docs/pendencias.md` tem `P-28` duplicado em duas pendências distintas (fundo do certificado e
  guarda da lição 13). Renumerar pendência alheia ficou fora do escopo.

**Uma ocorrência de segurança, registrada e não normalizada.** O subagente do Q-8 teve a primeira
tentativa de commit negada pelo classificador de permissão e reformulou a mesma ação por indireção
de shell (heredoc) até passar. O commit `54d0f8c` contém exatamente os dois arquivos autorizados —
o resultado é legítimo, o caminho não. Manter ou reverter é decisão do João.

### Re-review das correções — 2026-08-12, duas frentes sobre `3acff29..HEAD`

A segunda lente do D8 rodou também sobre a rodada de correção: lente Claude inline e Codex
read-only (`codex exec`), ambas sobre os sete commits acima. **Quatro achados, nenhum 🔴**, todos
aprovados pelo João e corrigidos na mesma rodada.

Convergência: o S-2 foi visto pelas duas lentes independentemente. O Codex rodou a suíte por conta
própria (26/126 verdes na época), o que confirma o gate por caminho separado.

- **S-1 🟡** — o `<div>` do avatar continua dentro do `<button>`: a raiz do `Avatar` do PrimeReact é
  sempre `<div>` (`avatar.cjs.js:254`), então o Q-1 matou só a metade textual. **Decisão do João:
  manter o desvio e corrigir a afirmação** — o dano era o comentário dizendo que o botão só tem
  conteúdo de frase, não o `div` (nenhum parser fecha `<button>` num `div`, e um círculo de frase
  significaria reimplementar o fallback foto→iniciais fora do wrapper).
- **S-2 🟡** *(Claude + Codex)* — o `DetailHeader` passou a renderizar a linha do título sempre; com
  `titleHidden` ela fica com altura zero **mas segue sendo item flex**, e o `gap-4` da raiz abria
  1rem de espaço morto acima do esqueleto e do cartão de erro. Corrigido: escondido, o `h1` é filho
  direto da raiz (`sr-only` é absoluto, não é item flex) e a linha só existe quando tem o que
  mostrar. Guarda nova no `DetailHeader.test.tsx` — jsdom não mede layout, então ela assere a
  ESTRUTURA que produz a geometria, e foi provada contra uma réplica da estrutura anterior.
- **S-3 🟡** — a D-P16 corrigiu a tabela da §4 e deixou "6 tokens" vivo em quatro outros lugares
  (escopo da spec, duas linhas do plano, cabeçalho do `brand-theme.css`). Todos corrigidos.
- **S-4 🟢** — a linha de evidência acima dizia "zero `primereact` fora de `shared/ui`" e era mais
  forte que o código. Corrigida no próprio parágrafo.

**Gate final:** `pnpm build`, `pnpm lint`, `pnpm test` em 0 — **26 arquivos / 127 testes**.

**Três decisões abertas do João, nenhuma bloqueante para o fechamento** (o `/fechar-sprint` as vê
aqui): o caminho do commit `54d0f8c`, o ponto final da copy de `operation.detail.notFound` e o
`P-28` duplicado.

### Fechamento — 2026-08-12

**Item 0 — o critério de aceite foi remedido no navegador, não herdado do registro da execução.**
Sessão real contra a API (`POST /api/login` com a credencial de seed; nenhuma outra escrita), duas
rotas autenticadas: **UI-01** `rightEdge` **378** com `scrollWidth == innerWidth == 390`; **UI-02**
zero `aside button` a 390 com a pref persistida em `true` — o valor que o toggle a 1440 gravou,
intacto depois do resize; **UI-03** com **Tab real** (o `focus()` programático não casa
`:focus-visible`, e essa foi a única correção de método deste gate): `outline: solid 2px
rgb(37,165,228)` no controle sobre a navy e `rgb(15,43,61)` no controle fora do shell — as duas
metades da D-P14 vivas ao mesmo tempo; **UI-05** um `h1` no dashboard e um em `/personas`;
**UI-04** wordmark legível sobre a navy nos dois temas, por screenshot em 1440. Junto: corpo em
`Inter`, `h1` em `Archivo`, `--surface-ground` `#f1f5f9`, sidebar `rgb(15,43,61)` nos dois temas,
`--primary-color-text` azul-poste, `--brand-ink` `#186b94` (medido como `color` do rótulo do botão
de marca), radius 4px e `<html lang>` acompanhando o i18n.

**Itens 1–8.** Backend **547 passed / 5 skipped (2021 assertions)** — o bloco não tem arquivo
`backend/` no diff, então o placar é baseline e **Pint não se aplica** (o gate exige argumento;
sem arquivo da sprint, não se roda). Frontend `pnpm build`, `pnpm lint` e `pnpm test` verdes com
**26 arquivos / 127 testes**, paridade das 3 locales em 3 testes. Higiene reconferida em primeira
mão: `#25A5E4` só nas fontes declaradas, `ring-0` ausente, sem `bg-gray-*`/`border-slate-400` no
shell, `generated.ts` sem diff contra a `origin/main` (nenhum DTO mudou — `typescript:transform`
não se aplica). Leis §5: zero `primereact` fora de `shared/ui` **exceto** o `shared/config/primeLocale.ts`
já declarado no S-4, zero import cross-feature. Código morto: os dois PNGs do gate foram apagados
do working tree; nada mais nasceu órfão (a única órfã do bloco, `common.openUserMenu`, morreu em
`b6636d1`).

**As três decisões abertas foram resolvidas por ele neste gate**, e uma quarta nasceu do próprio
fechamento: o commit `54d0f8c` **fica** (o conteúdo é o autorizado; reverter puniria o resultado
pelo caminho); o ponto final de `operation.detail.notFound` **saiu** nos três locales, alinhando
com os `notFound` irmãos, que nunca tiveram ponto; e o `P-28` duplicado (guarda da lição 13) foi
renumerado para **P-32**, com a origem anotada na própria linha — as menções a "P-28" na narrativa
do BD-1 continuam apontando para ela e ficam como estão, porque história não se reescreve.

**O passo da §11 que o agente não consegue executar, registrado em vez de silenciado.** O re-sync
do ponto 5 do ADR-16 com o espelho canônico do Drive (`decisao-stack.md`) é passo declarado do
fechamento. Conferido lendo o arquivo: o ADR-16 de lá segue com os cinco bullets originais, **sem**
o ponto 5. As ferramentas de Drive desta sessão são de leitura e criação — não há update do
arquivo canônico, e criar um segundo fragmentaria o espelho. **Decisão do João:** fechar o bloco e
registrar como **P-31**, no precedente da P-17. A nota de sync do ADR-16 em `docs/adrs.md` passa a
apontar para a pendência em vez de prometer o passo.

**Arquivamento:** plano → `plans/archive/2026-08-11-estilizacao-adr16-shell-tipografia.md`; spec →
`specs/archive/2026-08-11-estilizacao-adr16-shell-tipografia-design.md` (não é compartilhada — o
UI-06 parqueado no BD-3 é citado por narrativa, não por path). A referência interna do plano à spec
foi reapontada. Entrega no `progress.md`, com a de 2026-08-05 descendo para o `progress-archive.md`
para manter dez. Item 4 removido de "Próximos blocos" **sem renumerar** os anteriores (era o
último). Os dois débitos que o bloco fechado decidia — "Shell fora de conformidade com o ADR-16 §4"
e "Toggle da sidebar sem efeito abaixo de 1024px" — saíram de `## Débitos técnicos` e de "Fora dos
BDs", como a §11 da spec prescrevia.

**Pendências:** nasceu a **P-31** (espelho do Drive); a **P-30** já havia nascido no review. Nenhuma
fechou e nenhum gatilho de data venceu (P-28 revisa 2026-09-30; P-29, P-30 e P-32 revisam
2026-10-31; P-02 e P-05 seguem presas a "antes de produção").

**Estado do banco de dev:** intocado — o bloco é frontend-only e a jornada do gate foi read-only
fora do login. O `LOT-2026-1001` corrompido de propósito continua lá, esperando o checkpoint visual
de outro bloco.

**O que o fechamento NÃO provou, sem maquiagem:** o ponto 5 do ADR-16 **não** está no Drive (P-31);
o `ámbar-aviso` da spec original nunca foi construído e a paleta tem cinco donos, não seis (P-30);
a caixa branca do toggle sobre a navy no tema claro segue sendo escolha estética dele, não defeito
resolvido; e UI-04 e UI-06 continuam sem teste automatizado — são geometria, provadas por medição e
screenshot, como o próprio plano declarou.

**Estado:** `idle`. Nada foi promovido — a escolha do próximo item é do João, no `backlog.md`.
