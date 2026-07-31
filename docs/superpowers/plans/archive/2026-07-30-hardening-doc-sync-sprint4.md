# Hardening · H.1.3.1 — Sincronização de documentação e fontes canônicas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** provar, documento por documento, se código, `/docs`, Drive e Notion ainda dizem a mesma
coisa; corrigir o que é fato, escrever no canônico só o que o João aprovar item a item, e deixar
toda divergência restante com gatilho datado.

**Architecture:** duas fases separadas por um portão humano. Fase 1 (Tasks 1–6) só levanta e grava
evidência no relatório `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md`. Task 7 é o portão:
o João classifica cada linha. Fase 2 (Tasks 8–14) aplica correções internas, writes externos
aprovados e gatilhos novos, e prova o resultado reexecutando a auditoria.

**Tech Stack:** subagente `auditor-docs` (eixo repo) · conectores MCP `mcp__claude_ai_Google_Drive__*`
e `mcp__claude_ai_Notion__*` (eixo externo, leitura) · `mcp__codex__codex` (braço de escrita externa,
se a sondagem provar capacidade) · Markdown versionado.

## Global Constraints

- **Drive vence**, exceto quando o repositório registra decisão posterior explicitamente do João
  (spec D10). Divergência já resolvida não reabre por diferença de data.
- **Nenhum write externo sem aprovação nominal, por documento** (spec D1/D11). Aprovar um documento
  não autoriza o seguinte.
- **Nenhum write no canônico do Drive antes da Task 1 decidir a via** (spec D4/D5).
- **Gatilho de pendência é datado e verificável.** "Quando a Sprint X fechar" é proibido (lição 13).
- **O bloco corrige texto de doc e de rule; não corrige comportamento** (spec D12). Achado de código
  errado vai para `docs/superpowers/backlog.md`.
- **Nada de `docs/pendencias.md` é achado novo** — a skill `auditar-docs` já exige isso.
- Se alguma task tocar código: `docker compose exec -T app php artisan test` verde e
  `./vendor/bin/pint <arquivos>` **com argumento**.
- Um commit por task, com os paths exatos daquela task (`git add` cirúrgico, lição 9).
- O João edita o working tree ao vivo: `git status` no início de cada task, `git diff <arquivo>`
  antes de editar arquivo sujo.

---

## Task 1: Sondar a capacidade de escrita externa

**Files:**
- Create: `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` (seção `## 1. Capacidade de escrita externa`)

**Interfaces:**
- Produces: veredito `drive_write: codex | fallback` e `notion_write: claude | fallback`, consumido
  pelas Tasks 11 e 12.

- [ ] **Step 1: Confirmar que o conector desta sessão não atualiza arquivo do Drive**

Chame `ToolSearch` com `query: "+google_drive update edit write"`, `max_results: 10`.
Esperado: nenhuma tool de update/edit de conteúdo no namespace `mcp__claude_ai_Google_Drive__*`
(o inventário conhecido tem `read_file_content`, `search_files`, `create_file`, `copy_file`,
`download_file_content`, `get_file_metadata`, `get_file_permissions`, `list_recent_files`).
Anote os nomes exatos devolvidos — eles são a evidência da seção 1.

- [ ] **Step 2: Confirmar que a escrita no Notion existe nesta sessão**

Chame `ToolSearch` com `query: "select:mcp__claude_ai_Notion__notion-update-page"`, `max_results: 1`.
Esperado: schema carrega. **Não chame a tool.** Carregar o schema prova disponibilidade sem escrever.

- [ ] **Step 3: Sondar o runtime do Codex**

Carregue `ToolSearch` com `query: "select:mcp__codex__codex"`, `max_results: 1` e invoque com
`sandbox: "read-only"`, `cwd: "/home/jvbat/projetos/lotus"` e este prompt:

