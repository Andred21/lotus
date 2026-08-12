# BD-7 · `last_login` — desenho

> Spec do bloco `last-login`, aprovada pelo João em 2026-08-12.
> Origem: `docs/superpowers/backlog.md:140` (BD-7) e o débito de `backlog.md:318-321`.
> **Revisada no mesmo dia**, depois de duas perguntas do João que mudaram o mecanismo — ver §2.0.

## 1. Problema

`last_login` não existe em lugar nenhum. Reconferido em 2026-08-12, não herdado do backlog: zero
ocorrência em `backend/app/`, `backend/database/` e `frontend/src/`. A tabela `users`
(`docs/der-fisico.md:24`) não tem a coluna e `UserData` não tem o campo. O "último acesso" que o
protótipo mostra na tela de Usuários não tem de onde sair.

## 2. Decisões

### D0 — Por que não usar a tabela `sessions` nativa

Pergunta do João, respondida com medição antes de o desenho mudar.

**Laravel não tem `last_login` nativo** — nem no core, nem no Fortify/Jetstream. A tabela `sessions`
**existe neste repo** (nativa, `database/migrations/0001_01_01_000000_create_users_table.php:39-46`,
com `SESSION_DRIVER=database`) e estava viva quando isto foi medido: 5 linhas, 4 do `user_id=1`, uma
com `user_id NULL` de sessão de visitante.

Ela não fecha o requisito, por três razões medidas:

1. **`last_activity` é última *atividade*, não último *login*.** É reescrito a cada request.
2. **A linha é destruída no logout.** `AuthController::logout` chama `session()->invalidate()`, que
   apaga o registro — quem faz logout apaga a própria evidência.
3. **É efêmera por construção.** As linhas expiram em `SESSION_LIFETIME=120` minutos e o garbage
   collector do driver as remove. E o dado morre inteiro se `SESSION_DRIVER` mudar para `redis` ou
   `file` — seria feature de negócio pendurada em config de infra.

O que ela dá de graça é "quem está ativo agora". A pergunta da tela é "quem não acessa há três
meses", e essa ela não responde.

### D1 — Histórico em tabela própria; a coluna em `users` não existe

Decisão do João. O bloco grava **uma linha por login bem-sucedido** em `login_logs`, e o "último
acesso" é **derivado** desse histórico. Nenhuma coluna nova em `users`.

**O schema não copia o da `sessions`**, embora tenha nascido dela na conversa. Três colunas de lá são
artefato do driver de sessão, não do log: `id` string primary é o ID da sessão (log append-only quer
auto-increment); `payload longText` é a sessão serializada (peso morto e passivo de privacidade num
log); e `last_activity integer` é unix timestamp cru, enquanto o projeto usa `timestamp` com cast
`datetime` em todo lugar.

**Derivar em vez de denormalizar** é decisão dele contra manter `users.last_login` escrito em
paralelo: duas fontes para o mesmo fato divergem, e divergem em silêncio porque nada as compara. É a
mesma direção do Q-4 do BD-2, que puniu regra duplicada byte a byte em dois serviços.

**Efeito colateral que simplifica o bloco:** como nunca mais se escreve em `users` no login, morrem
juntos o problema do `$auditInclude` (audit com diff vazio por login), o `saveQuietly` e o
`timestamps = false`. O desenho anterior existia só para contornar uma escrita que deixou de existir.

### D2 — Só logins bem-sucedidos

Decisão do João. Uma linha por acesso concedido, `user_id` NOT NULL.

**Recusado, com a razão registrada:** registrar tentativas falhas. Daria detecção de força bruta, mas
custa `user_id` nullable (senha errada em e-mail inexistente não tem usuário), colunas
`email_intentado` e `success`, e captura dentro do ramo de erro do `AuthController`. Tentativa falha
é feature de segurança com regra própria — rate limit, bloqueio de conta — que o BD-7 não desenha.

**Recusado também:** registrar logout. O par login/logout ficaria incompleto em silêncio, porque
logout por expiração de sessão nunca passa pelo controller.

