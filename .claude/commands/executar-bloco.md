---
description: Executa um bloco do backlog pelo workflow superpowers, retomando da etapa pendente
argument-hint: [nome-do-bloco ou EAP]
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*)
disable-model-invocation: true
---

> **Fonte da mecânica de execução do Lotus** (gate inline, gate worktree, disciplina git, DoD).

## Âncora de contexto (não pule)

Estado do projeto:

@docs/superpowers/progress.md

Working tree: !`git status --short`

## Escopo:

**$ARGUMENTS**

Caso vazio: localize o primeiro bloco pendente na âncora acima e **confirme comigo antes de começar.**

## Reconstrução de contexto

Carregue o que a coluna **Contexto** da linha deste bloco listar — e só isso. Nada mais.

- Padrão de código **não se carrega**: as rules de `.claude/rules/` entram sozinhas quando você lê
  o arquivo que elas cobrem.
- Lacuna de contexto → consulte a próxima fonte oficial (CLAUDE.md §3), **incrementalmente**.
- Nunca carregue tudo indiscriminadamente.

## Disciplina de contexto (durante toda a execução)

- Carregue o menor contexto possível.
- Consulte documentos incrementalmente; reutilize o que já está carregado.
- Nunca leia um documento inteiro se uma seção resolve.
- Implemente um bloco lógico por vez.

## Estado — determine ANTES de agir

Verifique e diga em 1 linha onde o bloco está:
- Design aprovado? · Plano existe? · Implementação parcial? · Review pendente? · Branch ativa?

Identifique a **próxima etapa obrigatória** do workflow e **continue exatamente dela**.
Nunca reinicie nem reexecute etapa concluída. Etapa obrigatória ausente → execute-a antes de seguir.

## Workflow

O dono do fluxo é a skill **`using-superpowers`**. Pergunte a ela qual é a próxima etapa — não
reproduza a sequência de cabeça.

Ciclo canônico: `brainstorming` → `using-git-worktrees` → `writing-plans` →
`subagent-driven-development` → `test-driven-development` → `requesting-code-review` →
`finishing-a-development-branch`.

**Worktree — gate:**
- Bloco **frontend-only** → `using-git-worktrees` normalmente.
- Bloco que **toca backend** → **main tree** + disciplina git abaixo. O compose monta o main tree;
  worktree faria o teste rodar contra o código errado (verde mentiroso). Pendência P-03.

## Política de execução

Priorize **subagent-driven-development**.

Execução **inline** só quando TODOS os 5 critérios forem verdade:
1. envolve um arquivo;
2. não altera regra de negócio;
3. não exige reconstrução significativa de contexto;
4. é validável localmente sem impactar outras camadas;
5. **não toca superfície de lei inviolável** (§5): migration, `generated.ts`, auth/Sanctum,
   auditoria, RBAC.

Declare a classificação em 1 linha e siga. Qualquer critério falhou → fluxo completo.
**Na dúvida, não é trivial.**

## Disciplina git (main tree)

Antes de tocar em arquivo: `git status`. Arquivo sujo: `git diff <arquivo>` + **Read fresco
imediatamente antes de editar**. O João edita o working tree ao vivo — o WIP dele é **intocável**.
`git add` só os caminhos exatos da task. Em conflito, o working tree vence.

## Definition of done

**Comportamento provado end-to-end contra a API real.** Não é build verde, não é lint verde, não é
teste verde. Bugs de peso legal (upload vazio, 422 silencioso) só a verificação real pegou.

## Restrições

- Implemente **somente este bloco**.
- Siga CLAUDE.md e as rules ativas.
- Desvio de convenção → registre o motivo em `.superpowers/sdd/progress.md`.
- Desvio do definido em docs/spec/escopo, conflito arquitetural, ou quebra de lei do §5 → **PARE e me pergunte.**
- Nunca assuma contexto sem consultar.