```text
Sondagem de capacidade, não é tarefa de edição. Não altere nenhum arquivo do repositório e não
toque em nada dentro de Viagem Chile/Projetos/Lotus.cl/V2 — a pasta canônica é intocável nesta
sondagem.

1. Liste os nomes exatos das tools disponíveis no namespace mcp__codex_apps__google_drive_* e
   mcp__codex_apps__notion_*.
2. Diga, para cada namespace, se existe alguma tool que ESCREVE (cria, atualiza ou substitui
   conteúdo de arquivo/página existente) — citando o nome da tool.
3. Se existir tool de escrita no Drive, prove com uma escrita real em arquivo descartável: crie
   `lotus-probe-2026-07-30.md` na raiz do seu Drive (fora de V2), escreva a linha `probe ok`,
   releia e reporte o ID e o conteúdo lido. Se a tool falhar, cite a linha decisiva do erro.
4. Não faça mais nada. Responda em até 20 linhas, sem preâmbulo.
```

- [ ] **Step 4: Registrar o veredito**

Crie `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` com o cabeçalho e a seção 1:

```markdown
# Auditoria de sincronização — hardening-doc-sync-sprint4

**Data:** 2026-07-30 · **Spec:** `docs/superpowers/specs/2026-07-30-hardening-doc-sync-sprint4-design.md`
**Packet:** `docs/superpowers/context-packets/hardening-doc-sync-sprint4.md`

## 1. Capacidade de escrita externa

| Alvo | Runtime | Tools encontradas | Escreve? | Evidência |
|---|---|---|---|---|
| Google Drive | Claude (`mcp__claude_ai_Google_Drive__*`) | <lista do Step 1> | <sim/não> | <nomes das tools> |
| Google Drive | Codex (`mcp__codex_apps__google_drive_*`) | <lista do Step 3> | <sim/não> | <ID do arquivo de sonda ou linha do erro> |
| Notion | Claude (`mcp__claude_ai_Notion__*`) | `notion-update-page` | sim | schema carregado sem chamada |

**Veredito:** `drive_write: <codex|fallback>` · `notion_write: <claude|fallback>`
```

Substitua cada `<...>` pelo valor real. Placeholder que sobreviver a esta task é falha de execução.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md
git commit -m "docs(audit): sondagem de capacidade de escrita externa"
```

---

## Task 2: Varredura E1 — código ↔ /docs

**Files:**
- Modify: `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` (seção `## 2. Eixo código ↔ /docs`)

**Interfaces:**
- Consumes: nada da Task 1.
- Produces: tabela `| Doc | Divergência | Evidência (arquivo:linha) | Sugestão |`, consumida pela Task 6.

- [ ] **Step 1: Despachar o subagente**

Chame a `Agent` tool com `subagent_type: "auditor-docs"`, `run_in_background: false`, e prompt:

```text
Audite os 8 checks da skill auditar-docs contra a árvore real do repositório, nesta ordem:
der-fisico.md vs backend/database/migrations/; estrutura-monolito.md vs backend/app/Domains/ e
frontend/src/; adrs.md vs padrão de fato sem ADR; .claude/rules/* vs código real e paths: que não
casa com arquivo; CLAUDE.md vs comando que não roda e lei §5 sem mecanismo; progress.md vs
plans|specs/archive/; código sem doc; pendências com gatilho vencido.

Leia docs/pendencias.md primeiro: nada de lá é achado novo, EXCETO gatilho vencido, que é achado.
Devolva só a tabela | Doc | Divergência | Evidência (arquivo:linha) | Sugestão |, e ao final a
contagem de divergências e de gatilhos vencidos. Sem preâmbulo, sem correção.
```

- [ ] **Step 2: Colar a tabela crua no relatório**

Acrescente ao relatório a seção `## 2. Eixo código ↔ /docs (subagente auditor-docs)` com a tabela
devolvida, sem editar o conteúdo dos achados. Prefixe cada linha com um ID `E1-01`, `E1-02`, …

- [ ] **Step 3: Verificar que a contagem bate**

Run: `grep -c "^| E1-" docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md`
Expected: número igual à contagem de divergências reportada pelo subagente.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md
git commit -m "docs(audit): varredura codigo vs docs"
```

---

## Task 3: Varredura E2 — /docs ↔ Drive

**Files:**
- Modify: `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` (seção `## 3. Eixo /docs ↔ Drive`)

**Interfaces:**
- Produces: linhas `E2-NN` com a mesma estrutura de colunas da Task 2, mais a coluna `Quem está errado`.

