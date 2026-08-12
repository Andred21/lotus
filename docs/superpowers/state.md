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
review_findings_approved: []
last_completed_work_item: last-login
state_basis_commit: ff1f304
updated_at: 2026-08-12T17:25:00-03:00
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

## Último item fechado — 2026-08-12 (`last-login`)

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

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

## Penúltimo item fechado — 2026-08-11 (`integridade-e-concorrencia-backend`)

### Seleção — 2026-08-11

**BD-2 do `backlog.md`, promovido explicitamente pelo João.** Ele abriu a sessão com
`/planejar-bloco ### BD-2 · Integridade e concorrência no backend`; o gate do comando **reprovou**
pelo mesmo motivo do BD-1 na véspera — estado `idle`, `active_work_item` `null` e argumento que é
título de seção, não slug promovido. A promoção veio da resposta dele ao gate, com uma escolha
registrada: **manter os quatro itens do BD-2 na íntegra**, contra o recorte alternativo que teria
deixado só os itens 1 e 2 (concorrência) e devolvido a dedução do `getRoleNames()` e os quatro
testes ao backlog.

**Nada precisou ser commitado antes de promover** — ao contrário do BD-1, cuja proposta nasceu no
mesmo dia. O BD-2 já era durável em `ec3ad2a` e a árvore estava limpa em `09a11d9`, o merge do
PR #38, que passa a ser o `state_basis_commit`.

**BD-2 não é o item 1 de `## Próximos blocos`** — ali segue `Arquivados e restauração de
soft-delete`, intocado desde o BD-1. A fila **não** foi renumerada: os BDs vivem na seção de dívida,
paralela a `Próximos blocos`, e a ordem escrita entre eles (BD-2 → BD-7) está sendo seguida.

**Rota direta a `ready_for_planning`, sem Context Packet, por ausência medida de fonte externa**
(mesmo caso de `guardas-que-faltam`, `turma-habilitacao-listagem`, `profundidade-backend-b4-b7` e
`documentos-oficiais-template-e-docx`): nenhum dos quatro itens cita Drive, Notion ou Figma. As
fontes são o próprio repositório e documentos versionados — `Q-16` em `backlog.md:302`, os débitos
"Bloco 5.2a/5.2b (minors do review final)" em `backlog.md:356` e `:360`, e as specs arquivadas
`specs/archive/2026-07-17-bloco5.2a-usuarios-design.md` e
`specs/archive/2026-07-18-bloco5.2b-roles-permisos-design.md`. `context_packet: null`.

**Toca backend → main tree, sem worktree (P-03).** Nenhum outro `active_work_item` de backend está
aberto, então o gatilho de fechamento da P-03 continua não vencido. Branch
`hardening/integridade-e-concorrencia-backend`, criada de `09a11d9`, no padrão de
`hardening/guardas-que-faltam`.

**Escopo, na ordem escrita do BD-2:** (1) `lockForUpdate()` no `Client` — não só na coleção — antes
do `ensureSingle()`, nos **dois** serviços (`PrimaryContactService`, `PrimaryAddressService`) no
mesmo commit; (2) unicidade de RUT/email do `UpdateStaffUserAction` para **dentro** da
`DB::transaction`; (3) `UserData::fromModel` chamando `getRoleNames()` duas vezes; (4) os quatro
testes que faltam — `SuperadminGuard` com outro superadmin **inativo**, auto-colisão de RUT/email no
próprio update, o 422 de `role: redator` afirmando a **chave** e o error-bag de
`CreateRoleAction`/`UpdateRoleAction`. **DoD do item 1 é sonda de concorrência real** (dois writes
competindo), não teste sequencial verde.

**Fora de escopo, declarado pelo próprio item:** a decisão do 5.2b sobre `GET /api/roles` enumerar
permissão de superadmin — é do João, e está travada em `backlog.md:173`.

### Terreno medido antes de planejar (não é desenho, é fato)

1. **`lockForUpdate()` é no-op silencioso na suíte.** `SQLiteGrammar::compileLock()` devolve `''`
   (conferido no vendor) — nenhum teste sqlite pode provar serialização. O repo já sabia disso: o
   `DeleteClientContactAction` (Q-5) escreve exatamente isso no comentário do lock que já carrega.
2. **O repo já tem sonda de concorrência real, automatizada e versionada.**
   `CertificateNumberTest:44` pula fora do MySQL, clona a conexão, sobe **dois processos** com
   `Symfony\Process`, alinha os dois num gate e confirma pelo `performance_schema.data_lock_waits`
   que ambos esperam pelo mesmo lock antes de commitar. É o `1 skipped` que a suíte reporta há
   blocos. **Medido neste terreno, não herdado:** contra MySQL real (`lotus_test`), o arquivo dá
   **3 passed (20 assertions)**, com o caso concorrente em 0,31s.
3. **Os seis chamadores dos dois serviços de principal já abrem `DB::transaction`**
   (`Create`/`UpdateClientAction`, `Create`/`UpdateClientContactAction`,
   `Create`/`UpdateClientAddressAction`) — o lock nasce com efeito, sem tocar Action nenhuma.
4. **O item 2 tem três sítios, não um.** Além do `UpdateStaffUserAction:34-38` que o débito nomeia,
   `UpdateClientAction:29` e `UpdateRedatorAction:33` chamam `ensureRutAvailable` antes de abrir a
   transação. Os irmãos `CreateStaffUserAction`, `UpdateStudentAction` e `CreateStudentAction` já
   chamam de dentro — a inconsistência é entre Actions irmãs, não um caso isolado.
5. **O item 3 não economiza query.** `getRoleNames()` faz `loadMissing('roles')` e a segunda chamada
   lê a relação em cache (conferido no vendor do spatie). É dedução de `pluck`, não de `SELECT`, e a
   spec diz isso em vez de vender ganho inexistente.
6. **O banco de dev segue com o `LOT-2026-1001` corrompido de propósito** (`snapshot.aluno.name`
   vazio, conferido em SQL cru), esperando o checkpoint visual do João. Nenhum passe deste bloco
   roda `migrate:fresh --seed`.

### Brainstorming e spec — 2026-08-11

O João aprovou o desenho com a instrução literal `Aprovado`. O estado entra em `planning` no mesmo
commit da spec; `active_plan` segue `null` até a leitura humana do documento e a escrita posterior do
plano.

**A medição que mudou o desenho, feita antes de escrever:** sonda contra o MySQL de dev
(`REPEATABLE-READ`) mostrando que, depois de acordar do `lockForUpdate()` no `Client`, o `SELECT`
comum de `ensureSingle()` **continua lendo o snapshot** — não enxerga o principal que a transação
concorrente já commitou (`leitura comum: [..., "SONDA-A"]` contra `leitura com lock: [..., "SONDA-A",
"SONDA-B"]`). O Q-16, ao pé da letra, entregaria mecanismo que promete e não fecha: a transação
contaria 1 principal, faria o early-return e os dois sobreviveriam. O mutex é necessário e não
suficiente.

**Três decisões dele, respondidas antes de a spec existir** (D1, D2 e D3 da §2): o lock é **duplo**
(mutex no `Client` mais leitura travada da coleção); a prova é **teste MySQL-only com o harness
extraído** para `tests/Support/`, consumido também pelo `CertificateNumberTest` sem mudança de
comportamento; e o item 2 entra nos **três** sítios medidos, com a conversão de violação de índice
único em 422 **recusada** e registrada como limitação (a corrida de RUT/email segue subindo 500).

