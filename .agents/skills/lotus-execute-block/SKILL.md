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
- Deviation needed from a plan step → stop that task, record the reason, continue only independent
  tasks, and report.

Codex may commit implementation artifacts and update `state.md`/`progress.md`
when the active plan names Codex as executor or João Victor explicitly delegates
execution/closure. Never alter `backlog.md` unless explicitly requested.
State transitions must be committed with their proving artifact.

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