- [ ] **Step 1: Ler os 4 documentos canônicos pelos IDs do packet**

Use `mcp__claude_ai_Google_Drive__read_file_content` para cada ID:

| Chave | ID | Contrapartida no repo |
|---|---|---|
| DRIVE-STACK | `14Q_wL6G6acSCUaMLIr9BO2blqiGrPMGw` | `docs/adrs.md` |
| DRIVE-SCHEMA | `1GLv7fNsvZccrJ2CsbJDeFhqWo7BNl4ad` | `docs/der-fisico.md` |
| DRIVE-DOMAIN | `1QB9ei5JiWV33GNmXxZH_8_hSZPqoY_3a` | domínio implementado em `backend/app/Domains/` |
| DRIVE-PEOPLE | `1NFgZxUmCLynk8q1Rsg-3cP-973740V0V` | módulo de alunos entregue (`frontend/src/features/people/`, `backend/app/Domains/Identity/`) |

- [ ] **Step 2: Conferir a afirmação de path canônico do próprio README**

Run: `grep -n "Planejamento\|não foram espelhadas" docs/README.md`
Confronte com `mcp__claude_ai_Google_Drive__search_files` na pasta `Viagem Chile/Projetos/Lotus.cl/V2`.
Achado se o path afirmado não existe, ou se a lista de "fontes não espelhadas" não bate com o que
está lá.

- [ ] **Step 3: Escrever a seção 3**

Cada linha traz: ID `E2-NN`, o que o Drive afirma, o que o repo afirma, evidência dos dois lados
(ID do arquivo do Drive + `arquivo:linha` do repo) e **quem está errado** segundo a regra D10.
As 4 divergências que o packet já provou entram como piso, não como teto: schema N:N, `/api/alunos`
vs `/api/students`, ADR-15 revisado, ADR-16/18/19 ausentes do Drive.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md
git commit -m "docs(audit): varredura docs vs drive"
```

---

## Task 4: Varredura E3 — /docs ↔ Notion

**Files:**
- Modify: `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` (seção `## 4. Eixo /docs ↔ Notion`)

- [ ] **Step 1: Ler a task H.1.3.1**

Use `mcp__claude_ai_Notion__notion-fetch` com o ID `e30bc960-3dfa-828b-9d12-01d537820e9d`.
Confirme o que o packet registrou: `Critério de aceite`, dependências e ADR ref vazios.

- [ ] **Step 2: Listar as tasks da Sprint 4 e as dos blocos entregues**

Use `mcp__claude_ai_Notion__notion-search` restrito à base `Tasks · Lotus Fase 2`.
Confronte o status de cada task com as entregas de `docs/superpowers/progress.md` (linhas de
2026-07-20 a 2026-07-27).

- [ ] **Step 3: Escrever a seção 4**

Linhas `E3-NN`: task, status no Notion, estado real segundo `progress.md`/`archive/`, evidência
(ID da página + linha do `progress.md`), e destino sugerido. Task entregue com status desatualizado
é candidata a write no Notion (D11), não a correção no repo.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md
git commit -m "docs(audit): varredura docs vs notion"
```

---

## Task 5: Varredura E4 — docs de agente

**Files:**
- Modify: `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` (seção `## 5. Eixo docs de agente`)

- [ ] **Step 1: Capturar as afirmações vigentes**

Run: `grep -n "Notion" AGENTS.md .agents/skills/lotus-context-packet/SKILL.md`
Expected: `AGENTS.md:83` afirmando **indisponível**; `AGENTS.md:87-88` mandando reavaliar;
`SKILL.md:75` afirmando "Notion is not loaded in this runtime".

- [ ] **Step 2: Confrontar com a evidência real**

Duas provas independentes já existem: o packet de hoje recuperou `NOTION-H131` pelo runtime do
Codex, e a Task 4 leu a mesma task pelo runtime do Claude. Registre as duas.

- [ ] **Step 3: Conferir o resto do inventário de conectores**

Confronte a tabela de `AGENTS.md:78-83` com os nomes de tool que a Task 1 devolveu. Nome de tool que
mudou, sumiu ou nunca existiu é achado `E4-NN`.

