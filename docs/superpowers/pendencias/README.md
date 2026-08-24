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

## Abertas (24)

### Agrupadas em bloco de execução

| ID | Pendência | Bloco | Gatilho |
|---|---|---|---|
| P-02 | ADR-08 (pruning/retenção de `audits`) segue aberto | `hardening-auditoria-privacidade-e-observabilidade` | antes de subir para produção |
| P-33 | `login_logs.ip_address`/`user_agent` são dado pessoal sem política de retenção | `hardening-auditoria-privacidade-e-observabilidade` | fecha junto da P-02, ou antes de produção |
| P-46 | Sem Preflight, toda tag de bloco herda margem de UA — 80px de faixa para 24px de texto em todo card | `frontend-hardening-final` | decisão sobre reset escopado, ou 3º bloco neutralizando margem à mão; revisar 2026-10-31 |
| P-41 | `IdentityCell` empilhado promete truncar e não trunca — falta `min-w-0` nos 13 sítios | `frontend-hardening-final` | João decidir que a coluna deve cortar; revisar 2026-10-31 |
| P-15 | Certificados não aparecem na listagem nem no detalhe do aluno | `certificacao-historico-do-aluno` | João decidir expor (ou não); revisar 2026-09-30 |
| P-05 | Migrations "adicionais" não consolidadas nas originais | `go-live-confiabilidade-e-recuperacao` | antes de subir para produção |
| P-44 | Onze usuários de sonda de gates antigos vivem no banco de dev — 2 aparecem no dashboard | `go-live-confiabilidade-e-recuperacao` | bloco que puder reseedar o dev; revisar 2026-10-31 |
| P-32 | Guarda da lição 13 confere path, não classe — o caso que a motivou passa verde | BD-15 | lição 13 reincidir por **classe**, ou decisão explícita do João; revisar 2026-10-31 |
| P-31 | O ponto 5 do ADR-16 está em `docs/adrs.md` e não no espelho do Drive | BD-15 | ponto 5 no `decisao-stack.md` do Drive; revisar 2026-09-30 |
| P-22 | H.1.3.1 existe duas vezes dentro da base Notion canônica | BD-15 | João apagar ou mesclar uma das cópias |

> `BD-15` = `BD-15-docs-guardrails-e-sincronizacao`, item 14 da fila.

### Travadas em decisão — não entram em bloco

| ID | Pendência | Quem decide | Gatilho |
|---|---|---|---|
| P-03 | Compose por worktree não existe | João | dois blocos de **backend** em paralelo, ou 2026-10-31 |
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

## Encerradas (2)

| ID | Pendência | Encerrada em | Sai quando |
|---|---|---|---|
| P-47 | Os 7 redatores do seed não têm a role `redator`; só cadastro novo e reenvio de convite a atribuem | 2026-08-23, no `hardening-acesso-ownership-e-integridade` | primeiro fechamento **posterior** a este |
| P-50 | Suíte unida acima do `memory_limit` de 128M; o `artisan test` do §6 morria no meio | 2026-08-22, no `infra-producao-runtime-e-aws` | primeiro fechamento **posterior** ao deste bloco |

**A P-40 saiu nestes fechamentos** — os três são posteriores ao do BD-12, que é a condição que a
linha dela pedia; as três lanes a removeram em paralelo. **A P-29 e a P-35** já haviam saído no
fechamento do BD-12, pelo mesmo critério contra o BD-14. O rastro de todas fica nos commits e nas
linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).

A **P-36** e a **P-37**, encerradas em 2026-08-18 dentro do
`bd16-perfil-e-kit-compartilhado`, saíram no fechamento do `bd13-listagens-e-abas` (2026-08-18), pelo
mesmo precedente da **P-26**, da **P-38** e da **P-34**. A **P-45** saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19) e segue encerrada depois do merge da `main`: o conserto
que a fecha está commitado nos dois sítios que liam a variável — `tests/TestCase.php:25`
(`explode` + primeira origem) e `config/cors.php:22` (`explode`). O rastro durável de todas vive nos
commits e nas linhas de entrega em [`../historico/progress.md`](../historico/progress.md).
