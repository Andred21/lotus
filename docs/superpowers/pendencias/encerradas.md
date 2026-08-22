# Pendências encerradas

> Mantidas **1 sprint** para rastro e removidas no `/fechar-sprint` seguinte. O rastro durável de
> tudo que já saiu daqui vive no git e na linha da entrega em
> [`../historico/progress.md`](../historico/progress.md) ou
> [`../historico/progress-archive.md`](../historico/progress-archive.md).

## Em rastro (saem no próximo `/fechar-sprint`)

## P-18 — página de fechamento do Notion com `Sprint` divergente

**Bloco:** BD-15-docs-guardrails-e-sincronizacao · **Gatilho:** fecha quando o João corrigir a propriedade manualmente no Notion.

A página `Fechamento técnico de sprint` (id `f88bc9603dfa8253b40981686f8ae023`) tem
`Descrição: "Fechamento — Sprint 3"` mas a propriedade `Sprint` real é `Sprint 2 · Comercial`.

Doc-sync 2026-07-30 (achado E3-05): mislabel dentro do próprio Notion, fora do escopo de escrita
autorizado pelo D11 da spec daquele bloco (que só cobre critério de aceite de H.1.3.1 e status de
task) — só reportado, não corrigido.

**Encerrada em 2026-08-22 pelo BD-15.** O ID desta ficha é da base **obsoleta** e está `deleted`; o alvo canônico é `3a2bc9603dfa8067902cf3c62bffdb0d`. Quem cedeu foi a descrição, não a propriedade: a página irmã `3a2bc9603dfa8028a1fbf8a3863690ed` já é a da Sprint 3, com o mesmo EAP e a mesma descrição. Antes/depois em `docs/superpowers/audits/2026-08-22-bd15-notion-sync.md`.

---

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

**Encerrada em 2026-08-22 pelo BD-15.** O João autorizou o ADR novo: `docs/adrs.md` ganhou o **ADR-20 — Ingestão de planilhas por streaming (OpenSpout)**, depois do ADR-19.

---

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

**Encerrada em 2026-08-22 pelo BD-15.** O ADR-12 de `docs/adrs.md` ganhou a `**Nota (2026-08-22)**` que registra `simplesoftwareio/simple-qrcode ^4.2` como gerador do QR embutido no HTML do certificado — nota no ADR hospedeiro, não ADR novo, pelo mesmo precedente da rota LibreOffice.

---

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

**Encerrada em 2026-08-22 pelo BD-15.** O João decidiu declarar, não restaurar: o cabeçalho de `docs/superpowers/historico/progress.md` passou a dizer, em blockquote, que as cinco colunas são deliberadas e onde ler o contexto que o `progress-archive.md` mantinha em coluna própria.

---

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

**Encerrada em 2026-08-22 pelo BD-15.** A premissa errada virou a **lição 18** de `docs/README.md` ("RBAC de uma rota não se lê no arquivo de rotas") e ganhou nota de encerramento na linha da entrega do BD-6 em `docs/superpowers/historico/progress-archive.md:74`. Plano e spec do BD-6 seguem **não** retro-editados, pela regra da P-27. As coordenadas citadas foram remedidas contra HEAD: a declaração está em `CourseController.php:24` (hoje cobrindo `['index','show','archived']`) e o `apiResource` em `Catalog/routes.php:18`.

---

## P-43 — `der-fisico.md` listava `certificates` como "planejada", e as tabelas existem desde a Sprint 4

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

**Encerrada em 2026-08-22 — pelas DUAS lanes, em paralelo, e o merge delas é o registro final.**
A `lane-a` (`feedbacks-resolver-escopo`) a fechou pelo gatilho literal: o commit `608a436c` tocou
`docs/der-fisico.md` por outro motivo (mapear RF-FBK à documentação de turma). A `lane-c` (BD-15) a
fechou pelo escopo próprio, com **ampliação autorizada pelo João**. As duas mediram contra
`backend/database/migrations/2026_08_05_100000_certificates.php` e chegaram a sítios que se somam:

- **Os quatro sítios de status da ficha** perderam o "(planejada)" — `courses` 1:N, `enrollments`
  1:1, a linha de descrição e o contador.
- **Um quinto sítio, que a ficha não contava** (medido pela `lane-a`): a seção `Tabelas PLANEJADAS`
  ainda abria com "Não existem como migration ainda" e trazia as duas tabelas em rascunho PT/ES.
  Virou `Tabelas que NÃO existem (e por quê)`, que hoje só guarda o registro da decisão de Feedback.
  A legenda do topo que explicava "Tabelas planejadas = mantidas em PT/ES" saiu junto: nenhuma
  tabela de domínio segue no papel.
- **A premissa da própria ficha caiu** (medido pela `lane-c`): a linha 74 **não** estava correta —
  omitia `redator_id`, `snapshot`, `revoked_at`, `revocation_reason`, `timestamps` e a coluna gerada
  `active_enrollment_id`, e inventava um `qr_code_hash` que **não existe em lugar nenhum do backend**
  (`grep` vazio). As duas lanes reescreveram a ficha a partir da migration, não do rascunho.
- **Existência provada contra o banco de dev** (`lane-a`): `certificates` com 6 linhas,
  `certificate_sequences` com 1.

