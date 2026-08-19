# Pendências abertas

> Ficha por pendência. O índice com bloco e gatilho de cada uma está em [`README.md`](./README.md);
> as fechadas, em [`encerradas.md`](./encerradas.md). **Nada aqui é achado novo para a
> `auditar-docs`.** Cada ficha carrega o diagnóstico medido, o motivo de ter ficado aberta e o
> gatilho — pendência sem prazo vira mentira permanente (lição 13).
>
> **Agrupar em bloco não promove nem autoriza nada.** A linha `**Bloco:**` diz com quem a pendência
> sai barata, e o bloco só existe no `backlog.md`, que nunca promove sozinho.

---

# Frontend

## P-46 — sem Preflight, toda tag de bloco carrega margem do agente do usuário

**Bloco:** — · **Gatilho:** o João decidir se um reset escopado entra, ou o terceiro bloco que
gastar tempo neutralizando margem de UA à mão. Revisar em **2026-10-31**.

O `frontend/src/index.css:1-9` omite o Preflight do Tailwind **de propósito**, para o reset global
não sobrescrever a estilização do PrimeReact. A decisão está registrada e tem motivo. A consequência
não estava: todo `h1`–`h6`, `p`, `ul` e `ol` da aplicação herda a margem do agente do usuário, que é
**proporcional ao tamanho da fonte**.

**Medido na revisão de UI de 2026-08-17, em dois sítios de custo diferente:**

- `KpiRow` — o número em `text-3xl` recebia `margin: 30px 0` (1em de 30px), o que somava
  75–95px de área morta por card e empurrava as duas listas do Dashboard para fora da dobra em
  1024x768 e 390x844. É a UI-02 do relatório.
- `AppCardHeader` — o `h3` recebia `margin: 16px 0`, e a faixa media **80px de altura para 24px de
  texto**, em TODO card da aplicação. Não estava no relatório; apareceu ao corrigir.

**O sintoma é conhecido do repositório desde antes.** O `PageHeader` crava `my-[0.83em]` no `h1` com
o motivo escrito no docblock ("o projeto não carrega o Preflight"), e os `ul` do Dashboard, do funil
e da agenda carregam `m-0 list-none p-0` à mão. São três grafias do mesmo remédio, aplicadas caso a
caso, e ninguém as conta.

**Não se conserta de carona.** O passe de correção de 2026-08-17 neutralizou onde custava — `[&_p]:m-0`
no `AppCard variant="stat"`, `m-0` no `h3` do `AppCardHeader`, no `h2` da faixa de seção e no `h4` da
janela da agenda —, e parou aí de propósito. Um `@layer base` com
`h1,h2,h3,h4,h5,h6,p,ul,ol { margin: 0 }` fecharia a classe inteira, mas mexe no espaçamento de
**todas** as telas de uma vez, num passe que não tem como medir todas; e contradiria o `PageHeader`,
que crava a margem justamente para a correção semântica ficar invisível. Um mini-Preflight escopado
aos nossos elementos (sem tocar em form controls, que é o que quebra o PrimeReact) é o desenho
provável, e é decisão do João.

## P-45 — o `TestCase` lê `FRONTEND_URL` cru, e o ambiente já é lista de origens

**Bloco:** — · **Gatilho:** o commit que ligar multi-origin de verdade (o `config/cors.php` com
`explode` já está no working tree do João), ou o próximo `/fechar-sprint` que encontrar a suíte
vermelha por este motivo. Revisar em **2026-10-31**.

`backend/tests/TestCase.php:18` faz `$this->withHeader('Referer', env('FRONTEND_URL',
'http://localhost:5173'))`. A variável passou a ser **lista separada por vírgula**
(`backend/.env:38`: `http://localhost:5173,http://localhost:5174`), então o `Referer` sai com a
string inteira, o host não bate com `sanctum.stateful` (`.env:37`) e o
`EnsureFrontendRequestsAreStateful` não injeta o `StartSession`. `$request->session()` explode em
`AuthController.php:47` e a rota devolve **500**.

**Medido no `/fechar-sprint` de 2026-08-16, nos dois sentidos:** com o `.env` como está,
`php artisan test` dá **12 failed / 672 passed / 5 skipped** — os 12 são `AuthTest` (6), troca de
senha (3) e `StaffUserCrudTest` (3), todos com `RuntimeException: Session store not set on request.`
Com `FRONTEND_URL=http://localhost:5173 php artisan test`, **684 passed / 5 skipped, zero falha**. A
diferença é a variável, não o código.

**Não é regressão do bloco que a encontrou:** o `dashboard-frontend-central-controle` é frontend
puro (`git diff main...HEAD -- backend/` = 0 linhas). O `.env` é gitignored, então a mudança não
aparece em `git status`; o que aparece é a outra metade do mesmo WIP, o `config/cors.php` trocando
`[env('FRONTEND_URL', …)]` por `explode(',', env('FRONTEND_URL', …))`. **`TestCase.php` é o terceiro
sítio que lê a variável e o único que ainda a trata como valor único.**

**Medido de novo no `/fechar-sprint` de 2026-08-17 (B2), com os mesmos números:** `12 failed / 672
passed / 5 skipped` com o `.env` como está, `684 passed / 5 skipped / zero falha` com
`FRONTEND_URL=http://localhost:5173`. **O gatilho venceu** — este é o segundo fechamento que
encontra a suíte vermelha por este motivo, e o segundo bloco de frontend puro a encontrá-la
(`git diff main...HEAD -- backend/` = 0 linhas nos dois).