**Efeito declarado no placar:** a suíte em sqlite passa de **1 para 3 skipped** — skip aqui é sinal
honesto de caso que existe e roda onde o lock existe.

**Risco de review declarado MÉDIO** (§8 da spec): nenhum gatilho de ALTO se aplica (sem schema,
`generated.ts`, Sanctum, RBAC em produção, dinheiro, documento legal; `executor: claude`). Os dois
gatilhos próprios são caminho de escrita auditado e concorrência que a suíte anula por construção.

### Aprovação da spec e plano — 2026-08-11

O João aprovou a spec com a instrução literal `aprovado`. O plano ativo
(`docs/superpowers/plans/2026-08-11-integridade-e-concorrencia-backend.md`) decompõe o bloco em
**7 tasks (0–6)**: baseline; harness extraído para `tests/Support/`; o lock (item 1) num commit só;
unicidade dentro da transação nos três sítios (item 2); a dedução do `getRoleNames()` (item 3); os
quatro testes que faltam (item 4); gate. O handoff fixa **`executor: claude`** — a Task 2 fecha por
laço de medição contra MySQL com alinhamento de processos, e o modo de falha do desenho é um
**deadlock**, que aparece como exit code do filho e precisa ser lido como sintoma de ordem de lock,
não como flakiness a contornar com retry.

**Baseline reconferido, não herdado:** backend **524 passed, 1 skipped (1963 assertions)**; contra
MySQL real (`lotus_test`), `CertificateNumberTest` **3 passed (20 assertions)**. O plano projeta
**532 passed / 3 skipped** em sqlite e **7 passed** no recorte de MySQL. O total de assertions é
declarado como **registrado no gate, não projetado** — casos com laço de espera não têm contagem
previsível.

**A escrita do plano mediu o terreno e produziu nove desvios declarados** (§Desvios do plano). Os
três que mudam decisão da spec:

1. **O mutex sai do `ensureSingle` e vai para as Actions — cinco Actions mudam, não zero** (D-P1). A
   §3.2 da spec põe as duas peças do lock dentro do serviço e afirma "Nenhuma Action muda". Medido
   contra MySQL: nessa forma o mutex é tomado **depois** de a Action já ter escrito, o que inverte a
   ordem dos locks e produz `SQLSTATE[40001]: Serialization failure: 1213 Deadlock found when trying
   to get lock` em `select * from clients ... for update`, matando um dos processos (exit 255) — em
   produção, 500 para o perdedor. Com o mutex antes de qualquer escrita: 2 processos esperando, os
   dois com exit 0, exatamente 1 principal. `CreateClientAction` fica de fora com a razão escrita no
   código — o cliente nasce ali, não há concorrente disputando um id ainda não gerado.
2. **O alinhamento é por `performance_schema`, não por marcador dentro do filho** (D-P3). Os dois
   candidatos que a §3.3 nomeia não sobrevivem à exigência de o filho exercitar a **Action real**:
   não há onde emitir marcador entre o mutex e a escrita, porque as duas coisas estão dentro de uma
   chamada só. A saída medida: iniciar P1, esperar até ele estar **bloqueado** (o que só acontece
   depois de ele ter tomado o mutex) e só então iniciar P2. Daí o harness ganhar mínimo explícito e
   filtro de tabela opcional (D-P2) — P1 espera em `client_contacts` e P2 espera em `clients`.
3. **O teste de `role: redator` prova a porta abrindo as outras, não afirmando a chave** (D-P9). A
   §6 diz que ele "afirma a chave `role`"; medido no código, as três regras de `role` (`required`,
   `exists:roles,name`, `Rule::notIn`) reprovam com a **mesma chave** e a **mesma mensagem** do
   Laravel. Afirmar a chave não discrimina porta nenhuma — seria o defeito que o item 4 existe para
   corrigir, reintroduzido dentro da correção. O que discrimina é asserir que a role `redator`
   **existe** em `roles`, o que fecha a porta do `exists` e deixa só o `notIn` podendo recusar.

**Nenhuma guarda extra nasce para a ordem dos locks, e a razão é medida** (D-P4): a própria sonda já
reprova nas duas formas de quebrar o mecanismo — apagar o mutex deixa dois principais (a asserção
final reprova) e movê-lo para depois da escrita mata o filho por deadlock (a asserção de exit code
reprova). Varredura de código que tentasse provar a ordem seria promessa que a varredura não
entrega, que é o risco central da §8.

A auto-revisão do plano contra a spec ainda achou dois erros no próprio rascunho e os corrigiu antes
de gravar: o Pint do gate alimentado por substituição de comando (lista vazia vira Pint sem
argumento, que reformata o repositório inteiro) e a conferência do banco de dev lendo
`certificates.number`, coluna que não existe — o nome real é `codigo`, conferido no schema.

**Risco de review continua MÉDIO.** O foco é um só: a sonda realmente disputa, o vermelho foi visto
sem o lock, e o harness extraído não afrouxou o caso do certificado. O review não roda
automaticamente ao fim da Task 6.

### Execução — 2026-08-11

O João autorizou com `/executar-bloco integridade-e-concorrencia-backend`. Thread principal, main
tree, sem worktree (P-03), do base `44db6ca`. Sete tasks (0–6), commit por task, revisão de task
após cada commit delegável.

Commits, na ordem do plano: `542e3cc` (Task 1, harness extraído para `tests/Support/`), `1c27647`
(Task 2, o lock — Q-16), `2cf0250` (Task 3, unicidade dentro da transação nos três sítios),
`2f0d756` (Task 4, `getRoleNames()` uma vez), `15f9fff` (Task 5, os quatro testes que faltam).
Evidência task a task em `.superpowers/sdd/progress.md`.

**Vermelho visto antes de cada correção, texto exato:**
- Task 2 — sondas MySQL de `PrimaryConcurrencyTest`: `2 failed, 2 passed`, o array final
  `['SONDA-B','SONDA-C']` contra o esperado `['SONDA-C']` — dois principais sobreviveram.
- Task 3 — os três casos de `UniquenessInsideTransactionTest`: `3 failed`, `a unicidade de rut foi
  checada FORA da transação que escreve`, `Failed asserting that 1 is identical to 2`.
- Task 5 — quatro mutantes, quatro vermelhos: superadmin inativo, `esperava ValidationException: o
  outro superadmin está inativo`; auto-colisão de RUT, `ValidationException: Este RUT já está
  cadastrado.`; porta `redator`, `esperava ValidationException`; as duas Role Actions, `4 failed`,
  `Failed asserting that an array has the key 'name'`/`'permissions'`.

**Um desvio de execução, não de plano.** O implementador da Task 3 (subagent) morreu no meio do
trabalho — a sessão anterior encerrou antes de ele rodar a verificação final e commitar. O
controller recuperou o working tree (edições já feitas, sem commit), conferiu que batia byte a
byte com o brief, e reproduziu o vermelho por conta própria via `git stash` das três Actions antes
de aceitar o fix — não herdou a prova de ninguém. A Task 4 teve uma imprecisão do texto do plano: o
Step 2 projetava `11 passed` para `StaffUserActionTest`, e o real, estável antes e depois da
edição, é `10 passed (17 assertions)` — a task não toca arquivo de teste, então a contagem do plano
estava simplesmente errada, não o código.

