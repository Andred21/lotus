---
schema_version: 1
packet_id: 2026-08-28-hardening-performance-e-dados
block_id: hardening-performance-e-dados
status: ready
generated_at: 2026-08-28T15:56:02-03:00
base_ref: feat/hardening-performance-e-dados
base_commit: 13a0eb926c07d8e2af699760807ef12a8ef21c3a
state_path: docs/superpowers/state.md
state_blob_sha: ccf2c309d7b1902fc97f679153323e75871be6e0
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: a72abed1480a8f042152b118b578696a90387711
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — Hardening de performance e dados

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** medir e corrigir problemas relevantes de acesso a dados no porte real do Lotus: N+1, índices e joins, paginação de coleções crescentes, filtros/ordenação, operações pesadas e a duplicação D-15.

**Non-goals:** inventar SLA, orçamento de queries ou teto numérico de `per_page`; adotar arquitetura distribuída; tornar Redis obrigatório; introduzir cache sem medição e estratégia de invalidação; alterar silenciosamente o valor de 30 dias da D-15.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| DRIVE-RNF | Google Drive | `requisitos-negocio.md`, file `1Nt8XARvd_EIRWEJ9YXa3DKV45xPMQkk-`; V2 root `1oFk-RkBhuG4hBHzKutUqM2-19mI1cMEM` | 2026-08-22T08:09:38.786Z | retrieved via raw-file fetch | Texto canônico de RNF-DES-01/02/03 |
| NOTION-913 | Notion | Page `388bc960-3dfa-812b-a51b-cc642be320c8`; collection `e64b7d57-d000-4433-b652-a410e75193cc`; database `7e55d684-cdd4-4bf3-b152-e15ce70d324b` | modified time not exposed; snapshot as of 2026-08-14T18:41:13.554Z | retrieved | Escopo e aceite da task 9.1.3 |
| REPO-BACKLOG | Repository | `docs/superpowers/backlog.md`, item 6 e D-15; blob `4d7c8050bc0cc5e0b1c439b97af5661bb933ef88` | commit `13a0eb926c07d8e2af699760807ef12a8ef21c3a` | retrieved | Escopo ativo, cache/Redis, D-15 e DoD |
| REPO-ADR | Repository | `docs/adrs.md`, ADR-02/07/09; blob `6704d1d86c96b6a8496d4052a0e77dc4a3bf370f` | commit `13a0eb926c07d8e2af699760807ef12a8ef21c3a` | retrieved | Restrições arquiteturais e de persistência |

## Key facts

1. RNF-DES-01 exige apenas resposta de aparência "quase instantânea"; não fixa milissegundos, percentil ou outro SLA numérico. RNF-DES-02 fixa o único alvo quantitativo de desempenho: até 10 usuários simultâneos inicialmente, explicitando baixa concorrência e ausência de justificativa para arquitetura distribuída. `[DRIVE-RNF]`
2. RNF-DES-03 exige que documentos postados fiquem acessíveis ao admin imediatamente, mas não define prazo em segundos nem mecanismo técnico. `[DRIVE-RNF]`
3. A task Notion 9.1.3 cobre "Revisão de índices compostos (Spatie, FKs)", tipo Migration, camada Backend, ADR-07; seu único aceite é "Sem N+1 nas consultas RBAC/FK principais". A página não possui descrição ou conteúdo adicional. `[NOTION-913]`
4. Nenhuma fonte consultada fixa teto numérico de `per_page`, orçamento de queries ou meta numérica de latência. O backlog exige que exista um teto de `per_page`, mas deixa seu valor para o planejamento baseado em medição. `[DRIVE-RNF]` `[NOTION-913]` `[REPO-BACKLOG]`
5. Drive e Notion não mencionam Redis nem cache. O backlog determina que cache só seja considerado depois de query, índice e paginação, com invalidação definida, e afirma explicitamente que Redis não é requisito. Nenhuma fonte de prioridade superior contradiz isso. `[DRIVE-RNF]` `[NOTION-913]` `[REPO-BACKLOG]`
6. A D-15 registra duas constantes já iguais a 30 dias — `DIAS_AVISO` em Identity e `DashboardWindows::EXPIRY_WINDOW_DAYS` — e exige unificá-las. Nenhuma fonte escolhe o dono: o backlog deixa a decisão entre Shared ou um dos domínios e não pede alteração do número. `[REPO-BACKLOG]`
7. As correções devem preservar DDD-lite sem Repository sobre Eloquent, usar Custom Query Builders para consultas complexas, considerar os índices compostos do Spatie e permanecer sobre MySQL 8/RDS. `[REPO-ADR]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Metas de desempenho | Drive é qualitativo, exceto pelos 10 usuários simultâneos; Notion exige ausência de N+1 principal | Não inventar SLA, contagem máxima de queries ou latência; valores de engenharia podem ser definidos no brainstorming | `[DRIVE-RNF]`, `[NOTION-913]` e instrução atual |
| `per_page` | Drive e Notion não o mencionam | O teto faz parte do escopo, mas seu valor permanece decisão de planejamento baseada em medição | `[REPO-BACKLOG]`; nenhuma fonte superior fixa número |
| Cache e Redis | Nenhuma fonte externa os exige | Redis permanece não requisito; cache é condicional a evidência e invalidação definida | `[DRIVE-RNF]`, `[NOTION-913]`, `[REPO-BACKLOG]` |
| Amplitude do bloco | Notion cobre índices Spatie/FKs e N+1 principal; backlog inclui paginação, `EXPLAIN`, allowlists e operações pesadas | O backlog detalha o bloco ativo sem contrariar o aceite mais estreito do Notion | Hierarquia Lotus e ausência de conflito material |
| D-15 | Nenhuma fonte externa trata do dono dos 30 dias | Preservar 30 e escolher o dono durante o planejamento; Shared/Identity/Dashboard não está predeterminado | `[REPO-BACKLOG]` |

## Constraints

- Avaliar N+1 separadamente de adequação de índices; presença de índice não prova ausência de N+1. `[REPO-BACKLOG]`
- Usar `EXPLAIN` nas queries relevantes e cenários representativos do porte do Lotus. `[REPO-BACKLOG]`
- O DoD exige ausência de N+1 conhecido ou consulta evidentemente degradada; não exige um número não publicado. `[REPO-BACKLOG]`
- Working tree limpo na geração; lane-a, main tree, branch e commit iguais ao estado informado.

## External acceptance signals

- Aparência de resposta quase instantânea. `[DRIVE-RNF]`
- Suporte inicial a até 10 usuários simultâneos. `[DRIVE-RNF]`
- Documento postado acessível imediatamente ao admin. `[DRIVE-RNF]`
- Sem N+1 nas consultas principais de RBAC/FKs. `[NOTION-913]`

## Open questions

- None blocking. O brainstorming deve escolher o teto de `per_page`, eventuais guardas numéricas de latência/queries e o dono da constante D-15; as fontes não predeterminam essas decisões de engenharia.

## Deferred

- Redis e qualquer infraestrutura adicional de cache, salvo se medições posteriores justificarem cache e sua invalidação estiver definida.

## Staleness triggers

- Alteração semântica de RNF-DES-01/02/03 no Drive.
- Mudança de escopo ou aceite da página Notion `388bc960-3dfa-812b-a51b-cc642be320c8` na collection canônica.
- Alteração material do item 6, da D-15 ou das ADR-02/07/09.
- Spec, plano ou decisão explícita posterior que contradiga a reconciliação sobre metas, `per_page`, cache/Redis ou o dono dos 30 dias.