**Não se conserta aqui:** o fechamento de um bloco de frontend não abre arquivo de backend. O fix
provável é um `explode` + `[0]` (ou o `Referer` vindo de `sanctum.stateful`), e ele pertence ao
commit que fecha o multi-origin — decisão do João.

**Medido de novo no `/fechar-sprint` de 2026-08-19 (`identity-ativacao-acesso-redator`), e desta vez
a suíte saiu VERDE:** `710 passed / 5 skipped, 0 failed`. A diferença não é conserto — é o `.env`:
`FRONTEND_URL=http://localhost:5173` voltou a ser **valor único** (o gate da emenda o apontou para a
5174 e o restaurou), e a lista de origens vive hoje só em `SANCTUM_STATEFUL_DOMAINS`
(`localhost:5173,localhost:5174,localhost:8081`). Os três sítios seguem como estavam:
`tests/TestCase.php:18` lê a variável crua e `config/cors.php:22` continua
`[env('FRONTEND_URL', …)]` — o `explode` do WIP do João **nunca foi commitado**. **O gatilho não
venceu aqui** (nenhum fechamento encontrou a suíte vermelha por isso desta vez), e a pendência segue
aberta pelo mesmo motivo: ela reaparece no dia em que a variável voltar a ser lista.

## P-40 — o ramo "catálogo genuinamente vazio" não foi remedido contra HEAD

**Bloco:** BD-12 · **Gatilho:** fecha quando um bloco puder esvaziar o catálogo de dev sem tinker
bloqueado — seeder de cenário, endpoint de teste ou o João rodando o comando —, ou quando o
ambiente nascer com catálogo vazio por outro motivo e a tela puder ser medida de graça. Revisar em
**2026-10-31**.

O ramo foi medido ao vivo **em `d20bebc`** e não depois dos cinco commits de correção que fecharam o
review do BD-6.

A Prova B (Task 6, passo 7 do plano) rodou na execução: soft-delete dos 4 cursos, tela dizendo "No
hay cursos." **e não** a mensagem de falha, restauração conferida (`vivos=4 trashed=0` antes e
depois). No `/fechar-sprint` (2026-08-14) as outras provas foram **refeitas** contra HEAD, porque
`501d98c`, `08cb01a`, `baf08e9`, `1ba7dbb` e `4c7b61b` mexeram exatamente no ramo de falha — e esta
não pôde: o `php artisan tinker --execute` foi recusado pelo classificador de auto mode, e **não há
substituto pela API** (o índice de cursos não aceita filtro e o wizard filtra client-side,
`frontend/src/features/commercial/hooks/useQuoteCourseSearch.ts:15`, então 200 vazio legítimo não se
produz sem fabricar resposta). Decisão do João no fechamento: fechar com a pendência em vez de
segurar o bloco.

**O que substitui a remedição é leitura de código, não outra medição:** o predicado mudou de casa
sem mudar de forma (`!isError && isSuccess && data.length === 0`, hoje em
`frontend/src/shared/hooks/useLoadState.ts:32`) e o ramo `if (courses.isEmpty)` do `CourseStep` está
byte a byte igual ao que foi medido — o que os commits trocaram foi o gate ANTERIOR (`isError` →
`failedWithoutData`), que não dispara quando não há erro. Mais os dois testes que afirmam a
separação (`CourseStep.test.tsx:76` e `:51`). É argumento, e argumento é o que o item 0 do gate não
aceita no lugar de prova.

---

# Backend

## P-29 — corrida de unicidade entre transações ainda sobe 500

**Bloco:** BD-14 · **Gatilho:** fecha quando um 500 de cadastro por RUT/e-mail duplicado for
observado em uso real (aí a frequência justifica o contrato de erro), ou quando um bloco tocar
`ProblemDetails`/`ValidationMessages` por outro motivo e puder absorver a conversão. Revisar em
**2026-10-31**.

Duas escritas concorrentes com o mesmo RUT ou e-mail colidem no índice único de `users` e sobem
**500**, não 422.

O BD-2 (`integridade-e-concorrencia-backend`, 2026-08-11) moveu o check de unicidade para **dentro**
da `DB::transaction` nos três sítios medidos (`UpdateStaffUserAction`, `UpdateClientAction`,
`UpdateRedatorAction`), o que fecha a janela entre o check e a escrita da **mesma** transação.

**Atualização de 2026-08-13 (BD-9):** os dois métodos que o texto original nomeava —
`ensureRutAvailable`/`ensureEmailAvailable` — não existem mais; a porta única é
`UserProvisioner::ensureIdentityAvailable`, e os nove caminhos de escrita passam por ela. Isso
**não** move o gatilho: o BD-9 unificou e agregou o 422, não fechou a corrida entre transações
distintas.

O que segue aberto, por recusa explícita registrada na spec (D3): o `SELECT` de unicidade não trava
linha inexistente, então dois cadastros simultâneos do mesmo RUT passam os dois pelo check e o
perdedor estoura no índice único como `QueryException`, que o handler RFC 7807 devolve como 500
mascarado. Converter violação de índice em 422 exigiria capturar `SQLSTATE 23000` e reescrever o
erro por coluna, decisão de contrato de erro que a spec preferiu não tomar dentro de um bloco de
concorrência. Proporcional a ~10 usuários internos: a colisão exige dois cadastros do mesmo RUT no
mesmo segundo.

## P-35 — o ADR-17 é defendido em duas profundidades

**Bloco:** BD-14 · **Gatilho:** fecha quando um bloco tocar `CreateQuoteAction`/`Quote` por outro
motivo e puder absorver a simetria, ou quando um payload de cotação com `seq_in_budget` for
observado. Revisar em **2026-10-31**.