**Gate reproduzido, Steps 1 e 2:** backend em sqlite `3 skipped, 532 passed (1983 assertions)`;
contra MySQL real, filtro `CertificateNumberTest|PrimaryConcurrencyTest`, `7 passed (40
assertions)`. Pint `passed` nos 20 arquivos fechados do bloco (conferidos contra `git diff
--name-only main...HEAD -- '*.php'`, mesma lista). `typescript:transform` sem diff em
`generated.ts`; `git diff main...HEAD` de `backend/database/` e `frontend/` vazio. Nenhuma sonda
sobrevivente (`git status --porcelain` vazio, nenhum `SONDA`/`dd(`/`dump(` no diff de
`backend/app/`). Banco de dev intocado: `LOT-2026-1001` segue corrompido.

**O que o gate NÃO provou, sem maquiagem:** a corrida de unicidade de RUT/e-mail continua aberta —
duas escritas concorrentes com o mesmo valor ainda colidem no índice único e sobem 500, não 422 (D3
da spec, recusa registrada). E a suíte em sqlite segue sem enxergar lock nenhum:
`SQLiteGrammar::compileLock()` é no-op, então tudo que prova o lock do item 1 é MySQL-only.

**Estado:** `ready_for_review`. Review, fechamento, push e PR não rodam automaticamente.

### Review de sprint — 2026-08-11: ALTO risco, duas lentes, 6 achados

**ALTO RISCO pelo gate da skill, e a classificação divergiu da spec de propósito.** A §8 da spec
declarou MÉDIO na escala dela, afirmando "sem RBAC em produção". O `/revisar-sprint` é binário e
**três** gatilhos de ALTO se aplicam: o bloco toca RBAC (`UserData::fromModel` projetando
`getRoleNames()`, as duas Role Actions, o `SuperadminGuard`), toca auth/identidade
(`UpdateStaffUserAction`) e toca caminho de escrita auditado (as cinco Actions de Commercial). Duas
lentes, portanto: Claude mais revisão independente do Codex.

**Gate reproduzido, não herdado do relatório de execução:** backend em sqlite **3 skipped, 532
passed (1983 assertions)** — bate com o registro da execução.

**Órfãos: zero.** `ProbesMysqlConcurrency` tem os dois consumidores previstos (`CertificateNumberTest`,
`PrimaryConcurrencyTest`); `Client::lockForWrite()` tem os cinco chamadores que a spec nomeia, e a
sexta Action (`CreateClientAction`) carrega a razão escrita de não tomar o mutex; nenhuma sonda
`SONDA-*` sobreviveu no diff de `backend/app/`.

**A extração do harness não afrouxou nada.** Conferido linha a linha contra `09a11d9`: o
`CertificateNumberTest` passa `count($processes)` e `'certificate_sequences'`, que reproduz o
`WHERE ... OBJECT_NAME = 'certificate_sequences'` e o `>= count($processes)` da versão anterior. O
`assertGreaterThanOrEqual(2, $waitingCount)` continua no arquivo.

**Uma medição que NÃO virou achado, porque o código está certo.** O `lockForUpdate()` de
`ensureSingle` **não escala para linhas de outros clientes** — era o risco real de o item 1
serializar o sistema inteiro: sem índice, `SELECT ... WHERE client_id = ? AND is_primary = 1 FOR
UPDATE` em InnoDB trava tudo que varre. Conferido no schema de `lotus_test`:
`client_contacts_client_id_foreign` e `client_addresses_client_id_foreign` existem, então o lock fica
na faixa do cliente.

**A lente do Codex rodou em análise estática apenas** — o sandbox negou acesso ao Docker, então ele
não executou suíte nenhuma. As duas lentes convergiram no Q-1 e no Q-5. O Codex achou sozinho o Q-2 e
o Q-6; o Claude achou sozinho o Q-3 e o Q-4. Nenhum achado do Codex foi aceito sem conferência
própria no código, e **duas sub-afirmações dele foram recusadas** (registradas abaixo do Q-5).

**Uma conclusão da lente Claude estava errada e é corrigida aqui, não apagada.** A primeira passagem
descartou `DeleteClientContactAction` como fonte de deadlock com o argumento de que ela nunca pede
lock em `clients`, logo não fecha ciclo. O argumento ignora que o `lockForUpdate` dela adquire as
linhas de `client_contacts` **incrementalmente durante a varredura**: ela pode segurar parte da
coleção e bloquear no meio, numa linha que a outra transação já travou. Aí o ciclo existe. O Codex
apontou, a releitura confirmou, e o achado entrou como Q-2. A leitura sobre `ClientController::destroy`
continua válida no que ela afirmava (sem transação explícita, cada statement autocommita), mas isso
não a inocenta — ver a segunda ocorrência do Q-2.

**Os seis achados:**

1. **Q-1 🟡** *(Claude + Codex)* — o guard de lock-out de superadmin continua **check-then-act fora da
   transação** (`UpdateStaffUserAction:30-32`, e `UserController:62` sem transação nenhuma), no mesmo
   commit que moveu a unicidade para dentro pela razão oposta.
2. **Q-2 🔴** *(Codex, verificado)* — **o mutex tem dois escritores que o ignoram**, e os dois estão
   fora da lista de cinco Actions que o bloco tocou. `DeleteClientContactAction:32` trava a coleção
   sem tomar o mutex antes: ordem invertida contra as Actions novas, com ciclo real por aquisição
   incremental de lock, e o perdedor sai em `SQLSTATE[40001] ... 1213` (500). É **regressão do
   bloco** — antes dele ninguém travava `clients`, então a inversão não existia. E o hook
   `Client::booted deleting:40-47`, chamado por `ClientController::destroy:52` sem transação nem
   mutex, enumera os filhos e apaga um a um: um `CreateClientContactAction` concorrente insere depois
   da enumeração e o contato fica **ativo sob cliente arquivado**.
3. **Q-3 🟡** *(Claude)* — a D-P7 do plano afirma que `RedatorDocumentRollbackTest` prova o descarte do
   binário no caminho novo; o teste só injeta `RuntimeException` no segundo insert de `files`, depois
   do check de RUT. O caminho que o bloco criou não tem caso.
4. **Q-4 🟡** *(Claude)* — `PrimaryContactService` e `PrimaryAddressService` são idênticos byte a byte
   depois de normalizar o nome da entidade, e o bloco acrescentou as **mesmas** dez linhas aos dois.
5. **Q-5 🟢** *(Claude + Codex)* — `Client::lockForWrite()` devolve `void` e descarta o `->first()`: o
   mutex é no-op indetectável quando o id não casa, além do no-op já documentado em sqlite.
   **Duas sub-afirmações do Codex recusadas:** `null` produzindo `TypeError` é inalcançável pelos
   quatro sítios de chamada — `client_id` é `foreignId()->constrained()`, NOT NULL; e o `withTrashed()`
   aceitando cliente arquivado é a intenção escrita no docblock, não defeito do mutex.
6. **Q-6 🟢** *(Codex, verificado)* — `ProbesMysqlConcurrency:104`: com `$table === null` o `WHERE` fica
   só em `OBJECT_SCHEMA`, contando **qualquer** transação em espera no schema, sem correlação com os
   processos filhos. As duas chamadas de `PrimaryConcurrencyTest` passam `null`, inclusive a de
   `$minimum = 1` que existe para garantir que P1 já tomou o mutex antes de P2 subir.

**Decisão do João (2026-08-11): os seis entram.** Corrigidos na mesma sessão do review.

