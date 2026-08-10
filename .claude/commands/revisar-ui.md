---
description: Revisa uma tela ou jornada read-only do Lotus local e encaminha ao protocolo canônico.
argument-hint: [tela ou jornada local]
allowed-tools: Read, Glob, Grep, Bash(git status:*), Bash(playwright-cli:*), Bash(.agents/skills/lotus-ui-review/scripts/preflight.sh:*)
disable-model-invocation: true
---

> Entrada legada do eixo visual. A execução canônica vive em `/lotus-ui-review`.

Escopo: **$ARGUMENTS**

Se o escopo estiver vazio ou contiver mais de uma tela/jornada, pare e peça uma superfície. Se a
estrutura ainda não foi revisada, indique `/revisar-frontend` antes. Em seguida, carregue e siga a
skill `lotus-ui-review` passando exatamente este escopo. Proponha achados; não altere a interface
sem aprovação explícita.
