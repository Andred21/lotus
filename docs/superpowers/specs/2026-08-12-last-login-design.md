# BD-7 · `last_login` — desenho

> Spec do bloco `last-login`, aprovada pelo João em 2026-08-12.
> Origem: `docs/superpowers/backlog.md:140` (BD-7) e o débito de `backlog.md:318-321`.

## 1. Problema

`last_login` não existe em lugar nenhum. Reconferido em 2026-08-12, não herdado do backlog: zero
ocorrência em `backend/app/`, `backend/database/` e `frontend/src/`. A tabela `users`
(`docs/der-fisico.md:24`) não tem a coluna e `UserData` não tem o campo. O "último acesso" que o
protótipo mostra na tela de Usuários não tem de onde sair.

## 2. Decisões

As três primeiras são do João, respondidas antes de a spec existir. As demais são chamadas do
desenho, apresentadas e aprovadas no mesmo turno.

### D1 — A coluna mostra data + hora, não data seca nem tempo relativo

`12-08-2026 14:32` em es-CL. Quem nunca acessou mostra travessão (`—`).

Data seca perde a distinção entre "agora há pouco" e "hoje cedo", que é justamente o que discrimina
numa tela cujo propósito é decidir se a conta está em uso. Tempo relativo (`hace 3 días`) lê-se
rápido mas esconde a data exata, e esta é tela administrativa auditada.

O formatter novo **compõe** os dois que já existem em `frontend/src/shared/lib/datetime.ts`
(`formatDate`, `formatTime`) — não reimplementa `Intl`.

### D2 — A captura é escrita silenciosa: zero audit, e `updated_at` intacto

`User.php:53-68` documenta que `$auditInclude` **filtra o diff**, não só o evento: atributo de fora
da lista gera audit com `old_values`/`new_values` vazios — "sabe-se que algo mudou, nunca O QUE
mudou". `last_login` não está na lista.

Escrever a coluna com `save()` comum produziria **uma linha de audit inútil por login, para sempre**.
É o comportamento default e é o pior dos caminhos: polui uma tabela de peso legal com registros que
não informam nada, e a P-02 (retenção da auditoria) já está aberta sem política definida.

A escrita é `saveQuietly()` com `timestamps` desligado. Os dois, não um: `saveQuietly` sozinho ainda
toca `updated_at`, e aí "última edição do cadastro" passaria a mentir a cada login.

O campo **já é** o registro do acesso — auditá-lo seria guardar rastro de que o rastro mudou. Isto
não contraria a Lei 2 (`CLAUDE.md` §5.2): segue tudo na aplicação, sem trigger de banco.

**Recusadas, com a razão registrada:** pôr `last_login` no `$auditInclude` (daria histórico de
**todos** os acessos, mas engorda `audits` a cada login) e criar tabela `login_logs` própria (dado
forense de verdade, mas é segunda tabela e segunda migration — o BD-7 pede uma coluna).

### D3 — A captura vive numa Action, chamada depois do gate de `is_active`