**Como cada correção foi provada — cada teste novo foi visto REPROVAR contra o código antigo,**
um a um, revertendo só a linha que ele guarda:

| Achado | Correção | Prova de que o teste discrimina |
|---|---|---|
| Q-1 | guard passa para dentro da `DB::transaction` da `UpdateStaffUserAction` e ganha `DeleteStaffUserAction`; `SuperadminGuard` troca `where('id','!=')->exists()` por `pluck` **travado do conjunto inteiro** — excluir o alvo do `FOR UPDATE` quebrava o mutex (T1 trava {B}, T2 trava {A}, sem conflito) | com o guard de volta para fora: `Failed asserting that 1 is identical to 2` no nível de transação |
| Q-2 | `Client::lockForWrite()` na `DeleteClientContactAction`; `ClientController::destroy` passa por uma `DeleteClientAction` nova (transação + mutex) | sem o mutex no delete de contato, o filho **termina antes do commit do gate**; com `$client->delete()` cru, a sonda mede **0 contatos vivos** enquanto o escritor ainda espera — a cascata já tinha autocommitado, que é exatamente a janela do achado |
| Q-3 | caso novo cobrindo a `ValidationException` de RUT duplicado no update do redator | trocando `catch (Throwable)` por `catch (RuntimeException)`: "objeto órfão ficou no bucket", com os outros três casos verdes |
| Q-4 | regra única em `PrimaryCollectionService`; os dois services viram três linhas cada; `PrimaryConcurrencyTest` perde os três pares de helper e as duas cópias do caso MySQL | sem teste próprio — é estrutura, e a prova é a suíte inteira seguir verde com **uma** implementação |
| Q-5 | `lockForWrite()` devolve o cliente travado, com `firstOrFail()`, e recusa cliente arquivado | com `first()`/`void` de volta: três casos do `ClientArchiveIntegrityTest` reprovam |
| Q-6 | a sonda correlaciona por `PROCESSLIST_ID`, lido do `CONNECTION_ID()` que o filho imprime no handshake `READY` | **medido**: com uma sessão `mysql` CLI alheia bloqueada em `lotus_test`, a consulta antiga devolveu `1` e a correlacionada devolveu `0` |

**Gate depois das correções:** sqlite **538 passed, 5 skipped (1999 assertions)**; MySQL real, os nove
casos de sonda verdes (`PrimaryConcurrencyTest` com seis, `CertificateNumberTest` com três). Pint
limpo nos arquivos tocados. Nenhum DTO mudou — `typescript:transform` não era necessário.

**Uma consequência do Q-2 que exigiu fechar a outra ponta:** o mutex torna o arquivamento atômico,
mas sozinho não impede o filho de nascer sob pai já arquivado — a requisição concorrente resolveu um
cliente VIVO no binding de rota e só descobre o arquivamento depois. Por isso `lockForWrite()` recusa
cliente arquivado: é uma decisão só, no único ponto por onde todos os escritores passam, em vez das
quatro linhas repetidas em seis Actions que o Q-4 acabara de punir.

### Gate de fechamento — 2026-08-11

**Item 0 — o critério de aceite deste bloco, provado contra a API real e não herdado do review.** O
DoD escrito é "dois writes competindo", então suíte verde não fecha item nenhum. O e2e rodou contra
o banco de dev (MySQL), com sessão Sanctum por cookie e CSRF:

| Prova | Resultado |
|---|---|
| cliente criado com **dois** contatos `is_primary=true` | **201** com **um** principal (o último por id, a regra escrita) |
| rota nested `POST /clients/5/contacts` com principal já existente | **201**, o anterior rebaixado; SQL cru confirma 1 principal |
| **20 `PUT` concorrentes** (10 rodadas, dois contatos do mesmo cliente disputando) | **200 nos 20**, invariante em **1 principal** em todas as rodadas |
| espera de lock no caminho HTTP | `Innodb_row_lock_waits` **116 → 127** (delta **11** em 10 rodadas) e `SHOW ENGINE INNODB STATUS` **sem** seção de deadlock |
| coleção de **endereços** (a subclasse nova do Q-4) | dois `POST` principais → 1 principal, mesma regra, um dono só |
| **Q-2** — `DELETE /clients/6` concorrente com `POST .../contacts` | **204** e **422** `application/problem+json` (`Este cliente foi arquivado e não aceita mais alterações.`); **0 contatos vivos** sob o cliente arquivado em SQL cru |
| **item 2** — `PUT /users/71` com o RUT de outro | **422** com `errors.rut`; SQL cru mostra o `name` **não** escrito (zero escrita parcial) |
| item 2 — auto-colisão com o próprio RUT | **200** |
| **Q-1** — `DELETE /users/1` (único superadmin) | **422** `Não é possível deixar o sistema sem superadmin ativo.` |
| Q-1 — rebaixar o superadmin ativo com outro superadmin **inativo** no banco | **422**; role intacta em SQL — é o caso do item 4, medido onde o usuário vive |
| **item 3** — projeção de roles | `role: "admin"` e `roles: ["admin"]` coerentes em todas as respostas de usuário |

**A medição de espera de lock é o que separa este e2e de um teste sequencial disfarçado:** 20 writes
paralelos que nunca se cruzassem passariam igual. As 11 esperas dizem que houve disputa real no
caminho HTTP completo, e a ausência de deadlock diz que a ordem de locks da D-P1 se sustenta fora do
harness.

**Itens 1–5.** Backend **538 passed, 5 skipped (1999 assertions)** em sqlite. Contra MySQL real
(`lotus_test`), `CertificateNumberTest|PrimaryConcurrencyTest` → **9 passed (48 assertions)**. Pint
`{"tool":"pint","result":"passed"}` nos **29** `.php` do bloco (lista conferida contra `git diff
--name-only main...HEAD -- '*.php'`, nunca por substituição de comando). `pnpm lint` limpo e `pnpm
build` verde — o bloco não toca `frontend/`, e o diff vazio é a prova. `typescript:transform` **sem
diff** em `generated.ts`. Código morto zero: `ProbesMysqlConcurrency` tem os dois consumidores
previstos, `Client::lockForWrite()` tem **sete chamadores** — as sete Actions que escrevem sob cliente já
existente, com `CreateClientAction` de fora carregando a razão escrita no código —,
`PrimaryCollectionService` tem as duas subclasses, `DeleteClientAction`
e `DeleteStaffUserAction` estão fiados nos controllers; `git status --porcelain` vazio e nenhuma
sonda `SONDA`/`dd(`/`dump(` no diff de `backend/app/`.

**Item 6 — leis.** Nenhuma contrariada: zero classe `Repository` em `backend/app/`, zero
`CREATE TRIGGER`/`DB::unprepared` (as duas guardas do BD-1 seguem verdes), auditoria só na aplicação
— o rebaixamento continua por instância, nunca por query builder —, `generated.ts` gerado e sem
diff, Sanctum intocado, financeiro fora do bloco.

**Item 7 — pendências.** Nenhum gatilho venceu: a **P-03** exige dois `active_work_item` de backend
em paralelo (só houve um) ou 2026-10-31, e a **P-04** revisa em 2026-08-15. Nasceu a **P-29**: a
corrida de unicidade **entre transações distintas** segue subindo 500, recusa registrada na D3 da
spec e agora com gatilho próprio. Uma divergência de formato foi **reportada e não corrigida** — o
ID `P-28` aparece **duas vezes** em `docs/pendencias.md` (a guarda da lição 13 e o fundo do
certificado); renumerar quebra referência e é decisão do João.

