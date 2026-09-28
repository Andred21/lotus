---
description: Executa o plano do bloco da lane atual, com revisão por task. Não replaneja.
argument-hint: "[NN] [--simples] [--max]"
disable-model-invocation: true
model: sonnet
effort: medium
---

# /executar-bloco

Fase 2 de 4 do harness de blocos. Desenho: spec compartilhada
`docs/superpowers/specs/2026-09-26-harness-paridade-eladecora-design.md` §5.4, com as emendas da
spec do bloco 35.

Argumento: `$ARGUMENTS`

## Regra de invocação de skill — leia antes de tudo

Toda skill citada abaixo é invocada pela ferramenta `Skill`, e a invocação é confirmada antes
do passo seguinte. **Nunca execute o processo de uma skill de cabeça.**

Se você pensar *"eu já conheço essa skill"* ou *"o conteúdo dela já está no meu contexto"*,
esse é o sinal de que o erro está prestes a acontecer — não uma dispensa. Este modo de falha
já se repetiu neste projeto: o agente lê "use a skill Y", reconhece o processo, e executa uma
versão de cabeça, pulando exatamente os gates que justificam a skill.

## Passo 1 — Caveman

Invoque `Skill(caveman, "ultra")`. Confirme em uma linha que carregou.

## Passo 2 — Validar o estado

Descubra a branch atual (`git rev-parse --abbrev-ref HEAD`) e confira contra o regex de lane das
Global Constraints: `^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$`. Fora desse padrão,
pare: execução acontece dentro da worktree do bloco, nunca no main tree. `bash
.claude/scripts/lane.sh descobrir` dá o inventário, se precisar confirmar qual lane é esta.

A pasta do bloco sai da branch — é a branch sem o `<tipo>/`: `docs/superpowers/blocos/<NN>-<slug>/`.
Se o argumento trouxer `NN` e ele divergir do `<NN>` da branch, pare: é a invariante 7, e o motivo
mais provável é ter esquecido de trocar de lane.

Leia o `estado.md` dessa pasta e confira, nesta ordem. Divergência em qualquer item para a
sessão — **não conserte o arquivo**, relate:

0. `workflow_state` não é `blocked`. Se for, pare: relate `blocker` e `resume_state`. Sair de
   `blocked` é decisão do João, não deste command.
1. `workflow_state` é `ready_for_execution` ou `executing`. Se não for, pare e diga qual é o
   command certo para o estado atual.
2. `active_plan` está preenchido e o arquivo existe.
3. `branch` do estado é igual à branch atual.
4. `context_packet` existe no disco, quando o campo não é `null`.
5. `efeito_externo` e `executor` estão preenchidos.

## Passo 3 — Rota pelo `executor`

O campo `executor` do `estado.md` diz a rota. Para `codex`, os `paths_autorizados` exatos vêm da
seção `## Handoff de execução` do `active_plan` — o `estado.md` só copia `claude`/`codex`.

- **`executor: codex`.** Carregue o Codex — primeiro `mcp__codex__codex` via `ToolSearch`; ausente,
  o plugin `codex-companion` por Bash, em segundo plano e **com `--write`** (a execução delegada
  escreve):

  ```bash
  node "$(ls -d ~/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --fresh --write "<prompt>"
  ```

  Invoque a skill `lotus-execute-block` com `plan_path` (o `active_plan` do estado), o intervalo
  de tasks a executar e o commit base. Depois do report:
  1. valide os markers e o contrato;
  2. revise o diff real (`git status` + `git diff`) contra o plano — o report não substitui o diff;
  3. rode a verificação do plano você mesmo antes de aceitar;
  4. commit por task ou grupo coeso, nos paths exatos;
  5. `RECOMMENDED_TRANSITION: blocked` ou diff fora de `paths_autorizados` → `workflow_state:
     blocked` com `blocker`, sem aceitar o diff.

  Estado, transições e commits permanecem com Claude, mesmo nesta rota.

