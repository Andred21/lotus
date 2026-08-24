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

**Bloco:** frontend-hardening-final · **Gatilho:** o João decidir se um reset escopado entra, ou o terceiro bloco que
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

---

# Backend

## P-49 — o `lockRow` de redator e turma é meio mutex: só quem arquiva toma o lock

**Bloco:** — · **Gatilho:** os eixos **redator** e **turma** fecharam em 2026-08-23 (ver o bloco
final desta ficha). O que resta é o eixo **cotação × orçamento**: fecha quando um bloco tocar
`RestoreQuoteAction` ou `DeleteBudgetAction` e puder travar os DOIS lados, ou quando um filho ativo
sob pai arquivado for observado em uso real. Revisar em **2026-10-31**.

**Nasceu como `P-47` e foi renumerada no merge da `main` (2026-08-19), que já havia publicado uma
P-47 — a das roles do seed. Mesmo precedente da [P-35](#p-35).** Texto e blocos que a citam como
`P-47` são anteriores a esse merge.

`ArchiveRedatorAction:31` abre transação e toma `Redator::lockRow()` antes da cascata. Um lock de
linha só fecha janela se **os dois lados** o tomarem — e do lado do redator só existe um tomador.
Os escritores de filho não tomam:

| Sítio | O que escreve | Toma o lock? |
|---|---|---|
| `StoreRedatorDocumentAction:29-33` | `files` do redator | não |
| `UpdateRedatorAction` | `users`/`redatores` | não |
| `Operation\Actions\DesignateRedatorAction:18-25` | pivot `turma_redator` | não |

O molde `Client` faz certo: seis escritores de filho tomam `Client::lockRow()`
(`CreateClientContactAction:22`, `CreateClientAddressAction:22`, `UpdateClientAction:32`,
`UpdateClientContactAction:23`, `UpdateClientAddressAction:23`, `DeleteClientContactAction:38`).

**Consequência medida por leitura, não por corrida observada:** `StoreRedatorDocumentAction` faz o
`uploads->put()` **antes** de abrir a transação, então a janela entre "o binding resolveu um redator
vivo" e "INSERT em `files`" tem a largura de um upload no S3. Um documento criado nessa janela
sobrevive **ativo** sob redator arquivado — exatamente o modo de falha que a cascata existe para
impedir. Pelo mesmo caminho, uma designação concorrente pode pousar um redator arquivado numa turma
viva, furando o gate de turma em andamento.

**Por que ficou aberta:** o texto dos comentários veio verbatim do plano do
`arquivados-roots-restantes` e afirmava que a janela estava fechada; o review da Task 7 mediu que
não estava. Fechar de verdade custa três Actions fora da lista do plano — uma delas em **outro
domínio** (`Operation`), o que criaria aresta de lock cruzando domínio — e a suíte roda em sqlite,
onde `SQLiteGrammar::compileLock()` devolve string vazia: **nenhum teste deste repositório prova
lock**. A prova seria o molde, não o teste. Em vez de fechar mal no fim de um bloco de 15 tasks, os
dois comentários passaram a dizer o que o lock faz de fato e o resto virou esta ficha. Proporcional
a ~10 usuários internos: exige upload de documento e arquivamento do mesmo redator no mesmo
instante.

**A turma repete a forma (Task 11 do mesmo bloco, 2026-08-19).** `DeleteTurmaAction` nasceu com
`DB::transaction` + `Turma::lockRow()`, e do lado de lá também há um tomador só:

| Sítio | O que escreve | Toma o lock? |
|---|---|---|
| `EnrollStudentAction:24` | `enrollments` da turma (abre transação, sem lock da turma) | não |
| `ImportStudentsAction` | `enrollments` em lote | não |
| `StoreTurmaDocumentAction` | `files` da turma | não |

O texto do plano para a `DeleteTurmaAction` voltou à redação anterior à correção da Task 7 —
afirmava que o `lockRow` fechava "a outra ponta" logo depois de descrever a corrida da matrícula
concorrente. O review da Task 11 mediu que não fecha; o comentário foi reescrito no molde honesto da
`ArchiveRedatorAction` e a ficha passou a cobrir os dois roots. É o segundo bloco a copiar a
afirmação do plano sem medir: **o plano não é fonte sobre o que o código faz.**

**O eixo da COTAÇÃO foi fechado no review de 2026-08-19 (Q-5), e o resto da ficha segue aberto.**
O gate da `RestoreTurmaAction` perguntava sobre a turma irmã travando a turma que volta — a linha
disputada é a **cotação**, que o `UNIQUE` de `turmas.active_quote_id` protege. `Quote::lockRow()`
nasceu e os DOIS caminhos que decidem sobre ela a travam: `CreateTurmaAction` (que também moveu as
duas checagens para dentro da transação) e `RestoreTurmaAction`. É o primeiro eixo desta ficha com
tomador dos dois lados. Os três escritores de filho da tabela acima **continuam sem tomar o lock da
turma**, e o eixo do redator continua inteiro.

**Uma janela nova, da mesma classe, entrou com o gate do Q-1.** `RestoreQuoteAction` recusa
restaurar cotação sob orçamento arquivado lendo `$quote->budget->trashed()` sem travar o orçamento —
arquivar o orçamento entre a leitura e o `restore()` deixa o mesmo filho ativo sob pai arquivado. Não
foi fechada pela razão declarada na Action: `DeleteBudgetAction` também não toma lock nenhum (P8 do
plano), e travar só de um lado é a meia proteção que esta ficha existe para nomear.

### Os eixos REDATOR e TURMA fecharam em 2026-08-23

Fechados pelo `hardening-acesso-ownership-e-integridade` (`7b6123c7`, `2772d8cb`, `cc6d411e`,
`3282f4ac`, `48ed1840`). **A ficha errava em dois pontos, e o plano os corrigiu por medição:**

- **O lock é `lockForWrite()`, não `lockRow()` cru.** O molde `Client` que esta ficha cita chama
  `Client::lockForWrite()` (`Client.php:139-148`) — `lockRow()` **mais** a recusa se o pai já está
  arquivado. A diferença é a ficha inteira: `lockRow` sozinho SERIALIZA e depois deixa B pousar o
  filho sob o pai recém-arquivado. `Turma::lockForWrite()` e `Redator::lockForWrite()` nasceram
  neste bloco, no molde do `Client`.
- **`ImportStudentsAction` sai da lista dos seis escritores.** Ela não abre transação — a transação
  do import é POR LINHA e mora no `EnrollStudentAction`. `lockForUpdate()` fora de transação é
  solto no autocommit da própria consulta: o lock ali seria teatro. São **cinco** tomadores, e a
  cobertura do import vem da linha.

Os cinco tomadores: `StoreRedatorDocumentAction`, `UpdateRedatorAction` (eixo redator),
`DesignateRedatorAction` (aresta de lock cruzando domínio, declarada no `DomainDependencyTest`),
`EnrollStudentAction` e `StoreTurmaDocumentAction` (eixo turma).

**A catraca é `tests/Feature/Shared/ParentLockOnChildWriteTest.php`.** Arch test de lista dupla —
toda Action sob `app/Domains/*/Actions/` que recebe `Turma $` ou `Redator $` está em `TOMAM_LOCK`
ou em `ISENTAS` com o motivo escrito ao lado, e **silêncio reprova**. Roda em sqlite porque lê
código, não corrida: `SQLiteGrammar::compileLock()` devolve string vazia e nenhum teste deste
repositório prova lock.

**Provado no gate de fechamento (2026-08-23), em duas camadas:**

- **Sonda vista reprovar, nos dois braços da catraca.** Tirar o `Turma::lockForWrite()` do
  `EnrollStudentAction` reprova o braço do lock; criar uma Action nova recebendo `Turma $` e não
  declarada em nenhuma das duas listas reprova o braço do silêncio. As duas sondas foram
  revertidas e o teste voltou a **4 passed**.
- **Corrida real no MySQL de dev.** Conexão A abre transação e toma `SELECT … FOR UPDATE` sobre
  `turmas.id=7`; B dispara `EnrollStudentAction` sobre a mesma turma e **bloqueia por 6,2 s**; A
  arquiva e commita; B destrava e **recusa** com `Esta clase fue archivada y ya no acepta cambios.`
  As duas metades de uma vez — o lock bloqueou (senão a matrícula entraria imediatamente) e a
  recusa aconteceu (senão a matrícula entraria ATIVA sob turma arquivada, que é o modo de falha
  desta ficha). Turma 7 restaurada ao fim do gate.

---

# Documentação e mecanismo

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

**A forma óbvia foi medida e reprovada — 2026-08-22 (BD-15).** Varredura de identificador
PascalCase entre crases em `docs/`, `.claude/rules/` e `CLAUDE.md`: **167** candidatos, **28** sem
declaração nem arquivo homônimo no repositório, **0** achado real da lição 13. Os 28 são falso-positivo
legítimo, em três famílias:

- **vendor** — `DataTable`, `BodyCell`, `SoftDeletes`, `RefreshDatabase`, `HasMiddleware`,
  `ValidationException`, `DefaultValuesDataPipe`, `QueryObserverResult`, `UseQueryResult`,
  `RouteServiceProvider`, `QueryClientProvider`, `RadioButton`, `TypeError`, `FormData`,
  `ButtonProps`, `TableBody`;
- **placeholder de molde** — `CreateX`, `UpdateX`, `AppXProps`;
- **palavra de SQL, enum ou prosa, e nome de conceito** — `DELETE`, `EXPLAIN`, `UNIQUE`, `IDENTICO`,
  `MANUAL`, `PRUEBAS`, `EmAndamento`, `QueryBuilders`, `UnmappedErrors`.

Decisão do João no brainstorming do BD-15: **não desenhar a guarda**; a ficha guarda o número para
que quem reabrir a P-32 não regaste o desenho já reprovado. Allowlist das 28 foi considerada e
recusada — nasceria com 28 isenções, zero achado, e cada classe de vendor nova citada num doc viraria
manutenção. O gatilho continua sendo reincidência real da lição 13 **por classe**.

## P-44 — os gates de e2e criam usuário de sonda no banco de dev e nem sempre o removem

**Nasceu como P-42 e foi renumerada pelo mesmo motivo e no mesmo precedente da P-43** (encerrada em
2026-08-22 — a ficha vive em [`encerradas.md`](./encerradas.md)).

**Bloco:** go-live-confiabilidade-e-recuperacao · **Gatilho:** fecha quando um bloco puder reseedar o banco de dev, ou quando a
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

**As telas de Arquivados deste bloco deram um segundo palco às sondas (medido no `/fechar-sprint` de
2026-08-19).** `/personas` → Arquivados lista `E2E Gate Redator 1` e `E2E Gate Redator 2` (arquivados
em 2026-08-13), `/cursos` → Arquivados lista `GATE T7 — curso de afericao`, e a lista ativa de
clientes mostra `E2E Gate Client D` e `Gate BD9 RENOMEADA`. O bloco não criou nenhum deles e não
apagou nenhum: o efeito é que a residência, que antes só vazava na carga de redatores do dashboard,
agora aparece em três listas de produto. O gatilho segue o mesmo — reseedar é decisão do João.

**Rastro do `identity-ativacao-acesso-redator` (2026-08-19):** o gate da Task 14 daquele bloco criou
`gate.task14@lotus.cl` (user 58 / redator 8) e o deixou vivo; o `/fechar-sprint` o **removeu**, com
`users` de 58 para 57 e `redatores` de 8 para 7, porque era sonda criada por ESTE bloco. Foram
removidos junto os dois `password_reset_tokens` deixados pelos gates dele (`admin@lotus.cl`,
`gate.task14@lotus.cl`). As onze linhas de gates anteriores continuam intactas — são de blocos
fechados.

## P-52 — `invitation_tokens` existe desde 2026-08-18 e não tem ficha no `der-fisico.md`

**Bloco:** — · **Gatilho:** fecha quando um bloco tocar `invitation_tokens` (convite de redator,
expiração, reenvio) e puder descrever as colunas com o comportamento já provado, ou quando um
bloco de doc trouxer o `der-fisico.md` para o escopo de novo. Revisar em **2026-10-31**.

Medido em 2026-08-22, ao ampliar a P-43 (BD-15): a migration
`backend/database/migrations/2026_08_18_200000_create_invitation_tokens_table.php` cria a tabela, e
`docs/der-fisico.md` **não a mencionava em lugar nenhum** — nem na seção `Tabelas IMPLEMENTADAS`,
nem na contagem. A tabela entrou na enumeração e na contagem naquele bloco (é o que fazia a soma
fechar), mas **segue sem ficha de colunas**, que é o formato que as outras 19 tabelas de domínio
têm e o que torna o documento consultável antes de criar migration (`CLAUDE.md` §3).

Documentar tabela ainda não documentada ficou fora da P-43 de propósito: a P-43 é sobre status
escrito errado, não sobre lacuna de documentação, e a ficha de colunas precisa nomear semântica
(uso do token, expiração, unicidade, o que acontece no reenvio) que se lê no domínio e não só na
migration.

**A lacuna é da mesma família que a P-43 provou existir**, e por isso nasce com o número dela ao
lado: `der-fisico.md` envelheceu em silêncio porque nada mede o documento contra o conjunto real de
migrations. Enquanto essa medição não existir, a próxima tabela nova repete o caso.

---

## P-53 — a auditoria do fechamento do BD-15 mediu 12 divergências que nenhum bloco tinha no escopo

**Bloco:** — · **Gatilho:** fecha no primeiro bloco que tocar `docs/estrutura-monolito.md` ou
`.claude/rules/backend-ddd.md` por outro motivo e puder reconciliá-los contra a árvore, ou quando
uma delas custar uma decisão errada de verdade (o candidato mais provável é o `Dashboard` ausente:
é o doc que responde "onde vai o arquivo novo"). Revisar em **2026-10-31**.

Medidas pela `auditar-docs` no `/fechar-sprint` do BD-15 (2026-08-22), **fora do escopo daquele
bloco** — ele fechou P-20, P-21, P-23, P-39, P-43 e P-18, e nenhuma destas estava entre elas. A
13ª divergência da mesma varredura era da própria sprint (a âncora `[P-43](#p-43)` de
`abertas.md`, quebrada quando a ficha desceu para `encerradas.md`) e foi corrigida no fechamento.
Registradas aqui sem correção, porque `auditar-docs` reporta e não corrige, e porque reconciliar
`estrutura-monolito.md` contra a árvore é trabalho de bloco, não de gate. **Reconferidas contra o
merge da `main` de 2026-08-22** (que trouxe o `feedbacks-resolver-escopo` e tocou os dois arquivos):
as 12 seguem válidas, nenhuma foi corrigida de lado nenhum — só as coordenadas de linha
deslocaram, e estão atualizadas abaixo.

| Doc | Divergência | Evidência |
|---|---|---|
| `estrutura-monolito.md:49,145,181-186` · `.claude/rules/backend-ddd.md:24-26` | Afirmam que `Certification` é scaffold vazio dos dois lados; o domínio está entregue | `backend/app/Domains/Certification/` com 38 classes; `frontend/src/features/certification/` com 26 arquivos |
| `estrutura-monolito.md:32-50` · `backend-ddd.md:12-17` | O domínio `Dashboard` não aparece em nenhuma das duas listas, e é o 2º maior consumidor cross-domain | `backend/app/Domains/Dashboard/routes.php`; `tests/Feature/Shared/DomainDependencyTest.php:68-84` declara 15 arestas |
| `estrutura-monolito.md:20` | Afirma que `Certification` tem zero arestas; a matriz declara 9 | `tests/Feature/Shared/DomainDependencyTest.php:88-100` |
| `estrutura-monolito.md:53-58` | A árvore de `Shared/` lista 5 subpastas; o repo tem 11 | faltam `Audit/`, `Concerns/`, `Data/`, `Office/`, `Pdf/`, `Validation/` — três delas são home de lei (`PivotAudit`, `ArchivesChildren`, `WritableAttributes`) |
| `der-fisico.md` | A coluna `archived_with_parent` existe em 8 tabelas e não aparece em ficha nenhuma | `2026_08_18_000001_add_archived_with_parent_columns.php:26-38` e `..._000002_...:27-33` |
| `backend-ddd.md:38` | Diz que os `routes.php` de domínio são carregadas no `bootstrap/app.php`; quem carrega é o `glob()` | `backend/routes/api.php:12-14`; `docs/estrutura-monolito.md:82` já descreve certo |
| `CLAUDE.md:159-161` | A lista de serviços do Compose omite `mailpit`, transporte real do convite/recuperação | `docker-compose.yml:33-35` (porta 8025) |
| `CLAUDE.md:146` | Descreve `pnpm test` como "hooks de `shared/`"; o corte cobre hooks de feature, componentes e `frontend/tests/` | `frontend/tests/repo-docs-refs.test.ts`; `features/identity/components/PeoplePage.test.tsx`. A `frontend-fsliced.md:268-271` registra que a frase já foi lição 13 três vezes |
| `.claude/rules/frontend-fsliced.md:261-266` | População de testes de componente congelada em 2026-08-16 ("13 arquivos, 9 montam wrapper"), com lista nominal | só `shared/ui/**` tem 21 `*.test.tsx` que montam componente |
| `docs/adrs.md` | Transporte de e-mail virou padrão de fato sem ADR: broker `invites`, duas Notifications, Mailpit no Compose, três rotas públicas de senha | nenhuma ocorrência de mail/SMTP/Notification em `adrs.md`; a decisão só existe em plano arquivado |
| `docs/adrs.md` | O arquivamento em cascata (`archived_with_parent` + `ArchivesChildren`/`LoadsCascadedChildren`, hooks `deleting`/`restored`) alcança 8 roots sem ADR | a única regra escrita é `frontend-fsliced.md:114-130`, que descreve o **kit de UI**, não o mecanismo de backend |
| `abertas.md:57` | A âncora `[P-35](#p-35)` aponta para ficha que saiu de `abertas.md` no BD-14 e de `encerradas.md` no BD-12 | anterior a esta sprint; não corrigida por não ser dela |

**O padrão é o mesmo que a P-52 nomeia:** doc de estrutura envelhece em silêncio porque nada mede o
documento contra a árvore. A `auditar-docs` mede — mas só roda no fechamento, e reporta em vez de
travar. Enquanto não houver catraca executável para `estrutura-monolito.md` (a `D-17` fez isso para
as arestas de domínio, não para a árvore de pastas), a lista volta a crescer.

---

## P-54 — os testes da migration de permissões de feedback não cobrem o filtro `guard_name` nem o `forgetCachedPermissions()`

**Bloco:** — · **Gatilho:** o próximo bloco que escrever migration de permissão e puder absorver as
duas assertivas. Revisar em **2026-10-31**.

Medido no review de `feedbacks-resolver-escopo` (2026-08-22, achado Q-4): o
`RemoveOrphanFeedbackPermissionsMigrationTest` tem quatro testes e nenhum deles morde se você apagar
o `->where('guard_name', 'web')` ou o `app(PermissionRegistrar::class)->forgetCachedPermissions()` do
`up()` da `2026_08_22_000001_remove_orphan_feedback_permissions.php`. A suíte fica verde nos dois
casos — é a lição 10 outra vez: teste que passa por não conseguir observar a diferença.

Deferido para o `hardening-acesso-ownership-e-integridade` e depois tirado do escopo dele por decisão
do João em 2026-08-22. **O bloco escreveu duas migrations de permissão** (`..._000002` e
`..._000003`) e não aproveitou a oportunidade — o que é exatamente a informação que faz esta ficha
valer alguma coisa para o próximo bloco.

O conserto tem forma conhecida: semear uma permissão homônima em outro `guard_name` e provar que ela
sobrevive ao `up()`; e provar o cache lendo a permissão pelo registrar ANTES do `up()`, para que um
`up()` sem `forgetCachedPermissions()` devolva o estado obsoleto.

---

# Travadas em decisão do João

> Fichas desta seção que carregam linha `**Bloco:**` foram agrupadas na consolidação de
> 2026-08-22: a decisão que as trava passa a se resolver no brainstorming do bloco indicado.
> Agrupar segue não promovendo nada.

## P-02 — retenção da auditoria nunca decidida

**Bloco:** hardening-auditoria-privacidade-e-observabilidade · **Gatilho:** antes de subir para produção.

ADR-08 (pruning/retenção da auditoria) segue **aberto**. Política de retenção nunca decidida;
`audits` cresce sem poda.

## P-33 — `login_logs` guarda dado pessoal sem política de retenção

**Bloco:** hardening-auditoria-privacidade-e-observabilidade · **Gatilho:** fecha junto com a P-02, ou antes de subir para produção.

`login_logs.ip_address` e `login_logs.user_agent` são dado pessoal. Bloco `last-login` (BD-7,
2026-08-12): o log é append-only por desenho e o volume não é o problema (~10 usuários internos) — a
retenção é. Fica junto da **P-02**, aberta pela mesma razão para `audits`.

**Nasceu como segunda `P-30` e foi renumerada no `/fechar-sprint` do BD-3 (2026-08-12)**, pelo mesmo
precedente que renumerou a segunda `P-28` para `P-32`: a linha do `ámbar-aviso` entrou na `main`
primeiro (PR #41, commit `e6460f9`) e esta chegou depois (`656175c`), então quem renumera é a
recém-chegada. As menções a "P-30" na narrativa do `last-login` em `docs/superpowers/state.md` são
desta linha e ficam como estão — história não se reescreve.

## P-05 — migrations "adicionais" não consolidadas

**Bloco:** go-live-confiabilidade-e-recuperacao · **Gatilho:** antes de subir para produção.

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

**Bloco:** certificacao-historico-do-aluno · **Gatilho:** fecha quando o João decidir expor (ou não) certificados na listagem e no detalhe do
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

**Bloco:** BD-15-docs-guardrails-e-sincronizacao · **Gatilho:** fecha quando o ponto 5 estiver no `decisao-stack.md` do Drive — o João cola o texto, ou
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

**Medido em 2026-08-22 (BD-15): a impossibilidade agora é de schema, não de suposição.** A
ferramenta de escrita do Drive disponível é `update_file`, e o schema dela diz textualmente
*"currently only title and parent_id are supported"* — ela renomeia e move arquivo, não altera
conteúdo. `create_file` produziria um segundo documento, que fragmenta o espelho em vez de
sincronizá-lo. **Nada a fazer do lado do agente.**

**Para o João fechar em um passo** — arquivo `decisao-stack.md`, file ID
`14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` (cadeia `Viagem Chile/Projetos/Lotus.cl/V2/Planejamento/3-avancado`,
`modifiedTime` 2026-07-31T16:15:51Z na medição). O texto a colar é o ponto 5 do ADR-16 em
`docs/adrs.md`, **copiado de lá e não reescrito**, mais a frase que revoga a exceção de shell — hoje
o ADR-16 do Drive segue com os cinco bullets originais.

## P-22 — H.1.3.1 existe duas vezes na base Notion canônica

**Bloco:** BD-15-docs-guardrails-e-sincronizacao · **Gatilho:** fecha quando o João apagar ou mesclar uma das duas cópias no Notion; até lá, **todo
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

**Remedida em 2026-08-22 (BD-15), sem write.** As duas cópias foram relidas por ID e a diferença
entre elas está tabelada em `docs/superpowers/audits/2026-08-22-bd15-notion-sync.md`. O bloco tinha
autorização para escrita **não-destrutiva** apenas (D1), e apagar página não cabe nela. O gatilho
segue de pé: fecha quando o João apagar ou mesclar uma das duas.

---

## P-51 — a lei "ausente não é nulo" não alcança propriedade com default literal, e um dos seis campos é acesso

**Bloco:** — · **Gatilho:** o campo **1** (`is_active`) fechou em 2026-08-23 (ver o bloco final
desta ficha). Restam **cinco**: o primeiro bloco que tocar `UpdateClientAction`/`UpdateCourseAction`,
`BudgetController::update` ou `CourseTemplateController::update`. Revisar em **2026-10-31**.

Achado pela review final do **BD-14** (2026-08-20, `0fe30b13..dd0cda1`). **Nada aqui é regressão do
BD-14** — todos os seis campos já se comportavam assim antes do bloco. O que o bloco fez foi criar
o vocabulário que torna o defeito nomeável, e a própria review mediu que a lei que ele declara não
vale em todo lugar que devia valer.

### A mecânica

O `DefaultValuesDataPipe` do Spatie entrega o default declarado quando a chave está **ausente do
corpo**, e faz isso **antes** do ramo que preencheria `Optional`. Então:

| Declaração | Chave ausente vira | Correto? |
|---|---|---|
| `public string\|Optional\|null $phone` (sem default) | `Optional::create()` | sim |
| `public bool\|Optional $is_active = new Optional` | `Optional` | sim |
| `public bool $is_active = true` | **`true`** | **não** |
| `public string $type = 'client'` | **`'client'`** | **não** |

O `WritableAttributes::from()` que o BD-14 construiu **funciona**: ele tira do array toda chave que
chega como `Optional`. O que o derrota é a DTO entregar um valor real onde devia entregar `Optional`
— o helper não tem como distinguir "o cliente mandou `true`" de "o Spatie preencheu `true`".

### Os seis campos

**1 — `UserData::$is_active = true` ([`UserData.php:40`](../../../backend/app/Domains/Identity/Data/UserData.php#L40)) — controle de acesso.**
`UpdateStaffUserAction:57` escreve `'is_active' => $data->is_active` dentro do próprio
`WritableAttributes::from()`. Um `PUT /api/users/{id}` que omita a chave **reativa** um staff
desativado — e `is_active` é exatamente o portão que `AuthController:52` usa para barrar o login.
Quem só renomeia um admin desligado devolve o acesso dele sem pedir.

O contraste está na mesma pasta: `RedatorData::$is_active` é `public bool|Optional $is_active`
**sem default**, e `UpdateRedatorAction:68-73` usa o mesmo helper na mesma forma — e acerta. Um DTO
está certo, o irmão errado, pela diferença de um default.

**Custo medido dos dois remédios:**

- **(a) `public bool|Optional $is_active = new Optional`** — espelha o redator, coerente com a D1 da
  spec do BD-14. Muda `generated.ts` de `is_active: boolean` para `is_active: undefined | boolean`,
  **grafia que a linha 433 do arquivo já carrega hoje para `RedatorData`**. Do lado do SPA são ~5
  sítios (`useStaffUserForm.ts:34,53`, `StaffUserDialog.tsx:121-128`, `UsersTable.tsx:72-73`) e o
  idioma de narrowing (`?? true`) já existe no repositório, copiado do redator
  (`useRedatorForm.ts:28,90`, `RedatorIdentityFields.tsx:73-76`). O SPA sempre manda a chave — o
  ganho é para chamador parcial, não para a tela.
- **(b) `'is_active' => ['present', 'boolean']` em `UserData::rules()`** — omissão vira 422 em vez de
  reativação silenciosa, e `generated.ts` não muda. **Mas contradiz a D1**, que escolheu
  "omissão preserva" justamente contra "PUT exige a chave".

**2 e 3 — `ClientData::$type = 'client'` ([`ClientData.php:57`](../../../backend/app/Domains/Commercial/Data/ClientData.php#L57)) e `CourseData::$workload_hours = 0` ([`CourseData.php:34`](../../../backend/app/Domains/Catalog/Data/CourseData.php#L34)).**
Nas duas Actions que o BD-14 **editou**: um PUT que omita `type` rebaixa qualquer `provider`/`other`
para `client`; um que omita `workload_hours` zera a carga horária contratada — e o docblock do
próprio `CourseData:17` diz que ela é contratada, não derivada.

**4 a 6 — os que nem chegam ao helper.**
`BudgetController.php:86-88` escreve
`'payment_terms' => $data->payment_terms instanceof Optional ? null : $data->payment_terms` — o
ternário `Optional → null` que o BD-14 removeu de cinco Actions, ainda vivo aqui; e é inalcançável
de todo jeito, porque `BudgetData.php:44` declara `= null` e a propriedade nunca chega como
`Optional`. `CourseTemplateController.php:33` faz `$template->update($data->except('id','version')->toArray())`
sobre `CertificateTemplateData.php:22-23`, onde `$layout_config = []` e `$validity_months = null`:
omitir `layout_config` **apaga o layout inteiro** do template de certificado.

### Por que não se conserta dentro do BD-14

O `active_work_item` do bloco é o contrato de entrada dos **10 campos** que a D-13 mediu e dos **11**
campos de foto da D-12. Nenhum destes seis está na lista, e o `/executar-bloco` fecha em
"implemente somente `active_work_item`". O remédio do `is_active` ainda escolhe entre duas leituras
da D1 e move `generated.ts` — decisão do João, não do agente.

**A varredura que falta:** a medição da D-13 procurou o idioma `instanceof Optional ? null`. Ela era
cega a este defeito, porque aqui o valor nunca chega como `Optional`. Um bloco que feche esta ficha
deve varrer por **default literal em propriedade de DTO de entrada**, não pelo ternário.

### O campo 1 fechou em 2026-08-23; os cinco restantes seguem abertos

O João escolheu o remédio **(a)** — `public bool|Optional $is_active` sem default, espelhando o
`RedatorData`. O **(b)** (`['present','boolean']`) foi recusado por contradizer a D1 da spec do
BD-14 ("omissão preserva"): reabrir decisão de dois dias antes para economizar um diff de
`generated.ts` não paga. Entregue pelo `hardening-acesso-ownership-e-integridade` em `d11169c9`, com
`d4a8553d` fechando o blast radius no `create` de staff (o `Optional` sem default também alcança o
cadastro novo, que precisava do `?? true` explícito).

`generated.ts` foi **regenerado**, nunca editado (lei §5.3): `is_active` passou a
`undefined | boolean`, a mesma grafia que a linha 433 já carregava para `RedatorData`.

**Provado contra a API real no gate de fechamento (2026-08-23):** `PUT /api/users/87` com
`is_active: false` desliga; o `PUT` seguinte, **omitindo a chave** e só renomeando, devolve 200 com
o nome novo e `is_active` **ainda `false`** — confirmado no banco. Antes do bloco, esse segundo PUT
devolvia o acesso ao staff desligado sem ninguém pedir.

Os campos **2 a 6** (`ClientData::$type`, `CourseData::$workload_hours`, `BudgetController::update`,
`CourseTemplateController::update`) ficaram **fora por escrita explícita** na §2 da spec do bloco:
nenhum é controle de acesso, e a ficha já os separa por gatilho próprio.
