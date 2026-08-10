---
name: lotus-ui-review
description: Revisa uma tela ou jornada read-only do Lotus local pelo navegador, com evidências visuais, responsivas, de console e rede. Use por invocação explícita para revisão UI/UX; não use para backend, produção, auditoria de todo o frontend ou correção automática.
argument-hint: [tela-ou-jornada-local]
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(playwright-cli:*), Bash(.agents/skills/lotus-ui-review/scripts/preflight.sh:*)
---

Leia integralmente `../../../.agents/skills/lotus-ui-review/SKILL.md` e siga a fonte canônica.
Leia cada referência que ela exigir. As extensões deste frontmatter apenas controlam a invocação
no Claude Code; não alteram o workflow canônico.
