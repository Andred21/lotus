---
description: Executa o plano do trabalho ativo sem redescobrir a fase
argument-hint: [active_work_item]
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*)
disable-model-invocation: true
---

> Fonte da mecânica de execução do Lotus: gate de estado, main tree/worktree, TDD, disciplina Git
> e Definition of Done.

## Gate de estado

@docs/superpowers/state.md

Leia `state.md` primeiro. Este comando aceita somente:

- `ready_for_execution` → valide todas as âncoras e transicione para `executing`;
- `executing` → retome a primeira task comprovadamente pendente do plano.

Qualquer outro estado → PARE e informe `workflow_state`, `next_owner` e `next_action`.

O argumento é obrigatório e deve corresponder exatamente a `active_work_item`. Nunca selecione
trabalho por `progress.md`, `backlog.md`, commits ou existência de arquivos.

Antes de começar, exija:

- `active_spec`, `active_plan` e seus paths existentes;
- `context_packet` existente quando não for `null` ou quando a spec declarar dependência externa;
- coerência entre estado, spec, packet, plano, Git e work item;
- `active_plan` cobrindo o work item pedido.

Divergência → PARE e transicione para `blocked`; não reconstrua a fase por heurística.

Ao iniciar a partir de `ready_for_execution`, atualize `state.md` no mesmo commit da primeira task
durável:

```yaml
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
```

## Reconstrução de contexto

Carregue, nesta ordem:

1. `active_spec`;
2. `context_packet`, quando não for `null`;
3. `active_plan`;
4. `.superpowers/sdd/progress.md`, se existir, apenas para localizar a task atual;
5. arquivos exigidos pela task atual;
6. rules correspondentes aos paths tocados.

O ledger local registra task a task, mas não decide a fase. Lacuna de contexto → consulte a próxima
fonte oficial de `CLAUDE.md` §3 incrementalmente. Nunca carregue tudo por precaução.

## Workflow da execução

O estado escolhe a fase; as skills de Superpowers conduzem a técnica dentro dela. Preserve o ciclo
de execução aplicável: `using-git-worktrees` quando permitido, `subagent-driven-development` ou
`executing-plans`, `test-driven-development` e verificação do plano. Não inicie review ou fechamento
dentro deste comando.

### Gate main tree/worktree

- Bloco frontend-only → `using-git-worktrees` normalmente.
- Bloco que toca backend → main tree + disciplina Git abaixo. O compose monta o main tree; testar
  backend em worktree produziria um verde contra código diferente (pendência P-03).

### Classificação inline

Priorize `subagent-driven-development`. Execução inline só quando todos forem verdade:

1. envolve um arquivo;
2. não altera regra de negócio;
3. não exige reconstrução significativa de contexto;
4. é validável localmente sem impactar outras camadas;
5. não toca lei inviolável do §5: migration, `generated.ts`, auth/Sanctum, auditoria ou RBAC.

Declare a classificação em uma linha. Se qualquer critério falhar, use o fluxo completo.

## TDD e disciplina Git

- Siga o plano task a task e preserve red → green → refactor quando houver comportamento testável.
- Antes de tocar arquivo: `git status`. Arquivo sujo: `git diff <arquivo>` e leitura fresca
  imediatamente antes da edição.
- O WIP do João é intocável; em conflito, o working tree existente vence.
- `git add` somente nos paths exatos da task. Commits devem manter escopo e prova coerentes.
- Registre progresso fino em `.superpowers/sdd/progress.md` quando a técnica de execução exigir.
- Desvio de convenção deve ser justificado no ledger; desvio de lei exige decisão explícita do João.

## Definition of Done

DoD é o comportamento previsto no plano provado end-to-end contra a API real, além dos testes,
build, lint, Pint e tipos aplicáveis. Não marque task ou plano concluído apenas porque uma ferramenta
ficou verde. Implemente somente `active_work_item`.

## Ao concluir

Depois de executar e provar todas as tasks do `active_plan`:

1. registre a evidência final no ledger;
2. confirme working tree/commits coerentes com o plano;
3. atualize `state.md` no commit documental de handoff:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
```

4. não inicie review automaticamente. A próxima instrução deve acionar a revisão do trabalho ativo.
