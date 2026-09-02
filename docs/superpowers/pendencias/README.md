# Pendências — índice

> Divergências e dívidas **já registradas**. A skill `auditar-docs` lê esta pasta e **não reporta
> nada daqui como achado novo**. Toda pendência tem gatilho — pendência sem prazo vira mentira
> permanente (lição 13). Revisada a cada `/fechar-sprint`.
>
> Isto NÃO é backlog de produto — item de código/feature vai para `docs/superpowers/backlog.md`.
> Aqui mora só o que faz um doc ou um mecanismo divergir da realidade.

| Arquivo | O que tem |
|---|---|
| [`abertas.md`](./abertas.md) | Ficha completa de cada pendência viva — diagnóstico, por que ficou aberta e gatilho |
| [`encerradas.md`](./encerradas.md) | Fechadas, mantidas **1 sprint** para rastro e depois removidas |

## Como ler

A ficha é a fonte; esta tabela é só o mapa. A coluna **Bloco** diz em que bloco da fila do
`backlog.md` a pendência foi agrupada — agrupar não promove nem autoriza nada, só declara com quem
ela sai barata. Na consolidação de **2026-08-22**, pendências que dependiam de decisão do João
ganharam bloco quando o novo backlog resolve essa decisão no brainstorming do próprio bloco; a
coluna Gatilho preserva a condição. `—` significa que ela segue **fora** de bloco: depende de
decisão isolada do João ou da Lotus (tabela "Decisões não promovíveis" do backlog).

## Abertas (33)

### Agrupadas em bloco de execução

| ID | Pendência | Bloco | Gatilho |
|---|---|---|---|
| P-71 | Cinco recusas que o usuário lê continuam literais fora de `lang/` (`CorruptedSnapshotException`, `RedatorNaoElegivelException`, `TurmaConfiguracaoException`) — a catraca as segura em lista declarada, não as traduz | — | bloco que tocar `Certification/Services` ou `Operation/Exceptions`; revisar 2026-10-31 |
| P-72 | O 419 devolve `detail` literal em inglês nos três locales (`CSRF token mismatch.`) — o `title` foi traduzido, o `detail` do `TokenMismatchException` vence o fallback | — | bloco que tocar `ProblemDetails::fromException` ou a proteção CSRF; revisar 2026-10-31 |
| P-70 | O `screenDetail` continua calando o `detail` do servidor depois que ele passou a ser localizado — erro de GET mostra a dica genérica em vez do que o servidor disse | `frontend-dividas-de-mecanismo` (item 25) | o item 25 é o bloco de política de erro de tela que a ficha pedia; revisar 2026-11-30 |
| P-69 | O vitest não tem `setupFiles`, então o `cleanup()` do Testing Library nunca roda — teste que monta hook com timer derruba a rodada inteira com `window is not defined`, sem reprovar asserção | `frontend-dividas-de-mecanismo` (item 25) | o item 25 toca `frontend/vite.config.ts`, que é o gatilho escrito na ficha; revisar 2026-10-31 |
| P-68 | O `max-lines` mede arquivo de teste em `features/*/components` e não mede em `app/**`, e só a isenção tem razão escrita | `frontend-dividas-de-mecanismo` (item 25) | João alinha as duas camadas ou escreve a razão da assimetria no brainstorming do item 25; revisar 2026-10-31 |
| P-30 | O `warning` segue com o laranja de stock do Lara; o âmbar de marca nunca foi construído | `frontend-dividas-de-mecanismo` (item 25) | a sessão de tema que a `D-69` abre no item 25 é onde a decisão cabe; revisar 2026-10-31 |
| P-42 | Grafia construída do `IdentityCell` diverge da D1 da spec do próprio bloco | `frontend-dividas-de-mecanismo` (item 25) | João escolhe entre reescrever o D1 com a grafia construída e devolver o código ao D1, no brainstorming do item 25; revisar 2026-10-31 |
| P-05 | Migrations "adicionais" não consolidadas nas originais | `go-live-confiabilidade-e-recuperacao` | antes de subir para produção |
| P-44 | Onze usuários de sonda de gates antigos vivem no banco de dev — 2 aparecem no dashboard | `go-live-confiabilidade-e-recuperacao` | bloco que puder reseedar o dev; revisar 2026-10-31 |
| P-32 | Guarda da lição 13 confere path, não classe — o caso que a motivou passa verde | BD-15 | lição 13 reincidir por **classe**, ou decisão explícita do João; revisar 2026-10-31 |
| P-31 | O ponto 5 do ADR-16 está em `docs/adrs.md` e não no espelho do Drive | BD-15 | ponto 5 no `decisao-stack.md` do Drive; revisar 2026-09-30 |
| P-22 | H.1.3.1 existe duas vezes dentro da base Notion canônica | BD-15 | João apagar ou mesclar uma das cópias |