### D3 — A captura vive numa Action, chamada depois do gate de `is_active`

`RecordLoginAction` em `Identity/Actions/`, injetada no `AuthController`, seguindo a forma escrita em
`.claude/rules/backend-ddd.md` ("Controller = fino. Route-model-binding (leituras) + injeta a Action
(escritas)") e as 10 Actions irmãs do domínio.

**A ordem é medida, não estética.** O gate de `is_active` mora em `AuthController.php:43-48`, DEPOIS
do `attempt()`. Capturar antes dele gravaria acesso de usuário inativo cuja senha estava certa — um
login que a API recusou com 422.

**A Action não recebe a `Request`.** O controller passa `$request->ip()` e `$request->userAgent()`
como argumentos — a fronteira da Action é dado, não transporte, como nas 10 irmãs.

**Recusado:** listener do evento `Illuminate\Auth\Events\Login`. Ele dispara no `attempt()`
bem-sucedido, ou seja **antes** do gate, e exigiria repetir o gate dentro do listener. O argumento a
favor dele — pegar portas de autenticação que não passam pelo controller — foi medido e não se
sustenta hoje: o frontend **nunca** envia `remember` (zero ocorrência em `features/identity/` e
`shared/api/`), então o caminho de cookie "remember me" está morto, e o repo não tem um único
listener de evento de auth. `AuthController::login` é a única porta por onde alguém autentica.

### D4 — A leitura é por relação `latestOfMany`, que falha alto

`User::latestLogin()` = `hasOne(LoginLog::class)->latestOfMany()`, eager-loaded pelos controllers que
projetam usuário.

**A alternativa foi medida e recusada por modo de falha, não por custo.** `withMax('loginLogs',
'created_at')` é mais barato — subselect, zero query extra — mas **falha em silêncio**: controller que
esqueça o `withMax` projeta `null`, e a tela diz "nunca acessou" para todo mundo, sem erro em lugar
nenhum. Com a relação, o mesmo esquecimento estoura no `Model::preventLazyLoading()`.

É a mesma direção da D-B3 do bloco `turma-habilitacao-listagem`, que matou um
`?? $turma->enrollments()->count()` justamente por esconder query atrás de fallback silencioso.

**Este é o risco central do bloco e tem cicatriz no repo:** o seam do B4 introduziu N+1 em quatro
listagens em 2026-08-08 porque a carga ficou para trás. Por isso o eager-load entra no mesmo commit
da relação e ganha guarda de runtime própria (§4, prova 6).

### D5 — A coluna mostra data + hora, não data seca nem tempo relativo

`12-08-2026 14:32` em es-CL. Quem nunca acessou mostra travessão (`—`).

Data seca perde a distinção entre "agora há pouco" e "hoje cedo", que é justamente o que discrimina
numa tela cujo propósito é decidir se a conta está em uso. Tempo relativo (`hace 3 días`) lê-se
rápido mas esconde a data exata, e esta é tela administrativa auditada.

O formatter novo **compõe** os dois que já existem em `frontend/src/shared/lib/datetime.ts`
(`formatDate`, `formatTime`) — não reimplementa `Intl`.

### D6 — Escopo de tela: Usuários **e** Redatores

Decisão do João sobre o desenho apresentado, que propunha só Usuários. Redator autentica (RN-01), e
`RedatorData::fromModel` já achata campos do `user` (`name`/`rut`/`email`/`phone`) — a leitura entra
pela relação `user`, que aquele DTO já atravessa.

**Fora de escopo, declarado:**

- **Tela de histórico.** O bloco **grava** o histórico e **exibe só o último acesso**. Uma tela que
  liste os acessos de um usuário é endpoint novo, diálogo novo e paginação — feature própria, não
  este bloco. Fica registrado como candidato a backlog, não como esquecimento.
- **`SessionUserData` não ganha o campo.** A captura acontece antes de o payload da sessão ser
  montado, então `/me` diria "último acesso = agora" — o acesso atual, não o anterior. Campo que
  mente por construção.
- **`StudentsTable` fica de fora**, e não por esquecimento: aluno não autentica (RN-01), então a
  coluna seria vazia permanente ali. O mesmo vale para clientes.
- **Sem backfill.** Usuário existente não tem log e mostra travessão. Zero migration de dados.

### D7 — Fuso resolvido pelo transporte, não por conversão manual

`config/app.php` tem `timezone => 'UTC'`. O backend grava e projeta em UTC com `Z` (`toISOString`), e
`new Date(iso)` no browser converte para o local. Nenhum ponto do código converte fuso à mão.

## 3. As peças

### 3.1 Schema

Tabela nova `login_logs`:

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | `id()` | auto-increment; log append-only |
| `user_id` | `foreignId->constrained()->cascadeOnDelete()` | NOT NULL (D2) |
| `ip_address` | `string(45)` nullable | cabe IPv6 |
| `user_agent` | `text` nullable | |
| `created_at` | `timestamp` | único timestamp — o model declara `const UPDATED_AT = null` |

Índice composto `['user_id', 'created_at']`: é exatamente o acesso que o `latestOfMany` faz.

`ip_address` e `user_agent` são **dado pessoal**. A retenção entra em `docs/pendencias.md` junto da
P-02, que já está aberta para a auditoria sem política definida. Volume não é o problema (~10
usuários internos), a retenção é.

O model `LoginLog` **não é `Auditable`** e não entra no morph map (ADR-10): não é polimórfico, e
auditar um log append-only seria guardar rastro de que o rastro nasceu.

`docs/der-fisico.md` ganha a tabela no mesmo commit da migration. **Sem ADR novo:** não há decisão de
stack, padrão ou infra — a tabela segue as convenções já escritas em `.claude/rules/migrations.md`.

### 3.2 `RecordLoginAction`

`backend/app/Domains/Identity/Actions/RecordLoginAction.php` — cria uma linha de `login_logs` a
partir do `User`, do IP e do user-agent recebidos como argumentos.

**Sem `DB::transaction`, exceção declarada no docblock:** é um insert, não há duas escritas a
atomizar. Precedente de exceção escrita e justificada no código: `BatchIssueCertificatesAction`.

Fiação: `AuthController::login` injeta a Action e a chama depois do gate de `is_active` e do
`session()->regenerate()`.

### 3.3 Leitura e projeção

- `User::loginLogs()` (`hasMany`) e `User::latestLogin()` (`hasOne(...)->latestOfMany()`).
- `UserData` e `RedatorData` ganham `#[Computed] public ?string $last_login = null` — o molde do
  `photo_url` que os dois já carregam: só saída, sem `Optional`, fora do `rules()`.
- `UserData::fromModel`: `$user->latestLogin?->created_at?->toISOString()`, molde do
  `CertificateData:54` (`revoked_at`).
- `RedatorData::fromModel`: `$redator->user->latestLogin?->created_at?->toISOString()`.
- **Eager-load no mesmo commit** (D4): `latestLogin` nos caminhos do `UserController` e
  `user.latestLogin` nos do `RedatorController`.
- `typescript:transform` regenera `generated.ts` **no mesmo commit** que ajusta os consumidores,
  conforme `.claude/rules/generated-types.md`.

### 3.4 Frontend

- `shared/lib/datetime.ts`: `formatDateTime(date: Date): string`, compondo `formatDate` e
  `formatTime`.
- `UsersTable`: `AppColumn` entre "estado" e a coluna de ações — `field="last_login"`, `sortable`,
  body `u.last_login ? formatDateTime(new Date(u.last_login)) : '—'`.
- `RedatoresTable`: mesma coluna, entre "idoneidade" e ações.
- i18n: **uma** chave `common.lastLogin`, não duas. As duas tabelas vivem em namespaces diferentes
  (`admin.*` e `redator.*`) e o rótulo é o mesmo — `common.rut` já é o precedente de chave
  compartilhada entre exatamente essas duas telas. Nos **três** locales, com chaves idênticas, es-CL
  como referência (`Último acceso`).

## 4. Provas (DoD comportamental)

Suíte verde não fecha item nenhum. O que fecha:

1. **Login bem-sucedido cria UMA linha em `login_logs`** com `user_id`, `ip_address` e `user_agent`
   corretos — **e `users.updated_at` fica inalterado e `audits` não recebe linha nova**. As
   asserções no mesmo caso: o bloco promete não tocar `users` no login, e isso tem de ser afirmado,
   não presumido de "não escrevi lá".
2. **Login de usuário inativo com senha certa → 422 e zero linha em `login_logs`.** É o gate de ordem
   da D3, e o teste tem de ser visto **vermelho** movendo a chamada para antes do gate.
3. **Senha errada → zero linha.**
4. **Segundo login do mesmo usuário cria segunda linha, e o projetado passa a ser a mais recente.**
   Sem este caso, uma implementação que devolvesse a linha *mais antiga* passaria — é o caso que
   discrimina `latestOfMany` de um `hasOne` qualquer.
5. `UserData` e `RedatorData` projetam ISO 8601; usuário sem nenhum log projeta `null`.
6. **Guarda de eager-load** (D4, e é a cicatriz do B4): listagem com **duas ou mais** linhas
   hidratadas não dispara lazy load, com contagem de query afirmada. `Builder::hydrate()` só liga o
   `preventLazyLoading` por instância quando `count($items) > 1` — medido em 2026-08-08 —, então uma
   linha só não prova nada. Vale para `GET /api/users` **e** `GET /api/redatores`.
7. `formatDateTime` com teste unitário co-locado em `shared/lib` (o vitest já casa
   `src/**/*.test.ts` — sem mudança de config).
8. **E2E contra a API real** (lição 12): login por cookie Sanctum + CSRF, `GET /api/users` e
   `GET /api/redatores` trazendo o `last_login` do usuário recém-logado; SQL cru confirmando a linha
   em `login_logs` com IP e user-agent, `users.updated_at` intacto e `audits` sem linha nova.

## 5. Risco de review

**ALTO.** Três gatilhos do `/revisar-sprint` se aplicam: o bloco toca **auth** (`AuthController`),
toca **schema** (tabela nova) e toca **`generated.ts`**. Duas lentes — Claude mais revisão
independente do Codex.

Dois riscos próprios, os dois com precedente medido neste repositório:

1. **N+1 por carga que fica para trás.** É literalmente o Q-1 de 2026-08-08, onde um seam novo custou
   quatro listagens. A D4 escolhe o mecanismo que falha alto justamente por isso, e a prova 6 é a
   guarda.
2. **A ordem da captura contra o gate de `is_active`.** Se a chamada escorregar para antes do gate,
   o sistema grava acesso concedido a quem a API recusou — e nada reclama, porque a linha é um insert
   válido. Só a prova 2 discrimina, e por isso ela precisa ser vista reprovar.

## 6. Contexto de execução

Bloco de backend → main tree, sem worktree (P-03). Roda **em paralelo** com
`estilizacao-adr16-shell-tipografia`, que segue `reviewing` na worktree
`/home/jvbat/projetos/fix-frontend` — paralelismo autorizado explicitamente pelo João em 2026-08-12,
relaxando a invariante de um `active_work_item` só.

**Colisão medida com a outra frente, e ela é em doc, não em código:** a branch
`feat/estilizacao-adr16-shell-tipografia` mexe em `docs/superpowers/state.md` (+287 linhas) e
`docs/superpowers/backlog.md` (+20), então os dois estados conflitam no merge e a resolução é
manual. No código o risco é baixo: de `features/identity/` aquela branch tocou só
`LoginPage.tsx` (2 linhas), e este bloco não toca `shared/ui/` nem as folhas de tema.

**P-03 não vence com este bloco:** o gatilho exige dois `active_work_item` de **backend** em
paralelo, e `estilizacao` é frontend.
