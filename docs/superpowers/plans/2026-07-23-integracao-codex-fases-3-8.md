# Integração Claude Code + Codex — Fases 3–8 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Concluir a integração Claude Code (orquestrador) + Codex (contexto externo, execução delegada, revisão independente) com `state.md` como fonte única, fluxo retomável e sem heurística.

**Architecture:** Claude Code + Superpowers mantêm o workflow; comandos `/planejar-bloco` e `/executar-bloco` viram roteadores por estado que delegam ao Codex via MCP (`mcp__codex__codex`) usando skills-contrato em `.agents/skills/`. Codex nunca muda `state.md`; retorna artefato + `RECOMMENDED_TRANSITION`; Claude valida, salva e transiciona no mesmo commit do artefato.

**Tech Stack:** Markdown (comandos/skills/docs) · `.codex/config.toml` · MCP codex plugin · git.

## Global Constraints

- Este plano é meta-trabalho na branch `chore/lotus-operational-state`. **Não** toca `active_work_item`, spec ou plano de feature Lotus, exceto a Task 8 (piloto), que executa a `next_action` real pendente do `state.md`.
- `state.md` é a única fonte do estado operacional; `progress.md` só histórico; `backlog.md` só fila. Nenhum artefato novo pode contradizer isso.
- Codex não altera `state.md`, não escreve em Drive/Notion, não faz commit/push salvo instrução explícita no contrato.
- Mudança de estado sempre no mesmo commit do artefato que a prova.
- Commits em estilo do histórico: `docs: ...` / `docs(ai): ...`.
- Verificação de task de documentação = grep/inspeção com saída esperada explícita (não há suíte de testes para docs).
- Ferramentas MCP `mcp__codex__codex` são deferred: carregar com `ToolSearch "select:mcp__codex__codex,mcp__codex__codex-reply"` antes de invocar (Task 8).
- Limitação conhecida: Codex só tem conector Notion (global `~/.codex/config.toml`). Drive/Figma/GitHub indisponíveis → packet `partial` é aceitável e deve registrar fontes `unavailable`; `blocked` só quando faltar fato indispensável.

---

## Fase 3 — fechamento

### Task 1: Commitar config Codex coerente (read-only até Fase 5)

**Files:**
- Modify: `.codex/config.toml` (mudança já está no working tree: revert `workspace-write` → `read-only`)

- [ ] **Step 1: Confirmar diff pendente**

Run: `git diff .codex/config.toml`
Expected: única mudança `-sandbox_mode = "workspace-write"` / `+sandbox_mode = "read-only"`.

- [ ] **Step 2: Commit**

```bash
git add .codex/config.toml
git commit -m "docs(ai): fase3 - config Codex read-only coerente com contrato da fase"
```

### Task 2: Corrigir `lotus-context-packet` — resolver bloco por `state.md`, typos, dedupe

**Files:**
- Modify: `.agents/skills/lotus-context-packet/SKILL.md`

**Interfaces:**
- Produces: skill resolve bloco por `state.md.active_work_item`; bootstrap inclui `state.md`; captura `state_blob_sha`; validação única. Tasks 3 e 8 dependem deste contrato.

- [ ] **Step 1: Substituir seção Input**

Trocar o parágrafo que resolve o bloco por `progress.md`/`Ativo` por:

```md
The request must identify a `block_id`, plan path, or the active block. When none is supplied, read
`docs/superpowers/state.md` and use `active_work_item`. If `active_work_item` is null or
`workflow_state` is not `context_required`, return `BLOCKED` and state what must be identified.
```

- [ ] **Step 2: Substituir bootstrap**

```md
Read only:

1. `AGENTS.md`;
2. `CLAUDE.md`;
3. `INSTRUÇÕES-DO-PROJETO.md`;
4. `docs/superpowers/state.md`;
5. `docs/superpowers/progress.md` (history only; it never resolves the active block);
6. the active plan and spec pointed by `state.md`, ignoring null pointers.
```

- [ ] **Step 3: Corrigir comandos git**

Trocar o bloco de comandos por:

```bash
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git hash-object docs/superpowers/state.md
git hash-object <progress-path>
git hash-object <plan-path>
git hash-object <spec-path>
```