> `BD-15` = `BD-15-docs-guardrails-e-sincronizacao`, item 14 da fila.
>
> `frontend-dividas-de-mecanismo` = item 25 da fila, aberto em 2026-09-02: juntou as **cinco**
> fichas acima, que estavam em *Travadas em decisão* sem hospedeiro, com o débito `D-69`. As três
> mecanizáveis (`P-70`, `P-69`, `D-69`) foram remedidas contra `main@5f6daf8b` antes de o item ser
> escrito e seguem vivas no código; as duas restantes (`P-68`, `P-30`) e a `P-42` fecham por
> decisão escrita do João no brainstorming, que é o gatilho que elas já declaravam.

### Travadas em decisão — não entram em bloco

| ID | Pendência | Quem decide | Gatilho |
|---|---|---|---|
| P-57 | O `artisan test` do `CLAUDE.md` §6 fatala por memória em worktree cuja imagem `app` é anterior ao `memory-cli.ini` | João | §6 mandar construir a imagem em worktree nova; revisar 2026-10-31 |
| P-58 | `compose-dev.test.ts` afasta os `.env*` da raiz mas não o `frontend/.env`: árvore com `VITE_API_URL` legado reprova 3 casos | João | o teste isolar também o `frontend/.env`; revisar 2026-10-31 |
| P-28 | O fundo do certificado não reproduz as cunhas das quinas nem separa a página 2 | João / Lotus | fundo distinguir página 1 **e** cunhas existirem, ou Lotus aprovar como está; revisar 2026-09-30 |
| P-08 | RF-CUR-04 promete Manual por curso; implementado é Blade única | Lotus | contratante pedir manual personalizado por curso |
| P-09 | Figma mostra 4 tipos de documento de turma; implementados são 3 | Lotus | Lotus confirmar que quer os 4 |
| P-10 | Coluna CLIENTE da tabela de alunos foi omitida | Lotus | Lotus pedir alunos de múltiplos clientes na mesma turma |
| P-13 | Figma mostra código próprio de turma; implementado renderiza `quote_code` | Lotus | Lotus pedir identificador próprio de turma |
| P-16 | Figma põe `Alumnos` como primeira aba; implementado mantém `Redactores` | Lotus | Lotus pedir `Alumnos` como aba padrão |
| P-49 | Eixos **redator** e **turma** fechados em 2026-08-23 (`lockForWrite()` nos cinco escritores + catraca); resta a janela **cotação × orçamento** | João | bloco que tocar `RestoreQuoteAction`/`DeleteBudgetAction` e puder travar os dois lados; revisar 2026-10-31 |
| P-51 | Default literal em DTO de entrada — o campo de **acesso** (`is_active`) fechou em 2026-08-23; restam **cinco** campos sem controle de acesso | João | bloco que tocar `UpdateClientAction`/`UpdateCourseAction`, `BudgetController::update` ou `CourseTemplateController::update`; revisar 2026-10-31 |
| P-52 | `invitation_tokens` existe desde 2026-08-18 e não tem ficha de colunas no `der-fisico.md` | João | João apontar o bloco que a documenta, ou bloco que tocar `invitation_tokens`; revisar 2026-10-31 |
| P-53 | A auditoria do fechamento do BD-15 mediu 12 divergências de doc que nenhum bloco tinha no escopo — `Certification` e `Dashboard` na frente | João | bloco que tocar `estrutura-monolito.md` ou `backend-ddd.md` por outro motivo; revisar 2026-10-31 |
| P-54 | Os testes da migration de permissões de feedback não cobrem o filtro `guard_name` nem o `forgetCachedPermissions()` (achado Q-4) | João | próximo bloco que escrever migration de permissão e puder absorver as duas assertivas; revisar 2026-10-31 |
| P-55 | A invariante proíbe a lane de escrever os campos singulares do `state.md`, mas cada lane precisa do espelho apontando para si na própria árvore — e três lanes já fizeram isso | João | João escolher entre reescrever a invariante ou dar ao espelho um mecanismo próprio; revisar 2026-10-31 |
| P-56 | O `XSRF-TOKEN` não é isolado entre árvores — a escrita da aba parada volta 419 (medido) | João | João escolher entre isolar por host ou aceitar a receita de perfil por árvore; revisar 2026-10-31 |
| P-59 | `config/app.php:75` fixa `'timezone' => 'UTC'` como literal, sem `env()` — o `APP_TIMEZONE` do `.env.example` é ignorado e toda data derivada no servidor roda em UTC | João | bloco que tocar `config/app.php` ou derivação de data no servidor; revisar 2026-10-31 |
| P-60 | Um certificado do banco de dev tem snapshot sem `aluno.name`, e a validação **pública** dele devolve 500 (o gate de snapshot apresentável estoura numa rota que o QR impresso alcança) | João | bloco que puder reseedar/corrigir o dev, ou decisão sobre degradar em vez de estourar; revisar 2026-10-31 |
| P-62 | A `main` dos dois repositórios não tem branch protection — plano free recusa a API; a régua é compensada em três camadas | João | orçamento para GitHub Team (ou decisão de abrir o repositório); revisar 2026-10-31 |
| P-64 | A revisão do `RNF-SEC-05` está no ADR-21 mas ainda não foi replicada no Drive (fonte canônica) | João | Drive continuar dizendo "Micro-serviço em nuvem" enquanto o ADR-21 já revisou o requisito; revisar 2026-10-31 |
| P-65 | `RNF-SEC-03`/`RNF-SEC-07` ganharam decisão (D6/D7/D8) sem ganhar ADR, ao contrário do `RNF-SEC-05` (ADR-21) — mais três lacunas medidas no escopo da D6 | João | João decidir se D6/D7/D8 merecem ADR próprio e se as três lacunas da D6 mudam as famílias; revisar 2026-10-31 |