- [ ] **Step 4: Escrever a seção 5 e commitar**

```bash
git add docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md
git commit -m "docs(audit): varredura docs de agente"
```

---

## Task 6: Consolidação e tabela de proveniência

**Files:**
- Modify: `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` (seções `## 6. Tabela consolidada` e `## 7. Proveniência`)

**Interfaces:**
- Consumes: seções 2–5.
- Produces: tabela consolidada com coluna `Destino proposto` e tabela de proveniência com coluna
  `Governa código vivo?` — as duas entradas do portão da Task 7.

- [ ] **Step 1: Consolidar os achados numa tabela só**

Colunas: `ID` · `Eixo` · `Divergência` · `Evidência` · `Destino proposto`. Destino proposto usa
exatamente os quatro valores da spec §5: `corrigir-agora`, `pendência`, `ratificação`,
`write-externo`. Proposto é sugestão; quem decide é a Task 7.

- [ ] **Step 2: Levantar as decisões e sua proveniência**

Run: `grep -rn "^[-*] \*\*D[0-9]" docs/superpowers/specs/ | head -80`
Run: `grep -rn "^| ADR-" docs/adrs.md`

Para cada decisão: onde está registrada, quem decidiu (o texto diz "decisão do João" ou não diz
nada), e a evidência.

- [ ] **Step 3: Marcar o efeito vivo**

Uma decisão "governa código vivo" quando existe hoje código, schema, permissão ou rota que se
comporta como ela manda — e a prova é um `arquivo:linha` real, não a memória de quem lê. Sem prova
de efeito vivo, a coluna vira `não` e a decisão não consome rodada de ratificação (spec D9).

- [ ] **Step 4: Escrever a seção 7 e commitar**

```bash
git add docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md
git commit -m "docs(audit): tabela consolidada e proveniencia"
```

---

## Task 7: Portão de triagem (decisão do João)

**Files:**
- Modify: `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` (seção `## 8. Triagem`)

**Interfaces:**
- Produces: destino final de cada `ID`, a lista de writes externos aprovados por documento, e o
  gatilho novo de P-04. Tasks 8–13 leem daqui e de mais nenhum lugar.

- [ ] **Step 1: Apresentar a tabela consolidada ao João**

Agrupe por destino proposto. Para cada grupo, mostre ID, divergência em uma linha e a evidência.

- [ ] **Step 2: Coletar as decisões**

Use `AskUserQuestion` em lotes por grupo (nunca uma pergunta por achado — a triagem é uma rodada).
Cada achado sai com destino final. Achado que o João rejeitar sai da lista com motivo registrado.

- [ ] **Step 3: Fechar as três decisões nominais que a spec exige**

1. Gatilho novo de P-04 (datado e verificável — spec D3).
2. Lista de documentos do Drive autorizados a receber write, um a um (spec D1).
3. Se a Task 1 deu `notion_write: claude`, autorização nominal para o critério de aceite da task
   H.1.3.1 e para os status desatualizados da Task 4 (spec D11).

- [ ] **Step 4: Gravar a seção 8 e commitar**

Tabela `| ID | Destino final | Decisão do João | Data |`. Sem essa seção commitada, as Tasks 8–13
não têm insumo e não podem começar.

```bash
git add docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md
git commit -m "docs(audit): triagem aprovada pelo Joao"
```

---

## Task 8: Fechar P-06 — `der-fisico.md` ↔ turmas/turma_redator

**Files:**
- Modify: `docs/der-fisico.md:68` (bullet `turmas`), `:85-87` (relações), `:105-107` (implementadas)
- Modify: `docs/pendencias.md` (linha P-06 → seção "Encerradas")

**Interfaces:**
- Consumes: destino `corrigir-agora` confirmado na Task 7.

- [ ] **Step 1: Capturar o schema real**

Run: `grep -nE '\$table->' backend/database/migrations/2026_07_21_000001_create_turmas_table.php backend/database/migrations/2026_07_21_200000_alter_turmas_for_conclusao.php`