E na lista "Capture:" acrescentar `- blob SHA of state.md;`.

- [ ] **Step 4: Schema — campos de estado**

No frontmatter do packet schema, após `progress_blob_sha`, inserir:

```yaml
state_path: docs/superpowers/state.md
state_blob_sha: <blob-sha>
```

`plan_path`/`plan_blob_sha`/`spec_path`/`spec_blob_sha` aceitam `null` quando o ponteiro em
`state.md` for `null` (registrar `null`, não inventar).

- [ ] **Step 5: Dedupe validação**

Substituir toda a seção "Validation before returning" (linhas duplicadas) por UMA lista:

```md
Confirm all of the following:

- required frontmatter fields are populated;
- base_commit and all repository blob hashes were obtained, not guessed;
- every external fact cites a source-registry key;
- material conflicts appear in the divergence table;
- the packet contains at most 8 key facts and respects the word budget;
- no implementation steps already owned by the plan were copied;
- `ready` is not used while a blocking question remains;
- the result contains only the suggested path and the marked packet.
```

- [ ] **Step 6: Verificar**

Run: `grep -n "HEADgit\|progress.md and use\|Ativo" .agents/skills/lotus-context-packet/SKILL.md`
Expected: sem resultado.
Run: `grep -c "Confirm all of the following" .agents/skills/lotus-context-packet/SKILL.md`
Expected: `1`.

- [ ] **Step 7: Commit**

```bash
git add .agents/skills/lotus-context-packet/SKILL.md
git commit -m "docs(ai): fase3 - lotus-context-packet resolve bloco por state.md e corrige contrato"
```

---

## Fase 4 — comandos como roteadores finos

### Task 3: `/planejar-bloco` roteia `context_required` → Codex

**Files:**
- Modify: `.claude/commands/planejar-bloco.md`

**Interfaces:**
- Consumes: contrato da Task 2 (markers `SUGGESTED_PATH` / `BEGIN...END LOTUS CONTEXT PACKET` / `RECOMMENDED_TRANSITION`).
- Produces: rota usada pela Task 8 (piloto).

- [ ] **Step 1: Ampliar gate de estado**

No "## Gate de estado", trocar a lista de estados aceitos por:

```md
Este comando aceita somente:

- `context_required` → roteie a geração do Context Packet ao Codex (seção abaixo); com o packet
  validado e salvo, transicione para `ready_for_planning` e prossiga;
- `ready_for_planning` → valide as âncoras e transicione para `planning`;
- `planning` → retome exatamente do ponto pendente.
```

- [ ] **Step 2: Inserir seção de roteamento (antes de "Reconstrução de contexto")**

```md
## Rota `context_required` → Codex

Pré-condições: `next_owner: codex`, `next_action: generate_context_packet`, `context_packet: null`.
Divergência → `blocked`.

1. Carregue as ferramentas do plugin Codex (`ToolSearch "select:mcp__codex__codex"`).
2. Invoque o Codex (sandbox read-only) com prompt que exija a skill `lotus-context-packet` de
   `.agents/skills/`, informando `active_work_item`, `active_spec`, branch e commit atuais. O Codex
   não altera arquivos nem estado.
3. Valide a resposta: markers exatos, frontmatter completo, ≤ 8 key facts, fontes indisponíveis
   registradas, `RECOMMENDED_TRANSITION` presente. Contrato violado → uma re-invocação citando a
   violação; persistindo → `blocked`.
4. `RECOMMENDED_TRANSITION: blocked` → grave `workflow_state: blocked` com `blocker` copiado do
   packet e PARE.
5. `ready_for_planning` → salve o packet no `SUGGESTED_PATH`, e no MESMO commit atualize
   `state.md`:

```yaml
workflow_state: ready_for_planning
next_owner: claude
next_action: plan_active_work_item
context_packet: docs/superpowers/context-packets/<arquivo>.md
```

6. Um packet `status: partial` prossegue; as fontes `unavailable` viram limitação declarada no
   brainstorming. `status: blocked` nunca prossegue.
```

- [ ] **Step 3: Verificar**

