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

Read the block's `docs/superpowers/blocos/<NN>-<slug>/estado.md` — `<NN>-<slug>` named by the
caller, or derived from `plan_path`'s directory — and require `workflow_state: executing` (or
`ready_for_execution` when Claude states it will commit the transition with the first artifact) and
`active_plan == plan_path`. Mismatch → return `BLOCKED`.

The plan must contain a `## Handoff de execução` section with `executor: codex` and
`paths_autorizados`. Missing section or `executor: claude` → return `BLOCKED`.

## Bootstrap

Read only: `AGENTS.md`, `CLAUDE.md`, the block's `docs/superpowers/blocos/<NN>-<slug>/estado.md`
(`docs/superpowers/state.md` is only the contract), the plan, the spec and the context packet
pointed by it (ignore null pointers), and the `.claude/rules/*` matching the authorized paths (per
AGENTS.md §4).

## Execution rules

- Follow the plan task by task; preserve red → green → refactor exactly as the plan's steps define.
- Modify only files under `paths_autorizados`. A needed change outside them → stop and return
  `BLOCKED` with the exact path and reason.
- Run only the verification commands the plan or `CLAUDE.md` §6 define. Never claim a test passed
  without running it.
- Preserve existing WIP; start with `git status --short`.
- Deviation needed from a plan step → stop that task, record the reason, continue only independent
  tasks, and report.

Leave the implementation changes uncommitted, and never write the block's `estado.md`, nor
`progress.md` (it only changes at closure) or `backlog.md`. State, transitions and commits belong
to Claude (`.claude/commands/executar-bloco.md`); report the transition you recommend in
`RECOMMENDED_TRANSITION` instead.

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
