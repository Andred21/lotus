---
name: lotus-ui-review
description: Revisa uma tela ou jornada read-only do Lotus local pelo navegador, com evidências visuais, responsivas, de console e rede. Use por invocação explícita para revisão UI/UX; não use para backend, produção, auditoria de todo o frontend ou correção automática.
argument-hint: "tela-ou-jornada-local"
disable-model-invocation: false
allowed-tools: Read, Glob, Grep, Write, Bash(git status:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(mkdir:*), Bash(playwright-cli:*), Bash(.agents/skills/lotus-ui-review/scripts/preflight.sh:*)
---

Leia integralmente `../../../.agents/skills/lotus-ui-review/SKILL.md` e cada referência que ela exigir;
siga a fonte canônica. Este frontmatter só controla a invocação no Claude Code. A allowlist cobre o
workflow canônico — ler código, registrar Git (3), preflight (5), criar a run (6), dirigir o browser
(7–12), gravar `report.txt` (14) — e não autoriza escrita em código ou dado da aplicação.

`frontend-design` é lente estética complementar: quem classifica é `references/review-rubric.md`. Se
ela conflitar com uma rule de `.claude/rules/`, **a rule ganha e o conflito é avisado ao João**.