Run: `grep -n "context_required" .claude/commands/planejar-bloco.md`
Expected: hits no gate e na seção de rota.

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/planejar-bloco.md
git commit -m "docs(ai): fase4 - planejar-bloco roteia context_required ao Codex"
```

### Task 4: Sincronizar `CLAUDE.md` e `AGENTS.md` com o roteamento

**Files:**
- Modify: `CLAUDE.md` (§4, uma linha) e `AGENTS.md` (§1, ajuste do parágrafo Context Packet)

- [ ] **Step 1: CLAUDE.md §4** — após a linha dos comandos principais, acrescentar:

```md
Delegação ao Codex (Context Packet, execução delegada, revisão independente) é roteada pelos
próprios comandos conforme `state.md`; os contratos vivem em `.agents/skills/`.
```

- [ ] **Step 2: AGENTS.md §1** — no bullet "Context Packet", trocar a referência de invocação por:

```md
- **Context Packet:** a skill `lotus-context-packet` é invocada pelo `/planejar-bloco` quando
  `state.md` está em `context_required`. Consulte somente as fontes externas exigidas e retorne o
  packet conforme o contrato da skill. A consulta autoriza leitura externa seletiva, não escrita
  externa nem mudança de estado do Superpowers.
```

- [ ] **Step 3: Verificar**

Run: `grep -n "context_required" CLAUDE.md AGENTS.md`
Expected: AGENTS.md cita a rota; CLAUDE.md continua apontando state.md como fonte.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "docs(ai): fase4 - CLAUDE/AGENTS refletem roteamento por estado"
```

---

## Fase 5 — execução Codex com handoff

### Task 5: Criar skill `lotus-execute-block`

**Files:**
- Create: `.agents/skills/lotus-execute-block/SKILL.md`

**Interfaces:**
- Produces: contrato consumido pela Task 6 (`## Handoff de execução` no plano; report com `RECOMMENDED_TRANSITION`).

- [ ] **Step 1: Escrever a skill**

```md
---
name: lotus-execute-block
description: Execute only the tasks of an approved Lotus implementation plan inside the authorized paths, following the plan's TDD cycle and the repository rules, and return an auditable execution report. Use only when Claude Code delegates execution of a plan whose "Handoff de execução" section names codex as executor.
---

# Lotus Execute Block

## Objective

Execute the delegated plan tasks exactly as written. The skill does not replan, redesign, expand
scope, advance Superpowers state, or touch paths outside the authorization list.

## Input

The request must provide:

1. `plan_path` — the active plan;
2. the task range to execute (default: all unchecked tasks, in order);
3. base branch and commit.

Read `docs/superpowers/state.md` and require `workflow_state: executing` (or
`ready_for_execution` when Claude states it will commit the transition with the first artifact) and
`active_plan == plan_path`. Mismatch → return `BLOCKED`.

The plan must contain a `## Handoff de execução` section with `executor: codex` and
`paths_autorizados`. Missing section or `executor: claude` → return `BLOCKED`.

## Bootstrap

Read only: `AGENTS.md`, `CLAUDE.md`, `docs/superpowers/state.md`, the plan, the spec and the
context packet pointed by `state.md` (ignore null pointers), and the `.claude/rules/*` matching the
authorized paths (per AGENTS.md §4).

## Execution rules

- Follow the plan task by task; preserve red → green → refactor exactly as the plan's steps define.
- Modify only files under `paths_autorizados`. A needed change outside them → stop and return
  `BLOCKED` with the exact path and reason.
- Run only the verification commands the plan or `CLAUDE.md` §6 define. Never claim a test passed
  without running it.
- Preserve existing WIP; start with `git status --short`.
- Do not commit, push, branch, or alter `state.md`, `progress.md`, `backlog.md` — Claude commits.
- Deviation needed from a plan step → stop that task, record the reason, continue only independent
  tasks, and report.

## Output contract

Return exactly:

```text
BEGIN LOTUS EXECUTION REPORT
## Tasks
| Task | Status (done|blocked|skipped) | Evidence (command + decisive output line) |
## Files touched
- <path> — <one-line change summary>
## Commands run
- <command> → <result>
## Deviations and limitations
- ...
END LOTUS EXECUTION REPORT
RECOMMENDED_TRANSITION: ready_for_review|blocked
```