`course_certificate_templates.version` saiu do `$fillable` e só a Action a escreve, enquanto
`CreateQuoteAction` segue gravando `seq_in_budget` por **mass assignment**.

Nasceu no bloco `rastro-unicidade-e-gates` (2026-08-12; entrou como P-34 no fechamento e virou
**P-35** ao mesclar a `main`, que já tinha publicado a P-34 da catraca de cor): a D10 tirou `version`
do `$fillable` justamente porque payload que chega com o número não pode vencer a derivação sob
lock — e o `seq_in_budget`, mesmo padrão do mesmo ADR, continua aceitável por mass assignment.
Estava no ledger de execução como achado aberto e **não** entrou nos seis achados do
`/revisar-sprint`, então nunca foi triado.

Não é bug vivo: nenhum payload de cotação envia `seq_in_budget` hoje e o `unique` do banco recusa o
par repetido — o que fica é a assimetria, que faz o próximo leitor do ADR-17 copiar a forma mais
fraca.

---

# Documentação e mecanismo

## P-20 — `openspout/openspout` em produção sem ADR hospedeiro

**Bloco:** BD-15 · **Gatilho:** fecha quando o João apontar o ADR hospedeiro (ou autorizar ADR-20).
Revisar em **2026-09-30**.

Achado na re-auditoria do doc-sync 2026-07-30 (Task 14): `backend/composer.json` declara
`openspout/openspout ^5.3`, usado em `SpreadsheetRowReader.php` (Bloco 6c, import xlsx/csv). Decisão
real de biblioteca em produção, sem registro em `docs/adrs.md` — é decisão de arquitetura, não fato
a corrigir sozinho.

**Gatilho anterior venceu em 2026-08-10:** o bloco `documentos-oficiais-template-e-docx` tocou
`docs/adrs.md` e o João decidiu o formato **para o caso dele** — nota no ADR-12 existente, não ADR
novo, porque a rota LibreOffice é a segunda porta do mesmo Gotenberg. Isso resolve a forma, não o
conteúdo: `openspout` não tem ADR hospedeiro óbvio (não é decisão de PDF nem de transporte), e
escolher onde encaixá-lo é a mesma decisão de numeração que o agente não toma.

## P-21 — `simple-qrcode` gera o QR do certificado sem nota no ADR-12

**Bloco:** BD-15 · **Gatilho:** fecha no primeiro bloco de Certification que tocar `docs/adrs.md`.
Revisar em **2026-09-30**.

Achado na re-auditoria do doc-sync 2026-07-30 (Task 14, 3a rodada): `backend/composer.json` declarava
`simplesoftwareio/simple-qrcode ^4.2` sem nenhum uso no código e sem ADR — dependência de peso legal
instalada antecipadamente, mesmo padrão de gap do P-20.

**Gatilho venceu em 2026-08-07:** a lib passou a ser usada de verdade — `CertificatePdfService::html()`
gera o QR (`QrCode::format('svg')->size(180)`) embutido em base64 no certificado, provado no PDF real
do gate de fechamento. A dependência deixou de ser antecipada e virou decisão em produção **sem
registro**.

**Parcialmente resolvida em 2026-08-10:** o João decidiu no bloco `documentos-oficiais-template-e-docx`
que registro de biblioteca nova entra como **nota no ADR existente do mesmo eixo**, não ADR novo.
`simple-qrcode` tem hospedeiro óbvio — o QR nasce dentro do `CertificatePdfService`, ADR-12. Falta só
escrever a nota; não se escreveu naquele bloco porque o QR não estava no escopo dele, e nota de ADR
em bloco alheio é exatamente o alargamento de escopo que o gate recusa.

## P-23 — `progress.md` perdeu a coluna `Contexto`

**Bloco:** BD-15 · **Gatilho:** fecha na próxima vez que o João decidir o formato do `progress.md`
(restaurar a coluna ou declarar a mudança no cabeçalho). Revisar em **2026-09-30**.

`docs/superpowers/historico/progress.md` perdeu a coluna `Contexto` que o `progress-archive.md`
mantém — a linha do bloco não aponta para o packet na própria coluna, só dentro do texto de
"Referências".

Achado da re-auditoria de fechamento de 2026-07-30 (`progress.md:7`
`Data | Entrega | Status | Resultado | Referências` vs `progress-archive.md:6`
`... | Contexto | Plano | Spec`). É mudança de formato, não erro de fato: ou a coluna volta, ou o
cabeçalho do doc declara que o formato mudou de propósito — decisão do João, não do agente. Ficou de
fora do doc-sync 2026-07-30 por escolha explícita dele no gate de fechamento.

## P-32 — a guarda da lição 13 confere path, não classe

**Bloco:** BD-15 · **Gatilho:** fecha quando a lição 13 reincidir por **classe** e não por path — a
reincidência é o dado que falta para desenhar a guarda sem falso-positivo —, ou quando um bloco de
hardening de doc a trouxer para o escopo. Revisar em **2026-10-31**.

`frontend/tests/repo-docs-refs.test.ts` não pega o caso que a motivou: classe citada **sem** `/`.

**Nasceu como segunda `P-28` em 2026-08-11** (ID duplicado com o fundo do certificado) e foi
renumerada para P-32 no `/fechar-sprint` de 2026-08-12, por decisão do João — as menções a "P-28" na
narrativa do BD-1 em `docs/superpowers/state.md` são desta linha, e ficam como estão porque história
não se reescreve.