**O que o gate NÃO provou, sem maquiagem:** nada foi visto renderizado — o bloco é backend puro e o
contrato HTTP saiu idêntico, então não há tela nova a conferir; a corrida de RUT/e-mail entre
transações distintas continua em 500 (P-29); e a suíte em sqlite segue cega para lock
(`SQLiteGrammar::compileLock()` é no-op), então **tudo** que prova o item 1 é MySQL-only — os 5
skipped são isso, não cobertura ausente.

**Duas mutações declaradas no banco de dev:** os registros criados pelo e2e (2 clientes, 3 usuários
staff) foram removidos com `forceDelete` ao fim — `clients` vivos voltou a **4**, zero usuário
`gate.*` —, restando **15** linhas de `audits` apontando para ids que não existem mais; e o
`LOT-2026-1001` corrompido de propósito **segue lá**, conferido antes e depois, esperando o
checkpoint visual do João. Nenhum passe rodou `migrate:fresh`. Registrado também que o João estava
**usando a aplicação no navegador durante o gate** (foto e `PUT` no cliente 1, visto no log do
nginx): o tráfego dele não cruzou nenhum alvo do e2e, que operou só sobre registros próprios.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.

## Antepenúltimo item fechado — 2026-08-11 (`guardas-que-faltam`)

### Seleção — 2026-08-10

**BD-1 do `backlog.md`, promovido explicitamente pelo João.** Ele abriu a sessão com
`/planejar-bloco ### BD-1 · Guardas que faltam (mecanismo, zero mudança de comportamento)`; o gate
do comando **reprovou** — o estado era `idle`, `active_work_item` era `null` e o argumento era o
título de uma seção escrita no mesmo dia, não um slug promovido. A promoção veio da resposta dele ao
gate, com duas escolhas registradas: **commitar a proposta antes de promover** (feito em `ec3ad2a`,
que é o `state_basis_commit`) e **manter os 8 itens do BD-1 na íntegra**, incluindo a P-25, que eu
havia enfileirado por conta própria.

**BD-1 não é o item 1 de `## Próximos blocos`** — ali segue `Arquivados e restauração de
soft-delete`. A fila **não** foi renumerada: os BDs vivem na seção de dívida do `backlog.md`, que é
paralela a `Próximos blocos`, e o João pulou a ordem escrita conscientemente.

**Rota direta a `ready_for_planning`, sem Context Packet, por ausência medida de fonte externa**
(mesmo caso de `turma-habilitacao-listagem`, `profundidade-backend-b4-b7` e
`documentos-oficiais-template-e-docx`): nenhum dos 8 itens cita Drive, Notion ou Figma. A fonte é o
repositório — testes, ESLint e `.claude/rules/`. `context_packet: null`.

**Toca backend → main tree, sem worktree (P-03).** Os itens 1 e 2 mexem em `backend/tests/`
(guarda de §5.1/§5.2 e `NestedRouteOwnershipTest`). Nenhum outro `active_work_item` de backend está
aberto, então o gatilho de fechamento da P-03 continua não vencido. Branch
`hardening/guardas-que-faltam`, criada de `7e76db4`, no padrão de
`hardening/guardrails-e-transportes`.

### Terreno medido antes de planejar (não é desenho, é fato)

1. **A superfície das duas leis já está limpa** — zero classe `Repository` em `backend/app/` (o
   único hit de `grep` é `TurmaQueryBuilder`, que não é uma) e zero `CREATE TRIGGER`/`DB::unprepared`
   em `backend/database/`. A guarda da **P-04** nasce verde: é custo de escrita, não de correção. É
   também o gatilho mais próximo do bloco — a P-04 reavalia em **2026-08-15**.
2. **`NestedRouteOwnershipTest` filtra por assinatura, não por URI** (`Q-2`): ele lê
   `$route->signatureParameters(['subClass' => Model::class])` e faz `continue` quando encontra menos
   de dois models tipados. Rota com dois segmentos `{}` e binding não tipado sai do universo do teste
   em silêncio — o mecanismo entregue em 2026-08-04 tem essa porta aberta desde o primeiro dia.
3. **`postMultipart.test.ts` mocka o próprio transporte** (`Q-4`): o arquivo abre com
   `vi.mock('./axios', () => ({ api: { post: vi.fn(...) } }))`, então nenhum caso exercita o axios
   real. A afirmação que interessa — que o `Content-Type` **não** é fixado à mão — não é testada por
   nada hoje.
4. **O barrel de `shared/hooks` exporta três símbolos de uso interno** (`Q-2` de 2026-08-05):
   `unclassifiedPayloadKeys`, `MutableResource` e `CrudFormOptions`. Conferido em 2026-08-10: o único
   consumidor é `useCrudForm.test.ts`, **por caminho relativo** — a remoção do barrel não quebra
   ninguém.
5. **`useEntityPhoto` tem 161 linhas e nenhum teste**, sendo o module de maior fan-out de
   `shared/hooks`. É o item de maior custo do bloco e o único que não é guarda de guarda.
6. **A P-25 é uma linha ausente numa rule**, não código: `.claude/rules/frontend-fsliced.md` segue
   sem a cláusula "hook genérico não importa tipo de `shared/ui`", conferido em 2026-08-10, com os
   dois casos já medidos (`useFilePreview`, `SearchableTableFrame`). Entra no bloco porque o item 4
   já abre as rules pelo mecanismo da lição 13.

**Uma frase desta seção nasceu errada e é corrigida aqui, não apagada:** ela dizia que os itens 1 e
4 eram "as duas peças sem precedente no repositório". O item 1 **tem** precedente —
`tests/Feature/Shared/DomainDependencyTest.php` já é guarda de arquitetura por varredura de código,
com comentário descartado por `token_get_all()` e forma não coberta banida em vez de fingidamente
coberta. Só o item 4 era peça nova, e o brainstorming mudou o que ele confere.

### Brainstorming e spec — 2026-08-10

O João aprovou o desenho com a instrução literal `aprovado`. O estado entra em `planning` no mesmo
commit da spec; `active_plan` segue `null` até a leitura humana do documento e a escrita posterior do
plano.

**Quatro decisões dele, respondidas antes de a spec existir** (D1, D2, D5 e D6 da §2): a guarda da
lição 13 confere **referência de código citada em doc**, não comando; ela mora no **vitest**, em
`frontend/tests/`; o `useEntityPhoto` ganha **seis** casos; e a frase vencida da rule é corrigida
neste bloco.

**Três medições que mudaram o desenho, feitas antes de escrever:**

1. **O item 4, como o backlog o registrou, não fecha honesto.** Ele dizia "todo comando citado nos
   `§Comandos` das rules existe como script em `package.json`/`composer.json`, e vice-versa". Medido:
   só 2 das 4 rules têm `## Comandos`; o que citam é `docker compose exec -T app php artisan …` e
   `pnpm …`; **nenhum** é script de `composer.json`; e o "vice-versa" reprovaria no dia 1 contra
   `setup` e `post-autoload-dump`, que doc nenhuma cita. As três reincidências reais da lição 13
   foram **classe ou pasta citada que nunca existiu** (`app/Data`, `LibreOfficeConverter`).