Expected (já verificado em 2026-07-30): `turmas` **não tem** `redator_id`; tem `local_aplicacao`,
`start_date`, `end_date`, `concluded_at`, e a coluna gerada STORED `active_quote_id`
(`CASE WHEN deleted_at IS NULL THEN quote_id END`) com `unique`. O enum de `status` foi estreitado
para `('em_andamento','concluida')` só no MySQL. `turma_redator` existe com
`unique(turma_id, redator_id)`.

- [ ] **Step 2: Reescrever o bullet `turmas`**

Substitua a linha 68 por:

```markdown
- **turmas** — `id PK`, `quote_id FK` → quotes restrict, `course_id FK` → courses, `modalidade` enum(`presencial`,`online`), `local_aplicacao` (nullable — exigido só se presencial, validado no DTO), `start_date` (date), `end_date` (date), `status` enum(`em_andamento`|`concluida`, default `em_andamento`), `concluded_at` (timestamp NULL — ato do admin, RN-16), `active_quote_id` (coluna gerada STORED `CASE WHEN deleted_at IS NULL THEN quote_id END`, `unique`), `deleted_at`. Índice: `status`. Nasce de uma cotação: a unicidade é sobre `active_quote_id`, então 1:1 vale entre turmas **vivas** e turma soft-deletada não bloqueia recriar. **Redatores são N:N** via `turma_redator` (spec 6b, D5) — não existe `turmas.redator_id`. **`habilitada` NÃO é estado persistido**: saiu do enum no MySQL pela migration de conclusão e deriva em runtime de doc RN-16 completa (`TurmaHabilitacaoService`, spec 6d D3); conclusão é terminal (D5).
```

- [ ] **Step 3: Acrescentar o bullet do pivot logo abaixo**

```markdown
- **turma_redator** — `id PK`, `turma_id FK` → turmas cascade, `redator_id FK` → redatores restrict, `timestamps`, `unique(turma_id, redator_id)`. Pivô N:N de designação (quais redatores ministram a turma), sem soft-delete. Pivot não audita sozinho: a designação usa `auditSync`.
```

- [ ] **Step 4: Corrigir as três linhas de relação**

Linha 85: tire `turmas` da lista de planejadas de `courses`.
Linha 86: troque `e (planejada) turmas (ministra)` por `; N:N com turmas via turma_redator (ministra)`.
Linha 87: tire o `(planejada)` de `quotes 1:1 → turmas`.
Para `enrollments` e `feedbacks`, decida pelo comando — não pela memória:

Run: `ls backend/database/migrations/ | grep -E "create_(enrollments|feedbacks)_table"`
Cada uma que aparecer sai de "planejada"; a que não aparecer continua.

- [ ] **Step 5: Regenerar a lista de tabelas implementadas (linhas 105–107)**

Run: `ls backend/database/migrations/ | grep -E "create_.*_table" | sed -E 's/^[0-9_]+create_(.*)_table\.php$/\1/' | sort`
Reescreva a lista com a saída real e troque a data "Implementadas até 2026-07-20" por
"Implementadas até 2026-07-30".

- [ ] **Step 6: Provar que a divergência sumiu**

Run: `grep -n "redator_id" docs/der-fisico.md`
Expected: nenhuma ocorrência dentro do bullet `turmas`; as que restarem são de `course_redator`,
`turma_redator` e do banner de nome próprio.

Run: `grep -n "turma_redator" docs/der-fisico.md`
Expected: pelo menos o bullet novo e a linha de relação.

- [ ] **Step 7: Mover P-06 para "Encerradas"**

Na tabela de encerradas, registre como fechou: "doc-sync 2026-07-30 — `der-fisico.md` passou a
descrever o schema real (pivot N:N, colunas reais, `turmas` entre as implementadas), conferido
contra as duas migrations de turma."

- [ ] **Step 8: Commit**

```bash
git add docs/der-fisico.md docs/pendencias.md
git commit -m "docs(der): der-fisico descreve o schema real de turmas"
```

---

## Task 9: Docs de agente dizem a verdade sobre o Notion

**Files:**
- Modify: `AGENTS.md:76-88`
- Modify: `.agents/skills/lotus-context-packet/SKILL.md:72-75`

- [ ] **Step 1: Corrigir a linha do Notion na tabela de conectores**