A guarda confere **path**: `pareceCaminho()` exige prefixo conhecido (`backend/`, `src/`, `docs/`…)
ou barra mais extensão. `LibreOfficeConverter`, a terceira reincidência da lição 13 (Q-5 de
2026-08-10: classe que nunca existiu, citada numa nota do ADR-12), passa **verde** — provado por
sonda no `/fechar-sprint` de 2026-08-11, com `docs/adrs.md` citando a classe e os 14 testes do
arquivo passando. Ampliar a guarda para além de path foi decisão consciente da spec (§6, fora de
escopo), tomada **antes** de a lacuna ser medida contra o caso motivador.

Conferir todo identificador PHP/TS entre crases contra o repositório é a forma óbvia e tem
falso-positivo caro: a doc cita classe de vendor, classe planejada e nome de conceito.

## P-39 — o plano do BD-6 afirma que `GET /api/courses` não tem RBAC, e tem

**Bloco:** BD-15 · **Gatilho:** fecha quando um bloco tocar RBAC de catálogo ou reusar a receita de
injeção de falha do BD-6 — aí a premissa é relida e corrigida na fonte que for reusada. Revisar em
**2026-10-31**.

O plano escreve que a rota "não tem middleware de permissão (`app/Domains/Catalog/routes.php:11` — só
`auth:sanctum`), então não há 403 a provocar por RBAC". Medido no `/fechar-sprint` do BD-6
(2026-08-14), lendo `backend/app/Domains/Catalog/Http/Controllers/CourseController.php:19` —
`new Middleware('permission:catalog.course.view', only: ['index', 'show'])`. A frase do plano
(`docs/superpowers/plans/archive/2026-08-14-falha-vs-lista-vazia.md:51-52`) olhou só a linha do
`apiResource` e concluiu do arquivo errado: as rotas do domínio realmente não carregam permissão,
mas o `HasMiddleware` do controller carrega.

**Não invalida nenhuma prova do bloco:** para o frontend, 403 e rota inexistente entram no mesmo
ramo (`isError` com `data` vazio ou em cache), e o gate injetou a falha por redirecionamento de XHR,
que é mais barato de reverter que revogar permissão de um usuário real. O que fica errado é a
premissa escrita — quem a reler vai acreditar que o catálogo é legível por qualquer autenticado.

Plano e spec **não** foram retro-editados, pela regra que a P-27 fixou em 2026-08-10 e que sobreviveu
ao encerramento dela: história de bloco fechado não se reescreve — a divergência ganha nota no
`progress.md` da entrega, não emenda no artefato aprovado.

## P-43 — `der-fisico.md` lista `certificates` como "planejada", e a tabela existe desde a Sprint 4

**Nasceu como P-41 no fechamento do `dashboard-backend-agregacoes` e foi renumerada no merge com a
`main`**, que já usava o ID pelo fechamento da `celula-de-identidade` — quem renumera é a recém-chegada.

**Bloco:** BD-15 · **Gatilho:** fecha no primeiro bloco que tocar `docs/der-fisico.md` por outro
motivo — a correção é de quatro linhas e não vale um bloco só dela. Revisar em **2026-10-31**.

A spec do `dashboard-backend-agregacoes` já previa esta pendência na sua §10 ("candidata a pendência
no fechamento se ainda não registrada"); o fechamento de 2026-08-15 conferiu que não estava, e
mediu os sítios:

- `docs/der-fisico.md:87` — `courses` 1:N → … "e (planejada) `certificates`";
- `docs/der-fisico.md:91` — "`enrollments` 1:1 → `certificates` (planejada)";
- `docs/der-fisico.md:99` — "**`certificates`** (planejada): sem arquivo por aluno";
- `docs/der-fisico.md:110` — a contagem "26 tabelas — 19 de domínio (16 implementadas +
  `certificates`, …)" põe a tabela do lado do que ainda não existe.

A linha 74, que descreve as colunas, está correta e não fala em "planejada" — a divergência é só
nos quatro sítios de status. A tabela foi entregue na Sprint 4 (Bloco 7) e este bloco agrega
diretamente sobre ela (`Certificate`, `CertificateStatus`, `scopeEmitidos`), com o
`DomainDependencyTest` declarando as duas arestas. Diverge o **status escrito**, nunca o schema.

## P-44 — os gates de e2e criam usuário de sonda no banco de dev e nem sempre o removem

