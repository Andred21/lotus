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
last_completed_work_item: identity-ativacao-acesso-redator
state_basis_commit: 929b1e6
updated_at: 2026-08-19T16:05:00-03:00
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

## Último item fechado — 2026-08-19 (`identity-ativacao-acesso-redator`, item 4 de "Próximos blocos")

### Seleção — 2026-08-18

**Item 4 de "Próximos blocos" (`backlog.md`), promovido explicitamente pelo João** com o estado em
`idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre: o
argumento era a **linha do backlog** ("Identity · ativação de acesso do redator"), com bullet e
markdown, não slug promovido.

**Três decisões dele fecharam o gate:** o slug `identity-ativacao-acesso-redator`; a rota
**`context_required`**, porque "como o redator recebe a credencial" é decisão de produto e a fonte é
externa ao repositório; e a **worktree `fix-frontend`** como área de trabalho, contra a regra do
comando — a exceção está declarada abaixo, não descoberta na execução.

**A branch nasceu ANTES deste commit**, seguindo o precedente do B1 e do B2:
`feat/identity-ativacao-acesso-redator`, criada de `main@2c7b249`. Este arquivo já é escrito na
branch, não na `main`. Árvore limpa na promoção.

### Duas regras cedem por decisão explícita do João — declaradas na abertura

1. **P-03 · bloco de backend rodando em worktree linkada.** A regra do `/planejar-bloco` é "toque
   backend assume main tree por causa da P-03", e a main tree é `/home/jvbat/projetos/lotus`
   (primeira linha de `git worktree list`), não esta árvore. **Não há compose por worktree:** o
   MySQL e o container `app` são um só, então migration, seed e teste de integração deste bloco
   disputam o mesmo banco com a outra árvore. A mitigação não está desenhada — entra como custo do
   planejamento, e o gatilho da P-03 vence aqui em vez de ser adiado de novo.

2. **A base não contém `arquivados-e-restauracao`.** Medido na promoção: `/home/jvbat/projetos/lotus`
   está em `feat/arquivados-e-restauracao@3d7e95c` ("docs(state): fecha o bloco
   arquivados-e-restauracao"), com `state.md` próprio em `idle` e
   `last_completed_work_item: arquivados-e-restauracao` — e a `main` **não tem esse merge**
   (`main@2c7b249` é o PR #59, do BD-13). Os dois `state.md` concordam na **etapa** (`idle` nos
   dois) e divergem na **história**: o `backlog.md` desta árvore ainda lista "Arquivados e
   restauração de soft-delete" como Próximos blocos #1, e o estado daqui não sabe do fechamento.
   **Conflito de merge é provável e está previsto** — aquele bloco mexe no lifecycle de arquivamento
   dos agregados e este mexe em `User`/Identity. Integrar primeiro foi oferecido e recusado; a
   reconciliação fica para o fechamento.

### Quatro medições da abertura, feitas sobre `2c7b249` e não herdadas do backlog

1. **`password_reset_tokens` existe e ninguém a usa.** A tabela nasce em
   `database/migrations/0001_01_01_000000_create_users_table.php` e `config/auth.php:98` a aponta;
   não há uso do broker `Password::` no `app/` nem rota de reset em
   `app/Domains/Identity/routes.php`, que expõe apenas `/login`, `/logout`, `/me` e `profile/*`.
   **A infra está pronta e o fluxo é o que falta** — o bloco decide se a usa ou não.

2. **Não existe transporte de e-mail.** `MAIL_MAILER=log` no `.env.example` e nenhum
   `app/Notifications`. Se a decisão de produto for convite por e-mail, o custo não é "escrever a
   Notification": é escolher e configurar transporte para dev e para produção, e isso é infra nova
   num bloco de identidade.

3. **Ativar o login não basta: o redator nasce sem role.** `syncRoles` só existe em
   `CreateStaffUserAction.php:45` e `UpdateStaffUserAction.php:62` — `CreateRedatorAction` e
   `UserProvisioner` não atribuem nada, embora `RolePermissionSeeder.php:38` já defina a role
   `redator` com quatro permissões (`operation.turma.view`, `operation.turma.submit_docs`,
   `feedback.feedback.view`, `feedback.feedback.manage`). **Um redator ativado hoje autenticaria sem
   permissão nenhuma**, e a view do dashboard dele abriria assim mesmo, porque o gate é por `type`
   (`DashboardController.php:37`) e não por role. É a metade do defeito que o backlog não registrava.

4. **Nenhuma escrita de `is_active = true` alcança um redator.** `UserProvisioner.php:40` grava
   `false` para todo ator (RN-01), e o campo só é escrito depois em `CreateStaffUserAction:42` e
   `UpdateStaffUserAction:54`, que são staff. `AuthController.php:52` recusa o inativo. Não há
   endpoint, tela ou comando que vire o bit para redator — a promoção confirma o que o fechamento do
   `dashboard-backend-agregacoes` mediu em 2026-08-15.

**Risco de review projetado: ALTO pelo gate binário.** O bloco toca autenticação (lei §5.4, Sanctum
cookie/CSRF), a RN-01 (lei §5.5) e RBAC, e provavelmente cria caminho de credencial. A classificação
final é do `/revisar-sprint`, não desta promoção.

**O que a promoção NÃO decide, e é entrada do brainstorming:** o mecanismo de entrega da credencial
(convite por e-mail × senha definida no cadastro × link de ativação assinado), se `is_active` vira
ação administrativa explícita, e se a role `redator` passa a ser atribuída no cadastro. **O packet
vem antes** — nenhuma dessas respostas se supõe a partir do código.

**Estado: `context_required`.** Próxima ação: Context Packet pelo Codex, read-only, sobre
`feat/identity-ativacao-acesso-redator` a partir de `main@2c7b249`.

### Context Packet — 2026-08-18: a fonte canônica decide o canal e não decide o mecanismo

Gerado pelo Codex (`lotus-context-packet`, sandbox read-only, sobre `03a0b72`) e validado contra o
contrato item a item: marcadores exatos, frontmatter completo com `plan_path`/`spec_path` em
**`null`** (registrados, não omitidos), **8 key facts** — o teto —, fonte indisponível registrada
como tal e `RECOMMENDED_TRANSITION` presente. Salvo em
`context-packets/2026-08-18-identity-ativacao-acesso-redator.md`. **Uma re-invocação não se
justifica:** o contrato não foi violado, o packet respondeu o que pôde e nomeou o que falta.

**O que o Drive decide, e o backlog não sabia:** a credencial de admin e de redator **vai por
e-mail do sistema** (RF-USR-09 em `requisitos-negocio.md`), não há auto-registro, e a role
correspondente ao tipo deve ser associada **automaticamente no cadastro** (RF-ROL-05) — o que
transforma a medição 3 da abertura de "achado de desenho" em **divergência com a fonte canônica**:
o código não atribui role nenhuma ao redator.

**O que nenhuma fonte decide, e é por isso que o estado vai a `blocked`:** o Drive fixa o canal e
não o conteúdo — senha gerada, senha escolhida pelo admin, convite para definir senha ou link
assinado de ativação são todos compatíveis com o que está escrito. `modulo-identidade-acesso.md`
prevê recuperação de senha e verificação de e-mail, **e prever recuperação não autoriza usá-la como
convite**. A EAP do Notion não tem task de ativação, convite, primeiro acesso ou verificação: as
adjacentes são login (2.2.2), administração de staff (2.6.2), CRUD de redator (4.1.4/4.2.2), troca
autenticada da própria senha (8.5.7) e rate limit (9.1.1).

**Figma ficou `unavailable` e isso está registrado, não maquiado:** o runtime do Codex não tem
ferramenta de descoberta de arquivo, e nenhuma fonte consultada forneceu `fileKey`/`nodeId`. Se
existir tela de primeiro acesso no protótipo, ela não foi vista — e virou staleness trigger.

**Duas perguntas bloqueiam o brainstorming**, e as duas são de produto, não de código:

1. **O que o e-mail entrega** — senha gerada, convite para definir senha, link assinado de
   ativação/redefinição, ou mecanismo já acordado com a Lotus.
2. **Em que evento `is_active` passa a `true`** — no cadastro, no envio do convite, na conclusão do
   link, ou por ação administrativa explícita.

Expiração, reenvio, revogação e e-mail não recebido dependem da primeira e ficam registrados como
terceira pergunta, não bloqueante.

**Estado: `blocked`, com `resume_state: context_required`.** Respondidas as duas, o packet é
atualizado (não regerado do zero) e o estado retorna a `ready_for_planning`. **Não implemento, não
escolho por ele, e não trato "recuperação de senha" como convite por conveniência.**

### Bloqueio resolvido — 2026-08-18: as duas decisões de produto saíram do João

O packet voltou `blocked` porque nem Drive nem Notion decidiam o mecanismo. **O João decidiu os
dois pontos, e a decisão é dele — não está escrita no Drive**, então virou fonte `[JOAO-DEC]` no
packet e staleness trigger no sentido contrário: se a Lotus registrar algo que contradiga, o packet
envelhece.

1. **Um mecanismo, dois fluxos: link por e-mail.** O mesmo caminho serve **primeiro acesso**
   (disparado no cadastro do redator) e **recuperação de senha** (self-service). Isso põe em uso a
   `password_reset_tokens` que a medição 1 da abertura achou pronta e órfã, e satisfaz o canal que o
   RF-USR-09 exige sem inventar um segundo padrão de credencial.
2. **`is_active` nasce `true` para o redator, no cadastro, e o admin pode revogar.** Cliente e aluno
   continuam `false` por padrão — a RN-01 fica intacta onde ela vale. A consequência prática é que
   o gate de acesso do redator passa a ser *saber a senha*, não *estar ativo*: `UserProvisioner`
   grava `false` para todo ator hoje (`:40`), então o default deixa de ser único e passa a depender
   do `type`.

**O que a decisão NÃO fecha, e é o que o brainstorming resolve:** expiração/reenvio do link de
primeiro acesso (a política de 60 min do broker foi desenhada para recuperação), por qual superfície
o admin revoga, se o bloco entrega backend e frontend juntos — "esqueci minha senha" e "definir
senha" são telas **públicas** que não existem — e como o DoD prova o e-mail com `MAIL_MAILER=log`.

**Estado: `ready_for_planning`.** Packet atualizado no lugar (`status: ready`), não regerado.

### Brainstorming e spec — 2026-08-18: seis decisões, e uma delas nasceu de medição, não de pergunta

Cinco perguntas fecharam o desenho, e uma sexta decisão entrou **porque a medição a exigiu**: sem
reenvio de convite não há caminho para os redatores já cadastrados, que nasceram `is_active=false`
com senha aleatória — o switch liga a conta e ninguém sabe a senha, e eles não sabem que existem
para pedir recuperação.

**As escolhas:** só redator agora (staff segue com senha digitada, e isso vira débito contra o
RF-USR-09); bloco único ponta a ponta, fugindo do corte por camada do Dashboard e do Meu Perfil,
porque o DoD é "o redator autentica" e isso não se prova sem as telas públicas; dois brokers sobre
`password_reset_tokens` (7 dias para convite, 60 min para recuperação), com link morto caindo na
tela de recuperação em vez de virar chamado; `is_active=true` no cadastro com switch de revogação
no formulário do redator, encerrando todas as sessões; e Mailpit no compose, para o DoD clicar o
link real em vez de ler o `laravel.log`.

**Uma medição nova durante o brainstorming mudou o alcance da pergunta, e foi respondida:** staff
hoje recebe senha digitada pelo admin no formulário (`CreateStaffUserAction.php:41`), enquanto o
RF-USR-09 fala de admin **e** redator. O mecanismo novo tem um segundo consumidor óbvio; o João o
deixou fora, com o custo declarado.

Spec em `specs/2026-08-18-identity-ativacao-acesso-redator-design.md`.

### Plano — 2026-08-18: escrever o plano derrubou o mecanismo da D5

14 tasks, executor **claude**. O critério do `/executar-bloco` não deixa margem: o bloco toca lei do
§5 em três pontos — §5.3 (`generated.ts` regenerado), §5.4 (rotas públicas novas, purga de sessões,
`sendPasswordResetNotification`) e §5.5 (o default de `is_active` deixa de ser único) — e decide
contrato de API em duas tasks. Nada disso é mecânico com paths fechados, então não vai ao Codex.

**A D5 aprovada não sobreviveu à escrita do plano, e a spec foi emendada (§9).** "Dois brokers sobre
a mesma tabela" não funciona: o `expire` é aplicado na validação, pelo broker que valida, então com
uma tabela só o endpoint de reset não distingue token de convite (7 dias) de token de recuperação
(60 min) — e validar pelo broker errado daria 7 dias à recuperação. Pior, `password_reset_tokens`
tem uma linha por e-mail: um "esqueci minha senha" apagaria o convite pendente do mesmo redator.
**Correção:** tabela `invitation_tokens` própria e dois endpoints (`/api/invitation/accept` e
`/api/password/reset`), com a tela pública única decidindo pelo `?flow=`. A decisão de produto do
João fica intacta; muda a mecânica que a sustenta.

**Segunda correção, menor, também medida:** a spec falava em "switch" de acesso, e não existe
`AppSwitch` em `shared/ui` — feature não importa PrimeReact direto (§5.6). O controle copia o molde
já existente do staff (`StaffUserDialog.tsx:118-130`): `FormField` + `AppDropdown` Activo/Inactivo.

Plano em `plans/2026-08-18-identity-ativacao-acesso-redator.md`.

### Execução — 2026-08-19: 14 tasks, e o DoD do gate provado no navegador

As 14 tasks do plano estão implementadas e commitadas, uma por commit, de `50e76cd` a `112b145`
(mais `644e372` e `18adad6`, os dois artefatos do transformer). Ledger com a prova task a task em
`.superpowers/sdd/progress.md`.

**Catracas (Task 14, Step 1):** suíte backend `5 skipped, 704 passed (2586 assertions)`; `pint --test`
verde nos arquivos do bloco; `pnpm lint` limpo, `pnpm build` ok, `pnpm test` `67 files / 401 tests`;
`typescript:transform` seguido de `git diff --exit-code` em `generated.ts` sem saída.

**A P-03 não travou o gate, e a stack do João não foi derrubada.** Override efêmero de portas fora do
repositório subiu a stack deste worktree em nginx **8081**, MySQL **3308** e Mailpit **8025**, com o
Vite do worktree em **5174** — a 5173 é o dev server da main tree. Depois do gate, só
`fix-frontend-app-1` ficou de pé, como a sessão encontrou o ambiente.

**Steps 2–6, no navegador contra a API real:** primeiro acesso ponta a ponta (cadastro → e-mail no
Mailpit com `?flow=invite` e "vence en 7 días" → senha definida → login → Dashboard na view do
redator); revogação (`is_active=0`, `sessions=0`, a aba logada cai para o login no reload e a nova
tentativa é recusada com "This account is not active."); recuperação com resposta idêntica para
e-mail que existe e que não existe, com entrega só no primeiro; reenvio de convite para redator
pré-bloco, com o toast e o primeiro acesso completo. RN-01 medida no fim: `cliente`/`aluno` ativos
= `0`.

**Dois achados do gate, ambos registrados no ledger e nenhum deles defeito do código entregue:**
reenviar convite **não** ativa — para redator pré-bloco o admin precisa marcar Access state = Activo
*e* reenviar (o desenho está certo: conceder acesso é o controle explícito, não efeito colateral do
reenvio); e os 7 redatores do seed seguem **sem a role `redator`**, que só é atribuída no cadastro
novo — não impede login nem Dashboard (a view sai de `user.type`), mas qualquer gate `permission:`
os barraria. É dado de seed, não código do bloco.

**Estado: `ready_for_review`.** Próxima ação: `/revisar-sprint` para `identity-ativacao-acesso-redator`.
O review **não** foi iniciado por este comando.

### Emenda — 2026-08-19: a recuperação de senha volta para dentro da tela de login

Pedido do João com o bloco em `ready_for_review`: *"quero deixar a recuperação de senha na mesma
tela de login mudando apenas os campos (inputs) quando clicado"*. **Não é bloco novo.** A tela
`/recuperar-clave` é entrega deste bloco (`9726eab`, `112b145`), então o pedido muda a forma de uma
superfície já entregue e o estado volta para `planning`, com o review adiado — não iniciado e não
cancelado.

**O que a emenda troca:** `ForgotPasswordPage` deixa de ser página. `/login` e `/recuperar-clave`
viram rotas irmãs do mesmo layout, as duas renderizando `LoginPage`; o modo sai do `pathname` e a
troca é um `<Link>`. O e-mail digitado sobe para um painel comum e sobrevive ao clique — é o ganho
que justifica a mudança, não a estética.

**A premissa foi medida antes de virar decisão.** Em `react-router@7.18.0`, `_renderMatches` monta
cada match dentro de `RenderedRoute` **sem `key`**: duas rotas irmãs com o mesmo `element`
reconciliam em vez de remontar, e o estado do painel sobrevive à troca de URL. Sem isso o desenho
inteiro cairia — o e-mail morreria na navegação, que é exatamente o defeito que a emenda fecha.

**Dois efeitos declarados, não descobertos:** visitante anônimo em `/recuperar-clave` passa a
disparar `GET /api/me` (a rota entra no `SessionBootstrap`), e usuário autenticado que abrir a URL é
redirecionado para `/`, porque herda o `LoginRoute`.

**Ponteiros:** `active_spec` passa a apontar a spec da emenda; `active_plan` volta a `null` até o
plano existir. O par de 2026-08-18 continua válido como spec e plano do bloco — a emenda substitui
só o desenho da superfície `/recuperar-clave`.

**Plano — 2026-08-19:** `plans/2026-08-19-login-recuperacao-inline.md`, 6 tasks. A ordem existe para
que **toda task deixe a árvore compilando**: o `ForgotPasswordPage` vira ponte de 13 linhas na Task 3
e só é apagado na Task 5, quando a rota muda de dono. Task 6 é o gate — catracas, prova de navegador
e fechamento do estado.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco identity-ativacao-acesso-redator`.
O `/revisar-sprint` permanece na fila, para depois da emenda executada.

### Execução da emenda — 2026-08-19: início, técnica `subagent-driven-development`

Abertura da execução do `plans/2026-08-19-login-recuperacao-inline.md` (6 tasks, executor
**claude** — o plano não declara `## Handoff de execução`, então o ciclo é o Superpowers normal).
**Técnica: `subagent-driven-development`, por instrução do João** — implementer por task, review de
task (spec + qualidade) depois de cada uma, review amplo no fim. O ledger local
(`.superpowers/sdd/progress.md`) ganha a seção da emenda; o do bloco de 2026-08-18 segue no mesmo
arquivo, acima.

**Área de trabalho: a mesma worktree `fix-frontend`**, branch `feat/identity-ativacao-acesso-redator`
a partir de `7c4704e`. O gate main tree/worktree não dispara: a emenda é **frontend puro** (spec §2),
nenhum arquivo de `backend/` é tocado, então não há Pint, migration nem `typescript:transform`.

Este commit abre a execução junto com a **Task 1** (`useAuthPanel`), que é a primeira fronteira
durável.

**Estado: `executing`.** Próxima ação: seguir o plano task a task.

### Emenda executada — 2026-08-19: as 6 tasks fechadas e o gate provado no navegador

As 6 tasks do `plans/2026-08-19-login-recuperacao-inline.md` estão commitadas, uma por commit:
`37e4c61` (`useAuthPanel`), `b7c6d98` (`password.forgotSubtitle` nos 3 dicionários), `186f07f`
(`ForgotForm` controlado por props), `c04c27a` (`AuthPanel`), `df8f5e0` (rotas irmãs e morte do
`ForgotPasswordPage`) e este commit (gate). Ledger com a prova task a task e os achados de review em
`.superpowers/sdd/progress.md`.

**Catracas (Task 6, Step 1):** `pnpm lint` exit 0 sem saída, `pnpm build` verde, `pnpm test`
**69 arquivos / 408 testes** — frontend puro, sem Pint, migration ou `typescript:transform`.

**A prova no navegador, contra a API real, com a stack do João intacta.** Override efêmero de portas
fora do repositório (nginx **8081**, MySQL **3308**, MinIO 9002/9003, Mailpit 8025) e Vite do worktree
em **5174**. Medido: em `/login`, e-mail digitado, clique em "Forgot your password?" leva a
`/recuperar-clave` **com o e-mail preservado no campo**, foco no `<h1>` e
`performance.getEntriesByType('navigation')` ainda com **uma** entrada — a premissa da emenda (rotas
irmãs reconciliam, não remontam) confirmada na tela e não só na leitura do `react-router`. O envio
entrega no Mailpit para e-mail existente, devolve **a mesma** mensagem genérica para e-mail que não
existe e **não** entrega — a anti-enumeração sobrevive à mudança de superfície. Voltar (browser back)
devolve o campo de senha; deep link direto em `/recuperar-clave` abre em recuperação **sem roubar o
foco** (`document.activeElement` = `BODY`); link de definição expirado cai em "This link no longer
works" e "Request a new link" aterrissa em `/recuperar-clave`; autenticado, `/recuperar-clave`
redireciona para `/` — os dois efeitos declarados na abertura da emenda, medidos.

**Dois desvios do plano, decididos pelo João durante a execução, não pelo executor.**

1. **`eslint-disable react-hooks/refs` escopado no `useAuthPanel`.** O código do próprio plano reprova
   na régua, e o molde da casa para "ajustar estado no render" (`useEntityForm.ts`) foi **medido e
   quebra a feature**: o setState descarta o primeiro render e `switched` chega `false`, matando o
   movimento de foco. O disable tem precedente (`AppDialog.tsx:24-36`) e comentário com a medição.
2. **O caminho de erro da recuperação entrou na Task 3.** O review de task apontou que
   `ForgotForm`/`useForgotPassword` não davam retorno nenhum de falha; medido em
   `git show b7c6d98:…/ForgotPasswordPage.tsx`, o buraco é **pré-existente** (veio em `9726eab`), não
   regressão da emenda. Consertado agora com o molde do `LoginForm` (`FormErrorBanner` +
   `aria-invalid`/`aria-describedby`) e teste do ramo de falha. **A spec foi emendada** (§5, §6 e a
   nova §6.1): `generalError` e `fieldErrors` são falha de transporte e não desmentem a resposta
   genérica.

**Uma lacuna do plano ficou registrada:** ele afirmava que `FRONTEND_URL` não precisaria mudar para a
prova de navegador, e precisou — `config/cors.php:22` deriva a origem permitida dela, e o Vite do
worktree corre na 5174. `backend/.env` e `frontend/.env.local` foram alterados para o gate e
**restaurados** ao fim; ao término só `fix-frontend-app-1` ficou de pé, como a sessão encontrou o
ambiente.

**Estado: `ready_for_review`.** Próxima ação: `/revisar-sprint` para
`identity-ativacao-acesso-redator`, cobrindo o bloco de 2026-08-18 **e** esta emenda. O review **não**
foi iniciado por este comando.

### Revisão de sprint e correções — 2026-08-19: 6 achados, os 6 aprovados e corrigidos

O `/revisar-sprint` cobriu o bloco de 2026-08-18 **e** a emenda, e devolveu **6 achados**, todos
aprovados pelo João e corrigidos em quatro commits, cada um com regressão provada contra o código
antigo. **O relatório da revisão não virou arquivo próprio** — o rastro dela é o resumo do
`review_findings_approved` no commit `929b1e6` e os quatro commits abaixo:

1. **Q-1 · reenvio de convite não dava acesso, só senha** (`1483fd1`) — a role `redator` só era
   atribuída no `CreateRedatorAction`, então o redator **anterior ao bloco** autenticava com
   `roles: []` e `permissions: []`, e o gate de cada seção é permissão, não `type`. O `syncRoles`
   (idempotente) subiu para o `SendRedatorAccessInvitationAction`, que é a fonte única dos dois
   caminhos.
2. **Q-2 · as rotas públicas de senha enumeravam usuário** (`e54ce42`) — `PasswordBroker::validateReset`
   resolve o usuário **antes** de checar o token, então `INVALID_USER` e `INVALID_TOKEN` com mensagens
   distintas faziam de qualquer token inventado um oráculo de "este e-mail tem conta"; os dois passam
   a subir a **mesma** mensagem.
3. **Q-3 · o convite de senha alcançava cliente e aluno** (`e54ce42`) — `sendResetLink` ganhou
   `'is_active' => true` (vira `where` no `EloquentUserProvider`): pela RN-01 esses atores não
   autenticam, e a rota anônima chegava a mandar "defina sua senha" para contato comercial de cliente.
   No mesmo commit, o `try/catch` + `report()` fecha o outro oráculo, o da falha: com SMTP fora do ar,
   e-mail existente estourava 500 e inexistente devolvia 200.
4. **Q-4 · falha que não nomeia campo ficava muda** (`389ac4f`) — 429, 419 e 500 não trazem `errors`,
   e o `SetPasswordPage` parava de girar sem dizer nada. `useSetPassword` passa a derivar
   `generalError` do `detail`, no mesmo molde do `useForgotPassword`, e a tela mostra o
   `FormErrorBanner`.
5. **Q-5 · recuperar a senha não derrubava as sessões vivas** (`e54ce42`) — `auth:sanctum` não
   reconsulta senha nem `is_active` a cada request, então quem já estava dentro continuava dentro
   depois do reset. O `PurgeOtherSessionsAction` entrou **na mesma transação** da troca de senha.
6. **Q-6 · o TTL dos dois brokers era afirmação de config, não comportamento** (`8a11889`) — o
   `InvitationBrokerTest` passou a envelhecer o token na tabela e medir os quatro cantos: convite de
   6 dias vale, convite vencido é recusado, recuperação de 59 minutos vale, recuperação de 1 hora é
   recusada. Com o `expire` trocado entre os brokers, o teste cai.

Catracas do passe de correção: `pnpm lint` limpo, `pnpm build` verde, `pnpm test` 409/409, backend
**710 passed / 5 skipped**.

### Fechamento — 2026-08-19: o acesso do redator provado ponta a ponta contra a API real

**Item 0 — critério de aceite do bloco.** Stack deste worktree nas portas padrão (nginx 8080, MySQL
3307, Mailpit 8025) — a do main tree estava desligada, então não houve override de portas. Tudo via
`curl` com `Origin: http://localhost:5173` **e** `Accept: application/json`, mais Chromium via
`@playwright/cli` para as duas provas de tela. Medido, nesta ordem:

1. **Reenvio de convite atribui a role e entrega a credencial (Q-1).** `juan.morales@lotus.cl`
   (redator anterior ao bloco) saiu de `roles=[]` para `roles=[redator]` no `POST
   /api/redatores/1/invitation` (204), e o e-mail chegou ao Mailpit com
   `/definir-clave/<token>?email=…&flow=invite` e "Este enlace vence en 7 días".
2. **Primeiro acesso completo.** `POST /api/invitation/accept` (204) definiu a senha; o `POST
   /api/login` seguinte devolveu `type: redator`, `roles: ["redator"]` e as **4** permissões da role
   (`operation.turma.view`, `operation.turma.submit_docs`, `feedback.feedback.view`,
   `feedback.feedback.manage`), e o `GET /api/me` confirmou a sessão.
3. **Anti-enumeração nas duas rotas (Q-2, Q-3).** `POST /api/password/forgot` devolveu **a mesma**
   mensagem genérica (200) para o e-mail que existe, para `no-existe-jamas@lotus.cl` e para o
   **cliente** `contacto@transelec.demo.cl`, com entrega no Mailpit **só** no primeiro. `POST
   /api/password/reset` com token falso devolveu resposta **idêntica byte a byte** (422,
   `errors.token`) para e-mail existente e inexistente.
4. **Recuperar derruba quem está dentro (Q-5).** Com a sessão do Juan viva (`sessions` = 1), o reset
   consumiu o token e devolveu 204; `sessions` foi a **0** e o cookie antigo passou a receber **401**
   no `GET /api/me`, no envelope RFC 7807.
5. **Revogação é controle explícito do admin.** `PUT /api/redatores/1` com `is_active: false` (200)
   levou `sessions` a 0, o cookie vivo a 401 e o login novo a **422 "Esta cuenta no está activa."**
6. **A emenda, no navegador.** Em `/login`, e-mail digitado, clique em "Forgot your password?": a URL
   virou `/recuperar-clave` com o e-mail **no campo**, `performance.getEntriesByType('navigation')`
   ainda com **uma** entrada (irmãs reconciliam, não remontam) e foco no `<h1>`.
7. **O caminho de erro mudo, na tela (Q-4).** Com a quota do `throttle:6,1` gasta por `curl`, o
   submit do `/definir-clave/<token falso>` recebeu **429** e a tela mostrou o alerta
   **"Too Many Attempts."** — antes do `389ac4f` não mostraria nada.
8. **RN-01 medida no fim:** `cliente` ativos = **0**, `aluno` ativos = **0**.

**Catracas:** backend `710 passed / 5 skipped (2601 assertions)`; `pnpm lint` exit 0 sem saída;
`pnpm build` verde; `pnpm test` **69 arquivos / 409 testes**; `pint --test` **passed** nos 29 arquivos
PHP do bloco; `typescript:transform` seguido de `git diff --exit-code` em `generated.ts` **sem saída**
(o arquivo veio do transformer em `644e372`, nunca de edição à mão).

**Leis do CLAUDE.md §5:** nenhuma contrariada. Sem Repository sobre Eloquent (o bloco é Actions);
zero trigger de banco na migration nova; `generated.ts` gerado; auth só por cookie de sessão Sanctum
com CSRF, e os erros subindo pelo handler global (o único `abort(` do domínio Identity está **dentro
de um comentário** que manda nunca usá-lo); RN-01 medida; nenhuma feature importando PrimeReact
direto nem outra feature; financeiro intocado.

**Ambiente devolvido — com um excesso declarado.** A sonda `gate.task14@lotus.cl` (user 58 / redator
8, sem curso, documento ou turma), criada pelo gate da Task 14 **deste** bloco, foi removida
(`users` 58 → 57, `redatores` 8 → 7), junto dos dois `password_reset_tokens` deixados pelos gates.
O Juan voltou ao estado pré-gate: ativo, sem role, com senha aleatória inutilizável. **O excesso:** ao
limpar as sessões do gate, a tabela `sessions` foi apagada inteira (13 linhas), não só as 2 que este
fechamento criou — o efeito é que qualquer sessão de dev anterior precisa logar de novo. Mailpit
esvaziado; os containers deste worktree ficaram parados, como a sessão encontrou a máquina.

**Pendências:** nasce a **P-47** (os 7 redatores do seed não têm a role `redator`; só cadastro novo e
reenvio de convite a atribuem — dado de seed, não código do bloco). **P-03** e **P-45** ganharam
medição nova e seguem abertas: a P-03 porque o compose por worktree continua não existindo — o que
existe é override manual de portas, e o gatilho formal (dois blocos de backend em paralelo) não
venceu, houve um só; a P-45 porque a suíte saiu **verde** só por o `.env` ter voltado a
`FRONTEND_URL` de valor único, com `TestCase.php:18` e `config/cors.php:22` intocados. Nenhuma
pendência fechou; as encerradas seguem vazias. Total: **30 abertas**.

**Estado: `idle`.** O backlog **não** promove nada sozinho: o próximo item é escolha explícita do
João.

## Penúltimo item fechado — 2026-08-18 (`bd13-listagens-e-abas`, BD-13 do backlog)

**Promoção explícita do João**, com o estado em `idle` e `active_work_item` `null`. O gate do
`/planejar-bloco` não chegou a rodar: a seleção veio de uma revisão de arquitetura
(`improve-codebase-architecture`) que cruzou o código de `b758068` contra o `backlog.md` item a item.
O commit anterior a este grava o resultado dessa revisão no backlog; **este** grava a promoção.

**Escopo: o BD-13 inteiro, mais a D-31 pelo gatilho dela.** O bloco cobre D-02, D-04, D-05 e D-06;
a **D-31** entra porque o gatilho literal dela é *"entra em qualquer bloco que toque os dicionários
por outro motivo"*, e a D-02 toca os três locales. Não é alargamento de escopo — é gatilho vencido.

**Rota `ready_for_planning`, sem Context Packet, por ausência MEDIDA de fonte externa.** Grep por
`drive.google`, `notion.so`, `figma.com`, `docs.google` e `http` nas 100 linhas de escopo (o bloco no
`backlog.md` mais as fichas de D-02, D-04, D-05, D-06 e D-31) devolve **zero**. Mesmo precedente de
BD-4, BD-5, BD-6 e BD-16 — e o oposto das Sprints 5 e 6, cujo escopo era canônico do Drive.

**Área de trabalho: a worktree `fix-frontend`**, branch `feat/bd13-listagens-e-abas` a partir de
`main@b758068`, que é `origin/main` na hora da promoção. Escolha do João. A árvore da worktree estava
em `b758068` detached e limpa; `backend/config/cors.php` (WIP dele, o outro lado da P-45) fica no main
tree e fora de todo `git add`.

### A invariante de um `active_work_item` está quebrada, e é a QUARTA exceção declarada

O `arquivados-e-restauracao` foi promovido a `context_required` em `34aa0be`, na branch
`feat/arquivados-e-restauracao`, e segue ativo com `next_owner: codex`. Este bloco corre em paralelo
**por decisão explícita do João**, tomada depois de o custo ser mostrado, não descoberto no gate.
Precedentes: BD-4 × BD-9, BD-5 × `login-fora-do-adr16` e `celula-de-identidade` × BD-6.

**A P-03 não dispara, e isso é medição do gatilho, não conveniência.** A ficha exige *"mais de um
`active_work_item` de backend"*; este é frontend puro e o outro é backend, então a condição não se
satisfaz. O custo conhecido do arranjo continua valendo: a worktree não sobe stack própria e depende
do main tree como servidor do `:8080` — que estará servindo a branch do `arquivados`. Para este bloco
isso é barato, porque nenhum item dele precisa de API viva; o que precisa de navegador é a D-04
(contagem de GET) e ela se mede no devtools contra qualquer backend.

**O risco de merge deste arranjo está medido e é o que o PR #57 já cobrou.** Duas branches escrevendo
`state.md` produzem frontmatter auto-mesclado que ninguém escreveu, e ele fica verde, sem marcador de
conflito. Quem mergear qualquer uma das duas **lê o frontmatter antes do `git push`** — a lição está
escrita na seção do B2 e vale literal aqui.

### Quatro medições da abertura, feitas sobre `b758068` e não herdadas do backlog

1. **O escopo da D-04 é METADE do registrado, e isso muda o DoD do bloco.** `AppTabView` não passa
   `renderActiveOnly={false}`, então vale o default `true` do PrimeReact e só o conteúdo da aba ativa
   monta — `CertificatesPage.tsx:19,24` põe `EmissionPanel` e `HistorialTable` dentro de `ModuleTab` e
   faz **1** GET. Quem faz 2 é a `PeoplePage.tsx:16-17`, que chama `useRedatoresPage()` e
   `useStudentsPage()` **no corpo da página**, acima das abas, onde o `renderActiveOnly` não alcança.
   O defeito é de sítio de chamada, não de mecanismo de aba. **O DoD do backlog ("1 GET por aba
   aberta, não 2 por montagem") tem uma página a provar, não duas.**
2. **A D-05 tem uma decisão dentro, não só um fix.** `AppErrorState.tsx:47` renderiza o `detail` cru
   e `useLoadState.ts:25` é quem o entrega (`query.error?.detail`). Mostrar `detail` de servidor ×
   trocar por dica genérica do i18n é escolha de contrato de erro, e ela **não** depende da decisão de
   idioma canônico que trava a D-07/D-18 — o que se decide aqui é se a tela repete o servidor, não em
   que língua o servidor fala.
3. **A D-06 é uma linha e mente sobre registro de peso legal.** `HistorialTable.tsx:60` passa
   `description={c.snapshot.aluno.rut ?? '—'}` e `title={c.snapshot.aluno.name}` **sem fallback**: o
   certificado corrompido aparece na lista com a célula de aluno vazia, e a lista é o único lugar onde
   o registro aparece antes do clique.
4. **A D-02 segue viva nas três locales, nas mesmas linhas do registro:** `:91` (`usuario(s)`), `:449`
   (`curso(s)`) e `:471` (`módulo(s)`), com o rodapé do `AppDataTable` alimentado por chave sem plural
   do i18next. O repositório **não** usa plural do i18next em lugar nenhum hoje — `role.count` é forma
   única —, então a chave de plural é padrão novo no projeto, não adoção de padrão existente.

**Risco de review projetado: BAIXO pelo gate binário** — frontend puro, não toca schema, não regenera
`generated.ts`, não toca Sanctum, auditoria, RBAC nem documento legal. **Divergência por alcance já
declarada:** o bloco introduz plural do i18next, que é forma nova nos três dicionários, e mexe em
`AppErrorState`/`useLoadState`, que são `shared/` com muitos consumidores. A classificação final é do
`/revisar-sprint`, não desta promoção.

**Estado: `ready_for_planning`.** Próxima ação: `/planejar-bloco bd13-listagens-e-abas`
(brainstorming → spec → plano). Este commit **não** inicia o planejamento.

### Execução — 2026-08-18: início, técnica `executing-plans`

O `/planejar-bloco` fechou spec e plano (9 tasks, `executor: claude`) e o estado entrou em
`ready_for_execution` em `947194f`. Este commit abre a execução junto com a **Task 1** (D-31), que é
a primeira fronteira durável: as duas chaves órfãs saem dos três locales e o comentário do
`ProfileDocumentSlot.test.tsx` registra por que a asserção negativa sobrevive à remoção.

**Técnica: `executing-plans`, não `subagent-driven-development`** — a sessão corre sem delegação a
subagente por instrução do João; o ciclo task a task, com verificação por task, é o mesmo.

**Uma medição corrigiu o plano na primeira linha executada.** O grep do Step 1 da Task 1
(`grep -rn "documents\.noValidity"`) devolve **zero**, não a linha esperada: o único consumidor cita
a chave dentro de um regex (`/profile\.documents\.noValidity/`), com os pontos escapados no fonte.
Regrepado sem os pontos, a linha aparece — `ProfileDocumentSlot.test.tsx:118`, asserção negativa,
exatamente como a spec registrou. As chaves seguem órfãs; o passo do plano é que media com o padrão
errado.

**Estado: `executing`.** Próxima ação: Task 2 (D-02, plural do i18next em 17 chaves).

### Execução — 2026-08-18: as 9 tasks fechadas, estado em `ready_for_review`

As 9 tasks do plano estão nos commits `27bbd6d` (D-31), `35539aa` (D-02), `bb7b639` (D-06),
`c6fd4cb` + `069265a` + `70280ea` (D-05, 3 tasks), `34c0c3d` + `925e3ad` (D-04, 2 tasks) e este
commit (gate). O `d6912e5` no meio é conserto de `max-lines`: os comentários das tasks 1 e 3
empurraram dois arquivos para 152 linhas.

**Fronteira do bloco provada:** `git diff main...HEAD --name-only -- backend/ frontend/src/shared/types/generated.ts`
devolve vazio — frontend puro, P-03 não dispara. **Três catracas:** `pnpm test` 65 arquivos / 394
testes verdes, `pnpm lint` exit 0, `pnpm build` verde.

**Duas coisas saem daqui para o review, não fechadas por esta sessão.**

1. **Desenho novo no Dashboard, sem confirmação humana registrada.** A spec §6.2 contou os 3 sítios
   de `staleError` entre "as telas que já escrevem `?? hint`" — não escrevem: ali o `staleError` é
   mensagem **e** gatilho, e aplicar a D-05 apagava o aviso junto com o texto (3 testes de
   `useDashboard` ficaram vermelhos e provaram). Separado em `staleErrored: boolean` + `staleError`,
   com `DashboardPage.avisoStale()` caindo em `common.loadErrorHint`. **Consequência:** a mensagem de
   janela invertida (422, "La fecha de término no puede ser anterior a la de inicio.") deixa de
   aparecer na tela — o aviso continua, o texto do servidor não. Decisão do João no review.

2. **Step 3 da Task 9 não rodou.** A contagem de GET no devtools de `/pessoas` precisa de navegador,
   que esta sessão não tem. O `PeoplePage.test.tsx` espiona `api.get` (limite do axios, caminho real
   do componente) e mede a mesma coisa — 1/0 na montagem, 1 na 2ª aba, 0 na volta — mas a
   confirmação no navegador é passo do João.

Débito que sai do bloco: **D-36** no `backlog.md` (o envelope RFC 7807 não é localizado; o `D-32` do
plano já estava tomado pela ordem de foco de `/perfil`).

**Estado: `ready_for_review`.** Próxima ação: `request_code_review`. **A revisão não foi iniciada
aqui.**

### Revisão de sprint — 2026-08-18: risco BAIXO, uma lente, 3 achados, zero violação de lei

**Classificação: BAIXO risco.** Frontend puro (`git diff b758068..HEAD -- backend/ frontend/src/shared/types/generated.ts` vazio), sem schema, `generated.ts`, Sanctum, auditoria, RBAC, dinheiro ou emissão de certificado; `executor: claude`. Uma lente — sem revisão independente do Codex.

**Catracas re-rodadas nesta revisão:** `pnpm test` 65 arquivos / 394 testes verdes, `pnpm lint` exit 0, `pnpm build` verde.

**Órfãos:** zero componente, hook ou página sem consumidor. `RedatoresTab`/`StudentsTab` entram pela `PeoplePage`; os 12 sítios de `screenDetail` importam de `@shared/lib`. Uma chave de i18n órfã achada — o Q-2 abaixo.

**Gabarito:** nenhuma das 8 leis do §5 contrariada; nenhuma lição do `docs/README.md` repetida; ADRs e `frontend-fsliced.md` respeitados (nenhum import de `primereact` em feature, nenhum cruzamento entre features).

#### [Q-1] Dica de conexão para falha que não é de conexão — `frontend/src/shared/lib/screenDetail.ts` + 21 sítios · 🟡 · M

`screenDetail` cala TODO `detail` de servidor, e o fallback único dos chamadores é `common.loadErrorHint` = "Revisa tu conexión e inténtalo de nuevo." O envelope do backend não distingue só língua: distingue CAUSA. Depois da D-05, 403 (`Acesso negado`), 404 (`Recurso não encontrado`) e 422 (janela invertida do dashboard) chegam à tela como "revise sua conexão" — instrução errada, e o usuário não tem como agir. O caso do dashboard já subiu declarado na execução; o alcance é maior que ele: vale para os 12 sítios de `AppErrorState` e os 9 de `errorDetail`.

A spec §6.4 afirma "nenhuma mensagem de 422 some da tela" — o `useDashboard.test.tsx` do bloco prova o contrário (`staleError` vira `null` no 422 de janela invertida).

**Sênior faria:** dica por `status` no mesmo lugar da política — `403` → chave de sem permissão, `404` → não encontrado, `422` → dados inválidos, resto → `loadErrorHint`. Sai i18n do front (localizado hoje), não texto do servidor, então a D3 continua de pé.

**Fere:** catálogo universal (erro que não orienta) + a própria afirmação da spec §6.4. Não é lei do §5.

#### [Q-2] `certificate.certCount` é órfã, e a D-31 a pluralizou em vez de apagá-la — `frontend/src/shared/config/locales/{es-CL,pt-BR,en}.json:860-861` · 🟢 · P

A D-31 apagou as duas chaves órfãs de `/perfil`. `certificate.certCount` não tem consumidor nenhum em `.tsx`/`.ts` fora de `locales/` — e o bloco a transformou em `certCount_one`/`certCount_other` nos 3 dicionários e a inscreveu na lista de 17 do `plural.test.ts`. Resultado: uma chave morta agora tem teste que a segura viva.

**Sênior faria:** apagar as 6 linhas e tirar a chave do `CHAVES` do `plural.test.ts` (16 chaves), ou registrar no backlog o consumidor previsto.

#### [Q-3] Import duplicado do mesmo módulo — `frontend/src/features/identity/components/Student/StudentDetailSections.tsx:20` · 🟢 · P

O arquivo já importa de `@shared/lib` (`formatMonthYear` e companhia); a task acrescentou `import { screenDetail } from '@shared/lib'` como segunda declaração, em vez de entrar no grupo existente. O eslint atual não pega. Mesmo padrão, menor, em `TurmaDetailPage.tsx`, `BudgetDetailPage.tsx`, `TurmaDocuments.tsx`, `PendingQuotesPanel.tsx`, `RedatorDesignation.tsx` e `ReissueDialog.tsx` — ali o import é novo e não duplica, só ficou fora do bloco de imports de `@shared`.

**Sênior faria:** juntar ao import existente; se o padrão reincidir, `no-duplicate-imports` no eslint fecha a classe inteira.

#### O que NÃO é achado

`staleTime: 30_000` repetido nos dois hooks (dois sítios, comentado nos dois); a marca `localDetail` depender de o próximo autor lembrar de pô-la nos envelopes que o front sintetiza (os 3 de hoje estão marcados); o `detail` cru do `CertificateViewDialog` (D8, com teste que o prova); e a não localização do envelope no backend (**D-36** já no `backlog.md`).

**Pendente do João, herdado da execução:** Step 3 da Task 9 — contagem de GET no devtools de `/pessoas`. O `PeoplePage.test.tsx` mede o mesmo no limite do axios, mas o DoD do bloco pede o navegador.

**Estado: `blocked`.** `next_action: approve_review_findings`; `resume_state: reviewing`. Só achado aprovado vira código.

### Correções — 2026-08-18: os 3 achados aprovados pelo João, todos aplicados

`Q-1 a Q-3 entra` — os três, um commit cada, com as catracas re-rodadas ao fim: `pnpm test` 65 arquivos / **398** testes verdes (4 novos), `pnpm lint` exit 0, `pnpm build` verde.

**Q-1 (`cfdd626`) — a dica passa a vir do status.** `loadErrorHint(problema)` mora ao lado do `screenDetail` em `shared/lib` e devolve **chave** i18n, não texto: a tradução continua sendo de quem imprime, e a política não importa i18n dentro de `shared/lib`. `403` → `common.forbiddenHint`, `404` → `common.notFoundHint`, `422` → `common.invalidDataHint`, resto → `common.loadErrorHint` (rede caída e 500 seguem sendo dica de conexão, que ali é a certa). `401` fica de fora por medição: o interceptor do axios redireciona antes de virar estado de carga. Os três produtores expõem a chave (`errorHint` no `useLoadState`/`useResourceState`, `staleHint` no `useDashboard`), os 21 sítios trocam o literal, e `StudentClientField` ganhou a prop porque recebe estado por prop, não por hook.

**Uma imprecisão de teste apareceu no caminho, e foi corrigida junto:** o caso de janela invertida do `useDashboard.test.tsx` chamava `problem(...)` **sem status**, então rodava com o default `500` — não com o 422 que o cenário descreve. Com o status certo, o teste agora afirma `staleHint === 'common.invalidDataHint'`, e é ele que prova o achado.

**Q-2 (`6a39f9a`) — `certificate.certCount` apagada dos 3 dicionários** e retirada da lista do `plural.test.ts` (16 chaves). A D-31 tinha apagado as órfãs de `/perfil`; esta escapou por ter sido pluralizada pela D-02 no mesmo bloco.

**Q-3 (`a160e07`) — o import de `@shared/lib` volta a ser um só** em `StudentDetailSections.tsx`. **A regra de eslint sugerida NÃO entrou, e a medição é o motivo:** `no-duplicate-imports` do core não distingue `import type` de `import` de valor, e a casa separa os dois de propósito — **55 pares legítimos** em `src/` virariam erro. Duplicação valor+valor existia em **um** arquivo, o que o commit conserta. Custo da regra maior que a classe que ela fecharia.

**Estado: `ready_for_closure`.** Revisão sem achado pendente. Segue aberto, herdado da execução e para o fechamento: **Step 3 da Task 9** — contagem de GET no devtools de `/pessoas`, que precisa de navegador. O fechamento **não** foi executado aqui.

### Fechamento — 2026-08-18: o critério de aceite provado no navegador, contra a API real

**Item 0 — critério de aceite do bloco, não higiene genérica.** O passo que faltava desde a execução
(Step 3 da Task 9) **rodou**: Chromium via `@playwright/cli` (a lib global, dirigida por script), Vite
desta worktree em `:5173` e a API real em `:8080`, logado como `admin@lotus.cl`. Em `/personas`
(a rota é `/personas`, não `/pessoas` — o plano escreveu o nome em português):

1. **montagem:** `GET /api/redatores` **uma vez**, `/api/students` **zero** (o `GET /api/me` é a sessão);
2. **clique na aba de alunos:** `GET /api/students` **uma vez**;
3. **volta à primeira aba dentro dos 30s:** **nenhuma** request.

É o DoD do BD-13 ("1 GET por aba aberta, não 2 por montagem") medido no navegador, e não mais só no
limite do axios do `PeoplePage.test.tsx`.

**A D-05 e o Q-1 também foram exercitados contra a API real, na tela:** `/operacion/turmas/999999`
devolve 404 com `detail` cru do framework (`No query results for model [App\Domains\Operation…`), e o
que chega ao `AppErrorState` é **"No se pudieron cargar los datos" + "No encontramos este registro."** —
o `detail` do servidor calado pela política, e a dica vinda do **status**, que é exatamente o que o
Q-1 consertou. A paridade das 3 locales (a outra metade do DoD) é o `plural.test.ts`, verde.

**Catracas.** Frontend: `pnpm test` **65 arquivos / 398 testes** verdes, `pnpm lint` exit 0,
`pnpm build` verde. Backend: **713 passed / 5 skipped** — mas o registro honesto é que essa suíte é a
do **main tree**, que está na `feat/arquivados-e-restauracao`; o bloco tem `git diff main...HEAD --
backend/ frontend/src/shared/types/generated.ts` **vazio**, então Pint e `typescript:transform` são
**N/A por escopo medido**, e não há suíte de backend deste bloco para rodar. Código morto: nenhum
`.gitkeep`, placeholder ou import órfão criado aqui; as 3 chaves novas (`forbiddenHint`,
`notFoundHint`, `invalidDataHint`) têm consumidor nas 3 locales e no `screenDetail.ts`.

**Leis §5:** nenhuma contrariada — o bloco não tocou schema, `generated.ts`, Sanctum, auditoria, RBAC
nem financeiro, e nenhuma feature passou a importar `primereact` ou outra feature.

**Pendências.** Nenhuma nasceu e nenhuma fechou neste bloco; seguem **29 abertas**. A **P-36** e a
**P-37** cumpriram a sprint de rastro e saíram das `encerradas.md`. Dois gatilhos foram conferidos e
**não** disparam aqui: a **P-16** (o Figma quer `Alumnos` como primeira aba) continua esperando a
Lotus — a casca de abas nova manteve `Redactores` na frente, sem agravar nada; e a **P-45** teve a
correção **medida viva no main tree** (`TestCase.php` já pega a primeira origem da lista e a suíte
passa inteira), mas em outra branch — ela fecha no bloco de backend que levar esse commit à `main`,
não neste fechamento.

**Uma divergência documental fica declarada, sem virar pendência:** a §6.4 da spec afirma "nenhuma
mensagem de 422 some da tela", e some — o texto do servidor é calado pela D-05, e o que resta é a
dica de dados inválidos do Q-1. A spec é snapshot datado e foi arquivada como está; o desvio está
registrado no review e nas correções acima, que é onde quem for ler o comportamento vai procurar.

**Arquivados:** `plans/archive/2026-08-18-bd13-listagens-e-abas.md` e
`specs/archive/2026-08-18-bd13-listagens-e-abas-design.md` (a spec não é compartilhada — só o plano a
referenciava, e a referência foi atualizada). Do `backlog.md` saíram o **BD-13** e as linhas dos
débitos pagos (**D-02**, **D-04**, **D-05**, **D-06**, **D-31**); o **D-36**, nascido aqui, fica.
A entrega entrou no `historico/progress.md`, e o Login de 2026-08-13 foi para o
`progress-archive.md` para manter as dez.

**Estado: `idle`.** O backlog não promove nada sozinho: o próximo item é escolha explícita do João.

## Antepenúltimo item fechado — 2026-08-18 (`bd16-perfil-e-kit-compartilhado`, BD-16 dos blocos de dívida)

**Promoção explícita do João**, a partir da auditoria
`audits/2026-08-17-perfil-ui-review-e-design.md`. O estado saiu de `idle` para `ready_for_planning`
no mesmo commit que grava a auditoria e o BD-16 — a fronteira durável é essa, e não a leitura do
relatório.

**Como o item nasceu.** Duas lentes sobre `/perfil`, na mesma sessão: o `/lotus-ui-review` (1 achado
**C**, 8 **B**, 18 capturas em `.artifacts/ui-review/2026-08-17-1241-perfil/`) e o `frontend-design`
(7 achados estéticos). Nenhum código foi tocado por nenhuma das duas — o passo 16 da skill proíbe, e
a auditoria é registro, não correção.

**Escopo escolhido: A + B + C, com a D-28 dentro.** As três frentes estão no BD-16 do
`backlog.md`; a D-28 (dar marca visual ao corte de mutabilidade da spec D1) entrou por decisão
explícita do João na mesma seleção, e **precede a D-27** — reordenar sem marca visual só troca qual
metade fica por último.

**Por que `ready_for_planning` e não `context_required`.** As Sprints 5 e 6 exigiam Context Packet
porque o escopo delas era canônico do Drive. Este bloco não tem fonte externa: cada item é medição
local, feita no navegador ou por `grep` no repositório, e a auditoria já é o pacote de contexto.
Nenhuma consulta a Drive, Notion ou Figma é necessária para planejá-lo.

**O bloco absorve o BD-10 e reabre duas pendências travadas.** P-36 e P-37 estavam adiadas desde
2026-08-13 pelo mesmo motivo — `FormSection` e `FormField` sob reescrita ativa do BD-5 —, e o
impedimento venceu. O gatilho literal da P-36 (*"bloco que tocar `FormSection` ou `CoursesTable` por
outro motivo"*) foi disparado pelo DS-01 da auditoria.

**Três coisas que o planejamento precisa tratar e que não são detalhe:**

1. **O alcance sai de `/perfil`.** `FormSection` tem 11 consumidores, `AppPassword` 5 sítios,
   `AppFileRow` serve comercial/turma/redator, `AppTag` aparece fora da tela. O plano declara os
   sítios e o DoD prova que nenhum regrediu — a lei 6 manda a correção para `shared/ui`, então o
   alcance é consequência, não escolha.
2. **A P-36 traz uma decisão junto, não só um fix.** O seletor da catraca `COR_HARDCODED` precisa
   distinguir cor crua de `var(--…)` em `style={{ }}`, e é isso que sempre adiou a guarda.
3. **Dois achados ficaram FORA por decisão pendente:** DS-05 (`scale-200` no avatar — a previsão de
   recorte é aritmética e precisa de medição no navegador antes de virar task) e DS-07 (mural de
   credenciais como assinatura da tela — inverte a ordem da spec D1, é bloco próprio).

**Colisão de ID encontrada e não corrigida.** Existem dois `D-18` no `backlog.md`: a data do
`AppFileRow` (que este bloco cobre) e o `description` em espanhol fixo do Dashboard, em "Travados em
decisão". Renumerar é decisão do João — está anotado nas duas linhas.

### Planejamento — fechado em 2026-08-17

**Spec:** `specs/archive/2026-08-17-bd16-perfil-e-kit-compartilhado-design.md`. Oito decisões escolhidas pelo
João (D1–D8) e sete derivadas (D9–D15).
**Plano:** `plans/archive/2026-08-17-bd16-perfil-e-kit-compartilhado.md` — 16 tasks. As 8 primeiras entregam
o kit compartilhado (`shared/ui`), as 7 seguintes aplicam em `/perfil`, a 16ª é o gate do bloco.
Executor `claude`, worktree `fix-frontend`, branch `feat/bd16-perfil-e-kit-compartilhado` a partir de
`main@135e468`. P-03 não dispara: o bloco é frontend puro.

**Duas tasks abrem ponto de decisão por medição, não por escolha do executor:**

- **Task 8** ramifica: `onToggleMaskKeyDown` do Prime (`password.cjs.js:588-593`) **já trata**
  `event.code === 'Space'`. Se o teste da Task 8 passar sem código novo, o defeito não reproduz em
  jsdom e a task vira registro medido, não correção. Um handler no wrapper chamaria `toggleMask()`
  duas vezes e devolveria o campo ao estado inicial — o defeito pioraria ficando invisível.
- **Task 15** para e pergunta se a faixa recortar o avatar (ver o risco abaixo).

**Duas divergências medidas contra o que estava escrito, e o que venceu:**

1. **`FormSection` tem 16 consumidores, não 11.** A ficha da P-36 mediu 11 em 2026-08-13; os cinco
   arquivos de `Profile/` nasceram depois, e o DoD do BD-16 no `backlog.md` herdou o número velho.
   **Vence a medição de hoje.** A correção do registro sai no fechamento, junto do encerramento das
   duas pendências — auditoria reporta, não corrige no meio do bloco.
2. **O `aria-pressed` que a D-24 pede foi RECUSADO com motivo.** `AppPassword.tsx:50-57` registra a
   decisão de 2026-08-13 (UI-04): o olho é botão, não `switch`, porque o **nome** dele alterna a cada
   clique — e o `aria-checked` do Prime foi removido justamente por mentir sobre o estado. Pendurar
   `aria-pressed` num botão cujo nome já carrega o estado o anuncia duas vezes. A D-24 fecha pela
   metade do teclado (Espaço); a metade do `aria-pressed` não entra. Está na D6 da spec.

**Um risco que pode reabrir a DS-05 durante a execução.** A faixa horizontal da D8 esbarra no
`transform scale-200` do `AppPhotoField`, e a DS-05 está fora do bloco. Se a faixa recortar no
navegador, a decisão volta ao João: ou a DS-05 entra, ou a faixa fica só na parte de baixo do
cartão. Medir antes de escrever o layout.

### Execução — 2026-08-17: início, técnica `executing-plans`

`/executar-bloco bd16-perfil-e-kit-compartilhado` validou as âncoras (spec e plano no disco,
`context_packet: null` legítimo porque o bloco não tem fonte externa, handoff `executor: claude`,
`active_plan` cobrindo o work item) e transicionou `ready_for_execution` → `executing` no commit da
Task 1. Técnica: `executing-plans` — o ambiente restringe o Agent tool a pedido explícito, e as 16
tasks têm dependência sequencial declarada (a Task 2 só apaga `BRAND_COLOR` depois que a Task 1 o
zera; a Task 7 consome o contexto da Task 6; as Tasks 14 e 15 consomem a variante da Task 5).

**A branch nasce de `254d691`, não de `135e468` como o plano escreveu.** Não é divergência de estado:
os dois commits a mais na `main` são a própria spec (`94b533d`) e o próprio plano (`254d691`), que
não existiam quando o plano fixou a base. Nascer de `135e468` produziria uma branch que não carrega o
plano que executa. `state_basis_commit` acompanha, pelo mesmo critério das promoções anteriores.

**Worktree `fix-frontend` já era linked worktree** (`GIT_DIR` ≠ `GIT_COMMON`, sem submódulo), então
`using-git-worktrees` parou no passo 0 — nenhuma worktree nova foi criada, só a branch
`feat/bd16-perfil-e-kit-compartilhado`. Baseline medida antes de tocar arquivo: **45 arquivos /
250 testes**, verde.

### Tasks 1–15 — 2026-08-17: 15 commits, um por task, na ordem do plano

`8ffdefa` (tinta de marca sai do título de seção e do ícone de curso) · `efd5bfe` (régua de valor
para cor em `style`, `BRAND_COLOR` morre) · `e51e1cc` (tag de tom sai do preenchido saturado) ·
`7a1705a` (linha de arquivo quebra por contêiner e fala o idioma da interface) · `cfe0e19`
(`AppCard` ganha `sunken`) · `0672019` (a label do `FormField` vira **irmã** do controle) ·
`2ad35d7` (os cinco wrappers se associam ao rótulo sozinhos) · `d460528` (**Task 8 virou registro
medido, não correção** — o olho da senha já responde às duas teclas; a D-24 não reproduz, exatamente
o ramo que o planejamento previu) · `ebc6596` (disparador de upload vira botão nomeado) · `c1f7a79`
(o preview foca o próprio contêiner) · `836197f` (ação destrutiva da foto sai da tinta de marca) ·
`d038e67` (slot documental: validade sobe, ações alinham, upload se nomeia) · `09a22e2` (o subtítulo
ramifica pelo mesmo predicado do corpo) · `e6c1f4b` (coluna de leitura recua, o corte ganha marca
visual) · `b77ce75` (abaixo de `xl`, self-service primeiro).

**A Task 15 não precisou reabrir a DS-05.** O risco escrito no planejamento (a faixa horizontal
recortar o `scale-200` do `AppPhotoField`) foi medido no navegador e não se materializou.

### Task 16 — 2026-08-17: o gate achou 10 defeitos que o build não vê

**Step 1 — gate executável:** `pnpm build` verde, `pnpm lint` 0, suíte **53 arquivos / 312 testes**
contra a baseline de 45/250.

**Step 2 — a P-36 medida nos dois temas, e a catraca provada nos dois sentidos.** Título de seção
(régua 4,5:1, era 2,77:1): **11,4:1** no escuro sobre card e **10,35:1** no claro; o `h1`/`Identidad`
sobre o fundo mede 14,17:1 e 9,45:1. Ícone de curso em `/cursos` (régua 3:1, era 2,53:1): **6,21:1**
no escuro, **7,58:1** no claro. A medição **compõe o alfa da tinta sobre o fundo opaco mais próximo**
— ignorá-lo inflava as razões (`rgba(255,255,255,.6)` sobre ardósia mede 6,2:1, não 14,6:1). Catraca:
`style={{ color: '#25A5E4' }}` reintroduzido em `FormSection.tsx` faz o `pnpm lint` reprovar
**nomeando arquivo, linha e regra**; sonda revertida com a árvore limpa.

**Step 3 — a P-37 medida no navegador, não conferida no DOM.** Nos cinco wrappers, o nome acessível
é **só o rótulo**; sob um 422 real o `aria-invalid="true"` e o `aria-describedby` pousam no **input**
(não na casca), inclusive no `AppDatePicker`, onde prop desconhecida cai no `<span>` raiz e o
caminho é o `pt.input.root`; clicar no texto do rótulo põe o foco no controle. Onde o rótulo
**deliberadamente** não tem `htmlFor` é o modo leitura, para "Carga horaria (del curso, solo
lectura)" não apontar para o vazio.

**Step 4 — alcance fora de `/perfil`, visto e não deduzido**, nos seis grupos da tabela do plano.
`FormSection` mede **16 consumidores** com o seletor, não 11 (a correção do registro é do Step 7).

**Step 5 — as medições da auditoria refeitas**, nos dois papéis, nos **três locales**, nos dois temas
e em 390/1024/1440:

| Item | Auditoria | Medido agora |
|---|---|---|
| D-19 | `clientWidth` 227 vs `scrollWidth` 311 | 242 = 242 nos três slots em 390px, nome inteiro em 178px, zero truncamento |
| D-20 | 2,28:1 e 2,77:1 | ver Step 2 — nenhum sítio abaixo da régua |
| D-21 | validade como última linha `text-xs` | validade na linha do status, tinta de corpo (`d038e67`) |
| D-22 | `Ver` em x=1132 e x=1275 | mesma coordenada nos slots: 1290 / 874 / 248 por viewport |
| D-24 | Espaço não alterna | não reproduz — registro medido da Task 8 (`d460528`) |
| D-25 | Escape inerte com foco no iframe | Escape fecha antes do primeiro clique no visor (`a38aec5`) |
| D-27 | y=829 de 1476px (Admin) | `Datos personales` em **y=265** (1440) e **y=277** (390), nos dois papéis e nos três locales |

**Os três locales não mudam layout nenhum**, e isso é medição, não suposição: mesma contagem de
slots, zero vazamento, zero truncamento e as mesmas coordenadas de ação em es-CL, pt-BR e en. A maior
chave `profile.*` cresce 11% do es-CL para o pt-BR/en (89 → 99 caracteres) e é parágrafo de ajuda,
não rótulo.

**O gate rendeu 10 correções, uma por commit** (`6a5df00`…`a38aec5`) — cada uma um defeito que o
build, o lint e a suíte não veem: o grupo de ações vazando 9px do slot em 390px; o erro do campo
pousando na casca do `AppDatePicker`; a tag de modalidade fora do mapa de tom; valor imutável em
`disabled` em vez de `readOnly`; o disparador só-ícone anunciando "Choose"; o botão de fechar diálogo
falando inglês; a lista vazia de dropdown em inglês; o nome de arquivo sem base para quebrar; a
coluna de ação deixando de ser coluna depois da quebra; e a D-25, que **sobreviveu à primeira
correção** — `focusOnShow` do Prime foca o primeiro FOCÁVEL, que no PDF é o próprio `<iframe>`, e o
visor nativo ainda toma o foco ~200ms depois de abrir, sem clique (sonda de 100 em 100ms). A
devolução é única por abertura; depois do primeiro clique dentro do visor a tecla é do navegador e o
`X` é a saída garantida — limite declarado no docblock, não maquiado.

**Step 6 é do João:** `/lotus-ui-review` tem `disable-model-invocation: true`. **Step 7 (registro,
encerramento da P-36/P-37, contagem do `FormSection`, débito das chaves i18n órfãs e transição de
estado) fica retido até depois dele** — a ordem é do plano, e escrever a linha de entrega antes da
revisão registraria um resultado que ela ainda pode mudar.

**O que o gate achou e NÃO virou correção, para decisão do João:** o paginador do `DataTable` ainda
se anuncia em inglês (a raiz é o `locale('es')` global do Prime, que o projeto nunca chamou — hoje
cada wrapper pina o rótulo traduzido, e trocar isso é decisão de arquitetura); o `AppDatePicker` fixa
`locale="es"` no código; o `<a>` que embrulha o `<button aria-label="Descargar">` aninha dois
interativos; o olho do `AppPassword` **perde o foco para o `<body>`** quando alternado por teclado
(o Prime troca o nó do ícone; um handler no `pt` provavelmente substituiria o handler dele, e a Task
8 registrou por que não duplicá-lo); o dropdown de filtro do Historial de certificados não tem nome
acessível (`textbox: Todos`); e o backend devolve mensagem em espanhol com **nome de atributo em
inglês** ("El campo end date debe ser una fecha posterior o igual a start date."), além de "debe ser
una cadena de caracteres" para campo obrigatório vazio.

### Task 16 Step 6 — 2026-08-18: a revisão de UI achou 0 defeitos e 7 melhorias

`/lotus-ui-review perfil`, invocado pelo João. Papel **Redator** (`juan.morales@lotus.cl`, o único
redator ativo do seed), locale **es-CL**, tema claro e escuro em 1440x900 e tema claro em 1024x768 e
390x844. Jornada read-only: nenhuma mutação, nenhuma mudança de código como consequência da revisão —
o passo 16 da skill proíbe, e o passo 17 fecha só a sessão que ela abriu. Relatório e 14 capturas em
`.artifacts/ui-review/2026-08-17-2108-perfil/` (a pasta está no `.gitignore`, por desenho).

**Resultado: 0 achados C, 7 B e 1 bloco A agrupado** (8 observações de conformidade). Os B, com a
medição de cada um: ordem de foco divergindo da visual abaixo de `xl`; `Eliminar foto` a 3,44:1 no
tema claro; nome acessível do upload sem o rótulo visível; olho da senha com alvo de 16x16; download
consumindo duas paradas de Tab, a primeira sem nome; ação do slot vazio em x=297 contra 348 dos
outros três em 390px; e o vão de 548px entre `Cursos habilitados` e o valor em 1024px.

**O que a revisão confirmou funcionando**, e é o que fecha o gate: a jornada conclui nas três
viewports; a D-25 se sustenta (Escape fecha a prévia e devolve o foco ao `Ver` que a abriu); não há
overflow horizontal em 390px; o texto está em es-CL na superfície inteira; console com **0 erros e 0
warnings**; rede com `/api/me` 200 e `/api/profile` 200, sem repetição inesperada.

**Um falso defeito foi descartado com prova, não com suposição.** A prévia de CV e Título falha, mas
o arquivo-semente dos dois slots é uma fixture **truncada de 69 bytes** — só o header `%PDF-1.4`, sem
xref. O REUF, com PDF válido de 596 B, renderiza. É dado de seed, não comportamento da tela, e
entrou no relatório como limitação, não como achado.

### Task 16 Step 7 — 2026-08-18: as 7 melhorias viradas em código, uma por commit

Autorizado pelo João (*"vamos aplicar as correções para seguir para o state ready_for_review"*). Cada
uma medida no navegador antes e depois, um commit por achado:

| Achado | Antes | Depois | Commit |
|---|---|---|---|
| UI-02 · tinta `danger` de texto no claro | 3,44:1 | **5,83:1** (e 6,37:1 no escuro) | `4006ead` |
| UI-03 · nome acessível do upload | `Subir documento` vs `Enviar Post-Grado` | `Subir documento` vs `Subir Post-Grado` | `ef46d37` |
| UI-04 · alvo do olho da senha | 16x16 | **28x28**, glifo no mesmo pixel | `557565e` |
| UI-05 · baixar arquivo | 6 paradas de Tab para 3 ações, 3 mudas | **3 paradas**, todas nomeadas | `c15dfbf` |
| UI-01 · ordem de foco | `scrollTop` 0 → 1862 → 2230 → 0 em 390px | ~~monotônica em 390 e 1024~~ — **revertido**, ver abaixo | `da26b89`, desfeito |
| UI-06 · ação do slot vazio em 390px | x=297 contra 348 | **348 nos quatro** | `c9289fb` |
| UI-07 · vão rótulo/valor em 1024px | 548px | **214px** | `058b80f` |

**A UI-01 foi decisão do João, não escolha do executor, porque não tinha correção neutra.** A D1
punha o imutável à esquerda em `xl` e a D-27 punha o self-service em cima abaixo de `xl`: duas ordens
visuais para um DOM só, conciliadas com `order-*` — que reordena a pintura e não a árvore de
acessibilidade. Inverter só o DOM mudaria a viewport em que a violação acontece, não a eliminaria, e
1440 é a viewport de trabalho. O João escolheu virar as colunas em `xl`, e **depois, vendo a tela
pronta, reverteu** (*"deixe o meu perfil como estava"*): o desktop volta com a identidade à esquerda
e o `order-*` de volta abaixo de `xl`. **A revisão continua certa e o layout venceu** — não é o
achado que caiu, é o preço dele que foi aceito, e aceito com o número na mão.

O que sobrou está escrito onde se tropeça nele: o docblock do `ProfilePage` carrega a medição e diz
por que `tabIndex` positivo não é saída, e o débito é o **D-32** do `backlog.md`, sem bloco, porque a
saída restante é desenho — ou a D1 abre mão do lado, ou a D-27 abre mão da precedência abaixo de
`xl`, ou o cartão de identidade encolhe o bastante para dispensar a inversão. As outras seis
correções não dependiam desta e ficaram todas de pé.

**Duas correções não couberam na feature e subiram para `shared/ui`,** porque o defeito não era de
`/perfil`: o alvo do olho vale para os 4 campos de senha da aplicação, e o par `<a>`+`<button>` do
download vivia em **dois** sítios (`AppFileActions` e `AppFilePreviewDialog`) — corrigir um deixaria
o débito vivo no irmão. Nasceu daí o `AppDownloadButton`. A tinta `danger` foi ainda mais fundo: é
regra de tema, não de componente, e vale para todo botão `text`/`outlined` de severidade.

**A porta do dev server virou armadilha e fica registrado.** A revisão rodou em `:5173`, que era o
Vite deste worktree naquele momento. No passe de correção, `:5173` já era o Vite do **main tree
`lotus`** e este worktree servia em `:5174` — a primeira leva de medições saiu do app errado e foi
descartada (o sintoma foi `Eliminar foto` medindo `#186b94` em peso 400, que é outro componente).
`backend/.env:38` já lista as duas origens, então as duas autenticam com o mesmo cookie e nada
denuncia a troca. **Confira o `cwd` do processo, não a porta.**

**Fechamento documental do Step 7:** a linha da entrega entrou em `historico/progress.md`; **P-36 e
P-37** foram para `pendencias/encerradas.md` com os commits que as pagam (`8ffdefa`/`efd5bfe` e
`0672019`/`2ad35d7`) e saíram do índice, que passa a 29 abertas e 4 encerradas; a contagem de
consumidores do `FormSection` no `backlog.md` foi corrigida de 11 para **16**; e as duas chaves i18n
órfãs viraram o débito **D-31** (`profile.documents.noValidity` e `profile.identity.role` existem nos
três locales e nenhum `.tsx` as consome).

**A colisão de ID dos dois `D-18` não se resolve aqui** — renumerar é decisão do João, e mexer no ID
sem ele quebra as referências cruzadas já escritas dos dois lados.

**Estado: `ready_for_review`.** Working tree limpo, branch `feat/bd16-perfil-e-kit-compartilhado` com
15 commits de task, 10 do gate visual, 7 do passe de revisão (um deles desfeito por decisão) e os de
doc. Gate final: `pnpm build`
verde, `pnpm lint` 0, **54 arquivos / 321 testes** contra a baseline de 45/250 — o passe de revisão
somou 1 arquivo e 9 testes (a catraca da tinta `danger`, o alvo do olho e o controle único de
download). `state_basis_commit` segue em `254d691`: ele marca a base do item ativo, e a entrega ainda
não foi para a `main`. A próxima instrução do João aciona `/revisar-sprint`; este passo não inicia
review.

### Revisão de sprint — 2026-08-18: risco BAIXO, uma lente, 3 achados, zero violação de lei

`/revisar-sprint` sobre `254d691..dc46eb3` — 36 commits, 57 arquivos, +2260/−273.

**Risco BAIXO, e a classificação é o que decide o número de lentes.** O bloco não tocou nenhum
domínio das leis §5 (nenhuma migration, `generated.ts` intocado, nada de Sanctum, auditoria ou
RBAC), não tocou dinheiro nem emissão de certificado, e o executor foi o Claude. Uma lente,
sem segunda opinião do Codex.

**O gate foi reconferido, não citado.** O `state.md` afirmava 54 arquivos / 321 testes; a suíte
rodou de novo no review e devolveu o mesmo número, com `pnpm build` verde e `pnpm lint` 0. O
wrapper composto do gate devolveu `exit 1` com `BUILD=0 LINT=0 TEST=0` nos logs — o código de saída
era do encadeamento, não de checagem nenhuma.

**Passo 1 — órfãos: nenhum.** `AppDownloadButton` (2 consumidores + barrel), `ProfileDocumentSlotHeader`
(1) e `fieldContext` (5 wrappers + o `FormField`) estão todos consumidos; `BRAND_COLOR` foi apagada
e não deixou referência. Os 3 locales medem **636 chaves idênticas**, zero faltando e zero extra. As
duas chaves i18n sem consumidor já são o débito **D-31** — decisão registrada não é achado. A
contagem de consumidores do `FormSection` no `backlog.md` bate: 17 arquivos casam `<FormSection`,
menos o próprio teste, **16**.

**Leis e convenções, medidas:** zero import direto de `primereact` sob `src/features` ou `src/app`,
zero import cruzado entre features, nenhum `Field`/`UnmappedErrors` local, nenhum `useEffect` de
reset, nenhum `setForm` solto, e nenhum `any`/`@ts-ignore`/catch vazio/`console.*` no diff inteiro.

| Achado | Onde | Severidade | Esforço |
|---|---|---|---|
| **Q-1** · `role="button"` cravado sem o resto do contrato: Espaço não ativa e `disabled` não se anuncia | `shared/ui/AppFileUpload/AppFileUpload.tsx` | 🟡 | P |
| **Q-2** · `pt` que não pode vencer — o wrapper crava o mesmo `aria-label` pelo `pins` | `features/commercial/.../QuoteRow.tsx:90` | 🟢 | P |
| **Q-3** · `mergePt` compunha função num sentido só; no outro a folha do chamador sumia | `shared/ui/mergePt.ts:32-36` | 🟢 | P |

**Dois candidatos morreram na verificação, e é por isso que se verifica.** O `AppDownloadButton`
parecia abrir popup sem barra (`window.open(href, '_blank', 'noopener,noreferrer')`): a
especificação **remove** `noopener`/`noreferrer` do `tokenizedFeatures` antes do teste de popup, que
sai vazio — é aba, como o docblock diz. E um parser próprio acusou dois controles dentro de um
`FormField` no `StaffUserDialog:93`: ele engasgou com `<FormField ... />` autofechado, e a leitura
das linhas 84–135 mostrou três campos, um controle cada.

**Nada de decisão registrada virou achado:** D-32 (ordem de foco), DS-05 (avatar), D-31 (chaves
órfãs), a colisão dos dois `D-18` e o `--text-color-secondary` separado do interno compilado do
Prime estão todos escritos com número medido. **Nenhum padrão reincidente** apareceu — nada a
promover para rule ou ADR.

### Correções — 2026-08-18: os 3 achados aprovados pelo João, todos aplicados

Autorizado pelo João (*"Vamos aplicar de Q-1 á Q-3"*). Um commit por achado:

| Achado | Antes | Depois | Commit |
|---|---|---|---|
| Q-1 · contrato do disparador de upload | Espaço inerte; `disabled` focável e mudo | Espaço ativa; `aria-disabled` anunciado | `e9f53f3` |
| Q-2 · `pt` morto na cotação | 3 linhas que não valiam | removidas; nome vem do piso do wrapper | `a4eac5c` |
| Q-3 · assimetria do `mergePt` | função no `pins` descartava a folha do chamador | compõe nos dois sentidos | `fb2d38b` |

**A Q-1 é a metade que faltava da D-24.** O `mergeProps` do PrimeReact COMPÕE função de mesmo nome —
chama a existente e depois a do `pt` (`utils.cjs.js:2694-2700`) —, então o `onKeyDown` novo soma ao
`Enter` do Prime em vez de trocá-lo, e há teste travando as duas teclas. O `aria-disabled` entra
sem tirar o alvo do Tab: botão desabilitado que some da navegação é botão que o leitor de tela nunca
encontra para descobrir por que não responde.

**Os testes viram o defeito antes de virarem verde** (lição 10): as duas correções de comportamento
foram rodadas contra o código anterior e **5 dos 6 testes novos ficaram vermelhos** — o sexto é a
guarda do caso negativo (`aria-disabled` ausente quando habilitado), que passa dos dois lados por
construção. A Q-2 não ganha teste: é remoção de linha morta, e o nome acessível que ela repetia já
está travado por teste desde o BD-16.

**Gate após as correções:** `pnpm build` verde, `pnpm lint` 0, **54 arquivos / 327 testes** — os 321
anteriores mais 6. Nenhuma chave i18n virou órfã: `common.upload`, que saiu do `QuoteRow`, continua
consumida pelo próprio wrapper.

**Estado: `ready_for_closure`.** Nenhum achado aguardando decisão ou correção. `/fechar-sprint` é o
próximo passo e **não** foi executado aqui.

### Fechamento — 2026-08-18: o contrato do disparador provado no navegador, e a suíte de backend vermelha pelo mesmo `.env` de sempre

**O passo 0 não foi herdado do DoD da Task 16, e não podia ser.** Aquele DoD mediu o bloco antes das
três correções do review, e duas delas mudam comportamento de teclado e de estado no controle que
substitui documento de peso legal. A prova foi refeita em **Chromium real** (o `playwright-cli`
default não abre: ele procura o canal `chrome` em `/opt/google/chrome`, que não existe nesta máquina
— `--browser chromium` usa o binário do `ms-playwright` e abre), com o frontend **desta** worktree e
a API em `:8080`.

**A armadilha da porta foi conferida pelo `cwd`, não pela porta**, como o Step 7 mandou: `:5173` é o
Vite do main tree (`/home/jvbat/projetos/lotus/frontend`, pid 8995) e `:5174` é o desta worktree
(pid 12027). Toda medição saiu de `:5174` — e o `:5173` só apareceu de propósito, como grupo de
controle.

| O que | Como foi provado | Resultado |
|---|---|---|
| Q-1 · tecla | listener de contagem no `<input type=file>`, foco no disparador, `Space` | **1 ativação** (era 0) |
| Q-1 · Enter | mesma sonda, `Enter` | **1 ativação** — o handler do Prime sobreviveu à fusão, e não dispara duas vezes |
| Q-1 · estado | POST `/api/profile/documents` **segurado em voo** por rota do Playwright | `aria-disabled` de `null` para `"true"`, `tabIndex` **0** nos dois (focável de propósito), `p-disabled` e `<input disabled>` |
| Q-2 | nomes acessíveis de `/comercial/presupuestos/1` em es-CL | `Subir documento` ×3 pelo piso do wrapper, mais o 4º que se nomeia pelo rótulo visível |
| Q-3 | `maximizableButton` do `AppDialog` — a função que o ramo novo compõe | `Maximizar diálogo` → `Restaurar diálogo`, e `Cerrar` traduzido |
| D-23 | árvore de acessibilidade de `/perfil` como Redator | `Replace Résumé (CV)`, `Replace University degree`, `Upload Postgraduate degree` — nome por documento |
| P-37 | mesma árvore | `textbox "Name"`, `textbox "Current password"` — o nome é **só** o rótulo |
| UI-05 | mesma árvore | `button "Download"`, zero `<a>` no par de ações |
| UI-04 | olho da senha | `28x28` e Espaço alterna (`password` → `text`) |

**Zero resíduo no banco de dev.** A rota abortou a escrita depois de medir, e o slot de Post-Grado
seguia `Not uploaded` na releitura. Nada foi gravado — ao contrário do fechamento anterior, que
declarou dois documentos.

**Um defeito novo apareceu na prova e NÃO é deste bloco — foi medido nos dois lados.** Com o foco no
olho da senha, Espaço alterna e o `document.activeElement` vira `BODY`: o Prime troca o ícone e o nó
focado sai do DOM. O mesmo teste no main tree (`:5173`, sem os commits do BD-16) devolve `BODY`
igual, mudando só o alvo — 16x16 lá, 28x28 aqui. Entrou como débito **D-33**, sem bloco. É a terceira
ponta do mesmo `AppPassword`, depois da tecla (D-24, não reproduzida) e do alvo (UI-04, pago).

**Suíte de backend: 12 falhas no primeiro run, e a causa é a P-45, não o bloco.** Todas são
`RuntimeException: Session store not set on request`, do `tests/TestCase.php:18` lendo
`FRONTEND_URL` cru enquanto o `.env` do main tree é lista com vírgula
(`http://localhost:5173,http://localhost:5174`). **Provado por medição, não deduzido:** com
`FRONTEND_URL` valendo uma URL só, a suíte fecha em **684 passed / 5 skipped / 0 failed**. O bloco
tem **zero** arquivo em `backend/`, e o container que mede monta o main tree, que está em `main` —
o vermelho é o da `main`, e a ficha da P-45 já o registra desde 2026-08-17.

**Higiene medida:** 0 arquivo PHP no diff (Pint não se aplica, e ele nunca roda sem argumento),
`generated.ts` intocado e nenhum DTO alterado (`typescript:transform` não se aplica), 0 `.gitkeep`
novo, e nenhum órfão entre os arquivos que o bloco criou. Front: `pnpm lint` 0, `pnpm build` verde,
**54 arquivos / 327 testes**.

**Gatilhos de pendência conferidos um a um; nenhum venceu.** A **P-46** foi a única que chegou perto
e **não** disparou: o diff tem um `marginTop: 0`, mas ele neutraliza a margem do **próprio Prime**
num `<span>` de ícone (`AppPassword.tsx:111`), não a margem de agente do usuário num `h1`–`h6`/`p`/
`ul`/`ol`, que é o que a ficha conta. A **P-45** teve o sintoma medido de novo e segue aberta — o
gatilho dela é o commit que fechar o multi-origin, e ele não é deste bloco. A **P-03** não dispara em
bloco frontend puro; a **P-44** pede bloco que possa reseedar o dev; a **P-32** pede lição 13
reincidindo por **classe**.

**Duas encerradas saíram por rastro cumprido** — **P-38** e **P-34**, pelo precedente da P-26. A
**P-36** e a **P-37** ficam mais uma sprint: foram encerradas **dentro** deste bloco.

**Arquivamento e backlog.** Plano e spec foram para `plans/archive/` e `specs/archive/`. Do
`backlog.md` saíram o **BD-16** e o **BD-10** que ele havia absorvido, junto dos 14 débitos que
pagaram (D-01, D-18 do `AppFileRow` e D-19…D-30). Duas coisas foram **resgatadas antes** de a seção
sumir, porque a única cópia delas morava lá: **DS-05** e **DS-07**, que o João deixou fora do bloco
por decisão, agora vivem em "Travados em decisão". **A colisão dos dois `D-18` terminou por
entrega, não por renumeração** — o gêmeo do `AppFileRow` foi pago e saiu, então o número voltou a ser
único sem ninguém mexer em ID alheio.

**O que fica aberto, e é a única coisa:** a **`main` avançou 21 commits** desde a base deste bloco
(entrou o `dashboard-frontend-analitico-e-redator`) e **14 arquivos são tocados pelos dois lados** —
`state.md`, `backlog.md`, `progress.md`, o índice e as fichas de pendências, `eslint.config.js`,
`DashboardPage.tsx`, os 3 locales, `brand-theme.css`, `tokens.ts`, `AppCard.tsx` e o barrel de
`shared/ui`. O merge é trabalho a fazer, não defeito — e os arquivos de doc vão conflitar por
construção, porque os dois lados fecharam bloco no mesmo período.
### Integração — 2026-08-18: merge da `main` (fechamento do `dashboard-frontend-analitico-e-redator`)

**A `main` andou 21 commits desde o `254d691` de onde este bloco partiu** — o PR #57 fechou o
`dashboard-frontend-analitico-e-redator` (B2 da Sprint 5) em 2026-08-17. As duas frentes correram em
paralelo por exceção declarada, então este merge é a costura prevista.

**Merge, não rebase, e a razão é a mesma de 2026-08-17: documental.** O fechamento deste bloco
**cita SHAs** — `state_basis_commit: 0a1918b` e o intervalo `86ec2dd..0a1918b` na linha do
`progress.md`. Rebase reescreveria todos eles e a prova da entrega passaria a apontar para commits
que não existem.

**Cinco conflitos: dois de documento e três de código.** Documento: `state.md` e `progress.md`.
Código: `DashboardPage.tsx`, `brand-theme.css` e `tokens.ts`. Auto-mergearam `backlog.md`,
`pendencias/README.md`, `pendencias/abertas.md`, `progress-archive.md`, `eslint.config.js`, os três
locales, `AppCard.tsx` e o barrel de `shared/ui`.

**Os dois conflitos de CSS e token eram adição pura dos dois lados** — o `accentText` daqui e o
`chartInks` da `main`; a tinta `danger` de botão `text`/`outlined` daqui e a linha transparente da
tabela lá. Ficaram os quatro; nenhum decidia sobre o outro.

**O conflito de `DashboardPage` era estrutural, e a resolução foi rastrear o código, não o arquivo.**
A `main` transformou a página no roteador de `kind` (admin × redator) e **extraiu o `SectionLabel`
para arquivo próprio**; este bloco tinha mudado, no mesmo trecho, **só o docblock** — a D-28 matou a
razão original da tinta de corpo (a secundária do claro desceu ao slate-600 e hoje mede 6,92:1 no
humo), e a tinta fica por hierarquia. Ficou o arquivo da `main` inteiro, e a medição foi portada para
`SectionLabel.tsx`. Resolver por arquivo teria apagado a estrutura nova ou perdido a medição.

> Herdado da extração da `main` e **não corrigido aqui**: o docblock do `SectionLabel` ainda diz que
> os dois registros "estavam escritos no docblock abaixo", e abaixo não há mais docblock nenhum — ele
> ficou no `DashboardPage`. Comentário alheio se menciona, não se reescreve no meio de um merge.

**O frontmatter foi lido antes do push, que é exatamente o que a lição da `main` pede** (ela nasceu
de um frontmatter auto-mesclado que ninguém escreveu e que ficava **verde**). Os dois lados estavam
`idle`; venceu a entrega mais recente — `last_completed_work_item: bd16-perfil-e-kit-compartilhado`,
`state_basis_commit: 0a1918b`, `updated_at` de 2026-08-18.

**A escada de itens fechados ficou com os dois fechamentos** — BD-16 como último, o B2 do Dashboard
como penúltimo — e desceu um degrau: o `dashboard-backend-agregacoes` (2026-08-15) saiu do arquivo,
como o `celula-de-identidade` saiu no fechamento anterior. No `progress.md` as duas linhas de entrega
ficaram e o **BD-5** desceu **verbatim** para o `progress-archive.md`, mantendo as dez.

**Os números foram contados, não herdados** — é a classe de deriva que o merge de 2026-08-17 pegou.
Pendências: **29 abertas e 2 encerradas**, com o índice batendo ficha a ficha (zero ID de diferença
nos dois sentidos). Locales: **698 chaves idênticas** nos três. Desta vez não havia deriva a
corrigir.

**Gate depois do merge:** `pnpm build` verde, `pnpm lint` 0, **59 arquivos / 368 testes** — os 54/327
deste bloco mais os 5 arquivos e 41 testes que a `main` trouxe.

## Quarto item fechado — 2026-08-17 (`dashboard-frontend-analitico-e-redator`, Sprint 5 · Dashboard, bloco B2)

### Seleção — 2026-08-17

**Último bloco da Sprint 5 (`backlog.md:45`), promovido explicitamente pelo João** com o estado em
`idle` e `active_work_item` `null`. O gate do `/planejar-bloco` reprovou pelo motivo de sempre — e é
a **décima primeira** vez (BD-1, BD-2, BD-7, BD-8, BD-9, BD-5, `login-fora-do-adr16`,
`celula-de-identidade`, `dashboard-backend-agregacoes`, `meu-perfil-backend-self-service`,
`dashboard-frontend-central-controle`): o argumento era **linha do backlog**, com numeração `2.` e
markdown, não slug promovido.

**Quatro decisões dele fecharam o gate:** o slug `dashboard-frontend-analitico-e-redator`; a rota
**`context_required`**, como o backlog exige para a Sprint 5; **main tree** como área de trabalho; e
**a view do Redator entra inteira** no escopo.

**A branch nasceu ANTES deste commit**, seguindo o precedente do B1:
`feat/dashboard-frontend-analitico-e-redator`, criada de `main@c2ac9d4`. Este arquivo já é escrito
na branch, não na `main`.

**A main tree é escolha dele, e o gatilho da P-03 não vencia.** O bloco é frontend puro; a pendência
dispara com mais de um `active_work_item` **de backend**, e não há outro item ativo. Uma worktree
seria admissível; ele escolheu a árvore principal, como no B1.

**`state_basis_commit` passa de `0afdb55` a `c2ac9d4`, e isso não é divergência.** Com
`active_work_item` `null` não havia trabalho ativo cujo baseline pudesse ter derivado. `c2ac9d4` é o
merge da revisão de UI de 2026-08-17 na `main`, e `main == origin/main` na hora da promoção, árvore
limpa exceto `backend/config/cors.php`.

**Fonte externa declarada, como em toda a Sprint 5:** o backlog aponta o escopo canônico no Drive
(`Planejamento/dashboard-escopo-funcional-analitico.md`) e a execução detalhada no Notion (EAP
8.4.0–8.4.7). O bloco A consumiu a sequência de backend (8.4.0→8.4.1→8.4.2→8.4.3→8.4.6) e o B1
consumiu as de frontend pelo packet de 2026-08-15 — **este bloco não herda aquele packet**: ele foi
escrito para as 5 seções operacionais, e o que sobra aqui são os 4 datasets analíticos e a view do
Redator. O packet do B1
(`context-packets/2026-08-15-dashboard-frontend-central-controle.md`) é insumo, não substituto.
**O staleness trigger da troca 8.4.0 × 8.4.7 no Notion segue vivo** — descrição e critério de aceite
invertidos entre si, medido duas vezes e não corrigido até o fechamento do B1; a resolução é a
mesma, o Drive decide o escopo.

**Cinco medições da abertura, feitas sobre `c2ac9d4` e não herdadas:**

1. **Continua sem biblioteca de gráficos.** `package.json` não tem `chart.js` — peer obrigatório do
   `Chart` do PrimeReact `^10.9.8` — nem `recharts`, `apexcharts`, `echarts`, `d3`, `victory`,
   `nivo` ou `visx`; `shared/ui/` não tem wrapper de chart. **A decisão de chart lib é deste bloco**,
   e ela é dependência de runtime nova, não escolha de estilo.
2. **A D5 do B1 se paga aqui, medida.** `useDashboard(period?: DashboardPeriod)`
   (`useDashboard.ts:77`) já nasceu com o parâmetro: a `queryKey` inclui `start`/`end`
   (`useDashboard.ts:17-18`) e a chamada manda `period_start`/`period_end`
   (`useDashboard.ts:83`). **Ligar a UI de período não mexe no cache** — o hook não precisa mudar de
   forma para receber o filtro.
3. **Os 4 datasets que faltam do admin são exatamente os 4 anuláveis que o B1 não consumiu:**
   `compliance_turmas: TurmaComplianceData[] | null`, `redatores: RedatorLoadData[] | null`,
   `series: SeriesData | null` e `rankings: RankingsData | null` (`generated.ts:8-11`). O B1 levou
   `kpis`, `pendencias`, `alertas`, `pipeline` e `agenda`. O corte da D1 fecha sem sobra nem
   sobreposição.
4. **`RedatorDashboardData` tem 6 chaves e nenhuma anulável** (`generated.ts:376-383`): `view`,
   `resumo`, `agenda`, `pendencias_documentais`, `alertas_documentos`, `historico`. A nulabilidade
   de gate é só do admin, então **a política de estado do `useDashboard` não tem o que ramificar na
   view do Redator** — o predicado `nenhumaSecaoLegivel`, que o review do B1 consertou, é do ramo
   admin. Achado de desenho para o brainstorming, não do packet.
5. **A catraca de cor já cobre onde o bloco escreve.** `COR_HARDCODED` roda em `src/app/**` desde a
   D11 do B1 (P-34 fechada), e `app/pages/Dashboard/` tem 12 arquivos hoje. O bloco nasce sob a
   guarda, sem precisar ligá-la.

**A view do Redator entra inteira por decisão dele, com o custo declarado aqui e não descoberto no
gate.** A lei §5 permite que o redator autentique, mas **a ativação não foi feita, e isso é medido,
não suposto:** `CreateRedatorAction.php:20` diz "is_active=false até o fluxo de ativação" e
`AuthController.php:52` recusa login de usuário inativo. **Consequência para o DoD: a view do
Redator não pode ser provada com sessão de redator real** — a prova será por payload e render, e a
ativação de acesso do redator (item 4 de "Próximos blocos") **não é escopo deste bloco**.

**Duas linhas de backlog que tocam este bloco:** a **P-44** (dois usuários de sonda aparecem na
carga de redatores) tem o gatilho apontando para cá e **a carga de redatores é seção deste bloco**,
então o gatilho vence — tratar no planejamento; e a **D-16** (turma concluída sem matrícula caindo em
`fully_issued`) **não é deste bloco**: o consumidor do funil era o B1 e ele não pediu a distinção,
então a linha segue no BD-15 com o gatilho intacto.

**`backend/config/cors.php` está modificado no working tree e não é deste bloco** (WIP do João, o
outro lado da P-45). Fica fora de todo `git add`; os commits usam paths exatos.

**Risco de review projetado: BAIXO pelo gate binário** — frontend puro, não toca schema, não regenera
`generated.ts`, não toca Sanctum, auditoria nem documento legal. **Divergência por alcance já
declarada:** a chart lib é dependência de runtime nova e a view do Redator é superfície inteira sem
consumidor autenticável. A classificação final é do `/revisar-sprint`, não desta promoção.

**Estado: `context_required`.** Próxima ação: Context Packet pelo Codex, read-only, sobre
`feat/dashboard-frontend-analitico-e-redator` a partir de `main@c2ac9d4`.

### Context Packet — 2026-08-17: a metade externa foi verificada por conta própria

Gerado pelo Codex (`lotus-context-packet`, sandbox read-only, sobre `e48b4ae`) e validado contra o
contrato da skill item a item: marcadores exatos e nada fora deles, frontmatter completo com
`plan_path`/`plan_blob_sha`/`spec_path`/`spec_blob_sha` corretamente em **`null`** (registrados, não
inventados, porque os ponteiros do estado eram `null`), **8 key facts** — o teto exato —, corpo em
**718 palavras** contra o orçamento de 1.200, toda fonte com status `retrieved` (nenhuma
`unavailable`, então a regra das duas evidências não se aplica), e **nenhum staleness trigger**
apontando para hash de proveniência, para a transição promotora ou para edição de `state.md` que só
move campo de workflow. Salvo em
`docs/superpowers/context-packets/2026-08-17-dashboard-frontend-analitico-e-redator.md`.

**Os três hashes de proveniência foram medidos antes da invocação e batem:** `base_commit`
`e48b4aebedc0…`, `state_blob_sha` `98f93dac…` e `progress_blob_sha` `04ded854…`, obtidos por
`git rev-parse`/`git hash-object` e não aceitos de chegada.

**Seis afirmações de repositório foram medidas contra o código antes de salvar o packet, e as seis
batem:** `SeriesData` tem as cinco séries com os nomes que o packet lista e **cada uma anulável**
(`generated.ts:454-460`); `TurmaComplianceData` e `RedatorLoadData` batem campo a campo com o que o
packet atribui ao Drive (`present_types`/`missing_types`/`habilitada`/`redatores`/datas e
`current_turmas`/`upcoming_turmas`/`expired_documents`/`expiring_documents`); `DashboardPage.tsx:71`
chama `useDashboard()` **sem período**, como o packet afirma; os dois blob SHAs dos packets citados
como insumo batem exatamente; a spec do B1 (linha 16) confirma o corte da D1; e a D3 do bloco A está
verbatim onde o packet a cita.

**A metade externa não foi aceita de chegada — foi remedida por ferramenta própria, porque ela é a
parte que só o Codex tinha visto.** O Drive `1HlT8kUsnoGsRJpYmryHacZ8zBZnDQgRa` existe, é
`dashboard-escopo-funcional-analitico.md` e tem `modifiedTime` **`2026-08-14T18:38:17.992Z`** —
idêntico ao que o registro de fontes declara. E a EAP 8.4.0 foi buscada direto pelo ID
`3bcbc960-3dfa-81c8-9df1-de7d7805816b`.

**A troca 8.4.0 × 8.4.7 PERSISTE, e agora está medida em terceira mão independente.** A 8.4.0 tem
título "Estruturar domínio read-only Dashboard e dependências cross-domain", `Camada: Backend` e
`ADR ref: ADR-02` — **título, camada e ADR corretos** —, enquanto a `Descrição` diz "Validar a
central do Dashboard com harness/lotus-ui-review" e o `Critério de aceite` diz "UI review não
encontra falhas bloqueantes de hierarquia, leitura, overflow ou estados". O `parent-data-source` é
`collection://e64b7d57-d000-4433-b652-a410e75193cc`, **a base canônica** — não a homônima obsoleta
que produziu 12 divergências falsas em 2026-07-30. A resolução é a de sempre: o Drive decide o
escopo, e a UI review pertence ao frontend.

**A medição direta trouxe um fato que o packet não destaca e que muda o DoD deste bloco:** o corpo
de UI review da 8.4.0 exige validar "separadamente perfil administrativo e Redator" e, para o
Redator, "ownership visual, ausência de dados comerciais/terceiros". **O B1 não podia satisfazer
isso** — ele não tinha view do Redator. O aceite da 8.4.0 só fecha inteiro aqui.

**Uma linha do packet foi medida e não é divergência de verdade, e fica registrada em vez de
aceita.** A terceira linha da tabela ("Alcance do período") opõe o Drive à D3 local; medido, a
própria D3 cita **"§5 do Drive"** como base — ela deriva do Drive, não o contradiz. A resolução
registrada continua correta (só séries e rankings obedecem ao período), então **isto não foi motivo
de re-invocação**: nenhum item da validação da skill é violado, e o custo é registro a mais, não
decisão errada. Mesmo padrão do packet do B1, onde a medição também mostrou convergência onde o
packet via imposição externa.

**Uma tensão entre o packet e esta promoção fica declarada em vez de resolvida em silêncio.** A
seleção acima escreveu que o gatilho da **P-44** vence aqui; o packet põe a limpeza em `Deferred`.
Medida a ficha (`pendencias/abertas.md:369-371`), o gatilho é "quando um bloco puder reseedar o banco
de dev, **ou** quando a residência atrapalhar uma medição de verdade (o bloco B do Dashboard é o
primeiro candidato: a tela vai mostrar estes nomes)". As duas leituras cabem: a tela **vai** mostrar
os nomes de sonda, e este bloco **não** pode reseedar. É decisão do João no brainstorming, não
escolha por heurística.

**`status: ready`, e as duas open questions não bloqueiam:** ambas são de **apresentação** — qual
chart lib e qual visualização por dataset, e qual UX do seletor de período —, e o Drive delega essa
decisão ao frontend, o mesmo teste que o packet do B1 passou. Nenhuma regra de negócio, critério de
aceite ou comportamento de peso legal ficou por adivinhar, que é o teste da própria skill para
`blocked`.

**Estado: `ready_for_planning`.** Próxima ação: `/planejar-bloco` prossegue para `planning`
(brainstorming → spec → plano).

### Brainstorming e spec — 2026-08-17: o terreno mudou três decisões

Spec em `docs/superpowers/specs/archive/2026-08-17-dashboard-frontend-analitico-e-redator-design.md`, com
**treze decisões**: D1–D10 escolhidas pelo João entre alternativas com o custo declarado, D11–D13
derivadas e declaradas como tais.

**Baseline medido nesta branch antes de desenhar:** `pnpm lint` exit 0, `pnpm build` verde,
`pnpm test` **39 arquivos / 223 testes**.

**A D1 se decidiu por medição de mecanismo, não por preferência de biblioteca.** O tema troca em
runtime trocando o `href` de um `<link>` (`primeTheme.ts:15`), sem re-render React. SVG aceita
`stroke="var(--chart-1)"` e acompanha a troca **sem JS**; canvas exige `getComputedStyle` mais
redraw forçado. **Recharts venceu por isso**, e não por bundle ou API.

**Quatro achados de terreno mudaram o desenho, e nenhum estava no packet:**

1. **A catraca de cor é cega para gráfico.** `COR_HARDCODED` casa só `className` com classe Tailwind
   (`eslint.config.js:110-115`) — hex dentro de objeto de configuração de dataset passa em silêncio.
   É a **P-36**, e a consequência entrou na D11: o wrapper de `shared/ui` é o **único** sítio que
   nomeia token de cor, e o call-site passa índice de série. Cor vira mecanismo num lugar só, porque
   lint não a alcança.
2. **`src/app/**` é a camada sem a régua de linhas** — `max-lines` roda só em
   `src/features/*/components/**` (`eslint.config.js:248-251`) —, e **2 dos 24 arquivos dela já a
   excedem**, os dois criados pelo B1. É o mesmo formato da P-34 que o B1 fechou para a catraca de
   cor, agora com `max-lines`. Virou a **D8**, e o custo medido é **um** arquivo, porque a D4 já
   encolhe o `DashboardPage`.
3. **A query key varia pelo período, e isso quebrava a tela.** Trocar a janela cria key nova,
   `query.data` volta `undefined` e o hook cai em `kind: 'error'` — **a tela inteira viraria
   `AppErrorState` por um erro de digitação no filtro**, e o `staleError` do B1 não alcança porque o
   cache é da key antiga. A **D6** (`keepPreviousData`) fecha isso, e some de brinde o flash de tela
   em branco na troca **normal** de período.
4. **O reuso entre as duas views é maior do que parecia, e por forma do contrato.** `AgendaData` e
   `RedatorAgendaData` têm as **mesmas 4 janelas** e a linha difere em **exatamente um campo**,
   `client_name` — que é a regra de ownership. Genericizar `AgendaPanel` faz **o ownership virar
   consequência do tipo**, não condicional de tela. E `alertas_documentos` é `AlertData[]`, o mesmo
   tipo do `AlertList`: reuso sem tocar no arquivo.

**O self-review da spec achou quatro coisas e as corrigiu antes do commit:** eu havia escrito "os 7
cenários que o B1 deixou" e o arquivo tem **6 casos** (o "7º" do registro do B1 era contagem de
**cenário da spec**, e o próprio fechamento dele anotou que o vitest conta **casos**); o mapeamento
das 5 seções do Redator estava implícito e virou tabela, porque a D13 dispensou os componentes
`ResumoRow`/`HistoricoRow` que o desenho apresentado previa; o glob `.tsx` da D8 parecia arbitrário e
ganhou a razão (é o mesmo recorte da regra das features — hook e derivação longos são legítimos); e o
alvo do gate projetava número de casos, que é justamente a projeção que o fechamento do B1 teve de
declarar como divergência.

**Uma verificação que evitou um falso problema:** a spec cita paths que ainda não existem, e
`frontend/tests/repo-docs-refs.test.ts` reprova path fantasma em doc normativo. Medido,
`docs/superpowers/**` está **excluído de propósito** dele (`:35,138-140`). Nenhum risco, e isso fica
escrito para não ser remedido no próximo bloco.

**Risco de review: BAIXO pelo gate binário** — não toca schema, não regenera `generated.ts`, não
toca Sanctum, auditoria nem RBAC. **Divergência por alcance declarada:** dependência de runtime nova
(Recharts), 2 wrappers novos em `shared/ui`, 5 tokens de cor novos, régua nova numa camada inteira e
uma superfície de tela sem consumidor autenticável.

O estado entra em `planning` no commit da spec; `active_plan` segue `null` até o João ler a spec
escrita e autorizar o `writing-plans`.

### Plano — 2026-08-17: escrever o plano derrubou o mecanismo de uma decisão aprovada

**O João aprovou a spec sem pedir mudança**, e o plano saiu em
`docs/superpowers/plans/archive/2026-08-17-dashboard-frontend-analitico-e-redator.md`: **onze tasks**, uma
por commit, na ordem paleta → wrappers → hook → pastas → régua → período → séries → rankings →
compliance/carga → Redator → DoD.

**A ordem tem uma inversão deliberada.** A régua da D8 entra na Task 5, **antes** das cinco tasks
que escrevem seções novas, e não no fim. Catraca serve para o código nascer conforme: ligada
depois, as 4 seções nasceriam grandes e a task de ligar viraria refatoração retroativa. É a mesma
sequência da D11 do B1.

**Três coisas apareceram só ao escrever o plano, e as três viram emenda à spec.**

1. **A D6 nomeava um mecanismo que não faz o que ela pede.** Medido no observador da versão
   instalada — `@tanstack/query-core@5.101.1`, `src/queryObserver.ts:486-491` —,
   `placeholderData: keepPreviousData` só entra com `status === 'pending'`. Quando o fetch da
   janela nova **falha**, `status` vira `'error'`, `data` volta `undefined` e a tela vira
   `AppErrorState`: exatamente o que a D6 foi escrita para impedir. Ele cobre a troca normal — o
   "ganho de brinde" que a decisão citava — e **não cobre a troca falhada**, que era o objetivo
   declarado. Substituído por um piso único no hook (o último payload bom). Um mecanismo cobre as
   duas metades; manter os dois seria a segunda fonte da mesma verdade. **O objetivo da D6 e o
   cenário 4 do §6 não mudaram** — mudou o mecanismo nomeado.
2. **A §4 e a D8 não se satisfazem juntas.** A §4 dava ao `DashboardPage.tsx` dois papéis — roteador
   de `kind` e compositor das seções do admin — e a D8 põe 150 linhas sobre ele. Ele tem **159
   ANTES** das 4 seções novas. Resolvido pelo critério da própria D4: `admin/AdminView.tsx`,
   simétrico ao `RedatorView.tsx` que a §4 já previa, mais `SectionLabel.tsx` e
   `DashboardSkeleton.tsx` na raiz, que é onde mora o que as duas views usam.
3. **A chave i18n do KPI vira completa.** `KpiRow` montava `dashboard.kpi.${key}` dentro do render;
   com o Redator em `dashboard.redator.kpi.*` o prefixo implícito quebra, e uma prop de prefixo
   poria metade da chave no call-site e metade no JSX. Mesma correção que o Q-1 do review de
   2026-08-16 já fez neste arquivo.

**Quatro coisas que o plano mediu em vez de supor**, e as quatro mudaram código escrito:
`common.yes`/`common.no` **não existem** em nenhuma das 3 locales; a contagem de rodapé do
repositório **não usa plural do i18next** (`role.count` é `"{{count}} roles"`, forma única); **não
existe rota de detalhe de relator** — o `AppRouter` registra só `/personas`, e `navigation.ts:49-50`
já resolveu o mesmo caso com `key: null`; e o Meu Perfil é **`/perfil`**, não `/mi-perfil`.

**As 5 cores da D2 saíram medidas, não escolhidas por olho:** teal/laranja/roxo/rosa/índigo, nenhum
deles um hue dos `--tone-*-ink`, todos apontando para degraus que a rampa do tema já tem — **zero
hex novo**. No claro medem 3,41 / 3,78 / 3,96 / 3,53 / 4,47:1 sobre o card; no escuro, 4,52 a 6,89.
A régua (`frontend/tests/chart-tokens.test.ts`) cobra 3:1 e **30° de matiz entre quaisquer duas**,
com um controle que reprova a alternativa rejeitada da D2 — o amarelo do tom de aviso fica a 21° do
laranja da paleta.

**Um cenário além dos 6 do §6, e o motivo:** `periodoDoPreset` manda data ao servidor sem validação
de cliente (a D6 deixou a regra só no backend). Errar o recuo de mês manda uma janela que o backend
**aceita** e a tela mostra errada, sem nenhum 422 — mesma categoria do `parseUfInput`.

**`executor: claude`**, com o `/lotus-ui-review` da Task 11 reservado ao João
(`disable-model-invocation: true`). O aceite da EAP 8.4.0 exige validar admin e Redator
**separadamente** — coisa que o B1 não podia satisfazer.

### Execução — 2026-08-17: início, técnica `executing-plans`

`/executar-bloco dashboard-frontend-analitico-e-redator` validou as âncoras (spec, plano e packet no
disco; branch `feat/dashboard-frontend-analitico-e-redator` em `d479956`, árvore limpa exceto
`backend/config/cors.php`; `active_plan` cobrindo o work item).

**Técnica: `executing-plans`, não `subagent-driven-development`** — o ambiente restringe o Agent tool
a pedido explícito do João, que não veio nesta invocação. Mesmo precedente do B1. `executor: claude`,
main tree, como o handoff do plano já fixava.

**Baseline remedida nesta branch antes da Task 1, e bate com o plano:** `pnpm lint` exit 0,
`pnpm build` verde, `pnpm test` **39 arquivos / 223 testes**. Bundle antes: `index.js` 1.264,48 kB
(gzip 350,52 kB).

**Task 1 (paleta de série) completa.** Recharts **3.10.1** instalado e o peer medido, não suposto:
`^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0` — aceita o React 19.2 do projeto, então a D1 se sustenta
sem o PARE que o Step 2 previa. **O bundle não mexeu um byte** (mesmo hash `index--CYbGOcU.js`,
1.264,48 kB): a dependência entrou sem importador, e o custo real só aparece na Task 2 — o número que
o Step 3 manda declarar é este, e ele não é o custo do Recharts.

**Os 5 tokens `--chart-1..5` saíram com zero hex novo** e a régua mediu razão em vez de conferir hex:
claro **3,41 / 3,78 / 3,96 / 3,53 / 4,47:1** sobre o card, escuro **6,89 / 6,28 / 4,86 / 5,16 /
4,52:1** — os mesmos números que o plano projetou, remedidos aqui. A catraca da D11 fixa que só
`brand-theme.css` e `tokens.ts` nomeiam o token.

**Uma divergência de contagem, da classe que a §8 da spec previu:** o Step 9 projetava **22 casos** e
o runner deu **14**. A projeção contou *asserção* onde o vitest conta *caso* — os `it.each` de 5
tokens × 2 temas rendem 10 casos com 2 asserções cada, mais 2 de matiz, o controle do amarelo e a
catraca. Gate da task: lint exit 0, build verde, **40 arquivos / 237 testes**.

**Um registro de relógio, não divergência de estado:** o `updated_at` que o commit do plano gravou
(`14:20:00-03:00`) é 23 minutos adiantado em relação ao commit real (`13:57:55`). Este commit grava a
hora medida, então o campo **anda para trás** uma vez. Ponteiros, `workflow_state` e `next_action`
seguem coerentes — nada aqui bloqueia.

### Execução concluída — 2026-08-17: DoD provado item a item, e a revisão de UI custou mais que qualquer task

**As onze tasks fecharam, uma por commit** (`64bfc43`…`70e0129`), mais o passe de correção da
revisão de UI (`a71e11d`). As três emendas que o plano previa entraram na §11 da spec com o texto
que ele fixou — nenhuma emenda nova apareceu na execução.

**O DoD foi provado item a item, e não por ferramenta verde:**

| DoD | Prova |
|---|---|
| 1-2 · janela alcança só séries e rankings | 7 seções byte-idênticas entre janelas, medidas por API nas Tasks 6-7; a metade visual fechou no `/lotus-ui-review` (KPIs em 4/0/3/1/1(250 UF)/9 antes e depois da troca de preset) |
| 3 · janela invertida | 422 com `La fecha de término no puede ser anterior a la de inicio.`, tela **mantendo** o dado anterior |
| 4 · gate `null` | papel-sonda criado e removido por API: `redatores: null` some a tabela inteira, `series.uf_aprovada: null` some do gráfico **e** da legenda, `rankings.*.uf_aprovada: null` devolve zero barras e empty state |
| 5 · view do Redator | payload real capturado com `acting-as` e alimentado a sonda de render: 4 faixas, zero chave crua, zero `client`/`Cliente`, zero `UF`, `href=/perfil` presente. Confirmado depois no navegador, com sessão de verdade |
| 6 · 3 locales × 2 temas | sem chave crua nas 3 locales; `chart-tokens` verde; os 2 temas fechados na revisão de UI, com a troca repintando traço, barra e legenda sem recarregar — o motivo declarado de escolher SVG na D1 |
| 7 · régua da D8 | verde no HEAD; sonda de 200 linhas reprova (`File has too many lines (230). Maximum allowed is 150`); `--print-config` confirma o recorte `.tsx` |
| 8 · zero mutação | `COUNT(*)` nas 35 tabelas, 6 chamadas: `SEM MUTACAO`. O `+1 login_logs / +1 sessions` da primeira medição veio do **login**, não da travessia |
| 9 · escopo medido | `git diff main...HEAD -- backend/` e `-- generated.ts` vazios; Pint e `typescript:transform` **N/A por medição** |
| 10 · `/lotus-ui-review` | passo do João, `disable-model-invocation: true`. 10 achados, todos corrigidos e provados |

**Um desvio de procedimento, registrado e não escondido:** o Step 3 mandava criar o usuário-sonda
**pela UI**; sem navegador no momento, ele nasceu e morreu por `tinker` (`forceDelete`, sem redator
ligado), com papel e usuário conferidos como ausentes depois. A prova de comportamento é a mesma; o
caminho não foi o do plano.

**A revisão de UI achou 10, e os dois C eram leitura errada de número.** O `AppLineChart` fixava
`dot={false}`, e **série com um mês dentro de um gráfico de vários não desenhava nada** — três das
quatro curvas eram `M526,207.405Z`, e o eixo ia a 60 por causa das 55 matrículas que ninguém via.
Em 390px o CTA "Ir a Mi Perfil" saía do card **e da viewport**, sem rolagem que o alcançasse. Os
oito B e as medições de antes e depois estão no artefato, não aqui.

**A ativação do redator para a revisão é do João, não deste bloco.** A limitação 1 da spec §9
continua verdadeira sobre o fluxo (`CreateRedatorAction.php:20` segue criando `is_active=false`); o
que mudou é que a jornada do Redator foi percorrida com sessão de verdade, e isso fecha o aceite da
EAP 8.4.0 no ponto que o B1 não podia satisfazer.

**Três mecanismos tiveram de ser trocados durante o passe, os três por medição, e os três estão no
artefato:** `mt-auto` é letra morta contra o `[&_p]:m-0` do `AppCard`; a sombra de rolagem da tabela
nasceu invisível sob a linha opaca do Lara; e a barra de rolagem sempre visível é impossível neste
Chromium, que força overlay.

**Um desvio do Step 12, deliberado:** ele lista três paths no `git add`, e entrou um quarto —
`audits/2026-08-17-lotus-ui-review-dashboard-analitico-redator.md`. O motivo é o precedente que
este mesmo arquivo registra logo abaixo: o `/lotus-ui-review` do B1 rodou e **não deixou artefato**,
e o fechamento teve de anotar isso como divergência. O `report.txt` vive em `.artifacts/`, coberto
por `.gitignore:24-25`; o relatório é o que se versiona.

**Gate final:** `pnpm lint` exit 0, `pnpm build` verde, **44 arquivos / 262 testes** (baseline
39/223); bundle `index.js` de **1.264,48 kB para 1.672,59 kB** (gzip 350,52 → 464,97), que é o custo
do Recharts a partir do momento em que a Task 7 lhe deu consumidor. `backend/config/cors.php` (WIP
do João) fora de todo `git add`.

**Estado: `ready_for_review`.** `active_spec`, `active_plan` e `context_packet` **permanecem
preenchidos** — quem os arquiva é o `/fechar-sprint`. Próxima ação: revisão de código do bloco, por
instrução explícita do João; este commit **não** a inicia.

### Revisão de código — 2026-08-17: 4 achados, nenhum de lei, e uma classe repetida do B1

`/revisar-sprint` sobre `main..891bcdc` (16 commits, 50 arquivos). O estado passou por `reviewing`,
parou em `blocked` para a decisão do João, e voltou a `reviewing` com **os quatro achados
aprovados**. Todos corrigidos — o passe está registrado logo abaixo.

**Risco: BAIXO pelo gate binário, remedido e não herdado da spec** — `git diff main...HEAD -- backend/`
e `-- generated.ts` vazios, zero import de `primereact` fora de `shared/ui`, nada de Sanctum,
auditoria, RBAC ou documento legal. **Sem segunda lente do Codex**, que a skill só exige em alto
risco. Gate remedido nesta sessão: `pnpm lint` exit 0, `pnpm build` verde, **44 arquivos / 262
testes** — os mesmos números do fechamento.

**Órfãos: nenhum.** Os 13 arquivos novos têm consumidor; `recharts` tem importador; as 3 chaves i18n
novas existem idênticas nas 3 locales (658 chaves, zero divergência medida).

**Um falso positivo morreu na medição, e fica escrito para não renascer:** a sombra de rolagem do
UI-10 pinta as capas com `var(--surface-card)` e o `StudentDetailSections` põe `AppDataTable` dentro
de um `Dialog`, cuja superfície é `--surface-overlay`. Medido, `--surface-card` e `--surface-overlay`
são **o mesmo hex** nos dois temas (`#ffffff` / `#1e293b`) — não há banda de cor a aparecer, e o
alcance da mudança em `shared/ui` não é achado.

| Achado | Severidade | Esforço |
|---|---|---|
| Q-1 · o aviso de falha some para o admin sem seção analítica | 🟡 | P |
| Q-2 · a métrica UF é oferecida com o gate comercial fechado e o vazio mente | 🟡 | P |
| Q-3 · a âncora de meio-dia é copiada em 5 sítios, 2 deles novos | 🟡 | P |
| Q-4 · `retry` é campo sem consumidor nas duas variantes `ready` | 🟢 | P |

**Nada aqui viola as leis §5.** O relatório completo (trecho encontrado, versão alvo, princípio e
consequência) está na sessão.

### Passe de correção — 2026-08-17: os 4 achados aprovados, aplicados

**O João aprovou os quatro**, e os quatro estão corrigidos. O que mudou, achado a achado:

- **Q-1 — `admin/AdminView.tsx`.** A condição da seção de análise virou `temAnalise`, e o
  `InlineLoadState` do admin passa a existir também **fora** dela: quando não há `series` nem
  `rankings`, não há `PeriodFilter` — e era dentro dele que o único aviso de falha do ramo admin
  morava. Os dois sítios são mutuamente exclusivos, então nenhum papel vê o aviso duas vezes. O caso
  medido é o papel só com `identity.user.view`, que é `ready-admin` pelos alertas e tinha as duas
  seções nulas: um refetch falho ficava mudo e a tela seguia com dado velho.
- **Q-2 — `admin/RankingsPanel.tsx`.** `metricasDisponiveis(rankings)` remove a opção `uf_aprovada`
  quando **toda** linha a traz nula. Isso equivale exatamente ao gate comercial fechado:
  `rankingRows` preenche `'0.0000'` sempre que `includeUf` é verdadeiro
  (`AnalyticsQuery.php:319`), e `includeUf` é `$canCommercial` (`AdminDashboardAssembler.php:204`) —
  medido, não inferido. A seção deixa de renderizar "não pode ler" como "não há", e passa a falar a
  mesma língua do `SeriesPanel`, que já escondia a série de UF pelo mesmo gate. `turmas` é o valor
  inicial e nunca sai da lista, então não há estado apontando para opção inexistente.
- **Q-3 — `shared/lib/datetime.ts` + 5 sítios.** A âncora de meio-dia virou a função interna
  `meioDia`, e nasceu `formatIsoDate` ao lado do `formatMonthYear`, que agora a compõe. As cinco
  cópias morreram: `AgendaPanel`, `DashboardItemRow`, `admin/CompliancePanel`,
  `redator/PendenciasList` e `certification/.../ValidationPage` (esta mantém `formatDate` para
  `revoked_at`, que é timestamp e não data pura). Dois testes novos guardam a regra em
  `datetime.test.ts`, sem depender do fuso da máquina: a data ISO tem de cair no mesmo dia do
  calendário **local**, e o `new Date(iso)` cru só coincide com ela fora dos fusos a oeste.
- **Q-4 — `useDashboard.ts`.** `retry` saiu das duas variantes `ready`; repetir agora é oferecido
  só onde a tela oferece — `retry` no ramo `error` (`AppErrorState`) e `staleRetry` nos `ready`
  (`InlineLoadState`). O único consumidor do campo morto era o teste do BD-6, que passou a forçar o
  refetch pelo `queryClient.refetchQueries()` — o que o TanStack Query faz sozinho no produto
  (montagem, foco), e não uma porta que só o teste usava.

**Gate remedido depois das correções:** `pnpm lint` exit 0, `pnpm build` verde, **44 arquivos /
264 testes** (262 + os 2 do `formatIsoDate`).

**Estado: `ready_for_closure`.** Nenhum achado aguarda decisão ou correção. Próxima ação:
`/fechar-sprint`, por instrução explícita do João — a skill de review não fecha sozinha.

### Fechamento — 2026-08-17: o B2 fecha, e a P-45 vence o gatilho pela segunda vez

`/fechar-sprint` sobre `dashboard-frontend-analitico-e-redator`, com o estado em `ready_for_closure`
e sem argumento a conferir.

**Item 0 — o critério de aceite do bloco, remedido contra a API real e não pela suíte.** As duas
correções que mudaram comportamento observável mexem no mesmo lugar do DoD 4 (o gate `null` da D7),
então é ele que se reprova. Papel-sonda criado e removido por API, como o plano manda:

- **`sonda-cierre-op-cert`** (`operation.turma.view` + `certification.certificate.view`, **sem**
  comercial) → `rankings` presente com 4 cursos e 4 clientes, **`uf_aprovada` nula em todas**, e
  `series.uf_aprovada` nula. É o payload exato em que a métrica de UF era oferecida e devolvia
  empty state; agora a opção não existe.
- **`sonda-cierre-identity`** (só `identity.user.view`) → `series` e `rankings` **nulas**, todo KPI
  nulo, pipeline/agenda/compliance/redatores nulos. Com `alertas: []` a tela é `unauthorized` — e
  foi isso que a primeira medição devolveu. **Para provar que o Q-1 não era teórico**, um
  `valid_until` de documento de relator foi movido para dentro do horizonte e restaurado em seguida
  (doc 1, de `2028-08-10` para ontem e de volta): com **um** alerta, `nenhumaSecaoLegivel` é falso,
  a tela é `ready-admin` e as duas seções analíticas continuam nulas. O caso é alcançável, a
  correção não é código morto.

As sondas saíram: `users` com `sonda.cierre.b2@lotus.cl` = 0, `roles like 'sonda-cierre%'` = 0.

**Item 1 — `php artisan test`: ❌ registrado, e é a P-45.** `12 failed / 672 passed / 5 skipped`,
todos `RuntimeException: Session store not set on request.` Com
`FRONTEND_URL=http://localhost:5173 php artisan test`, **684 passed / 5 skipped, zero falha**. A
diferença é a variável, não o código: `tests/TestCase.php:18` manda `Referer` com o valor cru de
`FRONTEND_URL`, que no `.env` do João já é lista de duas origens. Números idênticos aos do
fechamento do B1 — **o gatilho da P-45 venceu**, e ela segue com o João, porque o fechamento de um
bloco de frontend não abre arquivo de backend.

**Itens 2 a 6.** Front: `pnpm lint` exit 0, `pnpm build` verde, 44 arquivos / 264 testes. Pint e
`typescript:transform`: **N/A por escopo medido** — `git diff main...HEAD -- backend/` e
`-- generated.ts` vazios, e nenhum DTO mudou. Código morto: o passe de correção **removeu** cinco
helpers locais e não criou nenhum; zero órfão no review. Leis §5: nenhuma contrariada — o único
`primereact` fora de `shared/ui` é `shared/config/primeLocale.ts`, que não é feature.
`backend/config/cors.php` ficou fora de todo `git add`, como em todos os commits deste bloco.

**Item 7 — pendências.** Dois gatilhos venceram e nenhuma pendência nasceu. A **P-45** ganhou a
segunda medição, nos dois sentidos. A **P-44** apontava para este bloco: ele fechou **declarando** a
residência pela D10 em vez de apagá-la, e as sondas do próprio gate não engrossaram a lista. A P-34,
única encerrada, **fica** — foi fechada dentro da Sprint 5, que só agora termina, e o rastro é de uma
sprint, não de um bloco.

**Itens 8 e 9.** Plano e spec arquivados (`plans/archive/`, `specs/archive/`), com as referências
atualizadas aqui e no `progress.md`. O `progress.md` voltou ao teto de dez entregas — as duas mais
antigas (BD-8 e BD-9, ambas de 2026-08-13) foram para o `progress-archive.md` **verbatim**. O item 2
do Sprint 5 saiu do `backlog.md`; **nenhum item foi promovido**.

**Estado ao fim do gate: `idle`**, com `state_basis_commit: 121ee1b` — o commit do passe de
correção, o último a provar a entrega. A Sprint 5 ficou sem bloco restante.

### Reconciliação do merge — 2026-08-17: duas linhas de história, um estado só

**O `idle` do parágrafo acima durou o que durou a branch.** O bloco B2 correu em branch enquanto o
`main` local recebia, no mesmo dia e sem passar pelo `origin`, a auditoria de `/perfil` e a promoção
do **BD-16** (`135e468` 13:46, `94b533d` 14:22, `254d691` 14:45). Quando o PR #57 entrou, as duas
linhas afirmavam coisas diferentes sobre a etapa atual — e o merge automático do GitHub
(`6d32609`) resolveu o `state.md` **pelo pior lado possível**: manteve os dois corpos, e trocou o
frontmatter pelo da `main` de meio-dia. O arquivo passou a documentar o fechamento do B2 às 19:00 e
a afirmar, no cabeçalho, que o último item fechado era o `meu-perfil-frontend` das 12:10.

**Resolvido à mão, sem heurística, no merge `origin/main` → `main`:** o **BD-16 é o item ativo**
(promovido explicitamente pelo João, plano escrito, `ready_for_execution`), o **B2 é o último item
fechado** (`last_completed_work_item`), e `state_basis_commit` fica em `135e468` porque é o commit
que prova o estado ATUAL — a promoção do item ativo —, não a entrega anterior. A escada de itens
fechados desceu um degrau e o sexto (`celula-de-identidade`, 2026-08-14) saiu do arquivo, como o
`falha-vs-lista-vazia` saiu quando o `meu-perfil-frontend` entrou.

**A lição é de mecanismo, não de disciplina:** `state.md` é arquivo de UMA verdade e o merge textual
não sabe disso. Duas frentes em paralelo com fronteiras duráveis no mesmo arquivo produzem
frontmatter auto-mesclado que ninguém escreveu — e ele fica **verde**, sem marcador de conflito.
Merge de branch que mexa em `state.md` pede leitura do frontmatter antes do `git push`.

## Trabalho fora de bloco — 2026-08-17 (revisão de UI do Dashboard e passe de correção)

**Isto não é um `active_work_item` e não muda `workflow_state`.** O estado segue `idle`,
`active_work_item` segue `null` e `state_basis_commit` segue `0afdb55`. A seção existe porque houve
escrita de código sem bloco promovido, e escrita não registrada é exatamente o que o
`/auditar-docs` volta a achar depois como divergência nova.

**Duas invocações do João, na mesma sessão.** Primeiro `/lotus-ui-review dashboard`, que é passo
dele por `disable-model-invocation: true`; depois, lido o relatório, a instrução de cruzar os
achados com a skill `frontend-design` e corrigir. Nenhum item do `backlog.md` foi promovido, nenhum
gate de `/planejar-bloco` correu, e não existem spec nem plano — **por decisão dele, não por
esquecimento do fluxo.**

**A divergência de registro que o fechamento do B1 deixou aberta fecha aqui.** O
`/fechar-sprint` de 2026-08-16 escreveu que o `/lotus-ui-review` daquele bloco "rodou mas não deixou
artefato em `docs/superpowers/audits/`". A execução de 2026-08-17 deixa:
`audits/2026-08-17-lotus-ui-review-dashboard.md`, com o `report.txt` verbatim, o passe de correção e
os números medidos antes e depois. A evidência bruta (13 capturas + 5 snapshots da revisão, 10 do
passe) fica em `.artifacts/ui-review/`, coberta por `.gitignore:24-25` — o relatório é o que se
versiona, não os PNG.

**A revisão não era redundante, e o próprio fechamento anterior dizia por quê:** `f38585e` tocou
`DashboardItemRow`, `KpiRow` e `PipelineFunnel` **depois** do commit da revisão visual `3273cbf`,
sem re-rodar os passos visuais do DoD. Medido agora, as cinco correções de 2026-08-16 se sustentam.

**6 achados B, 0 C, todos corrigidos.** Os números de antes e depois estão na §3.1 do artefato de
auditoria e não se repetem aqui. A tese de desenho que amarra o passe é uma só: **cor de sinal vive
em traço e marca; texto fica em contraste cheio** — é o que fecha a UI-04 na raiz, porque o tom sai
do número (onde precisava de 4,5:1 e entregava 2,86) e vai para o trilho (onde 3:1 basta e entrega
5,2–5,8).

**Três achados que não estavam no relatório apareceram ao corrigir e entraram junto:** a faixa do
`AppCardHeader` media 80px para 24px de texto em **todo card da aplicação**; a barra do funil
reprovava o 3:1 de elemento gráfico contra o próprio trilho nos dois temas; e dois sítios fora do
Dashboard pintavam texto com `var(--red-500)` cru a 3,52:1 — o caso que a **P-36** descreve.

**O alcance fora do Dashboard está declarado, não descoberto depois:** as quatro tintas de tom mudam
de valor em ~20 sítios; o `AppCardHeader` encurta nos 8 consumidores; `variant="stat"` também é do
`BudgetStatCard`, e a tela de orçamento foi conferida no navegador; o link de salto é do shell e
vale para toda rota protegida.

**Nasce a P-46**, e ela é a causa raiz da UI-02 que este passe **não** fechou: sem Preflight, toda
tag de bloco herda margem do agente do usuário. A neutralização foi feita onde custava e parou aí —
o reset escopado mexe no espaçamento de todas as telas de uma vez e é decisão do João.

**Branch `fix/dashboard-revisao-visual-2026-08-17`**, nascida de `main@18bf487`, oito commits de
código (`abff4be`…`2fc0bd8`) mais este de documentação, um por alteração. Gate: `pnpm lint` exit 0,
`pnpm build` verde, `pnpm test` **39 arquivos / 223 testes**. Zero mutação de dado.
`backend/config/cors.php` (WIP do João, o outro lado da P-45) ficou fora de todo `git add` — os
commits usaram paths exatos.

**Estado: `idle`.** O passe está entregue e o merge é decisão do João. O backlog não promove nada
sozinho.

## Quinto item fechado — 2026-08-17 (`meu-perfil-frontend`, Sprint 6 · Meu Perfil, bloco 2 de 2)

### Seleção — 2026-08-15

**Bloco restante da Sprint 6 (`backlog.md:64`), promovido explicitamente pelo João** com o estado
desta árvore em `idle` e `active_work_item` `null`. Três decisões dele fecharam o gate: correr **em
paralelo** com o `dashboard-frontend-central-controle`; a worktree **`fix-frontend`** com branch
nova a partir da `main`; e a rota **`context_required`**, como o backlog exige para a Sprint 6
inteira (`backlog.md:61`).

**O gate reprovou por motivo NOVO, e é a primeira vez em doze promoções.** As onze anteriores
(BD-1, BD-2, BD-7, BD-8, BD-9, BD-5, `login-fora-do-adr16`, `celula-de-identidade`,
`dashboard-backend-agregacoes`, `meu-perfil-backend-self-service` e
`dashboard-frontend-central-controle`) reprovaram porque o argumento era **título de seção**. Aqui o
argumento **trazia o slug** (`## Sprint 6 · Meu Perfil **meu-perfil-frontend**`); o que reprovou foi
**divergência de estado medida entre duas árvores**:

| Onde | Branch / commit | `workflow_state` | `active_work_item` |
|---|---|---|---|
| worktree `fix-frontend` | `main` `36faf44` | `idle` | `null` |
| main tree `/home/jvbat/projetos/lotus` | `feat/dashboard-frontend-central-controle` `1a56207` | `context_required` | `dashboard-frontend-central-controle` |

O `1a56207` promoveu o bloco B da Sprint 5 às **09:20:07**, 23 minutos depois do state desta árvore
(`08:57:58`), e **não chegou à `main`** — está um commit à frente, na branch dele. Nas duas leituras
o gate reprovava para `meu-perfil-frontend`: `idle` não é estado aceito, e o `context_required` do
main tree pertence a **outro** work item. A regra do `CLAUDE.md` §3 (divergência → PARE, não escolha
por heurística) foi aplicada como escrita: nenhum arquivo tocado antes da decisão do João.

### Exceção declarada à invariante de um `active_work_item` — quinta ocorrência, e a primeira frontend × frontend

**Existem dois itens ativos ao mesmo tempo, por decisão explícita do João em 2026-08-15**, e isto
está escrito porque a invariante do topo deste arquivo diz o contrário. As quatro anteriores
(BD-4 × BD-9, BD-5 × login, BD-6 × `celula-de-identidade`, e
`dashboard-backend-agregacoes` × `meu-perfil-backend-self-service`) eram backend × frontend ou
backend × backend. **Esta é a primeira em que os dois blocos são de frontend.**

**A P-03 não dispara, e o motivo é literal:** o gatilho da ficha (`pendencias/abertas.md:331-333`) é
"mais de um `active_work_item` de **backend**". Nenhum destes dois toca backend — os dois consomem
contrato já mergeado na `main` (`36faf44`, PR #53 e #54). **Mas a ausência do gatilho não significa
ausência de colisão**, e a colisão desta dupla é de outra natureza: as duas frentes escrevem no
**mesmo shell** `frontend/src/app/`.

**A sobreposição foi medida antes de escrever esta seção, não depois — quatro pontos:**

1. **`frontend/src/app/router/AppRouter.tsx` — colisão certa, 75 linhas, arquivo único.** As duas
   frentes acrescentam import no bloco 1-18 e rota no bloco 58-68. **A rota `/perfil` já existe**
   (`AppRouter.tsx:68`, hoje `<ModulePlaceholder titleKey="userMenu.profile" />`) e a `/` também
   (linha 58, `DashboardPage`) — cada frente substitui a **sua** linha. O conflito real é o bloco de
   imports, e é textual, não semântico: resolução mecânica no merge.
2. **`frontend/src/features/` — zero colisão, medida.** Tem cinco domínios (`catalog`,
   `certification`, `commercial`, `identity`, `operation`); **nem `dashboard` nem `profile`
   existem**. Cada frente cria a própria pasta. Onde exatamente o perfil nasce sob o ADR-05 é
   decisão do brainstorming — o backend dele vive em `App\Domains\Identity`, e `features/identity/`
   já existe.
3. **`frontend/src/shared/types/generated.ts` — zero colisão, e por mecanismo.** Os dois blocos são
   **consumidores**; nenhum regenera. Os dois backends já estão na `main`.
4. **`shared/ui/` — colisão possível, não medida ainda.** As duas frentes podem querer wrapper novo.
   Fica declarado como risco de merge, não como fato.

**Alternativa recusada por ele:** fechar o `dashboard-frontend-central-controle` primeiro, o que
manteria a invariante e eliminaria a colisão do `AppRouter.tsx` na origem, ao custo de o bloco não
começar hoje.

### Área de trabalho

**Worktree `fix-frontend`** (`/home/jvbat/projetos/fix-frontend`), branch
`feat/meu-perfil-frontend` criada de `main@36faf44` — o merge do PR #54, HEAD da `main`, que já
carrega o backend do bloco 1. O prefixo `feat/` segue o precedente de todas as branches do projeto;
o João nomeou o slug. A árvore estava limpa e em `main` antes do checkout.

**`state_basis_commit` passa de `d0430d0` a `36faf44`.** Não era divergência: com
`active_work_item` `null` não havia trabalho ativo cujo baseline pudesse ter derivado — mesmo
critério das quatro promoções anteriores.

### Superfície declarada do bloco, medida na abertura

**O contrato inteiro já está no repositório, e foram conferidas as seis entradas do bloco 1**
(`shared/types/generated.ts`):

| Tipo | Forma medida |
|---|---|
| `ProfileData` | 10 campos; `redator: RedatorProfileData \| null` |
| `ProfileUpdateData` | **2 campos** — `name`, `phone` |
| `ProfilePasswordData` | `current_password`, `password`, `password_confirmation` |
| `RedatorProfileData` | `documentos[]`, `cursos_habilitados: number`, `cursos: string[]` |
| `RedatorProfileDocumentData` | 8 campos, com `status: DocumentValidityStatus` |
| `DocumentValidityStatus` | `'vigente' \| 'vence_em_breve' \| 'vencido' \| 'ausente'` |

**Duas divergências nasceram desta medição, e as duas são de fonte viva — não de suposição:**

1. **O backlog promete mais do que o contrato entrega.** O `backlog.md:70-71` descreve o resumo do
   Redator como "cursos habilitados, **turmas atuais/próximas e pendências**". O
   `RedatorProfileData` tem `cursos_habilitados` e `cursos` — **turmas e pendências não existem**,
   porque o **corte D1** do bloco 1 as removeu por decisão do João (evitar aresta de `Identity` para
   `Operation`, esperando o bloco do dashboard). Não é lacuna a preencher por conta própria: ou o
   escopo do bloco 2 encolhe junto, ou alguém reabre a aresta. **Decisão do brainstorming.**
2. **Uma rule normativa ficou meio falsa, e a metade falsa é justamente a deste bloco.** O
   `.claude/rules/frontend-fsliced.md` afirma: *"Derivação de apresentação no front, não no DTO:
   status de documento e idoneidade se calculam no front."* O bloco 1 **inverteu isso** para o
   contrato de perfil (Drive §5 vence, `DocumentValidityStatus` calculado no backend). Medido nos
   dois DTOs: `RedatorProfileDocumentData` **tem** `status`; `RedatorDocumentData` (administrativo,
   intocado de propósito pelo bloco 1) **não tem**. A rule segue verdadeira no administrativo e
   falsa no perfil — é a **lição 13** com doc normativo vivo, e a emenda é tarefa deste bloco, não
   descoberta de fechamento.

**A porta de entrada da tela já está construída e não precisa nascer:** `UserMenu.tsx:22` já navega
para `/perfil` com `t('userMenu.profile')`, e a rota já está registrada sob o ramo protegido. O que
o bloco troca é o **conteúdo** do `ModulePlaceholder`.

**O gate visual é passo do João, não meu:** o bloco termina em revisão de tela e `/lotus-ui-review`
tem `disable-model-invocation: true`. Escrito aqui para não ser descoberto no fechamento, como no
`login-fora-do-adr16`.

**Risco de review projetado** pelo gatilho binário do projeto: **não regenera `generated.ts`**
(consumidor puro), **não toca backend**. Mas a tela **exibe e escreve no eixo de autenticação**
(troca da própria senha) e **exibe documento de peso legal com status de validade**. A
classificação final é do `/revisar-sprint`, não desta promoção.

### Context Packet — 2026-08-15: `ready`, e a validação virou medição em quatro frentes

Packet em `docs/superpowers/context-packets/2026-08-15-meu-perfil-frontend.md`, gerado pelo Codex
read-only com a skill `lotus-context-packet`. **Contrato conferido por medição, não aceito de
chegada:** marcadores exatos e nada fora deles; frontmatter com os 16 campos populados e
`plan_path`/`spec_path` corretamente em `null` (os ponteiros do estado eram `null`, e a skill proíbe
inventá-los); **8 key facts** — o teto exato; **802 palavras** de corpo contra o orçamento de 1.200,
contadas excluindo frontmatter e tabela de fontes como o contrato manda; `status: ready`,
`RECOMMENDED_TRANSITION: ready_for_planning`; nenhuma fonte marcada `unavailable`; e os cinco
staleness triggers todos semânticos, nenhum apontando para hash de proveniência ou para a própria
transição promotora — a armadilha que a skill documenta em §"Provenance versus staleness".

**Os três hashes de proveniência foram remedidos e batem byte a byte:** `base_commit`
`5ff2e7e134d5…`, `state_blob_sha` `503d5ca5…` e `progress_blob_sha` `d2bac2b4…`. Obtidos com
`git rev-parse`/`git hash-object`, não conferidos por semelhança.

**O Codex corrigiu a minha medição de novo, e no mesmo eixo do bloco 1.** Eu passei a frente
paralela como `1a56207` em `context_required` — medição minha, de 09:26. Ele mediu às 09:36 e achou
`cfee85c1` em **`ready_for_planning`**, com packet próprio já salvo
(`2026-08-15-dashboard-frontend-central-controle.md`, commit de 09:35). Conferido por
`git --git-dir` no main tree: a branch avançou nos nove minutos entre as duas leituras. É a segunda
vez que a instrução do prompt ("se não mediu, não escreva") devolve a correção na direção certa.

**Três afirmações foram verificadas contra a fonte pelo revisor, não aceitas pela citação:**

1. **"Sempre quatro slots" (key fact 3) confere no código, não na prosa.** `RedatorDocumentType`
   tem exatamente quatro casos (`CV`, `REUF`, `TITULO`, `POSTGRADO`) e
   `RedatorProfileData.php:48` projeta `RedatorDocumentType::cases()` — a lista não depende do que o
   redator subiu.
2. **A suspeita de lacuna nas EAP foi levantada e derrubada por medição.** O packet consumiu **3**
   das **9** páginas de Meu Perfil da base canônica, e o teto da skill é cinco artefatos externos —
   valia perguntar quais ficaram de fora. Buscadas na collection `e64b7d57-…` e abertas por ID: a
   "projeção resumida de idoneidade e atividade profissional" (EAP **8.5.3**), o "self-service
   seguro de documentos profissionais" (**8.5.6**) e os "testes de integração" (**8.5.8**) são
   **todas `Camada: Backend`**. As EAP de frontend da sprint são exatamente **8.5.4, 8.5.5 e
   8.5.9** — e ele consumiu as três. Nenhum gap.
3. **O critério de aceite que o packet atribui à 8.5.5 é verbatim dela.** A página
   (`3b1bc960-…-81e6`, `Camada: Frontend`, `ADR ref: ADR-05, ADR-06`) diz *"Admin não vê seção
   documental"*, *"alteração de senha exige fluxo próprio"* e *"loading/erro/vazio/sucesso, i18n,
   tema e responsividade seguem shared/ui"*. O packet não inflou o aceite.

**As duas divergências que a abertura levantou voltaram resolvidas com base declarada:** o resumo do
Redator (o Drive e a EAP 8.5.3 pedem turmas e pendências; o corte D1 as removeu do contrato, e a
instrução posterior do João vence) e a validade documental (o Drive §5 manda calcular no backend; a
linha da `frontend-fsliced.md` é genérica demais e vale só para o DTO administrativo). Nenhuma foi
resolvida em silêncio.

**Uma observação do revisor que NÃO vira emenda no packet, e fica aqui para o brainstorming:** o
sinal de aceite da 8.5.5 pede *"CTA para o Dashboard do Redator"*, e o Dashboard do Redator é
justamente a frente paralela — hoje a rota `/` ainda serve `DashboardPage` placeholder. O CTA não
está bloqueado (a rota existe), mas para onde ele aponta e o que promete é decisão de desenho, não
fato do packet. `status: ready` continua correto: nenhuma pergunta bloqueante sobrou.

**Estado: `ready_for_planning`.** Próxima ação: `/planejar-bloco` prossegue para `planning`
(brainstorming → spec → plano).

### Brainstorming e spec — 2026-08-15: cinco decisões, e a divergência de taxonomia virou débito nomeado

**Spec:** `docs/superpowers/specs/2026-08-15-meu-perfil-frontend-design.md`. Cinco perguntas abertas,
cinco respondidas pelo João; D6–D10 derivadas e declaradas como tais.

**D1 — layout de duas colunas com corte por mutabilidade.** Três formas foram desenhadas (empilhada,
abas, duas colunas) e a de duas colunas ganhou; o corte entre elas foi a segunda pergunta, porque era
ele que decidia se a esquerda ficava oca para o Admin. Cortar por *seção* deixava o Admin com uma
coluna que existe só para segurar uma foto; cortar por **mutabilidade** dá conteúdo real aos dois
papéis e faz a regra do bloco — o que é seu vs. o que o administrador controla — virar a regra
visível do layout. Custo aceito: o nome aparece nos dois lados.

**D2 — `useResourceState` é arquivo novo, `useLoadState` fica intocado.** O hook existente é tipado
`UseQueryResult<T[], …>` e sua razão de existir é a política "falhou" vs. "veio vazia" de uma LISTA.
Perfil é objeto único: não tem vazio. Generalizar mexeria nos seis consumidores por conveniência de
um sétimo caso que não é do mesmo tipo — e arquivo novo é também a opção de menor colisão com a
frente paralela, que pode adotá-lo depois.

**D3 — `ProfileDocumentSlot` é irmão, não reuso.** O slot administrativo deriva status no front
(`docStatus(valid_until)`), porque `RedatorDocumentData` não tem `status`; o do perfil consome
`RedatorProfileDocumentData.status` pronto. São duas fontes de verdade para a mesma pergunta, e
embutir as duas no mesmo componente é o que faria a tela mentir sob refactor.

**A divergência que o brainstorming mediu e o bloco NÃO conserta:** o mesmo REUF renderiza `sin_venc`
na tela administrativa e `vigente` no perfil, e um documento que vence em exatamente 30 dias é
`vigente` no front (`<` estrito, relógio de parede) e `vence_em_breve` no backend (`<=` inclusivo,
meia-noite). A raiz é `RedatorDocumentData` não ter `status` — correção de backend, declarada fora de
escopo pela D6 do bloco 1. Vira **débito nomeado na spec §10**, não emenda silenciosa. Pela mesma
razão, a linha da `frontend-fsliced.md` ("status de documento e idoneidade se calculam no front") é
hoje meia-verdade: vale para o DTO administrativo, não para o de perfil. Vira pendência de doc.

**O CTA que o packet deixou para o desenho foi resolvido:** aponta para `/`, que hoje serve um
`DashboardPage` placeholder (22 linhas, só `PageHeader`). O link funciona em qualquer ordem de merge;
se este bloco fechar primeiro, apenas leva a uma tela magra. Risco declarado, não bloqueio.

**Medições que mudaram o desenho, não confirmaram premissa:** `documentType.*` já existe nos três
locales e é reusado; `documentStatus.*` também existe, mas com a taxonomia ANTIGA (`sin_venc`,
`por_vencer`) — daí o namespace `profile.docStatus.*` próprio (D9), para não acoplar as duas telas a
uma régua que só uma usa. E `i18n.test.ts` protege a sincronia de `<html lang>`, **não** a paridade
de chaves entre dicionários: locale esquecido não reprova nada, e isso ficou declarado como risco de
gate na spec §8.

**Estado: `planning`.** Próxima ação: `writing-plans` produz o plano executável; só então
`ready_for_execution`.

### Plano — 2026-08-15: 11 tasks, executor Claude, e uma afirmação da própria spec corrigida por medição

**Plano:** `docs/superpowers/plans/2026-08-15-meu-perfil-frontend.md`. 11 tasks, 24 arquivos (22
criados, 4 modificados), 5 arquivos de teste novos. Ordem: `useResourceState` → i18n → camada de API
→ página com ramos de carga → as cinco peças de tela, cada uma acrescentando UMA linha de JSX à
página → gate/DoD/UI review.

**A correção que a medição impôs à spec já aprovada:** a §9 afirmava, herdando a
`.claude/rules/frontend-fsliced.md`, que teste de componente PrimeReact no jsdom está fora do corte
do runner. **Está dentro** — a medição são seis: `InlineLoadState`, `CourseStep`, `QuotesList`,
`BudgetDetailPage`, `TurmaDetailPage` e `ValidationPage`. É a **P-38**, já aberta desde o BD-12, que
manda a rule valer pelo que o `pnpm test` faz. A pendência **não fecha aqui** (o gatilho dela é tocar
a rule, e este bloco não a toca), mas a spec deixou de repetir a afirmação vencida e o plano ganhou
**um** teste de componente: `ProfileDocumentSlot`, escolhido porque o gate de `self_service` decide
se um documento de peso legal oferece envio. É a mesma classe de defeito que a spec do BD-6 já tinha
herdado — doc que descreve o corte por memória, não por medição.

**Duas coisas que o self-review do plano pegou contra a spec, não contra si mesmo:** (1) o rótulo do
botão documental tinha herdado o ícone mudo do slot administrativo, e a §6 exige "Enviar" vs.
"Reemplazar" — o texto é o único aviso de que substituir apaga o anterior, mesmo contrato do
`AppPhotoField`; (2) `profile.documents.noValidity` nascia órfã no dicionário, e passou a ser o que
o slot mostra quando o documento existe sem data de vencimento.

**Executor: `claude`.** O bloco é quase todo convenção local com lint por trás — `COR_HARDCODED`,
`DISABLED_READONLY` nas três grafias, `max-lines: 150` incidindo inclusive sobre arquivo de teste que
mora em `components/`, os três seletores de query-em-componente, `postMultipart` como único
transporte — e paridade de chaves em três locales que **nenhum teste protege**. O gate final é visual
e itera contra o navegador. Delegar aumentaria o custo de validação do diff sem baixar o de execução.

**Estado: `ready_for_execution`.** Próxima ação: `/executar-bloco meu-perfil-frontend`.

### Execução — 2026-08-15: início, técnica `executing-plans`

`/executar-bloco meu-perfil-frontend` validou as âncoras (spec, plano e packet no disco; Git limpo
na branch `feat/meu-perfil-frontend`; `active_plan` cobrindo o work item) e transicionou
`ready_for_execution` → `executing` no commit da Task 1. Técnica: `executing-plans` — o handoff do
plano já fixa `executor: claude` e o ambiente restringe o Agent tool a pedido explícito; as 11 tasks
têm dependência sequencial de montagem (cada seção volta a `ProfilePage.tsx`), sem paralelismo
genuíno a explorar.

**Task 1 (`useResourceState`) completa, com um bug de tipo que o plano não previu.** Vermelho medido
antes do código: `Failed to resolve import "./useResourceState"`. Implementação sem desvio da spec —
4 testes verdes no `vitest run`. Mas `pnpm build` (`tsc -b`) reprovou o teste literal do plano:
`Partial<UseQueryResult<T, ProblemDetails>>['error']` colapsa para `ProblemDetails | undefined`, sem
`null` — o union discriminado de `QueryObserverResult` não distribui do jeito que o literal do plano
assumia (`error: null` no terceiro caso). Isolado com repro mínimo fora do projeto antes de tocar o
arquivo real: `Partial<Omit<UseQueryResult<…>, 'error'>> & { error?: ProblemDetails | null }`
resolve, sem mudar nenhuma asserção do teste. Fica registrado no comentário do próprio arquivo de
teste, para não repetir a investigação num hook futuro que mocke `UseQueryResult` do mesmo jeito.
Gate: lint 0, build verde, suíte 37 arquivos / 190 testes.

**Tasks 2–10 completas**, uma por commit, na ordem do plano (`6f5a085`..`d4821d7`): i18n nos três
locales, camada de API, página com os ramos de carga na rota `/perfil`, e então as cinco peças de
tela — cartão de identidade com foto, `Datos personales`, `Seguridad`, slot e seção documental do
Redator, resumo profissional —, cada uma acrescentando **uma** linha de JSX à `ProfilePage`. Os
**5 arquivos de teste novos** que o plano previu existem (`useResourceState`, `useProfileForm`,
`useProfilePassword`, `useProfileDocuments`, `ProfileDocumentSlot`).

### Task 11 — 2026-08-16: gate verde, DoD provado, e o passo 4 do plano corrigido por medição

**Step 1 — gate:** `pnpm build` verde, `pnpm lint` com 0 erro e 0 warning, suíte **41 arquivos /
203 testes** contra a baseline de 36/186 — exatamente os 5 arquivos previstos.

**Steps 2 e 3 — DoD end-to-end contra a API real:** 6/6 no Admin e 6/6 no Redator, cada item
observado no navegador, não deduzido. Os dois que costumam passar por dedução foram medidos: **zero
input desabilitado ou `readOnly`** entre os 6 campos da tela do Admin (e-mail, RUT e papel são
texto), e **zero requisição de rede** na recusa do arquivo de 11 MB, conferida na aba Network — o
teto de 10 MB corta antes do transporte. Nenhum slot documental tem botão de excluir, em papel
nenhum.

**Step 4 — o ramo de falha, e a receita do plano estava errada.** Derrubar o backend
(`docker compose stop nginx`) **não** alcança o `AppErrorState`: `GET /api/me` morre junto e o
shell redireciona para `/login` antes de a página montar. O ramo se prova com falha **isolada** de
`/api/profile`, e assim foi provado — aviso inline ao lado do conteúdo, texto digitado preservado
através do Retry, recuperação quando o backend volta; e, com recarga durante a falha isolada,
`AppErrorState` substituindo a tela. Medição colateral: o `networkMode: 'online'` do TanStack Query
**pausa** a query com o browser offline, então a página remonta exibindo cache sem aviso nenhum —
offline de browser não serve como injeção de falha. A expectativa escrita do passo 4 foi corrigida
no próprio plano; o João mediu a mesma coisa independentemente (UI-06).

**Um defeito NOVO apareceu nessa medição, e a raiz é compartilhada — não nasceu neste bloco.** Sob
um 5xx **de corpo vazio**, o aviso inline não aparecia. Isolado por sonda temporária na página e
três testes de rascunho: `isError` verdadeiro, `loadError` presente, e ainda assim `null` chegando
ao componente — porque o valor era `''`. Raiz em `shared/api/axios.ts`: o `??` do interceptor só
pega `null`/`undefined`, então a string vazia virava a própria rejeição e o `InlineLoadState`
desistia no `!error`. Alcança **todas** as listas do projeto pelo `useLoadState`, não só o perfil.

### UI review — 2026-08-16: rodada pelo João, 7 achados, 2 classe C

`/lotus-ui-review` sobre `/perfil` em `d4821d7`, artefatos em
`.artifacts/ui-review/2026-08-16-1213-perfil/` (relatório + 20 PNGs). Cobertura: Admin e Redator,
três locales, dois temas, 1440/1024/390. **Resumo A:** o corte por mutabilidade da D1 é legível nas
três viewports; identidade, RUT, e-mail e papel como texto; Admin sem seção documental nem resumo;
quatro slots sempre projetados para o Redator, REUF administrativo, "Sin subir" nos ausentes,
substituição anunciada por rótulo e nenhum botão de exclusão; zero erro de console; zero requisição
repetida; nenhum overflow horizontal em 390px.

**Run NÃO conforme ao contrato read-only da skill, com autorização explícita do João:** a metade
Redator era inalcançável de outro modo (todo `type=redator` do seed está `is_active=0` e o
`UserProvisioner` grava senha aleatória). `users.id=2` (juan.morales@lotus.cl) recebeu
`is_active=1`, senha `senha123` e o papel `redator`, e **permanece assim**. Nenhuma escrita em dado
de negócio pela tela.

### Step 6 — 2026-08-16: 8 commits de correção, um achado por commit

Os 7 achados foram **verificados no código antes de virarem correção**, não aceitos pela descrição.
O João aprovou todos, incluindo os três que moram fora da feature.

| Achado | Correção | Prova |
|---|---|---|
| UI-01 (C) | `ProfileDocumentSlot` usa `formatDate` + âncora `T00:00:00` | "Vence el 10-08-2028" onde saía "8/9/2028"; teste novo pina o idioma da interface |
| UI-02 (C) | `AppPassword` pina a largura **também** no ramo sem `leftIcon` | input `113→357` dentro do cartão em 390px, onde vazava 42px |
| UI-05 (B) | `<form onSubmit>` + `autoComplete` nas duas seções | Enter envia (422 por campo vazio, sem mutação); console sem o aviso de DOM |
| UI-05 (B) | campo `username` oculto para o gerenciador de senhas | o segundo aviso do Chrome também some; console em 0/0 |
| — | `axios.ts` qualifica o corpo por **ser objeto** | guarda no interceptor real reprova com `expected '' to be truthy` se o `??` voltar |
| UI-03 (B) | `AppTag` pinta `secondary` neutro | "Sin subir" cinza nos dois temas, distinto das tags de curso |
| UI-04 (B) | grade de duas colunas só em `xl` | 1024px volta a uma coluna, com o self-service em largura cheia |
| UI-07 (B) | `AppPhotoField` centra o par e mantém o centro na quebra | es-CL e pt-BR deixam de trocar de arranjo |

**Gate re-rodado depois das oito:** build verde, lint 0, suíte **41 arquivos / 208 testes** (+5
asserções novas de guarda: 1 no slot documental, 4 no interceptor).

**Alcance declarado das correções de `shared/ui`:** `AppPassword` tem 5 sítios e só os 3 do perfil
mudam de comportamento; `severity="secondary"` tem 2 sítios e o outro é a tag de tipo de cliente da
`ClientsTable`, que também deixa de sair na cor da marca; `AppPhotoField` é o mesmo das telas de
pessoas.

**O que NÃO virou correção, e por quê.** `AppFileRow.tsx:42` tem a mesma classe do UI-01 (data no
idioma do navegador), mas o próprio review a declarou decisão fora do bloco: vira **D-18** no
`backlog.md`, agrupada no BD-10 junto do D-01, que é a mesma linha de arquivo. Como `created_at` é
timestamp completo, ali só o formato erra — o dia não volta.

### Emenda de doc — 2026-08-16: a rule que este bloco tinha de corrigir, e a pendência que veio junto

A `.claude/rules/frontend-fsliced.md` afirmava que "status de documento e idoneidade se calculam no
front". Verdade só na metade administrativa desde que o contrato de perfil existe: onde o DTO traz
`status`, o front **não recalcula**. A linha foi reescrita separando os dois contratos, com a
divergência REUF (`sin_venc` administrativo × `vigente` no perfil) declarada e não resolvida.

**Tocar o arquivo disparou o gatilho literal da P-38**, e ela foi encerrada no mesmo passo: a frase
"teste de componente com PrimeReact no jsdom segue fora do corte" foi trocada pelo corte **medido
com o runner** — 13 arquivos renderizam componente, **9 montam wrapper PrimeReact**
(`ValidationPage`, `BudgetDetailPage`, `CourseStep`, `QuotesList`, `TurmaDetailPage`,
`ProfileDocumentSlot`, `DetailHeader`, `IdentityCell`, `InlineLoadState`), 4 são DOM puro. Ficha em
`pendencias/encerradas.md`, índice e BD-12 atualizados.

### Resíduos declarados no banco de dev — não são achado novo, são rastro

1. `users.id=2` (juan.morales) segue `is_active=1`, `redator`, senha `senha123` — mutação do UI
   review, autorizada e **não revertida**.
2. Juan Morales ganhou um documento CV (`cv-e2e.pdf`) que não existia, do DoD do Step 3. Não há
   remoção self-service por desenho (spec D2), então ele fica.
3. O admin ficou **sem foto**: a demo foi substituída e depois removida na prova do Step 2. O
   `DemoPhotosSeeder` restaura. Senha, nome e telefone do admin foram restaurados e reprovados por
   login.

Os três seguem a mesma classe da **P-44** (gates de e2e deixam resíduo no banco de dev), que já está
aberta — não abre pendência nova.

**Estado: `ready_for_review`.** Working tree limpo, 18 commits na branch `feat/meu-perfil-frontend`
(`5ff2e7e`..HEAD), dos quais 10 de task, 8 de correção do gate visual e os de doc. A próxima
instrução do João aciona `/revisar-sprint`; este passo não inicia review.

### Revisão de sprint — 2026-08-16: alto risco, duas lentes, 6 achados e zero violação de lei

`/revisar-sprint` transicionou `ready_for_review` → `reviewing` e classificou o bloco como **alto
risco**: não regenera `generated.ts` e não toca backend, mas **escreve no eixo de autenticação**
(troca da própria senha) e **exibe documento de peso legal com status de validade**. A projeção da
abertura se confirmou, e a classificação acionou a **segunda lente do Codex** (read-only) sobre o
mesmo intervalo Git contra plano, spec e leis §5.

**Gate remedido, não citado:** `pnpm build` 0, `pnpm lint` 0, suíte **41 arquivos / 208 testes** —
bate com o que a Task 11 registrou.

**Órfãos: zero.** Todo hook novo tem consumidor, todo componente entra na `ProfilePage`, o
`useResourceState` está no barrel e é consumido pelo `useProfilePage`, e a paridade de chaves dos
três locales foi **medida** (581 chaves, 0 divergência) — justamente o que nenhum teste protege.
Nenhuma chave `profile.*` órfã entre as 36 criadas. Nenhuma dependência nova.

**Leis §5: nenhuma violada, e as duas de maior risco foram medidas.** `generated.ts` intocado nos 23
commits; nenhum import de `primereact` ou de outra feature sob `features/identity/**` — o
`ProfileDocumentSlot` recebe `FileUploadHandlerEvent` e `PreviewableFile` pelo reexport de
`shared/ui`, que é a porta.

**As duas lentes convergiram em quatro achados e divergiram em dois**, e as divergências foram
resolvidas por medição, não por autoridade:

1. **`refetch` que engole a promise** (`useResourceState.ts:31`) — o Codex a reportou; **derrubada
   na verificação.** O `useLoadState`, irmão e convenção vigente, faz o mesmo `void query.refetch()`
   e o docblock dele nomeia isso como idiom aceito. Divergir seria o achado, não seguir.
2. **`created_at` no idioma do navegador** (`ProfileDocumentSlot.tsx:89` via `AppFileRow`) — o Codex
   a reportou e ele próprio a identificou como **D-18**, já registrada no `backlog.md` pelo UI
   review. Decisão consciente registrada não é achado.

Os seis que sobraram entram no relatório ao João. Nenhum é 🔴: nenhum fere lei, lição ou ADR — o
mais caro é uma **divergência literal contra a spec §7** ("campos daquela seção desabilitados"),
reincidente em duas seções.

**Estado: `blocked`.** Só achado aprovado pelo João vira correção; depois o estado retorna a
`reviewing` e as checagens se repetem sobre o mesmo work item.

### Correções — 2026-08-17: os 6 achados aprovados pelo João, todos aplicados

**João aprovou Q-1 a Q-6 em bloco.** Nenhum achado foi diferido para o `backlog.md`.

| # | O que entrou |
|---|---|
| Q-1 | `disabled={pending}` nos 2 campos do `ProfilePersonalSection` e nos 3 do `ProfileSecuritySection` — a spec §7, que pedia isso literalmente |
| Q-2 | `detail` do fallback do interceptor passa a ser `common.unexpectedErrorHint`, a mesma chave que o `problemFromBlob` já usava para corpo não-parseável |
| Q-3 | `useProfilePhoto` zera a mutation IRMÃ antes de disparar a própria (`remove.reset()` no envio, `upload.reset()` na remoção); o envio saiu para uma função `enviar`, usada também pelo `onRetry` |
| Q-4 | `useProfileDocuments` deixou de ler o estado em voo da instância compartilhada: `mutateAsync` por chamada, lista local `emVoo` e erro local — `uploadingType` virou `uploadingTypes` |
| Q-5 | `AppPassword`: no ramo com `leftIcon`, `className`/`inputClassName` mesclados DEPOIS do spread, como no ramo sem ícone |
| Q-6 | `valid_until` removido das variables e do `postMultipart` em `useUploadProfileDocument` |

**A premissa do Q-4 foi medida contra o TanStack instalado, não deduzida.** Sonda temporária com
`useMutation` real e duas chamadas concorrentes numa instância: `variables` vira a da SEGUNDA com a
primeira ainda em voo (é o que reabilitava o slot errado), a `mutationFn` das duas roda e o
`onSuccess` da mutation dispara 2×, mas o **`onSettled` por chamada da primeira nunca dispara** —
`mutationObserver.mutate` faz `removeObserver` na anterior (build/modern/mutationObserver.js:58).
Isso **derruba a alternativa sugerida no próprio achado**: um `Set` alimentado por
`onMutate`/`onSettled` deixaria o primeiro slot desabilitado para sempre. `mutateAsync` devolve a
promise daquela chamada, que resolve sem observer; a invalidação segue na mutation e vale para as
duas. A sonda foi removida após medir.

**Guardas novas onde a correção tem comportamento a provar:** dois casos em
`useProfileDocuments.test.tsx` — envios simultâneos saindo da fila cada um no próprio término (o
segundo termina primeiro e o primeiro **não** reabilita) e falha do primeiro visível depois do
sucesso do segundo. O mock passou a devolver **uma promise por chamada**, que é o que permite
sobrepor os dois envios. Q-1, Q-2, Q-5 e Q-6 são supressão de superfície ou de string: não há
comportamento novo que uma guarda morda além do que a suíte já cobre (o `axios.test.ts:143` segue
verde — ele assere `toBeTruthy()`, não o texto).

**Gate após as correções:** `pnpm lint` 0, `pnpm build` 0, suíte **41 arquivos / 210 testes**
(+2), exit 0.

### Revisão de sprint — 2ª rodada, 2026-08-17: as duas correções que saíram com defeito

Risco inalterado (**alto**), então a segunda lente do Codex rodou de novo, sobre `df75d50..HEAD`.
Gate: lint 0, build 0, 41 arquivos / 210 testes. Órfãos zero — nenhuma referência sobrevivente a
`uploadingType`, `generated.ts` intocado, nenhum import de `primereact` ou cross-feature em
`identity/**`, nenhuma chave i18n nova. Leis §5 sem violação nova.

Q-1, Q-3, Q-4 e Q-5 saíram corretos, com as duas lentes concordando. **Q-2 e Q-6 saíram com
defeito, e os dois achados vieram do Codex** — verificados no código antes de aceitos, e nenhum
deles nascido do trabalho original: os dois nascem da rodada de correção.

**Q-7 — o docblock do `valid_until` afirmava a regra de domínio ao contrário.** O Q-6 escreveu
"quem declara validade é o administrador, e o redator declarar a própria fura a RN-09 (D5)", e a D5
do bloco 1 diz literalmente o oposto: *"`valid_until` segue aceito, e só nos três tipos permitidos.
Nenhum deles entra no gate da RN-09, que lê exclusivamente REUF."* Quem protege a RN-09 é o
`Rule::in(selfServiceValues())`, que barra o REUF por TIPO — validade de CV/TÍTULO/POSTGRADO é
capacidade suportada. O Q-6 não removeu superfície proibida, removeu superfície **ainda não usada**,
o que continua defensável; a justificativa é que não era. Pior: o comentário de
`useProfileDocuments.ts` já estava errado desde a execução, e o Q-6 o **copiou** para um segundo
arquivo em vez de medi-lo — lição 13 na regra que decide habilitação de turma. Os dois docblocks
foram reescritos, e a spec §4 ganhou a nota de que a rota aceita o campo e a tela é que não o
declara. (No relatório da rodada a tabela de contratos foi citada como §5; é **§4** — o código e a
emenda estão corretos.)

**Q-8 — a correção do Q-2 não tinha guarda.** O caso do fallback em `axios.test.ts` assere `status`
e `title` e **nunca** `detail`, que é o campo inteiro do achado: passava verde antes do Q-2, com
`error.message` em inglês, e passaria verde de novo se alguém revertesse. Corrige também o registro
acima, que afirmou não haver comportamento a guardar — havia.

**Q-9 — `AppPassword` acumulou quatro achados de largura sem nenhuma guarda.** C-2 (08-12), UI-01
(08-13), UI-02 e Q-5 (08-16), sempre a mesma forma, e a quarta encontrada por leitura. A rule já
carregava o texto ("pine o override após o spread"); faltava o mecanismo, mesma lacuna do D-08.
Ganhou `AppPassword.test.tsx`: os dois ramos, sob `inputClassName` do chamador.

**As duas guardas novas foram vistas reprovar contra o código antigo** (reversão pontual, medida,
revertida): com `detail: error.message` o caso do fallback falha em
`expected 'Request failed with status code 502' not to be 'Request failed with status code 502'`;
com o `className` antes do spread no ramo com ícone, o teste falha em
`expected 'uppercase p-password-input…' to contain 'w-full'`. O ramo sem ícone segue verde na mesma
reversão, que é o esperado — ele já estava correto desde o `a5f748c`.

**Gate após a 2ª rodada:** lint 0, build 0, suíte **42 arquivos / 213 testes**. Esta rodada não
mudou comportamento de produção — só comentário, doc e teste —, então as checagens pertinentes se
esgotam no gate e na medição das guardas.

**Estado: `ready_for_closure`.** Nenhum achado pendente de decisão ou correção. O fechamento não é
executado automaticamente.

### Fechamento — 2026-08-17: o critério de aceite provado no navegador, e a suíte de backend que estava vermelha por env

**O passo 0 do gate não foi herdado do DoD da Task 11, e não podia ser:** aquele DoD mediu o bloco
**antes** das nove correções, e seis delas mudam comportamento de produção. A prova foi refeita
contra a API real — **26/26 verificações**, nos dois papéis, em es-CL, num Chromium de verdade
dirigido por CDP (o Node 22 tem `WebSocket` global, então não entrou dependência nova no projeto), com
o frontend **desta** worktree em `:5174` e a API em `:8080`. Cada uma das seis correções foi
exercitada no ramo que ela mudou, não por proximidade:

| Correção | Como foi provada |
|---|---|
| Q-1 | PUT `/api/profile` e `/api/profile/password` **pausados no interceptor**, e os 5 campos medidos `disabled` com a escrita em voo |
| Q-2 | 5xx **de corpo vazio** rendeu "No se pudo procesar la respuesta del servidor." — o `detail` do fallback, não a string inglesa do axios |
| Q-3 | upload de foto falhado deixa erro na tela; disparar a remoção o **zera**, medido com o DELETE segurado em voo |
| Q-4 | dois uploads concorrentes, o **segundo liberado primeiro**: só o slot dele reabriu, o primeiro seguiu travado até o próprio término |
| Q-5 | largura do input de senha medida em px — 719, igual à do irmão de texto e igual à do formulário |
| Q-6 | o multipart carrega `type` e `file` e **nada de `valid_until`**; 201 nos dois envios |

**Três falhas intermediárias apareceram nessa prova e as três eram do harness, não do produto** — o
que só se soube porque cada uma foi lida até a causa em vez de contornada. O locator subia para fora
do `<label>` e devolvia o mesmo input para dois rótulos; a presença da seção documental estava sendo
medida por TEXTO, e o subtítulo da página já diz "tu documentación profesional" em qualquer papel; e o
`Fetch` estava pausando o **preflight OPTIONS**, não a escrita, o que explicava de uma vez o corpo
vazio e o `[204,204,201,201]`. **A quarta é a que mais valia:** injetar `Access-Control-Allow-Headers:
*` derrubava o preflight, porque em modo credenciado o `*` do CORS é lido **literalmente** — e com o
preflight reprovado tudo caía no ramo `!error.response`, que já era traduzido **antes** do Q-2. A
prova do Q-2 tinha passado pelo motivo errado, e a evidência disso era o texto: saía
`common.loadErrorHint`, não `common.unexpectedErrorHint`. Duas strings diferentes que compartilham a
tradução (`networkErrorHint` e `loadErrorHint` são a mesma frase em es-CL) quase esconderam isso.

**A suíte de backend abriu vermelha — 12 falhas — e a causa é local, não do bloco.** Todas as 12 são
de login, com `RuntimeException: Session store not set on request`: o Sanctum não tratou a request
como stateful, então `StartSession` nunca rodou. A raiz é `tests/TestCase.php:18`, que injeta
`Referer: env('FRONTEND_URL')` — e o `.env` do main tree virou **lista com vírgula**
(`http://localhost:5173,http://localhost:5174`), para o CORS multi-origem que ainda está
**descommitado** lá (`config/cors.php` com `explode`). O header sai com a lista inteira e não casa com
domínio nenhum. **Provado por medição:** com `FRONTEND_URL` valendo uma URL só, a suíte fecha em **684
passed / 5 skipped / 0 failed**. Nada disso é deste bloco — ele tem **zero** arquivo em `backend/` —,
e nem é rastreado: `.env` e `phpunit.xml` não estão no Git, então nenhum commit poderia tê-lo causado
nem consertado. **O container que mede é o `lotus-app-1`, que monta o main tree — e o main tree está
em `main`**, logo o vermelho medido é o da `main`, não o desta branch.

**Fica como candidata a pendência, não escrita por conta própria:** o código commitado assume
`FRONTEND_URL` com **uma** URL nos dois lados (`cors.php` embrulha num array de um elemento;
`TestCase` a usa como header único), e um `.env` com lista reprova 12 testes sem dizer por quê. Quem
decide se isso vira ficha é o João — e há razão extra para não escrever agora: os arquivos de
pendência desta árvore já divergem da `main`, que encerrou a **P-34** por lá.

**Gatilhos de pendência conferidos um a um, e nenhum venceu neste bloco.** A **P-37** pede bloco que
*toque* o `FormField`; este o consumiu e não o modificou. A **P-34** tinha o gatilho do shell, mas foi
**encerrada na `main`** pela frente paralela, que ligou a catraca de cor em `src/app`. A **P-32** pede
a lição 13 reincidindo **por classe** — o Q-7 é lição 13, mas de outra espécie: docblock que afirma
regra de domínio ao contrário, não classe citada que não existe, e a guarda de path não teria como
pegá-lo em nenhuma das duas formas. A **P-03** segue sem disparar: o gatilho é *backend* em paralelo.
A **P-38**, encerrada dentro deste bloco, cumpre a sprint de rastro **agora** e sai no próximo
fechamento, pelo precedente da P-26.

**Higiene medida, não presumida:** zero arquivo PHP no diff (Pint não se aplica — e ele nunca roda sem
argumento), `generated.ts` intocado nos 34 commits e nenhum DTO alterado (`typescript:transform` não
se aplica), zero `.gitkeep` órfão, nenhuma chave `profile.*` órfã entre as 36, nenhum sobrevivente de
`uploadingType` no singular, e nenhum import de `primereact` ou de outra feature sob
`features/identity/**`. As ocorrências restantes de `valid_until` no front foram lidas uma a uma: são
o caminho **administrativo** (`useRedatorDocuments`, `RedatorDocumentSlot`), a **exibição** da
validade no slot do perfil — que lê o campo, não o envia — e os dois docblocks corrigidos pelo Q-7.

**Resíduo declarado no banco de dev:** a prova do Q-4/Q-6 subiu dois documentos reais para Juan
Morales (`cv-fechamento.pdf` e `titulo-fechamento.pdf`), e não há remoção self-service por desenho
(spec D2), então eles ficam. As provas do Admin **não** gravaram nada — nome, telefone e foto foram
reconferidos por `GET /api/profile` depois de tudo, porque cada escrita foi abortada no interceptor de
propósito. Mesma classe da **P-44**, já aberta; não abre pendência nova.

**O que fica aberto, e é a única coisa que fica:** a **`main` avançou 21 commits** enquanto este bloco
corria — o PR #55 mergeou o `dashboard-frontend-central-controle` —, então esta branch está atrás e
**9 arquivos foram tocados pelas duas frentes**: `AppRouter.tsx`, os 3 locales e 5 docs de
`superpowers/` (backlog, state, e os três de pendências). A colisão do `AppRouter.tsx` é a que a
abertura deste bloco previu e mediu: bloco de imports, textual, resolução mecânica. Os docs exigem
mais cuidado que o router, porque as duas frentes rodaram a mesma cascata de `state.md` e a mesma
rotação do `progress.md` — e o `encerradas.md` precisa terminar com **P-34 e P-38**, não uma no lugar
da outra. **Nada disso é fechamento; é merge**, e é trabalho a fazer.

**Estado: `idle`.** `state_basis_commit` passa a `e103178`, o commit que prova a entrega fechada; a
próxima ação é escolha explícita do João no `backlog.md`. Nenhum item foi promovido — o backlog não
promove sozinho e a instrução atual não nomeou o seguinte.
### Integração — 2026-08-17: merge da `main` (fechamento do `dashboard-frontend-central-controle`)

**A `main` andou 30 commits desde o `36faf44` de onde este bloco partiu** — o PR #55 fechou o
`dashboard-frontend-central-controle` em 2026-08-16, e em 2026-08-17 entrou ainda o passe de
correção da revisão de UI do Dashboard, que não é bloco. As duas frentes correram em paralelo por
exceção declarada (a quinta, e a primeira frontend × frontend), então este merge é a costura
prevista, não uma surpresa.

**Merge, não rebase, e a razão é documental:** rebase reescreve todo SHA da branch, e o fechamento
deste bloco **cita SHAs** — `state_basis_commit: e103178` e a linha do `progress.md` com o intervalo
`5ff2e7e..e103178`. A prova da entrega passaria a apontar para commits inexistentes. O segundo
motivo é a forma dos conflitos: os arquivos que colidiram são os que o fluxo escreve em quase todo
commit, então rebase replayaria a mesma colisão de `state.md` dezenas de vezes, e cada resolução
intermediária seria um estado que **nunca existiu** — o oposto da invariante de fronteira durável.

**Cinco conflitos: quatro de documento e um de código.** Documento: `state.md`, `progress.md`,
`pendencias/README.md`, `pendencias/encerradas.md`. Código: `AppRouter.tsx`. Auto-mergearam
`backlog.md`, `pendencias/abertas.md`, `progress-archive.md` e os três locales.

**O conflito de código era o previsto na abertura, e fechou um placeholder:** a `main` moveu o
`DashboardPage` de `@app/pages/DashboardPage` para `@app/pages/Dashboard/` (a central de controle
virou pasta), e este bloco trocou o `/perfil` de `ModulePlaceholder` por `ProfilePage`. Resolvido
com o caminho novo da `main` e a rota real deste bloco. Consequência medida: **`/perfil` era o
último consumidor do `ModulePlaceholder`** — o import saiu (senão o lint reprova) e o componente
`frontend/src/app/pages/ModulePlaceholder.tsx` ficou **órfão**. Não foi deletado aqui: código morto
alheio se menciona, não se apaga num merge. O comentário do `AppRouter` que promete guarda de rota
"quando páginas reais substituírem os `ModulePlaceholder`" também venceu — não há mais nenhum.

**P-38 e P-34 fecharam em paralelo, uma de cada lado, e as duas ficam.** A tabela de encerradas do
índice unia formatos divergentes (a deste lado tinha coluna `Como`, a da `main` tinha `Sai em`);
ficou com as duas colunas, sem descartar informação de nenhum lado. As duas saem no próximo
`/fechar-sprint`, cumprida a sprint de rastro.

**A contagem de abertas do índice vinha errada dos dois lados, desde a base.** `36faf44` declarava
`Abertas (29)` com 31 linhas na tabela; a `main` declarava `(30)` com 32; esta branch, `(28)` com
30. O merge grava o número **contado** — **31**, conferido contra as 31 fichas de `abertas.md`, com
zero ID de diferença entre índice e fichas. Não é achado deste bloco nem da frente paralela: é
deriva herdada, e é exatamente a classe que a P-32 e a regra de "medir a própria população com o
seletor dela" existem para pegar.

**A candidata a pendência que o fechamento deixou para o João já existe na `main`:** o
`TestCase.php:18` lendo `FRONTEND_URL` cru contra um `.env` que virou lista é a **P-45**, aberta
pela frente paralela. Nada a registrar; a decisão segue sendo do João.

**O `progress.md` estourou o teto de dez ao unir as duas frentes** — cada lado rotacionou a mesma
linha mais antiga (BD-3) e depois somou entregas: uma daqui, duas de lá, dando doze. As duas mais
antigas (`2026-08-13 · Auditoria · BD-8` e `2026-08-13 · Identity/Commercial · contrato de entrada`)
desceram **verbatim** para o `progress-archive.md`, que vai a 58 linhas. A cascata deste arquivo
rotaciona um degrau e o `falha-vs-lista-vazia` (BD-6) sai como sexto — a narrativa dele vive no git
e no `progress-archive.md`.

**`last_completed_work_item` fica em `meu-perfil-frontend` por medição, não por preferência:** o
`dashboard-frontend-central-controle` fechou em 2026-08-16 14:22 (`4a0f08b`) e este em 2026-08-17
11:21 (`7afe2be`). `state_basis_commit` segue em `e103178`, o commit que prova a entrega fechada
mais recente, e continua sendo ancestral desta árvore.

**Gates remedidos pós-merge, não herdados:** `pnpm lint` exit 0; `pnpm build` exit 0; `pnpm test`
**45 arquivos / 250 testes**, a união das duas frentes (esta branch trazia 42/213). Backend
**684 passed / 5 skipped (2537 asserções)**, idêntico ao medido no fechamento — o merge não trouxe
**nenhum** arquivo de `backend/`, e a suíte só passa com `FRONTEND_URL` de uma URL só, que é a P-45.