No content outside the markers.
```

- [ ] **Step 2: Verificar**

Run: `grep -n "RECOMMENDED_TRANSITION\|paths_autorizados" .agents/skills/lotus-execute-block/SKILL.md`
Expected: ambos presentes.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/lotus-execute-block/SKILL.md
git commit -m "docs(ai): fase5 - contrato lotus-execute-block para execucao delegada"
```

### Task 6: Habilitar escrita do Codex + gates de handoff nos comandos

**Files:**
- Modify: `.codex/config.toml`
- Modify: `.claude/commands/executar-bloco.md`
- Modify: `.claude/commands/planejar-bloco.md`

**Interfaces:**
- Consumes: contrato da Task 5.

- [ ] **Step 1: `.codex/config.toml`**

```toml
# Fase 5: escrita habilitada somente para execução delegada via lotus-execute-block,
# dentro dos paths autorizados pelo plano ativo. Estado e commits permanecem com Claude.

approval_policy = "never"
sandbox_mode = "workspace-write"
web_search = "disabled"
```

- [ ] **Step 2: `planejar-bloco.md` — plano nasce com handoff**

Na seção "## Workflow", item `writing-plans`, acrescentar:

```md
   Todo plano termina com uma seção `## Handoff de execução` declarando `executor: claude|codex`
   e, quando `codex`, a lista `paths_autorizados` (globs exatos). Critério: `codex` para tasks
   mecânicas com verificação executável e paths fechados; `claude` quando a task toca lei do §5,
   decisão de arquitetura ou exige julgamento fora do plano.
```

- [ ] **Step 3: `executar-bloco.md` — gate de delegação**

Após "### Classificação inline", inserir:

```md
### Gate de delegação (handoff)

Leia `## Handoff de execução` do `active_plan`:

- `executor: claude` ou seção ausente → execute com o ciclo Superpowers normal.
- `executor: codex` → carregue `mcp__codex__codex` via ToolSearch e invoque a skill
  `lotus-execute-block` com `plan_path`, intervalo de tasks e commit base. Depois do report:
  1. valide os markers e o contrato;
  2. revise o diff real (`git status` + `git diff`) contra o plano — o report não substitui o diff;
  3. rode a verificação do plano você mesmo antes de aceitar;
  4. commit por task ou grupo coeso, nos paths exatos;
  5. `RECOMMENDED_TRANSITION: blocked` ou diff fora de `paths_autorizados` → `workflow_state:
     blocked` com `blocker`, sem aceitar o diff.