**O contador foi a única coisa que as duas lanes escreveram diferente, e o merge o remediu por
medição.** A `lane-a` gravou `25 tabelas — 18 de domínio`; a `lane-c`, `28 — 21 (20 implementadas,
`feedbacks` no papel)`. Nenhum dos dois sobreviveu ao merge: a `lane-a` descopou a tabela `feedbacks`
e a `lane-c` acrescentou `login_logs` e `invitation_tokens`, que faltavam na enumeração. Contado
pelos `Schema::create` das migrations em 2026-08-22, o valor é **27 tabelas — 20 de domínio, todas
implementadas + 7 RBAC/transversal**, e é o que o documento carrega.

A ausência de ficha de colunas de `invitation_tokens` virou a **P-52**.

**Sai quando:** primeiro fechamento **posterior** a este.

---

## P-50 — a suíte unida passou do `memory_limit` de 128M do container e o comando documentado morria no meio

**Bloco:** infra-producao-runtime-e-aws · **Gatilho:** o João decidir o `memory_limit` da imagem, ou
o primeiro bloco que tocar `docker/php/`.

O comando que o `CLAUDE.md` §6 documenta — `docker compose exec -T app php artisan test` — morria com
`Allowed memory size of 134217728 bytes exhausted` dentro de `ManualTurmaTest`, sem que teste nenhum
estivesse errado: o pico real da suíte foi de 127,00 MB (2026-08-20) para 129,00 MB, **acima** do
teto de 128M. Reproduzida em quatro fechamentos seguidos (BD-17, BD-14, BD-18 e BD-12), sempre pelo
mesmo mecanismo, e sempre contornada pelo binário direto com `-d memory_limit` elevado, porque o
`artisan test` reexecuta o PHPUnit em subprocesso que não herda a diretiva.

**ENCERRADA em 2026-08-22, no `infra-producao-runtime-e-aws`.** O gatilho venceu pelas duas metades
ao mesmo tempo: o bloco tocou `docker/php/` **e** o João decidiu o número. O impasse que a ficha
nomeava — `conf.d` vale para os dois SAPIs, então subir o CLI subiria o teto por processo do PHP-FPM
de produção — foi resolvido separando por SAPI, não escolhendo um lado:

| SAPI | Onde | Valor | Base da medição |
|---|---|---|---|
| CLI | `docker/php/memory-cli.ini` (nas duas imagens) | `320M` | menor múltiplo de 64M acima do **dobro** do pico medido de 129,00 MB |
| FPM | `php_admin_value[memory_limit]` em `docker/php/www.conf` | `256M` | pico de request medido na execução, com `pm.max_children = 5` fixado para a conta de sizing fechar |

**Quarta reprodução, medida na `main` em paralelo a este bloco** (fechamento do
`feedbacks-resolver-escopo`, 2026-08-22, suíte já em 877 testes): mesmo `Allowed memory size of
134217728 bytes exhausted … PhpEngine.php on line 62`, e `php -d memory_limit=1G vendor/bin/phpunit`
devolvendo **877 passed / 5 skipped, 3131 asserções** com **pico de 129 MB**. Terceira medição
consecutiva com o pico encostando ou passando o teto — 129, 127 e 129 MB. Ela entrou na ficha depois
que este bloco já a tinha fechado, e fica registrada porque **mede a mesma suíte maior** que o valor
novo precisa aguentar: 877 testes, não os 867 do gate desta branch.

**Prova de que fechou, medida no gate deste bloco e não citada:** o comando documentado do §6 roda
inteiro e devolve `5 skipped, 867 passed (3095 assertions)` em 58,49s, sem estouro de memória. É a
primeira vez desde 2026-08-19 que o gate de backend não precisa do contorno.

---

## Rastro anterior, já removido

A **P-40** (o ramo "catálogo genuinamente vazio" do BD-6 medido em `d20bebc`, não remedido contra
HEAD) foi encerrada em 2026-08-22, no `bd12-load-state-e-listas`, e saiu aqui, no fechamento do
`feedbacks-resolver-escopo` (2026-08-22) — o primeiro **posterior** ao do BD-12, que é o que a linha
do índice pedia. A **P-29** (corrida de unicidade entre transações subindo 500) e a **P-35** (o ADR-17 defendido em
duas profundidades) foram encerradas em 2026-08-20, no `bd14-contrato-de-entrada`, e saíram aqui, no
fechamento do `bd12-load-state-e-listas` (2026-08-22) — o primeiro **posterior** ao do BD-14, que é o
que a linha do índice pedia. A **P-36** (catraca `COR_HARDCODED` cega para `style={{ }}`) e a
**P-37** (`FormField` sem `htmlFor`) foram encerradas em 2026-08-18 e saíram no fechamento do
`bd13-listagens-e-abas`. A **P-45** (o `TestCase` lendo `FRONTEND_URL` cru) saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19). A **P-40** (o ramo "catálogo genuinamente vazio" medido
em `d20bebc` e não remedido contra HEAD) foi encerrada em 2026-08-22, no `bd12-load-state-e-listas`,
e saiu aqui, no fechamento do `BD-15-docs-guardrails-e-sincronizacao` — o primeiro **posterior** ao
do BD-12, que é o que a linha do índice pedia. O rastro durável de todas está nos commits (`8ffdefa`,
`efd5bfe`, `0672019`, `2ad35d7` e `6fd0ad8`) e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