2. **O container não enxerga a raiz do repositório.** `docker-compose.yml` monta `./backend` e
   `./frontend`; `CLAUDE.md`, `.claude/rules/` e `docs/` não estão montados — conferido de dentro do
   container. PHPUnit não tem como ler o doc que a guarda confere, e criar volume para isso seria
   mudar infra por guarda de doc, o mesmo que o bloco anterior recusou na D-P1. O vitest é o único
   runner do projeto com acesso à raiz.
3. **A guarda 4 nasce verde, e por pouco:** 87 referências conferíveis em 10 docs normativos, **3**
   não resolvem — e as três são negação deliberada (`generated-types.md:16` escreve "Não existe
   `app/Data`"; `README.md:88` é a própria lição 13; `estrutura-monolito.md:192` lista `src/Domains/`
   como alternativa em aberto). Viram lista de exceção declarada, não heurística de vizinhança.

**Um achado que o brainstorming produziu e o BD-1 não previa:** `.claude/rules/frontend-fsliced.md:161-167`
afirma que o runner "cobre os hooks de `shared/hooks/`", e existem **8 testes de hook de feature** no
repositório. É lição 13 dentro do arquivo que o item 8 já ia abrir; a correção entra no mesmo commit
(D6). O registro do bloco anterior, que herdou a mesma premissa ao justificar a Q-6 sem teste, **não**
foi reescrito — é histórico, pelo precedente da P-27.

**Risco de review declarado MÉDIO** (§7 da spec): nenhum gatilho de ALTO se aplica (sem schema, auth,
RBAC, dinheiro, documento legal, `generated.ts`, sem execução delegada). O risco próprio é guarda que
promete cobrir e não cobre — cinco das oito são varredura, e varredura tem escape por construção.

### Aprovação da spec e plano — 2026-08-11

O João aprovou a spec com a instrução literal `pode prosseguir`. O plano ativo
(`docs/superpowers/plans/archive/2026-08-10-guardas-que-faltam.md`, arquivado no fechamento de
2026-08-11) decompõe o bloco em **10 tasks (0–9)**:
baseline; as duas leis como teste; ownership de rota; a instância do axios; a recíproca da
classificação; o barrel; os seis casos da foto; a guarda de referência de doc; a rule; gate. O
handoff fixa **`executor: claude`** — as Tasks 1, 6 e 7 fecham por laço de ajuste contra medição, e o
risco declarado da §7 (guarda que promete cobrir e não cobre) não é detectável por execução linear.

**A escrita do plano mediu o terreno e produziu nove desvios declarados** (§Desvios do plano). Os que
mudam decisão da spec:

1. **A guarda 2 conta segmentos e exige declaração, não binding tipado** (D-P1). A spec pedia
   reprovar "≥2 segmentos com <2 models tipados, com a instrução de tipar o binding". O docblock do
   próprio teste já carregava a objeção certa contra ler a URI — `{file}` não diz que é model —, e a
   saída é a válvula que o teste já usa: `withoutScopedBindings()` com o motivo ao lado. Medido: **8**
   rotas com ≥2 segmentos, todas já declarando, **0** reprovando.
2. **A guarda 3 é arquivo novo** (D-P2). `postMultipart.test.ts` abre com `vi.mock('./axios')`, que é
   hoisted e vale para o arquivo inteiro: "caso sem mock" ali dentro não existe. Vai para
   `axios.test.ts`, e o DoD do frontend passa de **15 para 16** arquivos.
3. **`codigoSemComentarios` vira trait compartilhado** (D-P5). A guarda §5.2 precisa da mesma
   varredura sem comentário que o `DomainDependencyTest` tinha em método privado; duplicar
   reintroduziria o defeito da Q-4 de 2026-08-04 em dois lugares.
4. **A guarda §5.1 exclui `QueryBuilders/`, e a exclusão é provada com sonda** (D-P6), não afirmada
   em comentário: `TurmaQueryBuilder` é o padrão aprovado pelo ADR-02 e uma varredura por sufixo o
   reprovaria.
5. **A guarda 4 ganha duas guardas de si mesma** (D-P8): piso de volume de referências e conferência
   de que cada citação deliberada ainda está no doc que a declara. Extrator que pare de casar
   deixaria o teste verde com zero referências conferidas.

A auto-revisão do plano contra a spec ainda achou três erros de contagem no próprio rascunho e os
corrigiu antes de gravar: o total de casos da Task 3 (9, não 8), a projeção de arquivos do frontend
(16, não 15) e uma contagem absoluta na Task 4 que ignorava os testes da Task 3.

**Risco de review continua MÉDIO.** O foco é um só: para cada guarda, existe uma forma de violar a
lei que ela não pega? O review não roda automaticamente ao fim da Task 9.

### Execução — 2026-08-11: as oito entregues, oito commits

O João autorizou com `/executar-bloco guardas-que-faltam`. Thread principal, main tree, sem worktree
(P-03), do base `4ff7621`. **Task 0 reconferida, não herdada:** backend **522 passed, 1 skipped
(1961 assertions)**, frontend **13 arquivos / 47 testes**, lint e build verdes, árvore limpa — bate
com o plano.

Commits, na ordem do plano: `d5e53b0` (leis §5.1/§5.2 + trait), `e868076` (ownership de rota),
`60fc520` (instância do axios), `c45226a` (recíproca da classificação), `1a630a4` (barrel),
`a4d2d2d` (seis casos da foto), `e42ae30` (referência de doc), `d885738` (a rule). Evidência task a
task e os cinco desvios (D-E1..D-E5) em `.superpowers/sdd/progress.md`.

**Duas medições mudaram a guarda, não só a implementação.** **D-E1** — o regex da §5.2 nascia com
`->\s*unprepared\s*\(` e **não** pegava `DB::unprepared(`, que é a forma idiomática e a que a lei
nomeia; a sonda do próprio plano o denunciou ao produzir uma linha em vez de duas (reprovava pelo
texto `CREATE TRIGGER`, não pela chamada). É o risco da §7 aparecendo dentro do bloco que existe
para eliminá-lo. **D-E2** — a guarda do axios afirma o **valor** fixado, não a presença da chave: o
próprio axios escreve `Content-Type: undefined` em `defaults.headers.common`, e a medição do plano,
feita com `JSON.stringify`, não o via. Assertar ausência de chave reprovaria o estado correto.

**O escape da guarda 2 foi provado, não afirmado:** com a sonda no lugar, o teste **antigo** (por
`git stash` do arquivo) **passa** e o novo reprova. Mesma disciplina na §5.1, onde a exceção de
`QueryBuilders/` foi provada com sonda dentro e fora da pasta.

**A guarda 4 confere 87 referências em 10 docs — o número exato que o plano mediu** — e as 3 que não
resolvem são as 3 exceções declaradas. A guarda-da-guarda foi vista vermelha comentando o `push` do
extrator (`expected 0 to be greater than 60`), com o caso principal passando **em silêncio** com
zero referências conferidas.

**Gate da Task 9:** backend **524 passed, 1 skipped (1963 assertions)** — os 524 projetados; Pint
`passed`; frontend **16 arquivos / 79 testes**, os 16 do plano (D-P2). `git diff main...HEAD` de
`backend/database/` **vazio**; `typescript:transform` sem diff em `generated.ts`; e
`git diff main...HEAD --stat -- backend/app/ frontend/src/features/` **vazio** — nenhuma sonda ficou
para trás e o bloco não toca domínio nem feature.

**Uma etapa de processo foi pulada e fica registrada:** o estado não passou por `executing` no
commit da primeira task durável, como o `/executar-bloco` manda. Ele foi de `ready_for_execution`
direto para `ready_for_review` neste commit. Nenhum trabalho se perdeu — os oito commits são a prova
da execução —, mas se a sessão tivesse caído no meio, o `state.md` estaria mentindo sobre a fase.

