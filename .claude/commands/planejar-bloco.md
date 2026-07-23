---
description: Planeja o trabalho ativo pelo estado operacional (brainstorming → spec → plano)
argument-hint: [active_work_item, ex. "bloco6-frontend-exec3"]
allowed-tools: Bash(git status:*)
disable-model-invocation: true
---

## Âncoras de contexto (não pule)

@docs/superpowers/state.md
@docs/superpowers/progress.md

Leia `state.md` antes de qualquer outra fonte. Leia `backlog.md` somente se
`workflow_state: idle`; ele serve para o João escolher um item, nunca para o comando selecionar o
primeiro item pendente.

## Escopo

**$ARGUMENTS**

O argumento é obrigatório e deve corresponder exatamente a `active_work_item`. Argumento vazio ou
divergente → PARE e informe o valor esperado. Não planeje outro item enquanto houver trabalho ativo.

## Gate de estado

Este comando aceita somente:

- `ready_for_planning` → valide as âncoras e transicione para `planning`;
- `planning` → retome exatamente do ponto pendente.

Qualquer outro estado → PARE e informe `workflow_state`, `next_owner` e `next_action`. Em `idle`,
você pode mostrar o backlog e pedir ao João uma seleção explícita, mas não pode promover um item.

Ao iniciar a partir de `ready_for_planning`, atualize `state.md` no mesmo commit do primeiro artefato
durável:

```yaml
workflow_state: planning
next_owner: claude
next_action: continue_active_planning
```

## Reconstrução de contexto

1. Leia `context_packet` apontado pelo estado; ele deve existir e não pode ser `null` quando o bloco
   depender de contexto externo.
2. Leia `active_spec` quando não for `null`. A spec pode ser compartilhada por várias execuções;
   sua existência não significa que este work item já tenha plano.
3. Leia somente os documentos adicionais exigidos pelo packet/spec. Toca schema → `docs/adrs.md` +
   `docs/der-fisico.md`.
4. Leia as lições pertinentes de `docs/README.md`.
5. Confirme que `active_plan` é `null` ou pertence ao mesmo `active_work_item`. Plano divergente
   bloqueia a sessão.

Não use commits, existência de arquivos, ordem do backlog ou texto de `progress.md` para deduzir a
fase. Divergência entre state, packet, spec, plano ou Git → transicione para `blocked`, descreva
`blocker` e peça decisão; não escolha silenciosamente.

## Workflow

O dono das técnicas internas continua sendo **`using-superpowers`**. Dentro da fase `planning`:

1. **`brainstorming`** — refine somente as decisões ainda abertas, apresente o design em seções e
   obtenha aprovação. Quando `active_spec` já for uma spec compartilhada aprovada, complemente-a
   somente se a execução exigir decisão nova.
2. **`writing-plans`** — escreva tasks pequenas com paths exatos, passos de verificação e DoD
   comportamental. O plano sai em
   `docs/superpowers/plans/AAAA-MM-DD-<active-work-item>.md`.

## Regras

- Planejamento just-in-time: planeje apenas `active_work_item`.
- Regra de negócio não se supõe. Fonte insuficiente → bloqueie e pergunte ao João.
- DoD de cada task prova comportamento; build verde isolado não basta.
- Possível quebra de lei do `CLAUDE.md` §5 → PARE e peça decisão explícita.
- Toque backend assume main tree por causa da pendência P-03.
- Não remova nem promova itens do backlog durante planejamento.
- `progress.md` registra histórico; não recebe metadados operacionais nem controla transições.

## Ao concluir

1. Mostre os paths finais da spec e do plano.
2. Preencha `active_spec` e `active_plan` em `state.md`.
3. Transicione no mesmo commit que torna o plano executável:

```yaml
workflow_state: ready_for_execution
next_owner: claude
next_action: execute_active_plan
```

4. Não implemente. `/executar-bloco <active_work_item>` exige uma instrução posterior.
