---
name: lotus-context-packet
description: Create or refresh a compact, source-attributed Context Packet for a Lotus block by retrieving only the required external context from Google Drive, Notion, Figma, GitHub, or other configured MCP sources. Use before Claude plans or executes a block that depends on external context, when a packet is missing or stale, or when source divergences must be reconciled without giving Claude direct access to the external systems.
---

# Lotus Context Packet

## Objective

Produce one compact, auditable snapshot of the external context required by one Lotus block. The
packet is a derived handoff for Claude Code; it does not replace the canonical source, the active
spec, the implementation plan, repository rules, or code.

The skill retrieves and filters context. It does not brainstorm, redesign the feature, implement
code, advance Superpowers, update external systems, or resolve an unsupported ambiguity silently.

## Input

The request must identify a `block_id`, plan path, or the active block. When none is supplied, read
`docs/superpowers/state.md` and use `active_work_item`. If `active_work_item` is null or
`workflow_state` is not `context_required`, return `BLOCKED` and state what must be identified.

An optional existing packet path means refresh that packet instead of starting from zero.

## Required local bootstrap

Read only:

1. `AGENTS.md`;
2. `CLAUDE.md`;
3. `INSTRUÇÕES-DO-PROJETO.md`;
4. `docs/superpowers/state.md`;
5. `docs/superpowers/progress.md` (history only; it never resolves the active block);
6. the active plan and spec pointed by `state.md`, ignoring null pointers.

Read additional repository documents only when the active plan/spec explicitly points to them.
Run read-only commands to capture:

```bash
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git hash-object docs/superpowers/state.md
git hash-object <progress-path>
git hash-object <plan-path>
git hash-object <spec-path>
```

Capture:

- current branch or requested ref;
- current commit;
- blob SHA of `state.md`;
- blob SHA of `progress.md`;
- blob SHA of the active plan;
- blob SHA of the active spec;
- existing working-tree changes.

Preserve WIP. Do not install dependencies or run mutating commands.

## External retrieval

1. Derive the smallest source list from the plan/spec Fontes, the pointers in `state.md`,
and explicit source references in the request.
2. Query sources in the Lotus priority order:
   - current explicit instruction from João Victor;
   - canonical Google Drive planning documents;
   - requested GitHub reference;
   - Notion task organization;
   - memory only as a locator, never as evidence.

3. Use configured MCP/connectors. Do not use broad web search as a substitute for an unavailable
canonical source.
4. Retrieve no more than five external artifacts unless the packet explains why additional sources
are necessary.
5. Record source ID, title, provider, modified time, retrieval status, and the exact purpose for
which the source was consulted.
6. Never include credentials, access tokens, private personal data, raw conversation transcripts,
or large copied passages.

If a named connector is unavailable, mark the source `unavailable`.

Blocking is decided by the *missing fact*, never by the missing source:

- Lack of Notion is **not** blocking when the active spec already carries the block's scope,
  decisions, and acceptance criteria. Lotus work items are internal splits of a sprint
  (`...-exec1`, `-exec2`, `-exec3`) and usually have **no 1:1 Notion task** — absence of a
  matching task is expected, not evidence of missing context. Record it as `unavailable` and
  continue with `partial`.
- Lack of a requirement or explicit decision source **is** blocking when planning would otherwise
  require guessing a business rule, an acceptance criterion, or a legal-weight behaviour.

Use `blocked` only when you can name the specific fact that is missing and show that no available
source supplies it.

## Reconciliation rules 

Use the project hierarchy without silent choices. A repository spec may override an older Drive
snapshot only when it explicitly records a later instruction or decision from João Victor. Record:

- the external statement;
- the conflicting repository statement;
- the applied resolution or unresolved;
- the evidence and source-priority basis.

Do not reopen a resolved decision merely because an older Drive snapshot differs. Do not conceal
the divergence.


## Compression rules 

- Maximum packet body: 1,200 words, excluding YAML frontmatter and source table.
- Maximum key facts: 8.
- Include only facts that change scope, acceptance, constraints, terminology, permissions, or a
- cross-module contract.
- Reference plan/spec/code by path; do not copy their implementation details.
- Keep non-goals explicit to prevent scope expansion.
- Open questions contain only unresolved items that can change implementation. Put optional or
- future ideas under Deferred, not Open questions.

## Status

- `ready`: sufficient context exists and all material divergences are resolved by evidence.
- `partial`: a non-blocking source is unavailable or indirect; implementation can proceed.
- `blocked`: a required fact or conflict cannot be resolved safely.

## Output contract

Packet generation is a read-only operation regardless of the configured sandbox: do not create or
update the packet file — the caller stores it. Return
exactly one suggested path followed by one packet between these markers:

```text
SUGGESTED_PATH: docs/superpowers/context-packets/<plan-slug>.md
BEGIN LOTUS CONTEXT PACKET
<packet>
END LOTUS CONTEXT PACKET
RECOMMENDED_TRANSITION: ready_for_planning|blocked
```

Do not add an introduction, conclusion, alternative version, implementation advice, or commentary
outside these markers.

The caller reviews and stores the returned packet.

## Packet schema

```md
---
schema_version: 1
packet_id: <stable-id>
block_id: <block-id>
status: ready|partial|blocked
generated_at: <ISO-8601 date or datetime>
base_ref: <branch-or-ref>
base_commit: <git-sha>
state_path: docs/superpowers/state.md
state_blob_sha: <blob-sha>
progress_path: <path>
progress_blob_sha: <blob-sha>
plan_path: <path>
plan_blob_sha: <blob-sha>
spec_path: <path>
spec_blob_sha: <blob-sha>
word_budget: 1200
---

# Context Packet — <block title>

> Derived snapshot. Canonical source hierarchy and staleness rules remain authoritative.

## Scope

**Goal:** ...
**Non-goals:** ...

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|

## Key facts

1. ... `[SOURCE-KEY]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|

## Constraints

- ...

## External acceptance signals

- ...

## Open questions

- None blocking.

## Deferred

- ...

## Staleness triggers

- ...
```

## Validation before returning

Confirm all of the following:

- required frontmatter fields are populated (`plan_path`/`plan_blob_sha`/`spec_path`/`spec_blob_sha`
  record `null` when the corresponding `state.md` pointer is null — never invent them);
- base_commit and all repository blob hashes were obtained, not guessed;
- every external fact cites a source-registry key;
- material conflicts appear in the divergence table;
- the packet contains at most 8 key facts and respects the word budget;
- no implementation steps already owned by the plan were copied;
- `ready` is not used while a blocking question remains;
- the result contains only the suggested path and the marked packet.