## Encerradas (0)

**Nenhuma em rastro.** A **P-67** saiu de vez no fechamento do
`frontend-campo-de-formulario-liga-no-form` (2026-09-02), o primeiro posterior ao do bloco que a
encerrou — a escala de raio virou dois tokens no `@theme` e a catraca `RAIO_LITERAL` nasceu verde; o
rastro durável está nos commits e na linha de entrega do item 21 em
[`../historico/progress.md`](../historico/progress.md).

**A P-61 e a P-63 saíram neste fechamento** (`frontend-decisoes-de-ui-pendentes`, 2026-09-01), o
primeiro posterior aos dos dois blocos que as encerraram em 2026-08-30 — os `title` do
`ProblemDetails` em `lang/<locale>/problem.php` nos três locales (P-61, com a borda do 419 viva na
**P-72**) e a legenda própria do `AppLineChart` (P-63). O rastro fica em
[`encerradas.md`](./encerradas.md), nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-66 saiu no fechamento do `frontend-triagem-dos-audits-do-item-18` (2026-08-30)**, o primeiro
posterior ao do `hardening-performance-e-dados`, que a encerrou por mecanismo: a migration
`2026_08_28_000001_add_performance_indexes` criou o `login_logs_created_at_index` que o `EXPLAIN` do
`DELETE ... LIMIT 1000` passou a usar. O rastro fica no git e na linha de entrega em
[`../historico/progress.md`](../historico/progress.md).

**A P-02, a P-33 e a P-46 saíram nos fechamentos de 2026-08-29** (itens 6 e 18), os primeiros posteriores aos dos
blocos que as encerraram. A retenção de `audits` e de `login_logs` saiu por mecanismo
(`RetentionPolicy`, `PodarAuditoria`, `PodarLogins`, o índice `audits_created_at_index` e o
agendamento em `routes/console.php`/`scheduler`); a **P-46** saiu **remedida**, com o mini-reset
escopado de `index.css` sob catraca própria (`frontend/tests/preflight-escopado.test.ts`) e a borda
que ele abriu viva e nomeada na **P-63**. O rastro fica em [`encerradas.md`](./encerradas.md), nos
commits e nas linhas de entrega em [`../historico/progress.md`](../historico/progress.md).

**A P-46, a P-02 e a P-33 saíram neste fechamento**, o primeiro posterior aos dos blocos que as
encerraram: o mini-reset escopado de `index.css` com catraca própria (P-46, cuja borda virou a
**P-63**) e a retenção por mecanismo — `RetentionPolicy`, `PodarAuditoria`, `PodarLogins`, o índice
`audits_created_at_index` e o agendamento em `routes/console.php`/`scheduler` (P-02 e P-33). O
rastro delas está em [`encerradas.md`](./encerradas.md). A **P-03** e a **P-15** saíram nos dois fechamentos de 2026-08-25 — a
fatia 2 do `frontend-revisao-ui-por-modulo` e o `hardening-api-arquivos-e-abuso` —, os primeiros
posteriores aos dos blocos que as encerraram, e as duas foram remedidas antes de sair: o offset
injetado no container da worktree (medido com `printenv`), as seis `LOTUS_DEV_*` do
`docker-compose.yml`/`.env.example` no main tree e o `StudentTurmaData::$certificate` no detalhe do
aluno. A ficha viva mora em [`abertas.md`](./abertas.md); o rastro completo, em
[`encerradas.md`](./encerradas.md).

**A P-41 saiu no fechamento do `tabelas-coluna-de-acoes-e-largura` (2026-08-24)**, o primeiro
posterior ao do bloco que a encerrou, remedida antes de sair (`min-w-0` em `IdentityCell.tsx:74`).

**A P-47 e a P-50 saíram no fechamento anterior**, o primeiro posterior aos dos blocos que as encerraram
— e as duas foram **remedidas antes de sair**, não removidas na fé: os 9 redatores do dev carregam a
role e o `artisan test` do §6 terminou. **A P-40 saiu nos três fechamentos de 2026-08-22**,
posteriores ao do BD-12. **A P-29 e a P-35** já haviam saído no fechamento do BD-12, pelo mesmo
critério contra o BD-14. O rastro de todas fica nos commits e nas
linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).
