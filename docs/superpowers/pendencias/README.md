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

## Abertas (31)

### Agrupadas em bloco de execução

| ID | Pendência | Bloco | Gatilho |
|---|---|---|---|
| P-02 | ADR-08 (pruning/retenção de `audits`) segue aberto | `hardening-auditoria-privacidade-e-observabilidade` | antes de subir para produção |
| P-33 | `login_logs.ip_address`/`user_agent` são dado pessoal sem política de retenção | `hardening-auditoria-privacidade-e-observabilidade` | fecha junto da P-02, ou antes de produção |
| P-63 | O `role="list"` que o mini-reset exige não alcança lista renderizada por biblioteca — as 2 legendas do Recharts ficam sem ele | — (hospedeiro fechado em 2026-08-29 sem pagá-la; rehospedar é do João) | bloco que tocar gráfico ou o mini-reset e puder escolher o remédio; revisar 2026-10-31 |
| P-64 | A escala de raio está escrita na rule e 10 sítios de `features/` ficaram fora dela, sem catraca — ela nasceria vermelha | `frontend-triagem-dos-audits-do-item-18` | bloco que triar os achados de raio das runs, ou que toque os 9 arquivos; revisar 2026-10-31 |
| P-05 | Migrations "adicionais" não consolidadas nas originais | `go-live-confiabilidade-e-recuperacao` | antes de subir para produção |
| P-44 | Onze usuários de sonda de gates antigos vivem no banco de dev — 2 aparecem no dashboard | `go-live-confiabilidade-e-recuperacao` | bloco que puder reseedar o dev; revisar 2026-10-31 |
| P-32 | Guarda da lição 13 confere path, não classe — o caso que a motivou passa verde | BD-15 | lição 13 reincidir por **classe**, ou decisão explícita do João; revisar 2026-10-31 |
| P-31 | O ponto 5 do ADR-16 está em `docs/adrs.md` e não no espelho do Drive | BD-15 | ponto 5 no `decisao-stack.md` do Drive; revisar 2026-09-30 |
| P-22 | H.1.3.1 existe duas vezes dentro da base Notion canônica | BD-15 | João apagar ou mesclar uma das cópias |

> `BD-15` = `BD-15-docs-guardrails-e-sincronizacao`, item 14 da fila.

### Travadas em decisão — não entram em bloco

| ID | Pendência | Quem decide | Gatilho |
|---|---|---|---|
| P-57 | O `artisan test` do `CLAUDE.md` §6 fatala por memória em worktree cuja imagem `app` é anterior ao `memory-cli.ini` | João | §6 mandar construir a imagem em worktree nova; revisar 2026-10-31 |
| P-58 | `compose-dev.test.ts` afasta os `.env*` da raiz mas não o `frontend/.env`: árvore com `VITE_API_URL` legado reprova 3 casos | João | o teste isolar também o `frontend/.env`; revisar 2026-10-31 |
| P-65 | O `max-lines` mede arquivo de teste em `features/*/components` e não mede em `app/**`, e só a isenção tem razão escrita | João | João alinhar as duas camadas ou escrever a razão da assimetria; revisar 2026-10-31 |
| P-30 | O `warning` segue com o laranja de stock do Lara; o âmbar de marca nunca foi construído | João | João decidir que `warning` quer âmbar próprio; revisar 2026-10-31 |
| P-42 | Grafia construída do `IdentityCell` diverge da D1 da spec do próprio bloco | João | D1 reescrito com a grafia construída, ou código de volta ao D1; revisar 2026-10-31 |
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
| P-61 | Os `title` do `ProblemDetails` estão em **português** num produto es-CL — o `detail` do 429 foi traduzido no review de 2026-08-25 e deixou a inconsistência à mostra | João | bloco que tocar o `ProblemDetails` ou a camada de mensagens ao usuário; revisar 2026-10-31 |
| P-62 | A `main` dos dois repositórios não tem branch protection — plano free recusa a API; a régua é compensada em três camadas | João | orçamento para GitHub Team (ou decisão de abrir o repositório); revisar 2026-10-31 |

## Encerradas (0)

**Nenhuma pendência em rastro.** A **P-46** saiu neste fechamento (2026-08-29), o primeiro posterior
ao do bloco que a encerrou — o `frontend-hardening-final` (2026-08-27) —, e saiu **remedida**: o
mini-reset escopado de `index.css` entrou com catraca própria
(`frontend/tests/preflight-escopado.test.ts`, verde nos 653 testes deste gate), e a borda que ele
abriu segue viva e nomeada na **P-63**. O rastro fica nos commits e na linha da entrega em
[`../historico/progress.md`](../historico/progress.md).

A **P-03** e a **P-15** saíram nos dois fechamentos de 2026-08-25 — a
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