**O que o gate NÃO provou, sem maquiagem:** as cinco guardas de varredura têm escape por construção,
e os três medidos estão nomeados no ledger — a guarda 4 só vê token entre crases que **pareça path**,
então classe citada sem `/` (o caso `LibreOfficeConverter`, uma das três reincidências que a
motivaram) segue fora do universo; a guarda 1 casa por **sufixo de nome de arquivo**; e a guarda 2
exige **declaração**, não correção, então `withoutScopedBindings()` escrito por engano a satisfaz.
São o foco do review pela §7 da spec.

**Estado:** `ready_for_review`. Review, fechamento, push e PR não rodam automaticamente.

### Review de sprint — 2026-08-11: uma lente, 4 achados, três provados por sonda

**BAIXO RISCO pelo gate da skill, e a classificação divergiu da spec de propósito.** A §7 da spec
declarou MÉDIO na escala dela; o `/revisar-sprint` é binário, e **nenhum** gatilho de ALTO se aplica
— zero schema, zero `generated.ts`, zero auth/Sanctum, zero auditoria, zero RBAC, sem dinheiro, sem
documento legal, `executor: claude`. Uma frente, lente Claude, **sem Codex**.

**Gate reproduzido, não herdado do relatório de execução:** backend **524 passed, 1 skipped (1963
assertions)**, frontend **16 arquivos / 79 testes**, `pnpm lint` limpo, `pnpm build` verde.

**Órfãos: zero.** `ScansPhpSource` tem os dois consumidores previstos; os quatro símbolos tirados do
barrel (`unclassifiedPayloadKeys`, `classificationConflicts`, `MutableResource`, `CrudFormOptions`)
não têm um único import sobrevivente em `frontend/src/`; nenhuma sonda das oito tasks ficou para
trás.

**A guarda 7 foi testada por mutação, não aceita por contagem.** Três mutantes no `useEntityPhoto`,
cada um pego pelo caso que o promete: `onRetry` lendo a prop `id` em vez do `retryId` reprova
*"reenvia para o id da TENTATIVA"*; remover `sizeError === null` do gate reprova *"`sizeError` apaga
o `onRetry`"*; e `flush` propagando a exceção reprova *"NÃO lança e liga `hasBufferedFailure`"*. Não
é cobertura fantasma.

**A guarda 4 discrimina onde alcança:** path inventado em `.claude/rules/backend-ddd.md` reprova
nomeando `arquivo:linha`. E a afirmação nova da rule — que `frontend/tests/` é type-checado pelo
`tsc -b` — foi **provada**, não aceita: erro de tipo plantado no `repo-docs-refs.test.ts` sai como
`error TS2322` no `pnpm build`. Nenhuma lição 13 nasceu no commit que corrige lição 13.

**Os quatro achados atacam o risco que a própria §7 declarou** — guarda que promete cobrir e não
cobre —, e os três primeiros foram **vistos passando verde contra a violação**, com árvore
restaurada limpa em cada sonda:

1. **Q-1 🟡** — a guarda 3 assere `api.defaults.headers` e **não** a cadeia de interceptors. Fixar
   `Content-Type: application/json` no interceptor de request de `axios.ts:45` — a segunda porta do
   mesmo arquivo, seis linhas abaixo da que a guarda vigia — passa a suíte **inteira** verde (16
   arquivos / 79 testes). O mutante não é hipotético: é literalmente o bug da lição 6, com FormData
   serializado como JSON, cada `File` virando `{}` e upload chegando vazio com 201 silencioso, em
   caminho de documento com peso legal.
2. **Q-2 🟡** — a D4 da spec escreve o escopo como `.claude/rules/*.md` (glob) e o `DOCS` do teste é
   lista literal de quatro nomes. Rule nova (`zz-sonda.md`) citando
   `backend/app/Domains/Inexistente/NaoExiste.php` → **13 passed**. O teste já carrega três
   guardas-de-si-mesmo (doc existe, volume > 60, citação deliberada viva); falta a do **conjunto**, e
   `.claude/rules/` é onde a lição 13 reincidiu duas vezes no mesmo arquivo.
3. **Q-3 🟡** — a guarda §5.2 varre só `backend/database/`; a lei não tem escopo.
   `DB::unprepared("CREATE TRIGGER …")` plantado em `backend/app/Shared/Pdf/PdfRenderException.php`
   → **2 passed**. A §5.1, no mesmo arquivo, já varre `app/` inteiro.
4. **Q-4 🟢** — `vite.config.ts:25` inclui `tests/**/*.test.ts` enquanto a linha ao lado usa
   `src/**/*.test.{ts,tsx}`. Teste de repositório que precise de JSX nunca roda, em silêncio.

**Uma observação medida que NÃO virou achado:** a §5.1 casa por nome de arquivo, e PSR-4 amarra nome
de arquivo a nome de classe para tudo que o autoload alcança — o escape "classe `Repository` em
arquivo com outro nome" é bem menor do que o ledger da execução supunha. Sobra a exclusão de
`/QueryBuilders/`, que é por path: `app/Domains/X/QueryBuilders/ClientRepository.php` escaparia.
Plausibilidade baixa demais para gastar um dos achados.

**Estado:** `blocked`, aguardando o João aprovar quais achados entram. Só achado aprovado se corrige.

### Correções do review — 2026-08-11: os quatro aprovados, dois commits

O João aprovou com a instrução literal `faça Q-1 á Q-4`. Backend em `45534c9`, frontend em
`b854019`. **Os quatro foram vistos vermelhos antes do verde**, cada um contra a violação que
promete pegar:

- **Q-3** — `DB::unprepared("CREATE TRIGGER …")` plantado em
  `app/Shared/Pdf/PdfRenderException.php` reprova agora pelas **duas** formas, e passava verde
  antes. A varredura da §5.2 virou `database/` **mais** `app/`.
- **Q-1** — o mutante no interceptor de `axios.ts` reprova o caso novo (1 failed / 10 passed) e
  passava a suíte inteira antes. A guarda ganhou uma guarda-de-si-mesma: `handlers` vazio (removido,
  ou renomeado numa major do axios) faria o laço iterar em vazio e passar sem exercitar nada.
- **Q-2** — `zz-sonda.md` reprova **nomeando a rule**, e passava com 13 verdes antes.
- **Q-4** — teste `.tsx` em `tests/` roda com o include corrigido (2 arquivos / 15 testes) e era
  **ignorado em silêncio** com o antigo (1 arquivo / 14 testes).

**Uma medição mudou o desenho do Q-1, e a versão recusada fica registrada.** A primeira forma
mandava uma requisição real por `adapter` e lia o header final — o que cobriria o pipeline inteiro.
Medido no jsdom: o próprio axios escreve `Content-Type: application/x-www-form-urlencoded` para
`FormData` (e `application/json` para objeto). É artefato do ambiente, não configuração da app, e
assertar ali **reprovaria o estado correto** — exatamente a armadilha da D-E2 deste bloco, onde
afirmar ausência de chave reprovava o `undefined` que o axios escreve de propósito. O universo da
guarda passou a ser o que a app **declara**: `defaults.headers` mais os interceptors registrados.

