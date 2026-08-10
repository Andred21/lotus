---
name: lotus-ui-review
description: Revisa uma tela ou jornada read-only do Lotus local pelo navegador, com evidências visuais, responsivas, de console e rede. Use por invocação explícita para revisão UI/UX; não use para backend, produção, auditoria de todo o frontend ou correção automática.
argument-hint: "tela-ou-jornada-local"
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Bash(git status:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(mkdir:*), Bash(playwright-cli:*), Bash(.agents/skills/lotus-ui-review/scripts/preflight.sh:*)
---

Leia integralmente `../../../.agents/skills/lotus-ui-review/SKILL.md` e siga a fonte canônica.
Leia cada referência que ela exigir. As extensões deste frontmatter apenas controlam a invocação
no Claude Code; não alteram o workflow canônico. A allowlist cobre exatamente o que o workflow
canônico exige: ler o código, registrar Git (passo 3), rodar o preflight (passo 5), criar o
diretório da run (passo 6), dirigir o browser (passos 7–12) e gravar `report.txt` (passo 14).
Nenhuma escrita em código ou dado da aplicação é autorizada aqui.

A skill `frontend-design` é lente estética complementar, nunca dona do fluxo: quem decide
classificação é `references/review-rubric.md`. Onde `frontend-design` conflitar com uma rule de
`.claude/rules/`, **a rule ganha e o conflito é avisado ao João** — não resolvido em silêncio.
