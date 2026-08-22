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

**Bloco:** hardening-acesso-ownership-e-integridade · **Gatilho:** fecha quando um bloco tocar um dos seis escritores de filho
listados abaixo por outro motivo e puder absorver o lock, ou quando um filho ativo sob pai
arquivado for observado em uso real. Revisar em **2026-10-31**.

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

## P-50 — a suíte unida passou do `memory_limit` de 128M do container e o comando documentado morre no meio

**Bloco:** infra-producao-runtime-e-aws · **Gatilho:** o João decidir o `memory_limit` da imagem (a mesma que roda em produção),
ou o primeiro bloco que tocar `docker/php/`. Revisar em **2026-10-31**.

Medido no merge da `main` para a `feat/arquivados-roots-restantes` (2026-08-19). Com as duas suítes
juntas — **866 testes** (medição de 2026-08-20; eram 828 em 2026-08-19) —, o comando que o `CLAUDE.md` §6 documenta,
`docker compose exec -T app php artisan test`, morre em

```
Fatal error: Allowed memory size of 134217728 bytes exhausted … PhpEngine.php on line 62
Fatal error: Premature end of PHP process when running Tests\Feature\Operation\ManualTurmaTest::test_turma_maior_que_o_formulario_estende_as_grades.
```

**Não é defeito do teste nem do merge:** `--filter=ManualTurmaTest` passa em 2,35s (13 testes), e a
suíte inteira fecha **verde** quando o limite sobe —
`docker compose exec -T app php -d memory_limit=1G vendor/bin/phpunit` devolve
**828 passed / 5 skipped, 3006 asserções** (medição de 2026-08-19), com **pico de 129 MB**. São 129 contra 128: a suíte
cresceu 1 MB além do default do PHP, e quem estoura é o render de Blade do manual porque ele é o que
aloca mais no fim da corrida.

**O `-d` não resolve pelo `artisan test`:** ele reexecuta o PHPUnit em subprocesso, que não herda a
diretiva da linha de comando — por isso a medição usa o binário direto.

**Reproduzida de novo no fechamento do `feedbacks-resolver-escopo` (2026-08-22), com a suíte já em
877 testes:** o comando documentado morreu no mesmo `Allowed memory size of 134217728 bytes
exhausted … PhpEngine.php on line 62`, em
`Tests\Feature\Operation\ManualTurmaTest::test_manual_devolve_pdf_convertido_do_docx` — o mesmo
teste do vencimento de 2026-08-20, e não o do topo desta ficha. Qual dos testes de manual estoura
oscila com a ordem da corrida, não é sintoma próprio: este passa isolado em
0,48s (`--filter`, 6 asserções, pico de 73 MB), e a suíte inteira fecha verde pelo binário direto —
`php -d memory_limit=1G vendor/bin/phpunit` devolve **877 passed / 5 skipped, 3131 asserções**, com
**pico de 129 MB**. Terceira medição consecutiva em que o pico encosta ou passa o teto: 129, 127 e
129 MB.

**Reproduzida no fechamento do BD-17 (2026-08-20), na árvore `fix-frontend`:** mesmos dois `Fatal
error` pelo comando documentado, e `php -d memory_limit=512M vendor/bin/phpunit` devolve os mesmos
**828 passed / 5 skipped, 3006 asserções** — desta vez com **pico de 127,00 MB**. O pico oscila
abaixo do teto e o comando documentado morre assim mesmo, que é o argumento de que a margem não
existe: quem estoura é o overhead do runner do `artisan`, somado a uma suíte que já ocupa o limite.

**Reproduzida de novo no fechamento do BD-18 (2026-08-20), na mesma árvore `fix-frontend`:** o
comando documentado morreu com `Allowed memory size of 134217728 bytes exhausted` dentro de
`Tests\Feature\Operation\ManualTurmaTest`, e `php -d memory_limit=512M vendor/bin/phpunit`
devolveu **872 passed / 5 skipped, 3095 asserções** com **pico de 129,00 MB**. A suíte cresceu 44
testes desde o fechamento anterior e o pico subiu junto — de 127,00 para 129,00 MB, agora **acima**
dos 128M do teto. O que era margem inexistente virou déficit medido: o gatilho não mudou, mas o custo
de adiar sim.

**Por que não se conserta aqui:** `docker/php/uploads.ini` vira `/usr/local/etc/php/conf.d/` na
imagem, e `conf.d` vale para os DOIS SAPIs — subir `memory_limit` para o CLI sobe também o teto por
processo do PHP-FPM que roda em produção (EC2). É decisão de infra do João, não emenda de merge.
**Enquanto não fecha, o gate de backend roda pelo binário direto com `-d memory_limit=1G`.**

**Gatilho visto vencer de novo em 2026-08-20** (fechamento do `bd14-contrato-de-entrada`): o mesmo
fatal, agora em `ManualTurmaTest::test_manual_devolve_pdf_convertido_do_docx`, e o gate rodou por
diretório — **866 passed / 5 skipped**. Medido também que `php -d memory_limit=512M artisan test`
**não** contorna: a diretiva não desce para o subprocesso do PHPUnit, exatamente como a ficha diz.

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

## P-47 — os redatores do seed não têm a role `redator`, e o bloco que a criou só a atribui adiante

**Bloco:** hardening-acesso-ownership-e-integridade · **Gatilho:** o bloco que puder reseedar o banco de dev (mesmo gatilho da
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

## P-41 — o `IdentityCell` empilhado promete truncar e não trunca

**Bloco:** frontend-hardening-final · **Gatilho:** fecha quando o João decidir que a coluna deve cortar — aí volta o `min-w-0` **e** o
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

## P-18 — página de fechamento do Notion com `Sprint` divergente

**Bloco:** BD-15-docs-guardrails-e-sincronizacao · **Gatilho:** fecha quando o João corrigir a propriedade manualmente no Notion.

A página `Fechamento técnico de sprint` (id `f88bc9603dfa8253b40981686f8ae023`) tem
`Descrição: "Fechamento — Sprint 3"` mas a propriedade `Sprint` real é `Sprint 2 · Comercial`.

Doc-sync 2026-07-30 (achado E3-05): mislabel dentro do próprio Notion, fora do escopo de escrita
autorizado pelo D11 da spec daquele bloco (que só cobre critério de aceite de H.1.3.1 e status de
task) — só reportado, não corrigido.

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

---

## P-51 — a lei "ausente não é nulo" não alcança propriedade com default literal, e um dos seis campos é acesso

**Bloco:** hardening-acesso-ownership-e-integridade · **Gatilho:** o João decidir o remédio do `is_active` (é controle de acesso, sai antes
dos outros cinco); os demais, o primeiro bloco que tocar `UpdateClientAction`/`UpdateCourseAction`,
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