Em `AGENTS.md:83`, substitua a linha por (mantendo o alinhamento da tabela):

```markdown
| Notion       | **disponível** — verificado em 2026-07-30 pela geração do packet H.1.3.1 | `mcp__codex_apps__notion_*` (base `Tasks · Lotus Fase 2`) |
```

Atualize também o cabeçalho da tabela em `AGENTS.md:76`: a verificação passa a ser
"2026-07-23, linha do Notion revista em 2026-07-30".

- [ ] **Step 2: Corrigir o parágrafo seguinte**

Em `AGENTS.md:85-88`, a frase "Reavalie a linha do Notion quando o MCP do plugin passar a carregar"
descreve um futuro que já chegou. Substitua por:

```markdown
Não declare uma fonte `unavailable` sem ter tentado a tool correspondente e capturado o erro — a
linha do Notion ficou errada por uma semana exatamente assim. A ausência de uma task 1:1 no Notion
continua sendo não bloqueante: work items do Lotus são splits internos de sprint (`-exec1/2/3`) e
normalmente não têm task própria lá.
```

- [ ] **Step 3: Corrigir a skill do packet**

Em `.agents/skills/lotus-context-packet/SKILL.md:75`, troque
`Notion is not loaded in this runtime.` por:

```text
Notion via `mcp__codex_apps__notion_*` — verified 2026-07-30 while generating the
`hardening-doc-sync-sprint4` packet; the base `Tasks · Lotus Fase 2` answered search and fetch.
```

- [ ] **Step 4: Provar**

