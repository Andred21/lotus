---
description: Executa o próximo bloco de tasks do plano ativo (superpowers, subagent-driven)
argument-hint: [nome-do-bloco ou EAP]
---

## Âncora de contexto (não pule)

Estado do projeto:

@docs/superpowers/progress.md

## O que fazer

Bloco alvo: **$ARGUMENTS** — se vazio, use o primeiro item do backlog do índice acima e
**confirme comigo antes de começar**.

1. **Reconstrua contexto seletivamente** (CLAUDE.md §3): leia `INSTRUÇÕES-DO-PROJETO.md` para o
   padrão de código. Se o bloco toca schema/DB/infra, leia também `docs/adrs.md` e `docs/der-fisico.md`.
   Não carregue tudo indiscriminadamente.
2. **Plano just-in-time** (CLAUDE.md §4): se o bloco ainda não tem plano/spec em
   `docs/superpowers/plans/`, dispare o fluxo superpowers (`brainstorming` → `writing-plans`)
   ANTES de codar. Nunca execute em cima do plano de outro bloco.
3. **Execute** via `subagent-driven-development`, respeitando as leis invioláveis (CLAUDE.md §5)
   e a disciplina cirúrgica (§6).
4. **Antes de tocar arquivo:** `git status`; arquivo sujo → `git diff <arquivo>` + Read fresco
   imediatamente antes de editar. WIP do João é intocável; `git add` só os caminhos da task.
5. **DoD:** comportamento provado end-to-end contra a API real — não build/lint/test verde.

Se o bloco desviar do definido em docs/spec/escopo, ou parecer pedir quebra de uma lei do §5:
**PARE e me pergunte.**