**Nasceu como P-42 e foi renumerada pelo mesmo motivo e no mesmo precedente da [P-43](#p-43).**

**Bloco:** BD-15 · **Gatilho:** fecha quando um bloco puder reseedar o banco de dev, ou quando a
residência atrapalhar uma medição de verdade (o bloco B do Dashboard é o primeiro candidato: a tela
vai mostrar estes nomes). Revisar em **2026-10-31**.

Medido no `/fechar-sprint` de 2026-08-15, no `users` do banco de dev: onze linhas de sonda de gates
anteriores sobreviveram ao bloco que as criou — `gate.fechamento@lotus.cl` (id 76),
`e2e.gate.a/b/r1/r2` (77–80), `e2e.gate2.a/b/r1/r2/staff/d` (82–89) e `gate-bd9@gate.cl` (89). Duas
delas são `type=redator` e **aparecem na carga do dashboard** como "E2E Gate Redator 1" e
"E2E Gate Redator 2", com zero turma — dado de sonda entrando em seção de produto.

Nada disso é regressão deste bloco: as suas próprias sondas (3 roles `GATE-SIN-*` e 3 usuários)
foram removidas no mesmo gate, com `users`, `roles`, `role_has_permissions` e `model_has_roles` de
volta aos números exatos do snapshot (79/3/70/5). O que falta é o mecanismo — a receita de e2e
declara a limpeza como passo do gate, e passo de gate depende de quem executa lembrar.

**O gatilho apontava para o bloco B do Dashboard, e ele fechou em 2026-08-17 sem apagar nada** — a
**D10** da spec do B2 decidiu declarar a residência em vez de removê-la, e as duas sondas apareceram
na carga de redatores como previsto. As sondas do próprio B2 (dois papéis `sonda-cierre-*` e um
usuário, criados e removidos dentro do gate de fechamento) **não engrossaram a lista**: `users` com
`sonda.cierre.b2@lotus.cl` = 0 e `roles like 'sonda-cierre%'` = 0 depois do gate.

**Não se deleta agora:** linha alheia de bloco fechado se menciona, não se apaga — a decisão de
reseedar o dev é do João.

**Rastro do `identity-ativacao-acesso-redator` (2026-08-19):** o gate da Task 14 daquele bloco criou
`gate.task14@lotus.cl` (user 58 / redator 8) e o deixou vivo; o `/fechar-sprint` o **removeu**, com
`users` de 58 para 57 e `redatores` de 8 para 7, porque era sonda criada por ESTE bloco. Foram
removidos junto os dois `password_reset_tokens` deixados pelos gates dele (`admin@lotus.cl`,
`gate.task14@lotus.cl`). As onze linhas de gates anteriores continuam intactas — são de blocos
fechados.

## P-47 — os redatores do seed não têm a role `redator`, e o bloco que a criou só a atribui adiante

**Bloco:** BD-15 · **Gatilho:** o bloco que puder reseedar o banco de dev (mesmo gatilho da
[P-44](#p-44)), ou o primeiro gate `permission:` aplicado sobre rota de redator — é quando a falta
deixa de ser cosmética. Revisar em **2026-10-31**.

Medido no `/fechar-sprint` de 2026-08-19: dos 7 redatores do `OperationDemoSeeder`, **nenhum** carrega
a role `redator` que o `RolePermissionSeeder.php:38` define. O bloco `identity-ativacao-acesso-redator`
fechou as duas portas por onde a role passa a ser atribuída — `CreateRedatorAction` (cadastro novo) e
`SendRedatorAccessInvitationAction` (reenvio de convite, o achado **Q-1** do review) —, mas nenhuma
delas alcança linha que já existe no banco sem convite reenviado. Provado na própria prova e2e deste
fechamento: `juan.morales@lotus.cl` (user 2) saiu de `roles=[]` para `roles=[redator]` **só** depois do
`POST /api/redatores/1/invitation`; o estado foi restaurado ao fim do gate, e os 7 seguem sem role.

**Não é defeito do código entregue, e não é o mesmo caso da P-44.** A P-44 é sonda de gate que
sobreviveu; esta é **dado de seed que nasceu antes do mecanismo existir**. Hoje não impede nada — o
gate do Dashboard é por `user.type` (`DashboardController.php:37`), não por role —, e em produção o
caminho de remediação existe e está provado (reenviar convite atribui a role). O que falta é decidir se
o seed de dev passa a nascer com a role, e isso vem junto da decisão de reseedar.

---

# Travadas em decisão do João

## P-02 — retenção da auditoria nunca decidida

**Gatilho:** antes de subir para produção.

ADR-08 (pruning/retenção da auditoria) segue **aberto**. Política de retenção nunca decidida;
`audits` cresce sem poda.

## P-33 — `login_logs` guarda dado pessoal sem política de retenção

**Gatilho:** fecha junto com a P-02, ou antes de subir para produção.

`login_logs.ip_address` e `login_logs.user_agent` são dado pessoal. Bloco `last-login` (BD-7,
2026-08-12): o log é append-only por desenho e o volume não é o problema (~10 usuários internos) — a
retenção é. Fica junto da **P-02**, aberta pela mesma razão para `audits`.

**Nasceu como segunda `P-30` e foi renumerada no `/fechar-sprint` do BD-3 (2026-08-12)**, pelo mesmo
precedente que renumerou a segunda `P-28` para `P-32`: a linha do `ámbar-aviso` entrou na `main`
primeiro (PR #41, commit `e6460f9`) e esta chegou depois (`656175c`), então quem renumera é a
recém-chegada. As menções a "P-30" na narrativa do `last-login` em `docs/superpowers/state.md` são
desta linha e ficam como estão — história não se reescreve.

## P-05 — migrations "adicionais" não consolidadas

**Gatilho:** antes de subir para produção.

Decisão do João no Bloco 2 — evitar inchaço do folder.

## P-03 — compose por worktree não existe

**Gatilho:** fecha na primeira sprint que precisar de **dois blocos de backend em paralelo**
(condição verificável em `state.md`: mais de um `active_work_item` de backend), ou em
**2026-10-31**, o que vier primeiro.

Bloco de backend não pode usar `using-git-worktrees` — o stack monta o main tree e o teste rodaria
contra o código errado. **6a (Sprint 3) rodou em main-tree sem atrito — abordagem confirmada.** O
gatilho anterior ("se a concorrência passar a doer") era não verificável e escapou do grep de prova
do doc-sync 2026-07-30 por diferença de redação — trocado por condição observável na revisão do
mesmo dia (Q-6).

**Custo medido fora do backend em 2026-08-13** (BD-4, `catraca-max-lines-e-moldura`): a worktree não
pôde subir stack própria, dependeu do main tree — que naquele momento servia branch alheia com
`/api/students` em 500 — e o bloco **de frontend** perdeu dois passos de gate (e2e do 422 e checagem
visual), pagos só em parte no `/fechar-sprint`.

**Contraprova medida em 2026-08-13** (BD-5, `usecrudform-mais-fundo`, mesmo arranjo de duas execuções
em paralelo): o e2e do S3 rodou inteiro contra o main tree, porque `git diff main...HEAD -- backend/`
naquele tree estava **vazio no momento da prova** — o custo da P-03 não é constante, é contingente ao
que a branch alheia toca, e a prova só é válida com essa conferência feita na hora. O que mudou é que
a falta já cobra de quem a P-03 dizia não afetar.

**Primeiro bloco de BACKEND rodado em worktree linkada — 2026-08-19, `identity-ativacao-acesso-redator`,
por decisão explícita do João declarada na abertura.** O arranjo que segurou a execução, os dois gates
de prova e este fechamento foi **override efêmero de portas fora do repositório** (nginx 8081, MySQL
3308, MinIO 9002/9003, Mailpit 8025, Vite 5174 no gate da emenda), com o compose do worktree subindo
projeto próprio (`fix-frontend`) e, portanto, **volume de banco próprio** — a disputa que a ficha
previa (um MySQL só para as duas árvores) não chegou a acontecer. No `/fechar-sprint` a stack do main
tree estava **desligada**, então a prova e2e correu nas portas padrão (8080/3307/8025) sem override
nenhum. **Não fecha:** compose por worktree continua não existindo, e o que existe é receita manual
que depende de quem executa lembrar — a decisão de construí-lo é do João. O gatilho formal
(dois blocos de **backend** em paralelo) segue sem vencer: houve um só.

## P-30 — o `warning` segue com o laranja de stock do Lara

**Gatilho:** fecha quando o João decidir que o `warning` quer âmbar próprio (aí vira task de tema,
com medição de contraste nas quatro superfícies e guarda de drift no molde da D5'), ou quando um
bloco de design tocar as paletas de severidade por outro motivo e puder absorvê-lo. Revisar em
**2026-10-31**.

A §4 da spec de `estilizacao-adr16-shell-tipografia` prometia `ámbar-aviso` (`#D97706`) como sexto
token da paleta; o construído tem **cinco** donos de cor de marca.

**A divergência de doc já está resolvida** (achado Q-7 do review, 2026-08-12): `#D97706` não aparece
em `frontend/src/`, a §4 foi corrigida para descrever o construído e a decisão virou a emenda
**D-P16** do plano. O que fica aberto é **design**, não doc.

As paletas de severidade (info/sky, success, warning, danger, secondary/slate) ficam intactas de
propósito — a camada de marca transforma só a família da primária, como o comentário de
`frontend/scripts/generate-brand-theme.mjs` declara, e o script não tem nenhum hex laranja ou âmbar
em mapa algum. A regra é por **família**, não por severidade: onde o Lara pintou severidade com o
azul, a camada varreu junto (a mensagem `info` do claro tem borda celeste e texto no degrau 700,
achado da D-P14) — `warning` sobrevive porque é laranja, não porque foi poupado por ser severidade.

Trocar o laranja do Lara (`#f97316` em botão, tag e badge e `#cc8925` na mensagem `warn` no claro;
`#fb923c` e `#eab308` no escuro) por um âmbar de marca exige régua de contraste própria em botão,
tag, mensagem e badge nos dois temas — decisão que ninguém tomou, e que não cabia num bloco cuja
emenda ao ADR-16 é "camada de marca **sobre** o Lara".

## P-28 — o fundo do certificado não reproduz as cunhas nem separa a página 2

**Gatilho:** fecha quando o fundo passar a distinguir página 1 das seguintes **e** as cunhas
existirem (por raster recomposto ou CSS), ou quando a Lotus aprovar o documento como está. Revisar em
**2026-09-30**.

O certificado renderizado não reproduz duas coisas do `docs/templates/certificado.pdf`: (a) as cunhas
diagonais azul/preta das quinas da página 1, e (b) a página 2, que na nossa saída herda as faixas
azul/preta das bordas e no aprovado é cinza limpo.

Achado do gate visual de `documentos-oficiais-template-e-docx` (2026-08-10), **não** coberto pelas
exclusões aceitas da §7 da spec (assinatura da gerente, carimbos SENCE/NCH, ornamentos das quinas do
manual). Causa medida: as cunhas são **vetor** dentro do PDF aprovado e o raster versionado
(`fundo-certificado.jpg`, Task 1) só carrega o que é imagem — extraí-lo não as traz; e o
`background-repeat: repeat-y` da `.page` existe de propósito, para a página 2 não sair branca, mas
repete a faixa junto.

**Decisão do João no gate (2026-08-10): aceitar agora, tratar depois** — o documento está legível,
correto e com o conteúdo de peso legal íntegro; o que falta é ornamento. Corrigir reabre as Tasks 1 e
3 (recompor o fundo, ou reproduzir as cunhas em CSS, e separar o fundo da primeira página do das
seguintes).

## P-41 — o `IdentityCell` empilhado promete truncar e não trunca

**Gatilho:** fecha quando o João decidir que a coluna deve cortar — aí volta o `min-w-0` **e** o
teste vira medição de comportamento (largura fixa no pai, `scrollWidth > clientWidth`) —, ou quando
uma tabela real mostrar a coluna alargada em uso. Revisar em **2026-10-31**.

O bloco de texto de `frontend/src/shared/ui/IdentityCell/IdentityCell.tsx` é
`<div className="flex flex-col gap-2">`, sem o `min-w-0` que o plano do bloco escrevia. Item de flex
tem `min-width: auto`, então o `overflow-hidden`/ellipsis do `truncate` nunca dispara — nos 13 sítios
da célula.

Achado **Q-2** do `/revisar-sprint` de 2026-08-14 (`celula-de-identidade`), **rejeitado pelo João no
mesmo dia**: a edição é dele, à mão, depois do plano ("deixe como está, eu que fiz as alterações").
Consequência medida e aceita: nome ou e-mail longo alarga a coluna em vez de cortar.

O docblock do componente ainda diz "a forma empilhada trunca" e o `IdentityCell.test.tsx` conta
`span.truncate` — prova a **classe**, não o comportamento (lição 10, cobertura fantasma), então a
regressão inversa também passaria verde.

**Nasceu como `P-38` em `docs/pendencias.md` na branch `feat/celula-de-identidade` e foi renumerada
no `/fechar-sprint` de 2026-08-14**, no precedente exato que renumerou a segunda `P-30` para `P-33` e
a segunda `P-28` para `P-32`: a reorganização da pasta (PR #51) chegou à `main` primeiro e já usava
`P-38` para outra pendência, então quem renumera é a recém-chegada. As menções a "P-38" na narrativa
do `celula-de-identidade` em `docs/superpowers/state.md` são desta ficha e ficam como estão —
história não se reescreve.

## P-42 — a grafia construída do `IdentityCell` diverge da D1 da própria spec

**Gatilho:** fecha quando o D1 for reescrito com a grafia construída e o motivo (ou quando o código
voltar ao D1). Candidato natural: o próximo bloco que tocar tipografia de tabela. Revisar em
**2026-10-31**.

`IdentityCell.tsx` usa `font-semibold` no título (D1: `font-medium`), `text-sm font-medium` na
descrição (D1: `text-xs`) e um `gap-2` entre as duas linhas que o D1 não previa.

Achado **Q-3** do `/revisar-sprint` de 2026-08-14, **rejeitado pelo João** ("eu que mudei, deixei
como está"). O D1 foi decidido no brainstorming como "grafia vencedora — a dos três de `identity`" e
a decisão nova é dele, tomada com a tela na frente; o que fica aberto é só o **registro**: a spec
`specs/archive/2026-08-14-celula-de-identidade-design.md` segue descrevendo a grafia planejada, e o
`state.md` do bloco registrava apenas o `<p>`→`<span>` da edição à mão.

O `gap-2` × N linhas muda a altura de toda tabela que usa a célula, então não é detalhe cosmético
invisível.

**Nasceu como `P-39` e foi renumerada pelo mesmo motivo e no mesmo precedente da [P-41](#p-41).**

---

# Travadas em decisão da Lotus

## P-08 — RF-CUR-04 promete Manual por curso; implementado é Blade única

**Gatilho:** se o contratante pedir manual personalizado por curso.

Bloco 6d (2026-07-21, spec D6, respaldo em `modulo-operacao.md`): o manual de classe é uma Blade
única (`operation/manual-turma`) renderizada com os dados atuais para o Gotenberg, não materializado.
Schema não tem `course_manual_templates`. YAGNI: ~10 usuários, um formato padrão basta.

## P-09 — Figma mostra 4 tipos de documento de turma; implementados são 3

**Gatilho:** se a Lotus confirmar que quer os 4 tipos.

O protótipo mostra Manual, Pruebas/evaluaciones, Lista de asistencia e Acta de cierre; implementados
são `MANUAL`/`PRUEBAS`/`EVALUACION_REDATOR`.

Bloco 6-frontend (2026-07-21, decisão D6 da spec
`specs/archive/2026-07-21-bloco6-frontend-operacao-design.md`): a taxonomia de RN-16 tem peso legal
(define quando a turma habilita) e não se muda no escuro — o front renderiza os 3 do backend; os
rótulos extras do Figma eram exploratórios.

**Ficou mais barato em 2026-08-10** (`turma-habilitacao-listagem`): a lista canônica dos tipos
obrigatórios saiu de dois pontos de uso para `TurmaDocumentType::values()`, consumido pela relação
`Turma::documentacaoObrigatoria()` e pelo `TurmaHabilitacaoService` — o service **não** precisa mais
mudar, e o custo do enum virou uma linha. A decisão de negócio segue com a Lotus.

## P-10 — coluna CLIENTE da tabela de alunos foi omitida

**Gatilho:** se a Lotus pedir alunos de múltiplos clientes na mesma turma, expor `client_name` em
`EnrollmentData`.

Bloco 6-frontend (2026-07-22, Exec 2): `EnrollmentData` não expõe campo cliente e o cliente da turma
é único (já aparece no cabeçalho da página de detalhe). Implementação consciente seguindo spec §3
Operação. YAGNI para ~10 usuários com alunos de 1 cliente por turma.

## P-13 — Figma mostra código próprio de turma; implementado renderiza `quote_code`

**Gatilho:** se a Lotus pedir identificador próprio de turma (aí vira task de backend, não de UI).

O protótipo mostra a coluna CÓDIGO com identificador próprio (`TR-45`…`TR-42`); implementado renderiza
`quote_code` (`Scap 3 - Cot 1`).

Bloco 6b (spec D7): turma se identifica por relacionamento. **Gatilho anterior venceu no bloco visual
(2026-07-27) e produziu a decisão D8:** a coluna já existia (`TurmasTable.tsx:52-53`, monospace, e a
busca filtra por `quote_code`/`budget_code`), remover seria perda funcional, e criar código próprio
exige coluna + sequência ADR-17 + DTO + regeneração de tipos — backend com peso legal dentro de um
bloco de refino visual. O bloco só trocou o `text-sky-600` hardcoded por variável do tema.

## P-15 — certificados não aparecem no módulo de alunos

**Gatilho:** fecha quando o João decidir expor (ou não) certificados na listagem e no detalhe do
aluno, ou se a Lotus pedir. Revisar em **2026-09-30**.

O protótipo mostra coluna `CERTIFICADOS` na listagem e card `CERTIFICADOS EMITIDOS` no detalhe;
implementado não tem nenhum dos dois.

Bloco alunos (2026-07-27, spec D10): `app/Domains/Certification/` era pasta vazia e não existia
migration de `certificates`. Card vazio foi rejeitado explicitamente: afirmar "sem certificados"
quando a verdade é "o módulo não existe" é falha silenciosa, e aqui o dado tem peso legal.
**Proveniência de D10 ratificada pelo João no doc-sync 2026-07-30.**

**Gatilho venceu em 2026-08-07:** o Bloco 7 entregou `certificates` e a vertical até a API pública.
**Venceu de novo em 2026-08-08:** o bloco `certificacao-frontend` entregou o módulo próprio
`/certificados` (Emisión + Historial) e **não tocou o módulo de alunos** — o escopo aprovado no
brainstorming (4 frentes) nunca incluiu a listagem/detalhe do aluno, então a decisão que esta
pendência espera segue não tomada. Os dados agora existem de ponta a ponta; expor coluna/card no
módulo de alunos é composição de frontend sobre API pronta.

## P-16 — Figma põe `Alumnos` como primeira aba; implementado mantém `Redactores`

**Gatilho:** se a Lotus pedir `Alumnos` como aba padrão.

Bloco alunos (2026-07-27, spec D11): divergência aceita por decisão do João no mesmo dia — a ordem
atual fica, a aba `Alumnos` só trocou o empty state fixo pelo conteúdo real.

---

# Travadas em escrita fora do repositório

## P-31 — o ponto 5 do ADR-16 não está no espelho do Drive

**Gatilho:** fecha quando o ponto 5 estiver no `decisao-stack.md` do Drive — o João cola o texto, ou
um bloco futuro ganha ferramenta de escrita no Drive e o aplica. Revisar em **2026-09-30**.

O ponto 5 do ADR-16 (identidade própria sobre o Lara — temas gerados, camada de marca, fim da exceção
de shell) existe em `docs/adrs.md` e **não** no espelho canônico do Drive (`decisao-stack.md`,
`Viagem Chile/Projetos/Lotus.cl/V2`).

A §11 da spec de `estilizacao-adr16-shell-tipografia` declara o re-sync como passo do fechamento, no
precedente de 2026-07-31, quando o João colou no `decisao-stack.md` do Drive o patch que espelhou o
próprio ADR-16 mais ADR-15/18/19 (a pendência daquele sync foi encerrada no ato; a nota está em
`docs/adrs.md`, logo abaixo do ADR-16). Conferido em 2026-08-12 lendo o arquivo do Drive: o ADR-16 de
lá segue com os cinco bullets originais, sem o ponto 5 e sem a revogação da exceção de shell.

**O agente não consegue fechar sozinho:** as ferramentas de Drive disponíveis são de leitura e
criação — não há update do arquivo canônico, e criar um segundo arquivo fragmentaria o espelho em vez
de sincronizá-lo. Decisão do João no `/fechar-sprint` de 2026-08-12: fechar o bloco e registrar aqui,
em vez de segurar o fechamento ou deixar a promessa morrer sem rastro (lição 13). O texto a espelhar
é o ponto 5 do ADR-16 em `docs/adrs.md`, que é a fonte — copiar de lá, não reescrever.

## P-18 — página de fechamento do Notion com `Sprint` divergente

**Gatilho:** fecha quando o João corrigir a propriedade manualmente no Notion.

A página `Fechamento técnico de sprint` (id `f88bc9603dfa8253b40981686f8ae023`) tem
`Descrição: "Fechamento — Sprint 3"` mas a propriedade `Sprint` real é `Sprint 2 · Comercial`.

Doc-sync 2026-07-30 (achado E3-05): mislabel dentro do próprio Notion, fora do escopo de escrita
autorizado pelo D11 da spec daquele bloco (que só cobre critério de aceite de H.1.3.1 e status de
task) — só reportado, não corrigido.

## P-22 — H.1.3.1 existe duas vezes na base Notion canônica

**Gatilho:** fecha quando o João apagar ou mesclar uma das duas cópias no Notion; até lá, **todo
consumo de H.1.3.1 cita o ID `3a2bc9603dfa803b94bbf27c075b27d6`**.

Dentro de `collection://e64b7d57-d000-4433-b652-a410e75193cc`:
`3a2bc9603dfa803b94bbf27c075b27d6` (`Sprint 4 · Certificação`, `Critério de aceite` preenchido pelo
write da Task 12) e `3a2bc9603dfa8021b69ee399cd8fd915` (`Sprint 3 · Acadêmico`, critério ainda
**vazio**).

Achado da revisão do doc-sync 2026-07-30 (Q-1): o relatório usou os dois IDs como se fossem a mesma
página — a seção 4 (E3-04) cita a cópia Sprint 3 e as seções 8/10 escrevem na Sprint 4 — e nunca
notou que são duas linhas. A duplicata é o mesmo risco de proveniência que gerou os 12 falsos
positivos, um nível abaixo: dentro da base certa. Qual cópia é a canônica é decisão do João (a Sprint
da task mudou de 3 para 4), não do agente — enquanto as duas existirem, um packet futuro pode ler a
vazia.