Run: `grep -n "indisponível\|is not loaded" AGENTS.md .agents/skills/lotus-context-packet/SKILL.md`
Expected: nenhuma ocorrência referente ao Notion.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md .agents/skills/lotus-context-packet/SKILL.md
git commit -m "docs(agents): inventario de conectores diz a verdade sobre o Notion"
```

---

## Task 10: Aplicar as correções internas restantes

**Files:**
- Modify: um documento por commit, entre `docs/adrs.md`, `docs/estrutura-monolito.md`,
  `docs/README.md`, `docs/superpowers/progress.md`, `.claude/rules/*.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: seção 8 do relatório — só os IDs com destino final `corrigir-agora` que as Tasks 8 e 9
  não cobriram.

Esta task é um laço com procedimento fixo. O número de iterações é o número de IDs
`corrigir-agora` restantes; o procedimento não varia.

- [ ] **Step 1: Listar o que sobrou**

Run: `grep -n "corrigir-agora" docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md`
Tire dessa lista os IDs já fechados nas Tasks 8 e 9.

- [ ] **Step 2: Para cada ID, na ordem da lista — reproduzir o achado**

Rode o comando que consta na coluna `Evidência` daquele ID. Se o comando não reproduzir a
divergência, **não corrija**: registre na seção 8 que o achado não se sustentou e siga. Correção sem
achado reproduzível é ruído (a skill `auditar-docs` chama de achado inventado).

- [ ] **Step 3: Editar o documento**

O texto novo afirma o que **é**. Intenção não construída vai marcada como pendência, nunca como
descrição (lição 13).

- [ ] **Step 4: Provar e commitar, um documento por commit**

Rode de novo o comando do Step 2. Expected: a divergência não aparece mais.

```bash
git add <o documento editado> docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md
git commit -m "docs(sync): <ID> — <o que passou a ser verdade>"
```

---

## Task 11: Reescrever `docs/pendencias.md`

**Files:**
- Modify: `docs/pendencias.md`

**Interfaces:**
- Consumes: gatilho novo de P-04 (Task 7, Step 3) e veredito `drive_write` (Task 1).

- [ ] **Step 1: Repor o gatilho de P-04**

Substitua `Reavaliar quando a Sprint 3 fechar` pelo gatilho que o João fixou na Task 7. Acrescente na
coluna "Por que está aberta" que o gatilho anterior venceu em 2026-07-23 e ficou seis dias sem
reavaliação — pendência sem prazo vira mentira permanente.

- [ ] **Step 2: Ajustar P-01 e P-14 conforme a via do write**

Se `drive_write: codex` e o João aprovou os documentos: as duas fecham na Task 12 e saem daqui para
"Encerradas" — mas só depois da releitura de confirmação, nunca antes.
Se `drive_write: fallback`: gatilho novo e explícito — "fecha quando o João confirmar que aplicou o
patch `docs/superpowers/audits/2026-07-30-drive-patches/<arquivo>.md` no Drive".

- [ ] **Step 3: Registrar as pendências novas da triagem**

Uma linha por ID com destino `pendência`: o que diverge, por que fica aberta, gatilho datado.

- [ ] **Step 4: Limpar a seção "Encerradas"**

P-11 fechou no bloco visual (2026-07-26) e já cumpriu a sprint de rastro — sai. P-06 entra pela
Task 8.

- [ ] **Step 4b: Criar o item de backlog do guardrail (spec D3)**

Em `docs/superpowers/backlog.md`, seção "Débitos técnicos", uma linha: Pest Arch tests para as leis
§5 do backend + `eslint-boundaries` para a regra de dependência do frontend, com ponteiro para P-04 e
para a lição 14 (mecanismo vence instrução). Sem esse item, "adiado" e "esquecido" ficam iguais.

- [ ] **Step 5: Provar que não sobrou gatilho vago**

Run: `grep -n "quando a Sprint\|Reavaliar quando" docs/pendencias.md`
Expected: nenhuma linha de pendência **aberta**. Ocorrência em "Encerradas" é histórico e pode ficar.

- [ ] **Step 6: Commit**

```bash
git add docs/pendencias.md docs/superpowers/backlog.md
git commit -m "docs(pendencias): gatilhos datados e pendencias novas da triagem"
```

---

## Task 12: Aplicar os writes externos aprovados

**Files:**
- Create (só no fallback): `docs/superpowers/audits/2026-07-30-drive-patches/<documento>.md`
- Modify: `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` (seção `## 9. Writes externos`)

**Interfaces:**
- Consumes: lista de documentos aprovados (Task 7) e `drive_write`/`notion_write` (Task 1).

Laço com procedimento fixo, **um documento por iteração**. Aprovar um documento não autoriza o
seguinte (spec D1).

- [ ] **Step 1: Montar o texto final do documento**

Só o trecho que muda, com o texto integral que deve substituir o atual — não descrição da mudança.

- [ ] **Step 2: Mostrar o diff ao João e esperar a aprovação daquele documento**

Mostre lado a lado: o que o Drive afirma hoje e o texto novo. Sem "ok" para aquele documento, não
prossiga para o Step 3 dele.

- [ ] **Step 3a: Se `drive_write: codex` — aplicar**

Invoque `mcp__codex__codex` com `sandbox: "read-only"` e prompt fechado: o ID do arquivo, o texto
final, a instrução de não tocar em nenhum outro arquivo do Drive nem no repositório, e a exigência
de devolver ID, revisão e timestamp da escrita.

- [ ] **Step 3b: Se `drive_write: fallback` — gerar o patch**

Crie `docs/superpowers/audits/2026-07-30-drive-patches/<documento>.md` com: identificação do arquivo
no Drive (nome + ID), o trecho atual, o trecho novo e onde ele entra. Feito para colar, não para
interpretar.

- [ ] **Step 4: Provar a aplicação**

No caminho 3a: releia o arquivo com `mcp__claude_ai_Google_Drive__read_file_content` e confirme que
o texto novo está lá. **Sem releitura não conta como aplicado** (lei §8 — pacote instalado não é
DoD).
No caminho 3b: confirme que o patch existe e cobre o achado.

- [ ] **Step 5: Notion, se autorizado**

Preencha o critério de aceite da task H.1.3.1 com o escopo do backlog (fato 1 do packet) via
`mcp__claude_ai_Notion__notion-update-page`, e corrija os status desatualizados aprovados na Task 7.
Releia a página para confirmar.

- [ ] **Step 6: Registrar evidência e commitar**

Tabela `| Documento | Via | Aplicado? | Evidência (ID · revisão · timestamp) |`.

```bash
git add docs/superpowers/audits/
git commit -m "docs(audit): writes externos aplicados com evidencia"
```

---

## Task 13: Registrar as decisões ratificadas

**Files:**
- Modify: `docs/adrs.md` (decisão de arquitetura ratificada)
- Modify: `docs/pendencias.md` (divergência aceita)
- Modify: `docs/superpowers/backlog.md` (decisão rejeitada → achado de código)

- [ ] **Step 1: Separar por destino**

Da seção 8: `ratificação` aprovada + é arquitetura → ADR novo. `ratificação` aprovada + é divergência
aceita → linha em `pendencias.md` com gatilho. Rejeitada → o código é que está errado: item em
"Débitos técnicos" do backlog, com `arquivo:linha`.

- [ ] **Step 2: Escrever o ADR no formato vigente**

Run: `grep -n "^## ADR-19\|^## ADR-18" docs/adrs.md`
Copie a estrutura de seções do ADR mais recente (contexto, decisão, justificativa, trade-off) e
numere na sequência. Registre a data de ratificação e que a decisão nasceu antes do registro — a
proveniência é parte do ADR, não nota de rodapé.

- [ ] **Step 3: Provar**

Run: `grep -c "^## ADR-" docs/adrs.md`
Expected: contagem anterior + número de ADRs criados. Confira também que `docs/README.md` não afirma
mais "as 19 decisões" se o número mudou.

- [ ] **Step 4: Commit**

```bash
git add docs/adrs.md docs/pendencias.md docs/superpowers/backlog.md docs/README.md
git commit -m "docs(adr): ratificacao das decisoes sem proveniencia"
```

---

## Task 14: Re-auditoria e fechamento do bloco

**Files:**
- Modify: `docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md` (seção `## 10. Re-auditoria`)
- Modify: `docs/superpowers/progress.md` (uma linha)

- [ ] **Step 1: Reexecutar o subagente**

Despache `auditor-docs` de novo, com o mesmo prompt da Task 2, Step 1.

- [ ] **Step 2: Confrontar com `pendencias.md`**

Cada achado da segunda rodada tem que casar com uma linha registrada em `docs/pendencias.md`. Achado
sem pendência correspondente é regressão da Fase 2 — volte e corrija antes de seguir.

- [ ] **Step 3: Verificar os 7 critérios de DoD da spec**

1. Segunda rodada sem achado fora de `pendencias.md`.
2. Run: `grep -n "quando a Sprint\|Reavaliar quando" docs/pendencias.md` → nenhuma pendência aberta.
3. Run: `grep -n "turma_redator" docs/der-fisico.md` → bullet e relação presentes.
4. Run: `grep -n "indisponível\|is not loaded" AGENTS.md .agents/skills/lotus-context-packet/SKILL.md`
   → nada sobre o Notion.
5. Seção 9 com evidência de cada write, ou patch entregue com pendência aberta.
6. Seção 7 sem linha de efeito vivo com status vazio.
7. Se alguma task tocou código: `docker compose exec -T app php artisan test` verde e Pint nos
   arquivos tocados.

- [ ] **Step 4: Escrever a linha do `progress.md`**

Uma linha na tabela, no formato das existentes: data, entrega, status, resultado (quantos achados,
quantos corrigidos, quantos viraram pendência, quantos writes externos aplicados e por qual via) e
referências (spec, plano, packet, relatório).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/audits/2026-07-30-doc-sync-sprint4.md docs/superpowers/progress.md
git commit -m "docs(audit): re-auditoria verde e registro no progress"
```

---

## Handoff de execução

`executor: claude`

A triagem decide sobre lei §5, proveniência de decisão e write em fonte canônica — julgamento fora
do plano, que a spec §3 (D6) manteve com o Claude. O Codex entra em duas tasks, sempre por
`mcp__codex__codex` com prompt fechado e **sem tocar o repositório**: a sondagem da Task 1 e, se ela
provar capacidade, a escrita externa da Task 12. Não há `paths_autorizados` porque o Codex não
recebe path de escrita local nesta execução.

O subagente `auditor-docs` roda nas Tasks 2 e 14 — leitura pesada, devolve só a tabela.

**Parada obrigatória:** a Task 7 é portão humano. Nenhuma task de 8 a 13 começa sem a seção 8
commitada.