`RecordLoginAction` em `Identity/Actions/`, injetada no `AuthController`, seguindo a forma escrita em
`.claude/rules/backend-ddd.md` ("Controller = fino. Route-model-binding (leituras) + injeta a Action
(escritas)") e as 10 Actions irmãs do domínio.

**A ordem é medida, não estética.** O gate de `is_active` mora em `AuthController.php:43-48`, DEPOIS
do `attempt()`. Capturar antes dele gravaria acesso de usuário inativo cuja senha estava certa — um
login que a API recusou com 422.

**Recusado:** listener do evento `Illuminate\Auth\Events\Login`. Ele dispara no `attempt()`
bem-sucedido, ou seja **antes** do gate, e exigiria repetir o gate dentro do listener. O argumento a
favor dele — pegar portas de autenticação que não passam pelo controller — foi medido e não se
sustenta hoje: o frontend **nunca** envia `remember` (zero ocorrência em `features/identity/` e
`shared/api/`), então o caminho de cookie "remember me" está morto, e o repo não tem um único
listener de evento de auth. `AuthController::login` é a única porta por onde alguém autentica.

### D4 — Escopo de tela: Usuários **e** Redatores

Decisão do João sobre o desenho apresentado, que propunha só Usuários. Redator autentica (RN-01), e
`RedatorData::fromModel` já achata campos do `user` (`name`/`rut`/`email`/`phone`) — o campo entra
pela **mesma relação já percorrida**, sem eager-load novo e sem N+1.

**Fora de escopo, declarado:**

- **`SessionUserData` não ganha o campo.** A captura acontece antes de o payload da sessão ser
  montado, então `/me` diria "último acesso = agora" — o acesso atual, não o anterior. Campo que
  mente por construção.
- **Sem backfill.** Usuário existente fica `NULL` e mostra travessão. Zero migration de dados.
- **`StudentsTable` fica de fora**, e não por esquecimento: aluno não autentica (RN-01), então a
  coluna seria `NULL` permanente ali. O mesmo vale para clientes.

### D5 — Coluna sem índice

`users.last_login TIMESTAMP NULL`, depois de `is_active`. Cast `'last_login' => 'datetime'` em
`User::casts()`.

Sem índice: são ~10 usuários internos e o `DataTable` recebe a lista inteira, então a ordenação
acontece no cliente. Índice aqui seria custo de escrita sem leitura que o justifique.

A ausência no `$auditInclude` é **deliberada e fica escrita** no docblock que já existe em
`User.php:53-68` — sem isso, o próximo leitor "conserta" acrescentando o campo e reintroduz a linha
vazia por login que a D2 existe para evitar.

`docs/der-fisico.md:24` é atualizado no mesmo commit da migration. **Sem ADR novo:** não há decisão
de stack, padrão ou infra — é uma coluna.

### D6 — Projeção segue o molde do campo só-de-saída

`UserData` e `RedatorData` ganham `#[Computed] public ?string $last_login = null`, o molde do
`photo_url` que os dois já carregam: só saída, sem `Optional`, fora do `rules()`.

`fromModel` projeta `?->toISOString()`, molde do `CertificateData:54` (`revoked_at`).

`typescript:transform` regenera `generated.ts` **no mesmo commit** que ajusta os consumidores,
conforme `.claude/rules/generated-types.md`.

### D7 — Fuso resolvido pelo transporte, não por conversão manual

`config/app.php` tem `timezone => 'UTC'`. O backend grava e projeta em UTC com `Z` (`toISOString`), e
`new Date(iso)` no browser converte para o local. Nenhum ponto do código converte fuso à mão.

## 3. As peças

### 3.1 Schema

Migration acrescenta `users.last_login TIMESTAMP NULL` depois de `is_active`. Cast em `User::casts()`.
Comentário no docblock do `$auditInclude` registrando por que o campo está fora da lista.

### 3.2 `RecordLoginAction`

`backend/app/Domains/Identity/Actions/RecordLoginAction.php`:

```php
$user->timestamps = false;
$user->forceFill(['last_login' => now()])->saveQuietly();
```

**Sem `DB::transaction`, exceção declarada no docblock:** é um statement, não há duas escritas a
atomizar. Precedente de exceção escrita e justificada no código: `BatchIssueCertificatesAction`.

Fiação: `AuthController::login` injeta a Action e a chama depois do gate de `is_active` e do
`session()->regenerate()`.

### 3.3 Projeção

- `UserData`: propriedade nova + linha no `fromModel`.
- `RedatorData`: propriedade nova + `last_login: $redator->user->last_login?->toISOString()`.
- `generated.ts` regenerado.

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

1. **Login bem-sucedido grava `last_login`, `updated_at` fica inalterado e `audits` não recebe linha
   nova** — as três asserções no mesmo caso, porque cada uma isolada passa com o defeito da outra
   presente.
2. **Login de usuário inativo com senha certa → 422 e `last_login` inalterado.** É o gate de ordem da
   D3, e o teste tem de ser visto **vermelho** movendo a chamada para antes do gate.
3. **Senha errada → `last_login` inalterado.**
4. `UserData` e `RedatorData` projetam ISO 8601; quem nunca acessou projeta `null`.
5. `formatDateTime` com teste unitário co-locado em `shared/lib` (o vitest já casa
   `src/**/*.test.ts` — sem mudança de config).
6. **E2E contra a API real** (lição 12): login por cookie Sanctum + CSRF, `GET /api/users` e
   `GET /api/redatores` trazendo o `last_login` do usuário recém-logado, com SQL cru confirmando
   `updated_at` intacto e `audits` sem linha nova.

## 5. Risco de review

**ALTO.** Três gatilhos do `/revisar-sprint` se aplicam: o bloco toca **auth** (`AuthController`),
toca **schema** (migration) e toca **`generated.ts`**. Duas lentes — Claude mais revisão independente
do Codex.

Risco próprio do bloco: **escrita silenciosa é, por definição, escrita que a auditoria não enxerga.**
Se `saveQuietly` for aplicado ao model errado, ou a chamada escorregar para antes do gate de
`is_active`, nada no sistema reclama — não há audit, não há `updated_at`, não há exceção. Só o teste
da prova 2 discrimina, e por isso ele precisa ser visto reprovar.

## 6. Contexto de execução

Bloco de backend → main tree, sem worktree (P-03). Roda **em paralelo** com
`estilizacao-adr16-shell-tipografia`, que segue `reviewing` na worktree `/home/jvbat/projetos/fix-frontend`
— paralelismo autorizado explicitamente pelo João em 2026-08-12, relaxando a invariante de um
`active_work_item` só.

**Colisão medida com a outra frente, e ela é em doc, não em código:** a branch
`feat/estilizacao-adr16-shell-tipografia` mexe em `docs/superpowers/state.md` (+287 linhas) e
`docs/superpowers/backlog.md` (+20), então os dois estados conflitam no merge e a resolução é
manual. No código o risco é baixo: de `features/identity/` aquela branch tocou só
`LoginPage.tsx` (2 linhas), e este bloco não toca `shared/ui/` nem as folhas de tema.

**P-03 não vence com este bloco:** o gatilho exige dois `active_work_item` de **backend** em
paralelo, e `estilizacao` é frontend.