**Verificação depois das correções, refeita e não herdada:** backend **524 passed, 1 skipped (1963
assertions)** — o placar não muda porque a Q-3 alargou o universo de uma varredura sem somar teste;
Pint `passed` no `.php` tocado; frontend **16 arquivos / 82 testes** (+3 sobre os 79 do gate: dois
casos novos no axios, um no `repo-docs-refs`); `pnpm lint` limpo, `pnpm build` verde;
`typescript:transform` **sem diff** em `generated.ts`; `git diff main...HEAD` de `backend/database/`,
`backend/app/` e `frontend/src/features/` **vazios**; zero sonda sobrevivente.

**O que continua não provado, sem maquiagem:** as guardas de varredura seguem com escape por
construção, e três nomeados no ledger da execução continuam abertos por decisão de escopo — a
guarda 4 só vê token entre crases que **pareça path** (classe citada sem `/`, o caso
`LibreOfficeConverter`, segue fora), a guarda 1 casa por nome de arquivo (mitigado por PSR-4, não
fechado: `/QueryBuilders/` é exclusão por path e um `Repository` dentro dela escaparia) e a guarda 2
exige **declaração**, não correção. Nenhum dos três foi tocado por estas correções.

**Estado:** `ready_for_closure`. Nada pendente de decisão. O fechamento não roda automaticamente.

### Gate de fechamento — 2026-08-11

**Item 0 — o critério de aceite deste bloco, refeito e não herdado.** O DoD não é suíte verde: a
superfície das oito guardas nasceu limpa, então o que prova o bloco é **guarda vista reprovando com
sonda deliberada** (lição 10). As oito sondas foram plantadas de novo neste gate, não copiadas do
review, e a árvore foi restaurada limpa depois de cada uma:

| Guarda | Sonda | Reprovação |
|---|---|---|
| 1 · §5.1 | `app/Shared/Sonda/FooRepository.php` | nomeia o arquivo, com o diagnóstico do ADR-02 |
| 1 · §5.2 | `app/Shared/Sonda/TriggerAction.php` **e** `database/seeders/SondaTriggerSeeder.php` | quatro ocorrências, as duas formas nas duas pastas |
| 2 | `api/sonda/{parent}/{child}` sem binding tipado | `Rotas: GET\|HEAD api/sonda/{parent}/{child}` |
| 3 · porta A | `Content-Type` no `axios.create` | `não fixa Content-Type na raiz de defaults.headers` |
| 3 · porta B | `headers.set('Content-Type', …)` no interceptor | `expected [ 'application/json' ] to deeply equal []` |
| 4 · path | `docs/README.md` citando `backend/app/Shared/Pdf/NadaAquiConverter.php` | `docs/README.md:145  backend/app/Shared/Pdf/NadaAquiConverter.php` |
| 4 · glob | rule `.claude/rules/zz-sonda.md` fora da lista | `expected [ '.claude/rules/zz-sonda.md' ] to deeply equal []` |
| 5 | `'phone'` em `mapped` **e** em `summaryOnly` no `useStudentForm` | o `useCrudForm` lança nomeando a chave e as duas listas |
| 7 | gate de `sizeError` removido do `onRetry` | `× \`sizeError\` apaga o \`onRetry\`` |

As guardas **6** e **8** não têm sonda porque não são teste: a 6 é o barrel enxuto (conferido —
zero consumidor dos quatro símbolos fora do próprio `useCrudForm.test.ts`, por caminho relativo) e a
8 é a linha da P-25 na rule, que está lá.

**Itens 1–5.** Backend **524 passed, 1 skipped (1963 assertions)**. `pnpm lint` limpo, `pnpm build`
verde, `pnpm test` **16 arquivos / 82 testes** — a baseline era 13/47, e os três arquivos novos são
`repo-docs-refs.test.ts`, `useEntityPhoto.test.tsx` e `axios.test.ts` (o plano previa 15 arquivos
porque o caso da lição 6 nasceria dentro do `postMultipart.test.ts`; virou arquivo próprio na
execução). Pint `{"tool":"pint","result":"passed"}` nos 4 `.php`. `typescript:transform` sem diff em
`generated.ts` — nenhum DTO foi tocado. Zero código morto: `ScansPhpSource` tem exatamente dois
consumidores (`DomainDependencyTest`, `PersistenceLawsTest`), nenhum `.gitkeep` nem placeholder
nasceu, e `git status --porcelain` fica vazio depois das sondas.

**Item 6 — leis.** Nenhuma contrariada. O bloco não toca schema, `generated.ts`, auth, auditoria,
RBAC, financeiro nem documento legal; `backend/app/`, `backend/database/` e `frontend/src/features/`
não têm uma linha de diff contra a `main`. Os três arquivos de produção tocados fazem o que a spec
declarou: o barrel perde export sem consumidor, o `useCrudForm` ganha uma reprovação dentro do
`import.meta.env.DEV` que já existia (por construção não alcança o bundle) e o `vite.config.ts`
amplia o `include` do runner, que é build.

**Item 7 — pendências.** **P-04 fechada:** §5.1 e §5.2, as duas frentes que sobraram da resolução
parcial de 2026-08-03, agora têm mecanismo, visto vermelho neste gate. **P-25 fechada:** a linha
"hook genérico não importa tipo de `shared/ui`" está na `frontend-fsliced.md` com os dois casos
nomeados — era exatamente o gatilho, e não o constraint no `useFilePreview`. As duas fecham **aqui**,
como as próprias linhas prescreviam, e não por o bloco ter existido. **P-28 aberta, com o escape
medido no gate:** a guarda da lição 13 confere **path**, e `LibreOfficeConverter` — a terceira
reincidência, que motivou a guarda — passa **verde** por ser classe citada sem `/` (sonda em
`docs/adrs.md`: 14 testes passando). Nenhuma outra pendência venceu gatilho.

**O que fica aberto e declarado, sem maquiagem.** Cinco das oito guardas são varredura, e varredura
tem escape por construção. Três continuam nomeados: a **4** só vê token que parece path (P-28); a
**1** casa por nome de arquivo e exclui `QueryBuilders/` por path, então um `FooRepository.php`
dentro dessa pasta escaparia — decisão consciente, porque reprovar por semelhança de nome mataria o
padrão que o ADR-02 manda usar; e a **2** exige **declaração**, não correção: `withoutScopedBindings()`
com um comentário mentiroso passa. Nenhum dos três é defeito novo; os três estão escritos no docblock
da guarda que os carrega.

**Arquivamento:** plano → `plans/archive/2026-08-10-guardas-que-faltam.md`; spec →
`specs/archive/2026-08-10-guardas-que-faltam-design.md` (não é compartilhada — nenhum item do backlog
a consome). Entrega registrada no `progress.md`, com a de 2026-08-04 (`guardrails-e-transportes`)
descendo ao `progress-archive.md` para manter dez. **BD-1 removido do `backlog.md`**, junto das
linhas de débito que ele fechou (lição 13 sem mecanismo, Q-2 do `NestedRouteOwnershipTest`, Q-4 do
`postMultipart`, e o Q-2/Q-3 dos três achados de 2026-08-05 — o Q-4 desses três **fica**, porque o
bloco não o tocou). A linha do trio da foto **fica**: o teste do `useEntityPhoto` saiu aqui, a
absorção segue no BD-5.

**Estado do banco de dev:** intocado. O bloco não roda migration, não semeia e não escreve pela API
— nenhuma sonda tocou banco.

**Estado:** `idle`. O próximo item é escolha do João, no `backlog.md`; nada foi promovido.
