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

A ficha é a fonte; esta tabela é só o mapa. A coluna **Bloco** diz em que bloco de execução do
`backlog.md` a pendência foi agrupada — agrupar não promove nem autoriza nada, só declara com quem
ela sai barata. `—` significa que ela **não** entra em bloco: depende de decisão do João, da Lotus
ou de escrita fora do repositório.

## Abertas (30)

### Agrupadas em bloco de execução

| ID | Pendência | Bloco | Gatilho |
|---|---|---|---|
| P-36 | Catraca `COR_HARDCODED` não vê cor por `style={{ }}` — 2 sítios a 2,77:1 | BD-10 | bloco que tocar `FormSection`/`CoursesTable`; revisar 2026-10-31 |
| P-37 | `FormField` sem `htmlFor` soma o rótulo do controle no nome acessível — 2 sítios | BD-10 | bloco que tocar `FormField`; revisar 2026-10-31 |
| P-38 | A rule diz que teste PrimeReact/jsdom está fora do corte do runner, e o corte já tem três | BD-12 | próximo bloco que tocar `frontend-fsliced.md` |
| P-40 | Ramo "catálogo vazio" do BD-6 medido em `d20bebc`, não remedido contra HEAD | BD-12 | bloco que puder esvaziar o catálogo de dev; revisar 2026-10-31 |
| P-29 | Corrida de unicidade RUT/e-mail **entre transações** ainda sobe 500, não 422 | BD-14 | 500 observado em uso real, ou bloco que tocar `ProblemDetails`; revisar 2026-10-31 |
| P-35 | ADR-17 defendido em duas profundidades: `version` fora do `$fillable`, `seq_in_budget` dentro | BD-14 | bloco que tocar `CreateQuoteAction`/`Quote`; revisar 2026-10-31 |
| P-20 | `openspout/openspout` em produção sem ADR hospedeiro | BD-15 | João apontar o ADR hospedeiro (ou autorizar ADR-20); revisar 2026-09-30 |
| P-21 | `simple-qrcode` gera o QR do certificado sem nota no ADR-12 | BD-15 | primeiro bloco de Certification que tocar `docs/adrs.md`; revisar 2026-09-30 |
| P-23 | `progress.md` perdeu a coluna `Contexto` que o `progress-archive.md` mantém | BD-15 | João decidir o formato; revisar 2026-09-30 |
| P-32 | Guarda da lição 13 confere path, não classe — o caso que a motivou passa verde | BD-15 | lição 13 reincidir por **classe**; revisar 2026-10-31 |
| P-39 | O plano do BD-6 afirma que `GET /api/courses` não tem RBAC — e tem | BD-15 | bloco que tocar RBAC de catálogo ou reusar a receita de injeção de falha; revisar 2026-10-31 |
| P-43 | `der-fisico.md` chama `certificates` de "planejada" em 4 sítios; existe desde a Sprint 4 | BD-15 | bloco que tocar `docs/der-fisico.md`; revisar 2026-10-31 |
| P-44 | Onze usuários de sonda de gates antigos vivem no banco de dev — 2 aparecem no dashboard | BD-15 | bloco que puder reseedar o dev, ou `dashboard-frontend-analitico-e-redator` (B2); revisar 2026-10-31 |

### Travadas em decisão — não entram em bloco

| ID | Pendência | Quem decide | Gatilho |
|---|---|---|---|
| P-45 | `TestCase.php:18` lê `FRONTEND_URL` cru e o `.env` já é lista — 12 testes de sessão dão 500 | João | commit que fechar o multi-origin (o `cors.php` com `explode` já está no working tree); revisar 2026-10-31 |
| P-46 | Sem Preflight, toda tag de bloco herda margem de UA — 80px de faixa para 24px de texto em todo card | João | decisão sobre reset escopado, ou 3º bloco neutralizando margem à mão; revisar 2026-10-31 |
| P-02 | ADR-08 (pruning/retenção de `audits`) segue aberto | João | antes de subir para produção |
| P-33 | `login_logs.ip_address`/`user_agent` são dado pessoal sem política de retenção | João | fecha junto da P-02, ou antes de produção |
| P-05 | Migrations "adicionais" não consolidadas nas originais | João | antes de subir para produção |
| P-03 | Compose por worktree não existe | João | dois blocos de **backend** em paralelo, ou 2026-10-31 |
| P-30 | O `warning` segue com o laranja de stock do Lara; o âmbar de marca nunca foi construído | João | João decidir que `warning` quer âmbar próprio; revisar 2026-10-31 |
| P-41 | `IdentityCell` empilhado promete truncar e não trunca — falta `min-w-0` nos 13 sítios | João | João decidir que a coluna deve cortar; revisar 2026-10-31 |
| P-42 | Grafia construída do `IdentityCell` diverge da D1 da spec do próprio bloco | João | D1 reescrito com a grafia construída, ou código de volta ao D1; revisar 2026-10-31 |
| P-28 | O fundo do certificado não reproduz as cunhas das quinas nem separa a página 2 | João / Lotus | fundo distinguir página 1 **e** cunhas existirem, ou Lotus aprovar como está; revisar 2026-09-30 |
| P-08 | RF-CUR-04 promete Manual por curso; implementado é Blade única | Lotus | contratante pedir manual personalizado por curso |
| P-09 | Figma mostra 4 tipos de documento de turma; implementados são 3 | Lotus | Lotus confirmar que quer os 4 |
| P-10 | Coluna CLIENTE da tabela de alunos foi omitida | Lotus | Lotus pedir alunos de múltiplos clientes na mesma turma |
| P-13 | Figma mostra código próprio de turma; implementado renderiza `quote_code` | Lotus | Lotus pedir identificador próprio de turma |
| P-15 | Certificados não aparecem na listagem nem no detalhe do aluno | João / Lotus | João decidir expor (ou não); revisar 2026-09-30 |
| P-16 | Figma põe `Alumnos` como primeira aba; implementado mantém `Redactores` | Lotus | Lotus pedir `Alumnos` como aba padrão |
| P-31 | O ponto 5 do ADR-16 está em `docs/adrs.md` e não no espelho do Drive | João (escrita externa) | ponto 5 no `decisao-stack.md` do Drive; revisar 2026-09-30 |
| P-18 | Página de fechamento do Notion com `Sprint` divergente da descrição | João (escrita externa) | João corrigir a propriedade no Notion |
| P-22 | H.1.3.1 existe duas vezes dentro da base Notion canônica | João (escrita externa) | João apagar ou mesclar uma das cópias |

## Encerradas (1)

| ID | Pendência | Encerrada em | Sai em |
|---|---|---|---|
| P-34 | Catraca `COR_HARDCODED` não roda em `src/app/**` | 2026-08-16 (`dashboard-frontend-central-controle`) | próximo `/fechar-sprint` |

A **P-26** saiu no `/fechar-sprint` de 2026-08-14 (`celula-de-identidade`), cumprida a sprint de
rastro.