- **`executor: claude`.** Conte as tasks do plano e os arquivos distintos que elas tocam:

  ```bash
  grep -cE '^### Task' <plano>
  grep -E '^[[:space:]]*- (Create|Modify|Test|Delete):' <plano> | grep -o '`[^`]*`' | sed -E 's/:[0-9]+(-[0-9]+)?`$/`/' | sort -u | wc -l
  ```

  Com `--simples` no argumento, ou com até 3 tasks **e** até 2 arquivos, a escolha é
  `executing-plans`; no resto, `subagent-driven-development`. Declare a escolha e as duas
  contagens antes de seguir.

## Passo 4 — Gravar `executing`

Vindo de `ready_for_execution`, edite o `estado.md` do bloco agora — **sem commitar**:

```yaml
workflow_state: executing
next_owner: claude
next_action: continue_active_plan
commit: <git rev-parse --short HEAD antes desta edição>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

A invariante 6 proíbe um commit que só mude o `estado.md`: a mudança de estado tem de entrar no
mesmo commit do artefato que prova a transição. Deixe a edição no working tree, sem `git add`.
Quando o Passo 5 despachar o primeiro implementador do plano, o prompt do despacho manda ele dar
`git add` nos paths da própria task **e** em `docs/superpowers/blocos/<NN>-<slug>/estado.md`
juntos — assim a transição para `executing` entra no commit que prova a primeira task, não num
commit à parte. Retomando de `executing`, pule este passo: a transição já está commitada.

## Passo 5 — Executar

Conforme a escolha do Passo 3, invoque **uma** das duas — nunca as duas:

- Escolha padrão: `Skill(superpowers:subagent-driven-development)`.
- Escolha `--simples` ou bloco pequeno: `Skill(superpowers:executing-plans)`.

Confirme em uma linha que carregou. Deixe que ela conduza o loop.

- **Despacho.** Cada subagente é despachado pelo `subagent_type`, pela tabela de
  `.claude/papeis.md`: `implementador-mecanico`, `implementador-integracao`, `revisor-task`,
  `re-revisor`, `corretor-tardio`, `revisor-branch`. Task sem papel que bata na tabela → declare
  isso em uma linha e use o mais próximo. Com `--max` no argumento, todo `Agent` desta execução
  leva `model: "opus"`.
- O prompt de **todo** implementador leva a linha: "Invoque
  `Skill(superpowers:test-driven-development)` antes de escrever código."
- **Stack.** Quando o bloco toca `backend/`, suba o stack antes da primeira task:
  `cd <lane> && docker compose up -d` (`<lane>` é a raiz desta worktree, a mesma da sessão). As
  portas saem do `.env` da lane, pelo offset dela.

  A P-03 caiu (spec §3.2): backend não roda mais no main tree.

### Passo 5.1 — Pipeline de profundidade 1

A SDD descreve o loop estritamente sequencial. Este harness roda uma variação, e ela é um desvio
declarado: registre-o no `rulings.md` do bloco.

Quando o implementador de uma task termina e o revisor dela é despachado, o implementador da
**task seguinte** pode começar, com o revisor rodando em segundo plano. Os demais papéis
trabalham na árvore da lane, a mesma desta sessão. Três amarras, nenhuma opcional:

1. **Profundidade 1.** No máximo uma revisão em segundo plano por vez. Nunca implemente a task
   seguinte enquanto duas revisões correm — a correção da primeira encontraria duas tasks
   empilhadas por cima dela.
2. **Só entre tasks independentes**, pela tabela `## Grupos paralelos` do plano: as duas tasks
   precisam estar no mesmo grupo. Não estando, espere o revisor.
3. **O revisor não olha a árvore da lane.** Ele recebe uma worktree efêmera destacada no commit
   exato da task dele, despachada como `revisor-task` (`subagent_type`):

```bash
sha=$(git rev-parse --short HEAD)
rev="$(dirname "$(git rev-parse --show-toplevel)")/lotus-rev-$sha"
git worktree add --detach "$rev" "$sha"
ln -s "$(git rev-parse --show-toplevel)/frontend/node_modules" "$rev/frontend/node_modules"
# ... revisor-task trabalha em $rev, sem subir stack ...
rm "$rev/frontend/node_modules"   # so o link; nunca rm -r: atravessaria para o node_modules real
git worktree remove "$rev"
```

Sem isso o revisor leria arquivos que o implementador seguinte está editando e reportaria achado
fantasma, e qualquer suíte que ele rodasse mediria uma árvore intermediária. Worktree de revisão
não conta no teto de três lanes e não casa o padrão de lane.

**Correções continuam sequenciais.** Corrigir é escrever, e escrever nunca é paralelo.

### TDD e disciplina Git

- Siga o plano task a task e preserve red → green → refactor quando houver comportamento testável.
- Antes de tocar arquivo: `git status`. Arquivo sujo: `git diff <arquivo>` e leitura fresca
  imediatamente antes da edição.
- O WIP do João é intocável; em conflito, o working tree existente vence.
- `git add` somente nos paths exatos da task. Commits devem manter escopo e prova coerentes.
- Registre progresso fino em `.superpowers/sdd/progress.md` quando a técnica de execução exigir.
- Desvio de convenção deve ser justificado no ledger; desvio de lei exige decisão explícita do
  João.

### Definition of Done

DoD é o comportamento previsto no plano provado end-to-end contra a API real, além dos testes,
build, lint, Pint e tipos aplicáveis. Não marque task ou plano concluído apenas porque uma
ferramenta ficou verde. Implemente somente o que o `active_plan` deste bloco pede.

## Passo 6 — Preservar as decisões

Ao final, a skill do Passo 5 apresenta a lista **"Rulings I made"**. Copie-a para
`docs/superpowers/blocos/<NN>-<slug>/rulings.md`, uma decisão por linha, com o que custa se
estiver errada — é o que permite ao João desfazer uma decisão tomada em nome dele. Sem rulings,
grave a linha `Nenhuma decisão foi tomada em nome do João.` Commit.

## Passo 7 — Parar antes da revisão

A skill do Passo 5 termina apontando para `finishing-a-development-branch`. **Não siga esse
ponteiro.** Neste harness a revisão de duas lentes vem antes do fechamento.

Grave, no `estado.md`:

```yaml
workflow_state: ready_for_review
next_owner: claude
next_action: request_code_review
commit: <git rev-parse --short HEAD antes deste commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

Commit. Reporte: as tasks concluídas, o intervalo de commits, as rulings tomadas e que o próximo
passo é `/revisar-bloco <NN>`.

## `--max`

`--max` sobe `sonnet` para `opus` em todo despacho deste command, pelo parâmetro `model: "opus"`
da ferramenta `Agent`, conforme `.claude/papeis.md`. O esforço da sessão não muda.
