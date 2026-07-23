---
description: Planeja um bloco novo pelo workflow superpowers (brainstorming → design → plano)
argument-hint: [nome do bloco, ex. "Bloco 6 · Turmas"]
allowed-tools: Bash(git status:*)
disable-model-invocation: true
---

## Âncora de contexto (não pule)

@docs/superpowers/state.md
@docs/superpowers/backlog.md

## Escopo

**$ARGUMENTS**

Caso vazio: liste o backlog da âncora e **pergunte qual bloco** — não escolha por mim.

## Gate de estado

Leia `workflow_state`.

- `ready_for_planning` → prossiga para `active_work_item`.
- `planning` → retome exatamente do ponto pendente.
- `idle` → mostre o backlog e peça ao João que promova um item.
- qualquer outro estado → PARE e informe `next_action`.

O argumento, quando fornecido, deve corresponder a `active_work_item`.
Não planeje outro bloco enquanto houver trabalho ativo.

## Antes de planejar

1. **Confirme que o bloco não tem plano/spec ativo** em `docs/superpowers/plans|specs/`. Se tiver,
   isto é `/executar-bloco`, não planejamento. Pare e diga.
2. Carregue só o que o bloco exige (CLAUDE.md §3). Toca schema → `docs/adrs.md` +
   `docs/der-fisico.md`. Continua uma feature entregue → o plano dela em `archive/`.
3. Leia as **lições** de `docs/README.md` — não replanejar erro já mapeado.

## Workflow

Dono do fluxo: skill **`using-superpowers`**. Etapas desta fase:

1. **`brainstorming`** — refine a ideia por perguntas, explore alternativas, apresente o design em
   seções para eu validar. **Não pule para o plano com pergunta em aberto.** O design sai em
   `docs/superpowers/specs/AAAA-MM-DD-<bloco>-design.md`.
2. **`writing-plans`** — com o design aprovado: tasks de 2-5 minutos, cada uma com caminho de
   arquivo exato, código completo e passo de verificação. Sai em
   `docs/superpowers/plans/AAAA-MM-DD-<bloco>.md`.

## Regras deste planejamento

- **Just-in-time:** planeje só este bloco. Nada de plano para o bloco seguinte "já que estamos aqui".
- **Regra de negócio não se supõe.** Se o bloco muda regra e a fonte não responde → **PARE e me
  pergunte.** Alucinar regra em setor regulado é o pior resultado possível.
- **DoD de cada task = comportamento provado**, não build verde. O plano tem que dizer COMO provar.
- **Fronteira de lei (§5):** se o bloco parece exigir quebra de lei, o plano não nasce — pergunte.
- Toque de backend → o plano assume **main tree** (pendência P-03), não worktree.

## Ao final

1. Mostre o caminho do design e do plano.
2. Atualize `docs/superpowers/progress.md`: bloco sai do backlog, entra na tabela como **Ativo**,
   com a coluna **Contexto** preenchida (o que uma sessão nova precisa carregar para executá-lo).
3. **Não comece a implementar.** Planejamento e execução são turnos separados — `/executar-bloco`
   é a próxima ordem, e ela é minha.