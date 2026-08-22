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

## Abertas (28)

### Agrupadas em bloco de execução

| ID | Pendência | Bloco | Gatilho |
|---|---|---|---|
| P-49 | `lockRow` de redator e turma é meio mutex: os escritores de filho não tomam o lock que `ArchiveRedatorAction`/`DeleteTurmaAction` tomam | `hardening-acesso-ownership-e-integridade` | bloco que tocar um dos seis escritores de filho da ficha; revisar 2026-10-31 |
| P-51 | A lei "ausente não é nulo" não alcança propriedade com default literal — 6 campos, 1 deles é acesso (`is_active` omitido reativa staff) | `hardening-acesso-ownership-e-integridade` | João decidir o remédio do `is_active`; revisar 2026-10-31 |
| P-47 | Os 7 redatores do seed não têm a role `redator`; só cadastro novo e reenvio de convite a atribuem | `hardening-acesso-ownership-e-integridade` | bloco que puder reseedar o dev, ou primeiro gate `permission:` sobre rota de redator; revisar 2026-10-31 |
| P-02 | ADR-08 (pruning/retenção de `audits`) segue aberto | `hardening-auditoria-privacidade-e-observabilidade` | antes de subir para produção |
| P-33 | `login_logs.ip_address`/`user_agent` são dado pessoal sem política de retenção | `hardening-auditoria-privacidade-e-observabilidade` | fecha junto da P-02, ou antes de produção |
| P-50 | A suíte unida (866 testes) passa do `memory_limit` de 128M do container e o `artisan test` documentado morre no meio | `infra-producao-runtime-e-aws` | decidir o `memory_limit` da imagem (vale para o PHP-FPM de produção), ou bloco que tocar `docker/php/`; revisar 2026-10-31 |
| P-46 | Sem Preflight, toda tag de bloco herda margem de UA — 80px de faixa para 24px de texto em todo card | `frontend-hardening-final` | decisão sobre reset escopado, ou 3º bloco neutralizando margem à mão; revisar 2026-10-31 |
| P-41 | `IdentityCell` empilhado promete truncar e não trunca — falta `min-w-0` nos 13 sítios | `frontend-hardening-final` | João decidir que a coluna deve cortar; revisar 2026-10-31 |
| P-15 | Certificados não aparecem na listagem nem no detalhe do aluno | `certificacao-historico-do-aluno` | João decidir expor (ou não); revisar 2026-09-30 |
| P-05 | Migrations "adicionais" não consolidadas nas originais | `go-live-confiabilidade-e-recuperacao` | antes de subir para produção |
| P-44 | Onze usuários de sonda de gates antigos vivem no banco de dev — 2 aparecem no dashboard | `go-live-confiabilidade-e-recuperacao` | bloco que puder reseedar o dev; revisar 2026-10-31 |
| P-20 | `openspout/openspout` em produção sem ADR hospedeiro | BD-15 | João apontar o ADR hospedeiro (ou autorizar ADR-20); revisar 2026-09-30 |
| P-21 | `simple-qrcode` gera o QR do certificado sem nota no ADR-12 | BD-15 | primeiro bloco de Certification que tocar `docs/adrs.md`; revisar 2026-09-30 |
| P-23 | `progress.md` perdeu a coluna `Contexto` que o `progress-archive.md` mantém | BD-15 | João decidir o formato; revisar 2026-09-30 |
| P-32 | Guarda da lição 13 confere path, não classe — o caso que a motivou passa verde | BD-15 | lição 13 reincidir por **classe**, ou decisão explícita do João; revisar 2026-10-31 |
| P-39 | O plano do BD-6 afirma que `GET /api/courses` não tem RBAC — e tem | BD-15 | bloco que tocar RBAC de catálogo ou reusar a receita de injeção de falha; revisar 2026-10-31 |
| P-31 | O ponto 5 do ADR-16 está em `docs/adrs.md` e não no espelho do Drive | BD-15 | ponto 5 no `decisao-stack.md` do Drive; revisar 2026-09-30 |
| P-18 | Página de fechamento do Notion com `Sprint` divergente da descrição | BD-15 | João corrigir a propriedade no Notion |
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

## Encerradas (1)

| ID | Pendência | Encerrada em | Sai quando |
|---|---|---|---|
| P-43 | `der-fisico.md` chamava `certificates` de "planejada"; as duas tabelas de Certification existem desde 2026-08-05 | 2026-08-22, no `feedbacks-resolver-escopo` | primeiro fechamento **posterior** a este |

**A P-40 saiu neste fechamento**, que é o primeiro posterior ao do BD-12 — a condição que a linha
dela pedia. **A P-29 e a P-35** já haviam saído no fechamento do BD-12, pelo mesmo critério contra o
BD-14. O rastro de todas fica nos commits e nas linhas de entrega em
[`../historico/progress.md`](../historico/progress.md).

A **P-36** e a **P-37**, encerradas em 2026-08-18 dentro do
`bd16-perfil-e-kit-compartilhado`, saíram no fechamento do `bd13-listagens-e-abas` (2026-08-18), pelo
mesmo precedente da **P-26**, da **P-38** e da **P-34**. A **P-45** saiu no fechamento do
`arquivados-roots-restantes` (2026-08-19) e segue encerrada depois do merge da `main`: o conserto
que a fecha está commitado nos dois sítios que liam a variável — `tests/TestCase.php:25`
(`explode` + primeira origem) e `config/cors.php:22` (`explode`). O rastro durável de todas vive nos
commits e nas linhas de entrega em [`../historico/progress.md`](../historico/progress.md).
