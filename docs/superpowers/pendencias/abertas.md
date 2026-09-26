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

## P-74 — o botão de severidade reprova AA no estado base do claro, fora o `warning`

**Bloco:** — · **Gatilho:** fecha quando uma régua por estado, no molde do `describe` da P-30
(`frontend/tests/tone-ink.test.ts`), cobrir as cinco severidades e todas passarem 4,5:1 nos três
estados. Revisar em **2026-10-31**.

Medido em 2026-09-02, ao fechar a P-30 (item 25, Task 5): a tinta branca do Lara sobre o fundo
compilado de cada severidade reprova AA no `p-button` **filled**, estado base, no tema **claro** —

| Severidade | Contraste (base, claro) |
|---|---|
| success  | **2,28:1** |
| info     | **2,77:1** |
| warning  | **2,80:1** (era o defeito que a P-30 fechou) |
| danger   | **3,76:1** |
| help     | **3,96:1** |
| secondary | 4,76:1 — passa |

O `warning` não era caso especial: é a quarta pior das cinco que reprovam, e a P-30 resolveu a dele
trocando de família (laranja → amarelo) porque a coerência com o `AppTag` já pedia a troca. As
outras quatro não têm essa saída de graça — success/info/danger/help continuam na própria família,
e cada uma precisaria da mesma medição de três estados (base/hover/active) mais outlined/text antes
de mexer, porque a lição da P-30 é que trocar degrau a degrau na mesma posição pode reprovar pior
que o defeito original (o `active` do amarelo degrau-a-degrau media 2,29:1, pior que os 2,80:1 que
saíram).

O `danger` já tem remédio **parcial**: `frontend/src/shared/styles/brand-theme.css` (achado UI-02 do
review de 2026-08-18, no `Eliminar foto` do `AppPhotoField`) troca a tinta do `text`/`outlined` para
`var(--tone-danger-ink)` e mede 5,83:1 no claro / 4,98:1 no escuro — mas o **filled** do `danger`
(fundo vermelho, texto branco) não foi tocado e é o 3,76:1 medido acima.

Consertar os outros quatro é campanha de tema — mexe em botão, tag, mensagem e badge de cada
severidade nos dois temas, decisão de design que ninguém tomou ainda — e não é escopo do item 25.

## P-57 — o `artisan test` do `CLAUDE.md` §6 fatala em worktree com imagem velha

**Bloco:** — · **Gatilho:** fecha quando o `CLAUDE.md` §6 (ou o `/executar-bloco`) disser que
worktree novo constrói a imagem antes de rodar a suíte, ou quando o compose deixar de permitir
imagem por projeto defasada. Revisar em **2026-10-31**.

Medido em 2026-08-24, no fechamento do item 17, na worktree `../fix-frontend`: o
`docker compose exec -T app php artisan test` do §6 terminou em
`Fatal error: Allowed memory size of 134217728 bytes exhausted`. Não é regressão da **P-50** — o
`docker/php/memory-cli.ini` (320M) está no repositório e no `Dockerfile` desde então. O que falhou é
que **cada worktree é um projeto compose próprio, com imagem própria**: a imagem `fix-frontend-app`
tinha sido construída antes do ini e `php -i` no container dizia `memory_limit => 128M`,
`Loaded Configuration File => (none)`.

`docker compose build app` + `docker compose up -d --no-deps app` resolveu (o `--no-deps` porque
3307 e 8025 já estão presos pelo stack do main tree), e a suíte terminou **906 passed / 5 skipped**.
O conserto é de ambiente, não de código, e por isso não entrou em commit; o que fica aberto é o
doc não avisar — quem rodar o §6 numa worktree nova vê um fatal de memória e pensa em regressão.

**Nasceu como `P-55` na branch `refactor/tabelas-coluna-de-acoes` e foi renumerada no merge da
`main`**, que já trazia uma `P-55` (a invariante do espelho) e uma `P-56` vindas do fechamento do
`compose-por-worktree` — mesmo precedente que renumerou a `P-38` para `P-41`. Ela **não é** a P-03,
que fechou naquele bloco: o offset de portas por árvore não reconstrói imagem, e foi com o offset já
no lugar que o fatal de 128M apareceu aqui.