Estado, transições e commits permanecem com Claude em ambos os casos.
```

- [ ] **Step 4: Verificar**

Run: `grep -n "Handoff de execução" .claude/commands/*.md`
Expected: hit em planejar-bloco e executar-bloco.

- [ ] **Step 5: Commit**

```bash
git add .codex/config.toml .claude/commands/executar-bloco.md .claude/commands/planejar-bloco.md
git commit -m "docs(ai): fase5 - handoff de execucao Codex com gates nos comandos"
```

---

## Fase 6 — revisão por risco

### Task 7: `revisar-sprint` classifica risco e aciona revisão independente

**Files:**
- Modify: `.claude/skills/revisar-sprint/SKILL.md`

- [ ] **Step 1: Inserir após "## Gate de estado"**

```md
## Classificação de risco (obrigatória, uma linha)

Classifique `active_work_item` antes de revisar:

- **Alto risco** — tocou qualquer domínio das leis §5 (migration/schema, `generated.ts`, auth/
  Sanctum, auditoria, RBAC), dinheiro, certificados/documentos legais, ou foi executado via
  `executor: codex`.
- **Baixo risco** — todo o resto (ex.: frontend visual sem regra de negócio).

**Baixo risco** → revisão Claude com o gabarito abaixo, como sempre.

**Alto risco** → além da revisão Claude, acione uma revisão independente do Codex: carregue
`mcp__codex__codex` (read-only) e peça revisão do intervalo Git do work item contra plano, spec e
leis §5, retornando achados como `arquivo:linha — problema — impacto`. Depois:

1. deduplique e funda os achados das duas revisões;
2. achado que só o Codex viu não se aceita sem verificação própria no código;
3. divergência entre revisores se mostra ao João, não se resolve em silêncio.

A revisão independente não substitui o gabarito do projeto; é uma segunda lente.
```

- [ ] **Step 2: Verificar**

Run: `grep -n "Classificação de risco" .claude/skills/revisar-sprint/SKILL.md`
Expected: 1 hit.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/revisar-sprint/SKILL.md
git commit -m "docs(ai): fase6 - revisao por risco com segunda lente Codex"
```

---

## Fase 7 — piloto ponta a ponta

### Task 8: Piloto real — gerar Context Packet do `bloco6-frontend-exec3` via Codex

Executa a `next_action` real pendente do `state.md` usando a rota da Task 3.

**Files:**
- Create: `docs/superpowers/context-packets/<SUGGESTED_PATH retornado>.md`
- Modify: `docs/superpowers/state.md`

- [ ] **Step 1: Pré-condições**

Run: `grep -n "workflow_state\|next_owner\|next_action\|context_packet" docs/superpowers/state.md`
Expected: `context_required` / `codex` / `generate_context_packet` / `null`.

- [ ] **Step 2: Carregar ferramenta**

`ToolSearch "select:mcp__codex__codex,mcp__codex__codex-reply"`.

- [ ] **Step 3: Invocar Codex**

Prompt: seguir `.agents/skills/lotus-context-packet/SKILL.md` para `active_work_item:
bloco6-frontend-exec3`, spec `docs/superpowers/specs/2026-07-21-bloco6-frontend-operacao-design.md`,
branch e commit atuais. Fontes esperadas: Notion (disponível); Drive/Figma → registrar
`unavailable` (limitação conhecida das Global Constraints).

- [ ] **Step 4: Validar contrato**

Checar markers, frontmatter (incl. `state_blob_sha`), ≤ 8 facts, `RECOMMENDED_TRANSITION`.
Violação → uma re-invocação; persistindo → `blocked` e registrar no relato final.

- [ ] **Step 5: Salvar e transicionar (mesmo commit)**

Salvar packet no `SUGGESTED_PATH`; atualizar `state.md` (`ready_for_planning`, `next_owner:
claude`, `next_action: plan_active_work_item`, `context_packet: <path>`, `updated_at`,
`state_basis_commit` = HEAD do commit).

```bash
git add docs/superpowers/context-packets/*.md docs/superpowers/state.md
git commit -m "docs(ai): fase7 - piloto Context Packet exec3 via Codex; state ready_for_planning"
```

Se o resultado for `blocked`: gravar `workflow_state: blocked` + `blocker` no mesmo commit do
relato — piloto ainda é válido, a evidência é o bloqueio explícito.

- [ ] **Step 6: Registrar evidência do piloto**

Anotar na seção final deste plano (checkbox abaixo): status do packet (`ready|partial|blocked`),
fontes consultadas/indisponíveis, defeitos de contrato encontrados. Isso alimenta a Task 9.

---

## Fase 8 — limpeza baseada em evidência

### Task 9: Corrigir defeitos do piloto e varrer incoerências

**Files:**
- Modify: somente os arquivos que a evidência da Task 8 indicar + varredura abaixo.

- [ ] **Step 1: Aplicar correções de contrato evidenciadas no piloto** (se houver; cada correção
  cita a evidência no commit).

- [ ] **Step 2: Varredura de coerência**

Run: `grep -rn "Fase 1\|read-only" .codex/ AGENTS.md .agents/skills/ | grep -vi "revisão\|review"`
Expected: nenhuma afirmação de que o sandbox é read-only (Fase 5 mudou para workspace-write com
gates); referências históricas em progress/commits não contam.

Run: `grep -rn "progress.md" .agents/skills/`
Expected: apenas menções como histórico, nunca como resolvedor de bloco ativo.

- [ ] **Step 3: Atualizar `progress.md`** — uma linha de histórico:

```md
| 2026-07-23 | Integração Codex · Fases 3–8 | Entregue | Roteamento por estado, handoff de execução, revisão por risco e piloto de packet. | `plans/2026-07-23-integracao-codex-fases-3-8.md` |
```

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "docs(ai): fase8 - limpeza por evidencia do piloto e historico"
```

---

## Evidência do piloto (preencher na Task 8)

- Status do packet: _
- Fontes consultadas: _
- Fontes indisponíveis: _
- Defeitos de contrato: _