> **Duas fichas foram renumeradas no merge de fechamento (2026-08-29).** Nasceram `P-64` e `P-65`
> na `lane-c` e viraram `P-67` e `P-68`: a `main` já trazia `P-64`, `P-65` e `P-66` da `lane-a`,
> mescladas antes destas (PR #81). Mesmo movimento que a nota da `lane-a` registra adiante — ID
> publicado na `main` não se reusa, e quem renumera é a lane que ainda não mesclou. **A `P-67`
> fechou em 2026-09-01** (item 21) e a **`P-68` fechou em 2026-09-03** (item 25); as duas estão em
> [`encerradas.md`](./encerradas.md).

# Backend

## P-76 — seis frases ao usuário seguem literais em `app/`, por três caminhos que nenhuma catraca alcança

**Bloco:** — · **Gatilho:** bloco que tocar `Identity/Services/UserProvisioner`, `Shared/Rules`,
`Shared/Files/Rules` ou `AuthController::logout()` por outro motivo; cada sítio passa a ler `lang/`
nos três locales no mesmo commit, **ou** a catraca ganha o caminho que faltava. Revisar em
**2026-10-31**.

Herdada da **`P-71`**, que fechou em 2026-09-03 no `backend-envelope-de-erro-e-recusa-de-dominio`.
A `P-71` pagou os cinco sítios que ela contava **e mais os seis** de
`CertificateEligibility::refuse()`, que o Q-7 do review do mesmo dia descobriu — o encaminhador de
`withMessages` virou a terceira porta coberta por `MensagemLiteralTest`. Estes seis **não** foram
pagos, e estavam nomeados no corpo da `P-71`: ficha que fecha leva o resto junto se ninguém o
reabrir, e foi por isso que esta nasceu.

Remedido contra a árvore em 2026-09-03, os três caminhos seguem vivos:

| Sítio | Idioma de hoje | Por que a catraca não alcança |
|---|---|---|
| `Identity/Services/UserProvisioner.php:27-28` (RUT e e-mail duplicados) | pt-BR | a frase mora numa **constante de classe** (`DUPLICADO`), longe da chamada a `withMessages`; o detector lê janela, não constante |
| `Shared/Rules/ValidRut.php:19` | **pt-BR** | `$fail('...')` é o contrato de `ValidationRule`, não `throw` nem `withMessages` — nenhuma das três portas cobertas |
| `Shared/Rules/PrintableGrade.php:27` | es-CL | idem |
| `Shared/Files/Rules/ScannedForMalware.php:34` | es-CL | idem |
| `Identity/Http/Controllers/AuthController.php:107` (`'Sessão encerrada.'`) | pt-BR | é resposta de **sucesso** (`200`), não recusa; catraca de exceção não passa perto |

**Dois defeitos, não um.** O primeiro é o de sempre — frase fora de `lang/` não se traduz. O
segundo é que **três sítios estão em pt-BR num produto es-CL**: o `ValidRut` e o `UserProvisioner`
respondem em português a um operador chileno, e o `logout` também. Isso é observável hoje, sem
mudar locale nenhum.

**Por que fica aberta:** fechar pede a quarta porta da catraca (`$fail` de `ValidationRule`) e uma
quinta para resposta de sucesso — não é dicionário, é mecanismo, e o mecanismo é o que a
`.claude/rules/backend-lang.md` manda estender junto. O bloco do envelope fechou a lista de quatro
mudanças que a spec dele declarou; abrir a quarta porta ali seria a quinta.

---

## P-85 — no sqlite da suíte, o último dia do período some do filtro de `start_date` do `AnalyticsQuery`

**Bloco:** — · **Gatilho:** bloco que tocar `Dashboard/Services/AnalyticsQuery` ou o filtro de
período do dashboard; os três filtros de `start_date` passam por `DataSql::literal` e um teste prova
a turma que começa no **último dia** do período dentro da série e dos dois rankings. Revisar em
**2026-10-31**.

Achado de passagem no review Q-1 do item 29 (2026-09-25, `audits/2026-09-24-item29-medicoes.md`
§8), fora do achado, e promovido a ficha no fechamento por decisão do João. O `AnalyticsQuery`
filtra a coluna `date` `turmas.start_date` com
`whereBetween('start_date', [$start->toDateString(), $end->toDateString()])` em três lugares
(`AnalyticsQuery.php:50`, a série `turmas_iniciadas`; `:100`, o ranking de cursos; `:148`, o de
clientes). No MySQL a coluna é `DATE` e a comparação é de dia com dia — correta. No sqlite da suíte
o cast `date` grava `Y-m-d 00:00:00` numa coluna texto, e a comparação vira de string:
`'2026-09-25 00:00:00' <= '2026-09-25'` é falso, então a turma que começa no último dia do período
cai fora.

**A produção não erra; a suíte não enxerga.** Um teste que cobrisse a borda do último dia
reprovaria no sqlite com o código certo, e uma regressão que cortasse o último dia no MySQL
passaria verde. O `AnalyticsQueryTest` do item 29 evita a borda de propósito — contorna, não
resolve. Já era assim antes do bloco.

O remédio existe no repositório: `App\Shared\Support\DataSql::literal`, que o `display_status` da
`CertificateQueryBuilder` e a janela do `EmissionPanelQuery` usam exatamente por isso (o docblock
dele descreve a mesma borda). Não entrou no item 29 porque o Q-1 era sobre os limites de
**instante**, e a coluna `date` não mudou de comportamento com ele.

---

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

## P-84 — o harness de guarda não existe em nenhum doc versionado

*(nasceu `P-79` no fechamento do item 28 e foi renumerada na integração: o item 10 v2 fechou
a mesma faixa no mesmo dia e mesclou antes, pela PR #105. Ver a nota da colisão em
[`encerradas.md`](./encerradas.md).)*

**Bloco:** — · **Gatilho:** fecha quando `docs/estrutura-monolito.md` descrever `.claude/hooks/`,
`.claude/tests/` e `.claude/settings.json`, ou quando o `CONTRIBUINDO.md` disser o que os cinco
hooks negam e como se acrescenta entrada à allowlist. Revisar em **2026-10-31**.

Medido em 2026-09-20, no `/fechar-sprint` do `harness-hooks-de-guarda` (item 28). O bloco entregou
cinco hooks que passam a governar **toda** sessão futura — e nenhum doc versionado os menciona:

| Doc | O que ele diz hoje |
|---|---|
| `docs/estrutura-monolito.md` | zero ocorrências de `.claude`. É o doc que o `CLAUDE.md` §3 manda ler "antes de criar arquivo novo — para saber ONDE ele vai", e ele não conhece a pasta |
| `CONTRIBUINDO.md` | descreve o `pre-push` de `.githooks`, que é outro mecanismo. Nada sobre os hooks do Claude Code |
| `CLAUDE.md` §4 e §6 | tabelam comandos e skills; hook não aparece |

A consequência não é estética: quando o `guard-main-shell` negar um comando legítimo, o remédio é
"acrescente a entrada em `.claude/hooks/lib/classificar-comando.py` e commite" — o próprio motivo de
recusa diz isso —, e não há doc que explique a régua da allowlist nem por que ela existe. O bloco
não escreveu nada disso porque o plano não listou entregável de doc; a spec §3.4 cobre a
consequência de versionar os hooks, mas a spec agora está em `specs/archive/`, que ninguém lê por
rotina.

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

**Gatilho disparado e não pago — 2026-09-04, `dominio-decisoes-de-rbac-e-semantica` (item 22).**
O bloco tocou `.claude/rules/backend-ddd.md` "por outro motivo" (o achado Q-5 do review: a rule
citava `ensureSingle`, método que o próprio bloco renomeou para `ensureExactlyOne`) — três linhas.
A outra metade do gatilho, *"e puder reconciliá-los contra a árvore"*, **não se cumpriu**:
reconciliar as 12 divergências é trabalho de bloco de doc, não de correção de review, e o
`active_work_item` do 22 eram as quatro decisões de domínio e RBAC. Decisão do João no gate de
fechamento: anotar e seguir. **As 12 seguem válidas** — o bloco não tocou `estrutura-monolito.md`,
`der-fisico.md`, `adrs.md` nem `CLAUDE.md`, e as coordenadas de linha do `backend-ddd.md` na tabela
acima (24-26, 12-17, 38) não foram deslocadas pelas três linhas mudadas (que estão na linha 83).

**Gatilho disparado e não pago de novo — 2026-09-25, `backend-config-e-conteudo-de-documento`
(item 29).** O bloco acrescentou ao `.claude/rules/backend-ddd.md` a seção "Data de calendário sai
do `FusoDoNegocio`" (a partir da linha 192), por outro motivo: a decisão D1 da spec e o Q-2 do
review. A metade *"e puder reconciliá-los contra a árvore"* de novo não se cumpriu — o bloco era de
config e conteúdo de documento. Decisão do João no gate de fechamento: anotar e seguir, como no item
22. **As 12 seguem válidas**, e as coordenadas do `backend-ddd.md` na tabela (24-26, 12-17, 38)
seguem as mesmas: a seção nova entrou abaixo de todas. O gatilho não se desarma.

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

## P-05 — migrations "adicionais" não consolidadas

**Bloco:** go-live-confiabilidade-e-recuperacao · **Gatilho:** antes de subir para produção —
**disparado em 2026-09-20 e não pago** (seção abaixo). Revisar em **2026-10-31**.

Decisão do João no Bloco 2 — evitar inchaço do folder.

### Gatilho disparado e não pago — 2026-09-20, `infra-producao-provisionamento-aws` (item 10 v2)

A produção subiu. O `deploy.sh a5fc92bb` rodou as **30 migrations** sobre banco novo na EC2 em
2026-09-04 e a aplicação atende em `http://18.230.53.197` desde então — o gatilho desta ficha era
exatamente esse momento, e ele passou sem a consolidação.

Decisão do João no gate de fechamento de 2026-09-20: **disparar sem pagar**, junto com os outros
três itens herdados do bloco (a [P-80](#p-80--a-previsão-de-custo-estoura-o-teto-de-d8-e-o-resize-da-ec2-piora-a-conta) e a [P-81](#p-81--a-access-key-que-provisionou-a-produção-continua-ativa)). O gatilho **não se desarma** — mas mudou de
natureza, e quem pegar a ficha precisa saber disso: consolidar agora não é mais só reescrever o
folder. A produção já tem as 30 linhas na tabela `migrations`, então uma consolidação ou preserva
esse estado à mão ou só vale para ambiente novo. É a diferença entre o que a ficha custava antes de
2026-09-04 e o que ela custa hoje.


## P-83 — sete decisões de política dos guardas ficaram só no ledger, que é gitignorado

*(nasceu `P-78` no fechamento do item 28 e foi renumerada na integração: o item 10 v2 fechou
a mesma faixa no mesmo dia e mesclou antes, pela PR #105. Ver a nota da colisão em
[`encerradas.md`](./encerradas.md).)*

**Gatilho:** fecha quando o João decidir cada uma das sete linhas abaixo — a favor ou contra, tanto
faz, desde que a decisão vire commit. Revisar em **2026-10-31**.

Medido em 2026-09-20, no `/fechar-sprint` do `harness-hooks-de-guarda`. O review de branch triou
sete pontos que **não** foram corrigidos porque cada um muda política escrita à mão, e política de
segurança não se alarga por conta do agente. O registro deles vive em `.superpowers/sdd/progress.md`
e `.superpowers/sdd/review-final.md` — e `.superpowers/` inteiro é **gitignorado**: a worktree some,
eles somem junto. Por isso a ficha.

| # | Decisão em aberto | Estado hoje |
|---|---|---|
| a | `.github/`, `.githooks/` e `.codex/` fora da allowlist de escrita na `main` | negados. São versionados, e editá-los na `main` é trabalho normal; o revisor argumentou a favor de incluí-los e eu concordo com o raciocínio, mas alargar allowlist de segurança é do João |
| b | `.superpowers/` fora da mesma allowlist | negado — e é onde o `CLAUDE.md` §3 manda o ledger morar. Provado contra a `main` real: `Write` em `.superpowers/sdd/progress.md` volta `deny` |
| c | `git merge` na `main` sem `--ff-only` | liberado. `merge` e `pull` mutam a árvore, enquanto `checkout`, `switch`, `restore` e `stash` são negados exatamente por isso |
| d | `docker/probe.env` real (versionado, 1591 bytes) | negado pelo `guard-secrets`, pelo `APP_KEY=base64:` que ele de fato contém. Isentar por nome ou manter o `deny` é decisão de política, não de código — a suíte não o isentou |
| e | `stop-verify` cobra `backend/`, `frontend/` e `.claude/`, e só | os três limites vieram da §8 da spec. `docs/` não está entre os caminhos vigiados, e a suíte prova que não está |
| f | o motivo de recusa ensina a alargar a própria allowlist | "acrescente a entrada em `.claude/hooks/lib/...` e commite". Não está errado — a edição exige commit visível —, mas um guarda que documenta o próprio caminho de extensão baixa o atrito do auto-alargamento |
| g | `git commit` sem `-m` passa e abre o `$EDITOR` | pendura o turno. Não é fuga de segurança, é ergonomia |

Nenhuma das sete é fuga conhecida: são escolhas onde o guarda está mais apertado (a, b, d, e) ou
mais frouxo (c, f, g) do que talvez se queira, e o bloco parou na linha certa ao não decidir sozinho.

## P-55 — a invariante do espelho proíbe o que toda lane precisa fazer

**Gatilho:** fecha quando o João escolher entre (a) reescrever a invariante para descrever o que as
lanes fazem de fato, ou (b) dar ao espelho um mecanismo próprio que dispense a escrita manual — por
exemplo `focused_lane` derivada da árvore corrente em vez de campo escrito. Revisar em
**2026-10-31**.

O `state.md` diz, na lista do que cada lane pode escrever: *"**Nunca os campos singulares do topo**:
são espelho de `focused_lane`, e trocar o foco é fronteira durável do main tree."* Mas
`/planejar-bloco` e `/executar-bloco` leem os singulares, não o bloco da lane em `lanes:` — então
uma lane que não vire o espelho na própria árvore é planejada e executada contra a lane errada.

**Medido em 2026-08-24:** três lanes viraram o espelho na própria branch, fora do main tree — a
`lane-c` em `ff5c29f6` (`focused_lane: lane-c`), a `lane-a` no commit de promoção do item 2 e a
`lane-b` no commit que abre esta ficha. Nenhuma das três podia, pela letra. É a mesma classe do
achado **Q-2** do review de 2026-08-22, em que a regra de dono foi quebrada por 21 commits no mesmo
dia em que foi escrita: a regra descreve a intenção (nenhuma lane sobrescreve o foco de outra no
merge) e proíbe o mecanismo que a operação exige.

**Por que fica aberta:** as duas saídas mudam contrato de workflow lido por comando — decisão do
João, não de lane em execução. Até lá vale o precedente executado: cada árvore mantém o espelho
apontando para a lane que a ocupa, e a colisão de merge se resolve na integração serial.

**Quarto caso, 2026-08-28:** a promoção do item 18 (`frontend-estilizacao-padronizacao-de-componentes`)
para a `lane-c` foi escrita da worktree `../fix-frontend`, espelho singular incluído, com o João
avisado da pendência antes do commit e decidindo por ela. A alternativa oferecida — gravar só o
bloco da lane aqui e o espelho no main tree — foi recusada por ping-pong entre árvores. A ficha
segue aberta: quatro precedentes não reescrevem a invariante.

**Quinto caso, 2026-08-29:** a promoção do item 19 (`frontend-triagem-dos-audits-do-item-18`) para a
`lane-c` foi escrita da worktree `../fix-frontend`, espelho singular incluído, pelo mesmo motivo do
quarto: `/planejar-bloco` lê os singulares, e a sessão rodou autônoma, sem o João para escolher o
ping-pong entre árvores. Cinco precedentes, mesma saída pendente.

## P-56 — o `XSRF-TOKEN` não é isolado entre árvores; a escrita da aba parada dá 419

**Gatilho:** fecha quando o João escolher entre (a) isolar as árvores por HOST em vez de por porta
— cada árvore com `SESSION_DOMAIN` e URLs próprias (`127.0.0.1`, `lotus1.localhost`), que é o que dá
jar de cookie separado —, ou (b) aceitar o comportamento com a receita de perfil de navegador por
árvore, que já está no `.env.example`. Revisar em **2026-10-31**.

O bloco `compose-por-worktree` isolou o cookie de SESSÃO por offset
(`SESSION_COOKIE: lotus_session_${LOTUS_DEV_HTTP_PORT:-8080}`, achado A do review final). O
`XSRF-TOKEN` ficou de fora, e não por esquecimento: o nome é **cravado** no framework —
`PreventRequestForgery::newCookie()` (`Illuminate/Foundation/Http/Middleware`, linha 242) monta
`new Cookie('XSRF-TOKEN', …)` com `path` e `domain` de `config('session')`. Não há chave de config
que o renomeie, e o axios lê `XSRF-TOKEN` por default (`withXSRFToken: true`,
`frontend/src/shared/api/axios.ts`). Cookie não é isolado por porta: `domain=localhost` vale para as
duas árvores.

**Medido em 2026-08-24** (review do bloco), main tree em :8080 e `../lotus-infra` em :8081, jar único:

```
csrf8081 204 | login8081(token proprio) 200
csrf8080(main tree) 204 → XSRF SOBRESCRITO pelo main tree
write8081 apos clobber 419
```

A SESSÃO sobrevive — os dois `me` continuam 200, como o apêndice do DoD provou —, porque `GET` não
passa pelo CSRF (`PreventRequestForgery::isReading()`). Quem quebra é a **escrita**: `POST/PUT/DELETE`
da aba que não chamou o csrf-cookie por último volta 419, e o front não se recupera sozinho —
`initCsrf()` só é chamado no login e no fluxo de senha (`frontend/src/shared/api/csrf.ts`).

**Por que fica aberta:** a saída (a) muda o host de `APP_URL`, `SANCTUM_STATEFUL_DOMAINS`,
`SESSION_DOMAIN` e do dev server — mexe no desenho que o DoD deste bloco provou ponta a ponta e pede
decisão do João, não correção de review; a saída (b) é aceitar. Até lá vale a receita escrita no
`.env.example` da raiz: um perfil de navegador (ou janela anônima) por árvore.

## P-62 — a `main` dos dois repositórios não tem branch protection; a régua é compensada

**Nasceu como `P-61` na branch `cicd/ci-governanca-e-artefato` e foi renumerada no merge da
`main`**, que já trazia uma `P-61` (os `title` do `ProblemDetails` em português) vinda do
fechamento do `hardening-api-arquivos-e-abuso`. Quem renumera é a recém-chegada.

**Bloco:** — (fora de bloco) · **Quem decide:** João · **Gatilho:** orçamento para GitHub Team, ou
a decisão do João sobre a visibilidade de `Andred21/lotus` (emenda de 2026-08-29, abaixo), ou
**2026-10-31**, o que vier primeiro.

O item 11 desenhou `PUT /repos/<owner>/lotus/branches/main/protection` com required checks como o
DoD 5 do bloco. Medido em 2026-08-25: a API responde `403 Upgrade to GitHub Pro or make this
repository public`, e `GET /orgs/Gatika-CL` mostra `plan.name = free`. Rulesets dão o mesmo 403. As
duas saídas do plano original foram **recusadas pelo João**: não há orçamento, e abrir o código de
um cliente do setor elétrico regulado troca confidencialidade por régua, que é preço errado.

**O DoD 5 fechou COMPENSADO, não provado**, e a diferença é material: **nada impede um push direto
em `main`**. O que existe são três camadas que reduzem o dano sem eliminá-lo —
`.githooks/pre-push` (recusa local, e só vale para quem rodou `git config core.hooksPath
.githooks`), o job `procedencia` (commit que chegou em `main` sem PR mesclado **não vira imagem**,
então não é promovível) e `scripts/espelhar-corporativo.sh` (árvore filtrada, um commit por
release, trailer `Source-Commit` conferido contra o histórico de `main` da origem). A camada que
falta é a única que impede de verdade, e ela é a camada 0.

**Fica escrito para não virar silêncio:** force-push em `main` não é impedido, é **detectado e
datado** pelo `procedencia`; e a janela entre o push e a negação do artefato existe. A prova disso
é a própria sonda vermelha `26d0e3e9`, que segue no histórico de `main` do repositório pessoal.

**Fecha quando** o Step 6 da Task 9 do plano arquivado
([`plans/archive/2026-08-24-cicd-ci-governanca-e-artefato.md`](../plans/archive/2026-08-24-cicd-ci-governanca-e-artefato.md))
puder rodar como está e o readback da API mostrar `required_pull_request_reviews` e os cinco
required checks (`backend`, `frontend`, `types-drift`, `audit-prod`, `audit-dev`) ativos nas duas `main`.
Evidência do que foi medido: [`../audits/2026-08-24-cicd-evidencias.md`](../audits/2026-08-24-cicd-evidencias.md).

**Emenda de 2026-08-29 (bloco `prontidao-pre-nuvem`, item 20).** A ficha diz "a `main` dos dois
repositórios não tem branch protection — plano free recusa a API". Medido nesta data: `GET
/repos/Andred21/lotus` responde `"visibility": "public"`, e `ghcr.io/andred21/lotus-app:<sha>`
entrega manifesto **sem autenticação**. O 403 foi medido só em `Gatika-CL/lotus`; **no pessoal,
público, a API aceitaria** — protection é grátis em repositório público. Ou seja: o repositório que
esta ficha registra como fechado por confidencialidade está aberto, e a régua que ele teria de graça
não foi ligada. O João **adiou** a decisão (tornar privado; manter público e ligar protection; ou
manter como está) e o bloco não mudou visibilidade nem protection. Quando protection for ligada onde
couber, os required checks são **cinco**: `audit-dev` decide desde 2026-08-29 (D1 da spec do item
20) — o `image` já depende dele.

**Emenda de 2026-09-26 (bloco `cicd-promocao-deploy-e-rollback`, item 12).** A mesma raiz tira da
promoção o **Environment**: plano free em repositório privado não oferece Environment, required
reviewer nem environment secret, e `Gatika-CL/lotus` não tem nenhum (medido no brainstorming do
item 12). O botão `.github/workflows/deploy.yml` mora no corporativo **sem Environment**, e a
aprovação é a composição que a spec §4 descreve e a §12.1 declara mais fraca: só quem tem escrita no
corporativo dispara `workflow_dispatch`; o input `confirmar` tem de ser exatamente `PROMOVER`; a
`concurrency` é de grupo único e não cancela; o log leva ator e SHA, e o ledger `releases.jsonl` do
host também. A guarda `if: github.repository == 'Gatika-CL/lotus'` impede o repositório público de
promover — provada pelo run `36225909713`, `skipped` com zero passos
([`../audits/2026-09-21-cicd-promocao-deploy-e-rollback.md`](../audits/2026-09-21-cicd-promocao-deploy-e-rollback.md),
Task 12, Step 6). **Fecha junto com esta ficha:** quando a org virar Team, o job `promover` ganha
`environment:` com required reviewer, e os dois secrets de deploy passam a ser do Environment.

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

## P-78 — a assinatura do relator cai para uma página própria quando a folha 1 cresce

**Bloco:** infra-producao-provisionamento-aws (achado da Task 16, não do escopo) · **Gatilho:** fecha
quando um certificado com dado real da Lotus fechar o rodapé na página 1 **e** isso for remedido, ou
quando o João decidir o corte (clamp por comprimento de nome/descrição) e ele for implementado.
Revisar em **2026-10-31**.

Medido em produção em **2026-09-20**, no certificado `LOT-2026-1000` emitido pela UI para provar o
DoD 4: o PDF saiu com **3 páginas** — (1) o certificado, com ~25% do rodapé vazio, (2) só a
assinatura do relator e o aviso legal, (3) o temário do curso. A assinatura é o que se espera ver ao
pé do documento assinado, e ela apareceu sozinha numa folha.

**Não é regressão da nuvem nem defeito novo.** É o trade-off que o próprio template documenta em
[`backend/resources/views/certification/certificate.blade.php`](../../../backend/resources/views/certification/certificate.blade.php),
no comentário do `min-height` da `.page`: com `height` fixo o Chromium pinta o excedente **por cima**
da página seguinte (medido em 2026-08-08 — QR sobre o logo, assinatura sobre o cabeçalho, disclaimer
atravessando a tabela: documento corrompido e sem aviso). Com `min-height` a folha cresce e a
paginação leva o excedente para uma página limpa — "feio, porém íntegro". O mesmo comentário diz que
**o que cortar é decisão de negócio, e está com o João.**

O penhasco que o comentário mede é o `courses.name` passar de ~67 caracteres. **Não foi esse o caso
aqui:** o nome do curso sintético tinha 38. O suspeito é a `description` de 137 caracteres que a
sessão escreveu no curso de prova, que vira a narrativa da folha. **Isso não chegou a ser medido** —
a re-renderização com descrição curta exigia escrita no banco de produção, e a sessão parou antes.
Quem pegar esta ficha começa por aí: encurtar a descrição, re-renderizar e contar as páginas diz se o
gatilho real é o nome, a descrição ou a soma dos dois.

Ligada à [P-28](#p-28--o-fundo-do-certificado-não-reproduz-as-cunhas-nem-separa-a-página-2), que trata
do **fundo** dessa página 2, não da quebra que a cria.

## P-80 — a previsão de custo estoura o teto de D8, e o resize da EC2 piora a conta

**Bloco:** infra-producao-provisionamento-aws (item 10 v2 — chega ao fechamento sem decisão) ·
**Gatilho:** fecha quando o João decidir **as duas coisas na mesma conversa** — o teto (manter 30
USD e cortar, ou elevá-lo ao número real) e o resize (`t4g.small` fica, ou promove a `t4g.medium`)
— e a decisão estiver escrita na spec/ADR que a carrega. Revisar em **2026-10-31**.

Medido em 2026-09-17, na Task 18 do item 10 v2 (`ce get-cost-and-usage`, 01–18/09):

| | USD |
|---|---|
| Gasto real até 17/09 | 21,02 |
| **Previsão do mês** | **35,74** |
| Teto da decisão **D8** | 30,00 |

Quebra: EC2-Compute 9,13 · EC2-Other (EBS) 4,48 · VPC (IPv4 público) 3,55 · Tax 3,36 · Route 53
0,50 · S3 0,002. Parte do custo de VPC é o **EIP cobrado enquanto a instância ficou parada** —
IPv4 público ocioso custa mais, não menos.

**As duas decisões são uma só.** O critério de resize do runbook §12 está **satisfeito** (swap em
694 MiB com o host ocioso; a geração de PDF só passa paginando o ClamAV), mas o `t4g.medium` sobe o
EC2-Compute de ~9 para ~18 USD/mês. Decidir o resize sem decidir o teto produz um teto que já
nasce falso; decidir o teto sem o resize decide sobre um custo que pode dobrar na semana seguinte.

O alarme **existe e funciona** — Budget `lotus-prod-teto`, MONTHLY, 30 USD, `ACTUAL > 100%` e
`FORECASTED > 100%` por e-mail para `jvbatalha32@gmail.com` (o DoD 6 fechou por ele). O que esta
ficha guarda não é a falta do alarme: é que ele **vai disparar**, porque o número que ele vigia já
está estourado na previsão.

## P-81 — a access key que provisionou a produção continua ativa

**Bloco:** infra-producao-provisionamento-aws (item 10 v2 — chega ao fechamento sem execução) ·
**Gatilho:** fecha quando `aws iam list-access-keys --user-name lotus-infra` não devolver mais a
`AKIA3B7BDINPPYESZA6T`. Ação: apagar a chave no console IAM ou por CLI. Revisar em **2026-10-31**.

A `AKIA3B7BDINPPYESZA6T` (usuário `lotus-infra`, criada em 2026-09-04) é a credencial que executou
todo o provisionamento da Fase B. O review de 2026-09-20 a marcou como *apagar no fechamento*; o
João decidiu no gate do mesmo dia **adiar para um bloco futuro**, e a ficha existe para que o
adiamento não vire esquecimento.

**O que já está resolvido, e não se confunda com esta ficha:** a chave vazada
`AKIA3B7BDINPIEP2W4WK` **já não existe** na conta, e o CloudTrail dela devolve três eventos, todos
`GetCallerIdentity` do próprio `lotus-infra` em 2026-09-04 — nenhum uso de terceiro (conferido em
2026-09-17). Esta ficha é sobre a chave **atual**, que não vazou.

**Por que ela não é urgente como a outra foi:** a aplicação em produção não a usa — o `.env` do
host não tem access key nenhuma, o acesso ao S3 vai pelo instance profile `lotus-ec2` (provado no
DoD 3). A chave só serve para operar a conta de fora. Apagá-la não derruba nada; mantê-la é
credencial de longa duração viva sem uso corrente, que é exatamente o que a política de rotação
existe para evitar.

**Quando for apagar, confira antes se ela não é a única via de acesso programático à conta** — se o
MFA do usuário estiver indisponível (o fallback da Task 12), apagar a chave pode deixar a conta
operável só pelo console.

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

## P-16 — Figma põe `Alumnos` como primeira aba; implementado mantém `Redactores`

**Gatilho:** se a Lotus pedir `Alumnos` como aba padrão.

Bloco alunos (2026-07-27, spec D11): divergência aceita por decisão do João no mesmo dia — a ordem
atual fica, a aba `Alumnos` só trocou o empty state fixo pelo conteúdo real.

## P-77 — o registro A de `app.lotusotec.cl` ainda aponta para a hospedagem antiga, e sem ele não há TLS

**Bloco:** — · **Gatilho:** fecha quando `app.lotusotec.cl` resolver **exatamente** o EIP
`18.230.53.197`; a ação é o §11 do `deploy/aws/README.md`, que desde 2026-09-20 tem **quatro**
passos e não um — emitir o certificado, virar os **seis** campos do `.env` para o domínio e para
HTTPS (o sexto, `CERTIFICATE_VALIDATION_URL`, entrou pelo item 29 em 2026-09-25), redeployar (o `deploy.sh` já sobe o overlay sozinho quando o certificado existe) e passar a
renovação para webroot, com `certbot renew --dry-run` como gate. Revisar em **2026-10-31**.

Medido em 2026-09-04 e remedido em 2026-09-17, na Task 19 do item 10 v2:

| Registro | Valor | |
|---|---|---|
| `A` | `185.146.167.195` | hospedagem antiga (WordPress) |
| `AAAA` | `2a07:7800::195` | hospedagem antiga |
| EIP da produção | `18.230.53.197` | — |

O pedido do registro foi disparado à Lotus/agência na Task 1; a zona vive em `ns1–ns4.stackdns.com`
e não temos acesso ao painel. **A prova é a igualdade, nunca "o nome resolve"** — existe curinga
`*.lotusotec.cl` apontando para o WordPress, então qualquer nome responde.

Enquanto o registro não chega, a produção atende em `http://18.230.53.197` (DoD 2, provado na Task
15) e o bloco fecha sem TLS: o overlay `docker-compose.prod-tls.yml`, o `deploy/nginx/tls.conf` e a
catraca deles já estão no repositório desde a Task 7, prontos e nunca exercidos contra um
certificado real. **Nada além do registro A separa os dois estados.**

**Desde o item 29 (2026-09-25), a espera também trava certificado.** Em produção o backend recusa
emitir e baixar certificado enquanto o `CERTIFICATE_VALIDATION_URL` não for https (500 nomeado,
`ValidacaoDeCertificadoNaoConfigurada`), e a chave só se preenche no passo 2 do §11 — o de prova
`LOT-2026-1000` inclusive. É a consequência aceita na spec do item 29 (§4): a proibição do runbook
virou comportamento, e o registro A passou a ser também o que libera a emissão.

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

### Gatilho disparado e não pago — 2026-09-04, `dominio-decisoes-de-rbac-e-semantica` (item 22)

O bloco tocou **`UpdateClientAction.php`** e **`ClientData.php`**, que é o gatilho literal desta
ficha e a casa do **campo 2** (`ClientData::$type = 'client'`). Tocou os dois pelo mesmo motivo
estreito: `UpdateClientAction` só trocou a chamada renomeada (`ensureSingle` → `ensureExactlyOne`) e
`ClientData` só ganhou a regra `UmContatoPrincipal` em `contacts`. **Nenhum dos cinco campos foi
pago.**

Por que não: o `active_work_item` do 22 eram as quatro decisões `D-09`/`D-10`/`D-11`/`D-16`, e o
`/executar-bloco` fecha em "implemente somente `active_work_item`". O remédio (a) — `$type` sem
default, como `bool|Optional` — **move `generated.ts`** e o narrowing do SPA, e chegaria depois do
review do bloco, sem lente nenhuma sobre ele. Decisão do João no gate de fechamento de 2026-09-04:
**anotar e seguir**, mesma forma da P-54, que registra um bloco que teve a oportunidade e não a
usou. Este registro é o que faz a ficha valer alguma coisa para o próximo bloco: o gatilho já
disparou uma vez sem ser pago, e o gatilho não se desarma por isso.

> **As três fichas abaixo foram renumeradas no merge de fechamento (2026-08-28).** Nasceram
> `P-62`, `P-63` e `P-64` na `lane-a` e viraram `P-64`, `P-65` e `P-66`: a `main` já trazia uma
> `P-62` (branch protection, `lane-b`) e uma `P-63` (o `role="list"` do mini-reset, `lane-c`),
> mescladas antes destas. Mesmo movimento que a `P-61`→`P-63` da `lane-c` registra acima — ID
> publicado na `main` não se reusa, e quem renumera é a lane que ainda não tinha mesclado.

## P-64 — a revisão do `RNF-SEC-05` está no ADR-21 mas ainda não foi replicada no Drive

**Bloco:** — · **Gatilho:** o Drive é a fonte canônica e vence os `/docs` (`CLAUDE.md` §3) — enquanto
ele continuar dizendo "Micro-serviço em nuvem com logs das ações do software" para o `RNF-SEC-05`, a
divergência é real, e uma sessão futura que consulte só o Drive pode reabrir uma decisão que o João já
tomou, sem saber que ela existe. Fecha quando o João colar a revisão na fonte canônica (Google Drive,
`Viagem Chile/Projetos/Lotus.cl/V2`). Revisar em **2026-10-31**.

O ADR-21 (`docs/adrs.md`) registra, do lado do código, que os logs de ações do software ficam
centralizados dentro do monólito (canal `seguranca`, `EventoDeSeguranca`) — substituindo a forma
literal do `RNF-SEC-05` —, decisão do João de 2026-08-26 (spec `2026-08-26-hardening-auditoria-privacidade-e-observabilidade-design.md`, **D5**). O ADR documenta a substituição; não a replica na
fonte. Até o Drive ser atualizado, os dois lugares contam histórias diferentes do mesmo requisito.

## P-65 — `RNF-SEC-03` e `RNF-SEC-07` ganharam decisão (D6/D7/D8) sem ganhar ADR, ao contrário do `RNF-SEC-05`

**Gatilho:** João decidir se D6 (três famílias de acesso suspeito), D7 (alerta síncrono) e/ou D8
(segredos seguem em `env_file`, cofre gerenciado adiado ao item 10) merecem ADR próprio no molde do
ADR-21, ou se ficam só como decisão de spec/plano sem registro de arquitetura — e, se merecerem,
abrir pendência de replicação no Drive espelhando a P-64 para a metade de `RNF-SEC-03` que segue sem
cofre. Revisar em **2026-10-31**.

Achado pela `auditar-docs` no fechamento do `hardening-auditoria-privacidade-e-observabilidade`
(2026-08-26), depois da Task 9 já commitada. A spec do bloco (`2026-08-26-hardening-auditoria-privacidade-e-observabilidade-design.md:89`) só escreve a linguagem de "revisão formal por
escrito, não equivalência silenciosa" para **D5** (`RNF-SEC-05`) — por isso só D5 virou ADR-21. D6,
D7 e D8 são decisões do mesmo dia, da mesma spec, com a mesma autoridade (instrução explícita do
João), mas `docs/adrs.md` não tem nenhuma ocorrência de `RNF-SEC-03`, `RNF-SEC-07`, "cofre", "D6",
"D7" ou "D8" — a única metade registrada em ADR é a de D5.

**Não é regressão do bloco:** o brief da Task 9
(`docs/superpowers/plans/archive/2026-08-26-...md`) só pediu ADR-21 para D5, e a spec não pediu revisão formal para as outras três — o bloco fez exatamente o que
foi pedido. O que fica aberto é a assimetria: `docs/operacao-segredos.md` já documenta D8 (a decisão
de adiar o cofre gerenciado ao item 10), mas só como operação, não como decisão de arquitetura
registrada — e `RNF-SEC-03` na fonte canônica do Drive pede "fora do código, em cofre de segredos".
A metade "fora do código" está cumprida; a metade "em cofre" está **datada e atribuída** (item 10),
não revisada — o que é diferente do caso do RNF-SEC-05 (revisado, não adiado), mas ainda é uma
lacuna entre o que o Drive pede hoje e o que o sistema faz hoje que nenhum ADR ou pendência nomeia.

**Três lacunas medidas em D6, do review final do mesmo bloco (2026-08-26).** Não são defeitos da
implementação — o detector faz exatamente o que a D6 escreveu. São perguntas sobre o **escopo** que a
D6 escreveu, e por isso vivem aqui e não viraram patch: mudá-las é redefinir o que cada família
captura e em que chave ela acumula, o que é decisão do João e alimenta diretamente o gatilho acima.

- **Senha CERTA em conta desativada não gera alerta prioritário.** `sessao_de_conta_desativada` só
  dispara pelo `EnsureAccountIsActive`, isto é, para sessão **já aberta** quando a conta cai. Quem
  tenta `POST /api/login` com a senha correta de uma conta desativada é barrado antes disso e sai
  como `login.recusado` comum — o sinal mais forte que existe (alguém TEM a credencial de uma conta
  que foi desligada) some no mesmo balde da senha errada. Some-se que essa linha de log leva
  `chave_hash`, não o `usuario_id`, embora o usuário seja conhecido nesse ponto.
- **`login_falho_repetido` não carrega a chave da evidência.** O alerta emite `familia`,
  `usuario_id` (nulo aqui), `ip` e `ocorrencias`, mas não o `chave_hash` que identifica o balde — e
  `chave_hash` é justamente o campo pelo qual as linhas `login.recusado` correspondentes podem ser
  encontradas. Quem receber o e-mail não tem como ligar o alerta ao rastro sem cruzar por IP e
  horário.
- **Password spraying não acumula em lugar nenhum.** Tanto o `throttle:login` quanto o detector
  chaveiam em `email|ip`. Uma senha por conta, contra 200 contas, do mesmo IP, nunca cruza limiar
  nenhum: cada chave fica em 1. A D6 definiu as famílias por chave de vítima; não existe família por
  atacante.

## P-86 — o dump pré-deploy nunca rodou num deploy de verdade

**Bloco:** cicd-promocao-deploy-e-rollback (item 12) · **Gatilho:** o primeiro release corporativo
que trouxer migration nova. Nele, conferir: a linha `inicio` do `releases.jsonl` com `migrations`
não vazio e `dump` com a chave `s3://…`, esse objeto existindo no S3, e o `verificar-backup.sh`
aprovando. Se houver rollback recusado depois dele, a recusa tem de imprimir essa mesma chave ao
lado da migration (o ramo de `dump_que_introduziu` que acha a linha só rodou em sonda local).
Revisar em **2026-10-31**.

O DoD 6 da spec pede o dump de um deploy com migration pendente. Em 2026-09-25 não havia SHA com
migration além das 30 que a produção já tem, em nenhum dos dois repositórios, e o João decidiu não
fabricar um release-sonda (a migration inútil ficaria para sempre na história e no banco). O que já
está provado: o `backup-db.sh` publica a chave por `LOTUS_BACKUP_SAIDA` (Task 9), o deploy sem
migration registra `"dump": null`, e o `deploy-sh.test.ts` assere o ramo do dump **por texto**
(dump antes do `migrate`, só com `PENDENTES`) — não por execução. O ramo nunca rodou.

## P-87 — o botão promove imagens, mas o host guarda compose, `tls.conf`, `.env` e os próprios scripts de `deploy/bin/` por cópia, e nada avisa quando eles ficam para trás

**Bloco:** cicd-promocao-deploy-e-rollback (item 12) · **Quem decide:** João · **Gatilho:** o
próximo commit que mudar `docker-compose.prod.yml`, `docker-compose.prod-tls.yml`,
`deploy/nginx/tls.conf`, `deploy/aws/env.prod.example` ou `deploy/bin/*.sh`, ou o João escolher o
mecanismo abaixo. Revisar em **2026-10-31**.

Medido em 2026-09-26, antes do primeiro disparo do botão:
- o host rodava o compose do `db8f8736`, sem o healthcheck do clamav que olha a idade da base
  (`f9b56707`, Q-9);
- o overlay e o `tls.conf` eram os do `53ca6ce7`, sem a renovação (Q-6) e sem a isenção do `/up`
  (Q-1);
- o `.env` não tinha 10 das 40 chaves do molde (Q-2). Sem `APP_LOCALE`, a produção respondia em
  `en`.

As três correções vieram do review do item 10, em 2026-09-20, e nenhuma chegou ao host em seis
dias. O runbook §7 só instala esses arquivos quando o host nasce, e o `deploy.sh` — que o botão
invoca — promove **imagens** por SHA. Nada compara o que o host guarda com o que o SHA promovido
espera, e um rollback herda os arquivos do host, não os do SHA alvo. Nesta execução o João
sincronizou tudo à mão (audit do item 12, "Antes do botão"), mas a causa segue aberta: o próximo
desvio passa do mesmo jeito.

Direções, para o João escolher:

- (a) **Detectar:** a imagem `app` carrega os hashes dos arquivos de compose e do `tls.conf`, e os
  nomes das chaves do molde. O gate do `deploy.sh` compara com o host, como já faz com as
  migrations. O host continua sendo a fonte.
- (b) **Entregar:** o botão manda os arquivos de compose e o `tls.conf` pelo próprio SSM antes do
  `deploy.sh`, e o SHA vira a fonte. O `.env` não tem como ir assim, porque tem segredo; dele só
  vale conferir os nomes.
- (c) **Procedimento:** a §8 do runbook ganha o passo "antes de promover, confira a §7", e o risco
  fica aceito por escrito.

**Emenda de 2026-09-26 (review do item 12, Q-4).** A ficha nasceu sem `deploy/bin/*.sh`, que é o
caso mais grave. O botão não leva o `deploy.sh`: ele executa a cópia que está no host. O gate, o
ledger e o dump deste bloco chegaram lá porque o João reinstalou o script à mão ("Antes do botão"
no audit). Uma correção desses scripts pode entrar na `main` e nunca rodar em produção.

O gatilho já disparou. As correções do review mudaram o `deploy.sh`: agora ele grava
`schema_a_frente` e passa o rótulo do dump. Também mudaram o `backup-db.sh`, cuja chave agora vai
até o segundo e aceita rótulo. **Depois do merge, os dois precisam ser reinstalados pela §7 do
runbook antes do próximo disparo do botão.** Enquanto isso não acontecer, o host continua com a
versão anterior. Nada quebra, mas o escape não deixa rastro, e o dump do deploy pode colidir com o
do cron.

As direções mudam assim:

- Em (a), o `deploy.sh` não consegue conferir a si mesmo. Uma cópia velha não tem a conferência
  nova. Para os scripts, quem detecta é o workflow: ele pede o `sha256sum` de `/opt/lotus/bin/*.sh`
  por SSM e compara com o SHA promovido.
- Em (b), os scripts entram no pacote que o SSM entrega, junto com o compose e o `tls.conf`.

**Disparo de 2026-09-26, pago à mão.** O review do item 12 mudou `deploy.sh` e `backup-db.sh`
(`19aeb734`). Depois do merge e do espelho, o João reinstalou os dois pelo runbook §7, às 08:40Z.
Host, `origin/main` e o corporativo `df30a6bd` ficaram com os mesmos hashes, e o botão promoveu o
`df30a6bd` com o script novo (audit do item 12, "Depois do fechamento"). **A causa segue aberta:**
foi de novo sincronização manual, e nada teria avisado se ela não acontecesse.


## P-88 — o `deploy.sh` aceita promover imagem de qualquer dono do GHCR, inclusive do repositório pessoal

**Bloco:** — (fora de bloco) · **Quem decide:** João · **Gatilho:** o próximo commit que mudar
`deploy/bin/deploy.sh` (o mesmo da **P-87**, para que o host receba as duas correções numa
reinstalação só), ou o João promover a correção. Revisar em **2026-10-31**.

**A regra:** a produção roda **sempre** imagem de `ghcr.io/gatika-cl/`, nunca de
`ghcr.io/andred21/`. Decisão do João em 2026-09-26, no fechamento do item 12.

**Hoje ela vale por padrão, não por mecanismo.** O `deploy.sh` monta o nome das três imagens com
`DONO="${LOTUS_RELEASE_OWNER:-gatika-cl}"`: o dono é uma variável de ambiente com `gatika-cl` como
padrão. Um `LOTUS_RELEASE_OWNER=andred21 /opt/lotus/bin/deploy.sh <sha do pessoal>` por SSH promove
o trio do repositório pessoal. As imagens de `andred21` são **públicas** no GHCR, então o pull nem
precisa de credencial. Nenhuma catraca de `frontend/tests/deploy-sh.test.ts` reprova isso.

**Medido em 2026-09-26, só por leitura, e a produção estava certa:**
- os quatro containers nossos (`app`, `scheduler`, `nginx`, `clamav`) rodam
  `ghcr.io/gatika-cl/lotus-*:1142911b…`, e as sete imagens `ghcr.io` em cache no host são todas de
  `gatika-cl`;
- `1142911b`, `a5fc92bb` e `683e6221` existem em `Gatika-CL/lotus` como `release: espelho de …`,
  com `Source-Commit`, e o `1142911b` não existe em `Andred21/lotus` (422);
- o ledger tem seis deploys, todos para `1142911b` ou `a5fc92bb`;
- `LOTUS_RELEASE_OWNER` não aparece em `/opt/lotus`, em `/etc/environment` nem no perfil do root,
  e o `deploy.yml` não a passa no comando do SSM.

**Fecha quando:**
- o `deploy.sh` tiver `gatika-cl` fixo, sem variável de ambiente;
- uma catraca em `deploy-sh.test.ts` reprovar qualquer outro dono, e for vista reprovar pela sonda
  que devolve o `${LOTUS_RELEASE_OWNER:-…}`;
- o host tiver o `deploy.sh` novo, pela reinstalação do runbook §7.
