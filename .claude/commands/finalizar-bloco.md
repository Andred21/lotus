---
description: Fecha o bloco — verificação fresca, portão da revisão, registros de fechamento na lane, PR; depois do merge, fecha a lane.
argument-hint: "[NN]"
disable-model-invocation: true
model: sonnet
effort: high
---

# /finalizar-bloco

Fase 4 de 4 do harness de blocos. Desenho: spec compartilhada
`docs/superpowers/specs/2026-09-26-harness-paridade-eladecora-design.md` §5.6, com as emendas da
spec do bloco 35 — em especial a E8, que reescreve o Passo 6 e a invariante 10 para este command.

Argumento: `$ARGUMENTS`

## Regra de invocação de skill — leia antes de tudo

Toda skill citada abaixo é invocada pela ferramenta `Skill`, e a invocação é confirmada antes
do passo seguinte. **Nunca execute o processo de uma skill de cabeça.**

Se você pensar *"eu já conheço essa skill"* ou *"o conteúdo dela já está no meu contexto"*,
esse é o sinal de que o erro está prestes a acontecer — não uma dispensa. Este modo de falha
já se repetiu neste projeto: o agente lê "use a skill Y", reconhece o processo, e executa uma
versão de cabeça, pulando exatamente os gates que justificam a skill.

Se a `Skill` responder `Unknown skill` para um nome `superpowers:<skill>`, pare e peça ao João
que instale ou ative o plugin `superpowers@claude-plugins-official`. Nunca troque pelo nome
sem prefixo: ele carrega a cópia legada de `~/.claude/skills/`, que não tem o que estes commands
esperam.

## Passo 1 — Caveman

Invoque `Skill(caveman, "ultra")`. Confirme em uma linha que carregou.

## Passo 2 — Descobrir o modo

Este command tem quatro modos que já existem, mais um quinto que só o item 36 implementa. O
primeiro que casar vence — não escolha por conveniência, escolha pela assinatura em disco:

```bash
git rev-parse --abbrev-ref HEAD
git worktree list --porcelain
bash .claude/scripts/lane.sh descobrir
```

**Cada chamada da ferramenta Bash é um shell novo:** anote os valores que estes três comandos
imprimem — a branch atual e, para o `NN` do argumento, o campo `branch` da linha que o `descobrir`
devolveu — e use-os **literalmente** dali para frente, nos passos seguintes.

- **Normal.** A branch atual casa `^(feat|fix|chore|refactor|infra|cicd|docs)/([0-9]+)-(.+)$` — a
  sessão está numa lane, nunca no main tree. O `<NN>` vem da branch, nunca do argumento; se o
  argumento trouxer um `NN` diferente, pare — invariante 7. A pasta do bloco é a branch sem o
  `<tipo>/`: `docs/superpowers/blocos/<NN>-<slug>/`. Leia o `estado.md` de lá: o `branch` gravado
  precisa bater com a branch atual — divergindo, é `estado.md` desatualizado, e a invariante 7
  manda parar, não consertar. Com `workflow_state: ready_for_closure`, siga o fluxo normal. Com
  `closed` — ou com `blocked` **aguardando aceitação**, que é o que o 6a grava para `sim` sem prova
  (`resume_state: ready_for_closure` e `blocker` começando por `aguardando aceitação`) —, o Passo 6
  já rodou nesta lane e a sessão parou antes de o Passo 7 publicar (ou a PR voltou `CLOSED`): é a
  **retomada**, logo abaixo. Qualquer outro estado — `blocked` por outro motivo, inclusive — cai no
  ramo **Nada casa**.

  **Retomada.** Confira se o HEAD está publicado e se há PR:

  ```bash
  git fetch origin
  git rev-parse HEAD origin/<branch>        # ausente ou diferente → falta push
  gh pr view <branch> --json url,state
  ```

  O `state` da PR decide primeiro, antes do HEAD:
  - PR `MERGED` → nada a publicar, mesmo que a branch remota já tenha sido apagada e o
    `rev-parse` acuse falta de push. Relate, aponte o modo Pós-PR (`/finalizar-bloco <NN>` no main
    tree) e pare. Nunca empurre.
  - PR `CLOSED` sem merge → relate e pare. Reabrir ou abandonar é decisão do João.
  - PR `OPEN` e HEAD publicado → não há o que retomar. Relate e pare.
  - Falta push, ou não há PR → retome no **Passo 7**, pulando os Passos 3 a 6. O commit do 6f já
    carrega os registros, e a verificação do Passo 3 foi feita contra esse mesmo HEAD.

  Estes comandos rodam na lane, não no main tree.

- **Pós-PR.** A árvore é o main tree — a primeira entrada de `git worktree list --porcelain` — na
  branch `main`, e o argumento `NN` é obrigatório: sem lane, não há de onde tirá-lo. O `descobrir`
  mostra, para este `NN`, uma linha `lane␟NN␟estado␟branch␟árvore␟next_action␟offset` com
  `estado` em `closed`, ou em `blocked` com `next_action: resolve_blocker aguardando aceitação…` —
  é o que o Passo 6 já gravou, na branch, antes do push, na sessão que abriu o PR. Confirme:

  ```bash
  git fetch origin
  git merge-base --is-ancestor <branch> origin/main
  ```

  Sai `0` → o PR já mesclou; vá direto ao **Passo 8**, pulando os Passos 3 a 7 — a verificação
  daquele código já foi feita quando ele foi aceito. Sai `1` → o PR ainda não mesclou: relate com

  ```bash
  gh pr view <branch> --json state
  ```

  se ele segue aberto ou se foi mesclado por squash/rebase — que este comando não reconhece por
  ancestralidade, porque as PRs deste repositório mesclam por merge commit — e pare.

- **Conserto.** A árvore é o main tree, na `main`, e o `descobrir` traz, para o `NN` do argumento
  (também obrigatório), uma linha `sem-arvore␟NN␟branch`. É o `lane.sh fechar` que morreu entre o
  `git worktree remove` e o `git branch -d`: a árvore já saiu do disco, o stack já caiu, só a
  branch ficou. Confirme se ela está mesclada:

  ```bash
  git fetch origin
  git merge-base --is-ancestor <branch> origin/main
  ```

  Sai `0` → peça ao João, no terminal dele, `git branch -d <branch>`: a allowlist da `main` nega
  esse comando a esta sessão (medido em `.claude/hooks/lib/classificar-comando.py`) — e pare aqui.
  Sai `1` → pare e relate; apagar essa branch agora perderia commits que não existem em nenhum
  outro lugar. **Nunca `-D`.**

- **Aceitação.** No main tree, o `NN` do argumento não aparece nem como `lane␟NN␟…` nem como
  `sem-arvore␟NN␟…` no `descobrir`, e `docs/superpowers/blocos/<NN>-<slug>/estado.md` — já
  mesclado na `main` — diz `workflow_state: blocked`, esperando prova de efeito externo depois do
  merge (o que o 6a gravou). Esse é o modo que o item 36 implementa por inteiro; aqui, pare e diga:
  "o modo aceitação chega com o item 36". Até lá, a saída é do João, numa PR de docs
  (`docs/superpowers/state.md`, "Entrar e sair de `blocked`" e invariante 10), com tudo num commit
  só:

  - a prova escrita no corpo do `estado.md`, abaixo do frontmatter (invariante 11);
  - o frontmatter direto de `blocked` para `closed` — o `resume_state` já está cumprido: a revisão
    passou e a prova era o que faltava:

    ```yaml
    workflow_state: closed
    next_owner: joao
    next_action: none
    blocker: null
    resume_state: null
    commit: <git rev-parse --short HEAD antes deste commit>
    updated_at: <date -Iseconds>
    updated_by: <id -un>@<hostname -s> / <alias do modelo, ou terminal>
    ```

  - a remoção da ficha como o 6d descreve;
  - a linha do `historico/progress.md` atualizada, sem linha nova.

- **Nada casa.** Relate `workflow_state`, `next_owner` e `next_action` do `estado.md` que deu para
  ler, e pare.

**Normal segue para o Passo 3 — ou, com `closed` e algo por publicar, para o Passo 7. Pós-PR, com o merge-base já confirmado, pula direto para o
Passo 8. Conserto e Aceitação terminam aqui mesmo, nos dois ramos acima.**

## Passo 3 — Verificação com evidência fresca

Só no modo normal.

Invoque `Skill(superpowers:verification-before-completion)`. Confirme que carregou.

As áreas tocadas pelo bloco:

```bash
git diff --name-only $(git merge-base origin/main HEAD)..HEAD
```

Tudo roda **no stack da lane** — se o bloco toca `backend/` e o stack não está de pé,
`docker compose up -d` na raiz desta árvore; as portas são as do `.env` dela.

- `backend/` tocado → `docker compose exec -T app php artisan test`; depois
  `cd backend && ./vendor/bin/pint <arquivos .php do bloco>` (**nunca sem argumento** — reformata
  o repo inteiro) e `git diff --exit-code` nesses mesmos arquivos: Pint reformatando é achado, não
  passo mudo.
- `frontend/` tocado → de `frontend/`: `pnpm lint`, `pnpm test` e `pnpm build`.
- DTO em `backend/app/**/Data/` tocado → `docker compose exec -T app php artisan
  typescript:transform`, depois `git diff --exit-code` em `generated.ts` — lei 3 do `CLAUDE.md`
  §5, mecânica em `.claude/rules/generated-types.md`.
- `.claude/` tocado → `bash .claude/tests/run-all.sh`.

**A prova end-to-end do critério de aceite não se pula — item 0 do antigo `fechar-sprint`, portado
verbatim (com a nota do curl):**

Rode a verificação própria do bloco e mostre o resultado.
- Bloco corrigiu docs → invoque `Skill(auditar-docs)` e reporte quantas divergências restaram.
- Bloco tocou código → prove o comportamento **end-to-end contra a API real**.

Suíte verde NÃO prova o critério de aceite do bloco. Este item não se pula.

> Prova e2e via curl precisa de `-H 'Origin: <FRONTEND_URL>'` **e** `-H 'Accept: application/json'`.
> Sem `Origin`, o Sanctum não trata a request como stateful → 500. Sem `Accept`, o middleware de
> auth tenta redirecionar para uma rota `login` inexistente → 500. Os dois 500 são do curl, não do
> código.

As portas desta lane são `8080+offset` (backend) e `5173+offset` (frontend) — o `offset` é o do
`estado.md` dela.

Mais dois itens do antigo `fechar-sprint`, portados:

- **Código morto** (item 5) — `.gitkeep` órfão, import não usado, placeholder que este bloco
  criou. Remova só o que ESTE bloco criou; dead code alheio se menciona, não se deleta.
- **Leis** (item 6) — nenhuma lei do `CLAUDE.md` §5 foi contrariada. Registro em `rulings.md` não
  autoriza desvio de lei inviolável; exceção exige decisão explícita do João Victor e referência a
  ela.

Qualquer vermelho para o command.

## Passo 4 — Portão da revisão

Abra o arquivo de `active_review` (do `estado.md` que o Passo 2 leu) e olhe a seção
`## Em aberto`, logo abaixo do título — é a única, reescrita a cada rodada do `/revisar-bloco`.

O portão é sobre **conteúdo**, não sobre bytes: vazia significa nenhum `Q-N` listado entre
`## Em aberto` e o próximo `## `, mesmo que sobre ali um placeholder ou uma nota — o que importa é
não ter achado listado. Havendo qualquer `Q-N`, **pare**: liste o que falta (severidade e o que
falta, como a própria seção já descreve) e diga que o caminho é corrigir e rodar `/revisar-bloco`
de novo.

Sem achado listado, siga para o Passo 5.

## Passo 5 — Atualizar contra a `origin/main`

```bash
git fetch origin
git merge origin/main
```

É merge, não rebase: o `revisao.md` e o `rulings.md` citam SHA, e um rebase os desancoraria de
commits que deixariam de existir.

- Sem rede (o `fetch` falha) → pare e diga isso; mergear a `main` local no lugar da `origin/main`
  é exatamente o defeito que este passo existe para evitar.
- Conflito → pare e relate: liste os arquivos em conflito com `git diff --name-only
  --diff-filter=U`. Não resolva os conflitos nem aborte o merge sozinho — `git merge --abort` ou a
  resolução são decisão do João.

Depois do merge — ou mesmo sem novidade nenhuma — refaça o Passo 3 inteiro contra o HEAD novo.
Vermelho aqui para o command: a lane estava verde contra uma `origin/main` que já ficou velha.

## Passo 6 — Registros de fechamento na lane

**Nenhum commit na `main`** (E8) — tudo neste passo entra **num commit só**, aqui na lane, e é
esse commit que o Passo 7 empurra. É ele quem carrega os registros até o PR.

**a. Portão de efeito externo.** Leia `efeito_externo` no `estado.md`.
- Ausente ou `null` → pare. `null` nunca vale `nao`: é a semente do `lane.sh abrir`, e um campo
  assim parado ali diz que o `/planejar-bloco` não gravou a decisão.
- `sim` → até o item 36 trazer o `aceitacao.md`, a prova do efeito externo vai escrita no corpo em
  markdown do `estado.md` (abaixo do frontmatter — invariante 11). Com a prova escrita, siga para o
  item b. Sem ela, o bloco não vai a `closed` — e não para aqui: quando a prova só existe depois do
  merge (deploy, configuração em produção, aprovação de terceiro), o fechamento segue em
  **aguardando aceitação**, com as diferenças marcadas nos itens c a f. Antes, liste os
  itens de `## Verificação externa` da spec do bloco que ainda não têm prova: são eles que vão no
  `blocker`.
- `nao` → siga para o item b.

**b. Pendências.** O item 7 do antigo `fechar-sprint`, verbatim: em
`docs/superpowers/pendencias/`, algum gatilho venceu? Alguma pendência fechou — a ficha sai de
`abertas.md` e vai para `encerradas.md`, e a linha do índice em `README.md` acompanha as duas?
Alguma das encerradas já passou de 1 sprint e sai de vez? Alguma nasceu nesta sprint?

**c. Histórico.** Uma linha nova em `docs/superpowers/historico/progress.md`, no formato das que
já estão lá. No máximo dez entradas recentes: o excesso desce, **verbatim**, para
`progress-archive.md`. Aguardando aceitação: a linha diz que o bloco mesclou sem a prova externa e
nomeia os itens pendentes; quem a atualiza, sem linha nova, é a PR que grava o `closed`.

**d. Backlog.** Remova **só a própria ficha**, que no `backlog.md` ocupa dois lugares:

- a seção `## <NN>. …`, até antes do próximo `---`, `## ` ou `# `. Depois do corte, não podem
  sobrar dois `---` seguidos (só linha em branco entre eles): sobrando, apague um;
- a linha dela na tabela de `# Ordem de execução`, quando tiver uma — a linha cujo `Bloco` começa
  por `**<NN>**`. As outras linhas da tabela não mudam de posição nem de número.

Nenhuma outra linha do `backlog.md` muda — prosa que cita o número, inclusive (E8, invariante 10 —
a lane escreve a própria remoção; o main tree não publica commit nenhum na `main`, então a única
porta pela qual o `backlog.md` chega lá é esta, dentro do PR).

Aguardando aceitação: pule este item. A ficha fica no `backlog.md` até o `closed`, e sai na mesma
PR que o grava.

**e. Estado.**

```yaml
workflow_state: closed
next_owner: joao
next_action: none
blocker: null
resume_state: null
commit: <git rev-parse --short HEAD antes deste commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

Aguardando aceitação, no lugar do bloco acima (`docs/superpowers/state.md`, "Entrar e sair de
`blocked`"):

```yaml
workflow_state: blocked
resume_state: ready_for_closure
blocker: "aguardando aceitação depois do merge: <itens pendentes da ## Verificação externa>"
next_owner: joao
next_action: "resolve_blocker aguardando aceitação: <itens>"
commit: <git rev-parse --short HEAD antes deste commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

**f. Commit.** Tudo que os itens b–e tocaram, junto — e só isso. `git add` nomeia cada caminho;
nunca `-A`, `.` nem diretório, porque o WIP do João é intocável (a mesma disciplina do
`/executar-bloco`):

```bash
git add docs/superpowers/blocos/<NN>-<slug>/estado.md \
        docs/superpowers/backlog.md \
        docs/superpowers/historico/progress.md
# mais, só quando o item tocou: docs/superpowers/historico/progress-archive.md (c) e
# docs/superpowers/pendencias/abertas.md, encerradas.md e README.md (b), cada um pelo nome
git diff --cached --name-only    # tem de listar só os caminhos acima
git commit -m "chore(close): item <NN> fecha <slug>

Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

`<modelo>` é o modelo que de fato escreveu o commit (ex.: `Sonnet 5.5`). Aguardando aceitação, o
assunto é `chore(close): item <NN> aguarda aceitação`, e o `backlog.md` não entra no `git add`.

**Regra para o que vier depois.** PR que volta com correção — o João pede mudança depois de
aberto, ou a `origin/main` trouxe algo que a verificação não passa mais — reescreve o `estado.md`
para `executing` ou `reviewing` no commit que corrige, porque `closed` (ou o `blocked` aguardando
aceitação) deixou de ser verdade; a
cadeia recomeça no command daquele estado. Uma segunda passagem por este Passo 6, depois da
correção, não repete os itens b–d do zero: confira o que a primeira passagem já gravou na branch —
a linha do `historico/progress.md`, a ficha removida do `backlog.md`, os movimentos em
`pendencias/` — e ajuste só o que precisar. Nunca duplique. O que viaja com o `closed` nessa
passagem é a linha do `historico/progress.md` (item c): ela é atualizada, sem ganhar linha nova,
para registrar a correção que voltou do PR — assim o commit nunca é só de `estado.md` (invariante
6 de `docs/superpowers/state.md`).

## Passo 7 — Integração

Invoque `Skill(superpowers:finishing-a-development-branch)`. Confirme que carregou.

Apresente o menu **como a skill escreve**, com uma emenda deste repositório: **o merge local está
indisponível** — a `main` só recebe PR mesclado (`CONTRIBUINDO.md`; spec compartilhada §2). Não
ofereça essa opção como se ela existisse aqui.

Caminho do PR:

```bash
git push -u origin HEAD:refs/heads/<branch>
```

Antes de criar, confira se a branch já tem PR aberta — é o caminho de uma segunda passagem, quando
um PR volta com correção e a cadeia chega de novo até aqui (regra do fim do Passo 6):

```bash
gh pr view <branch> --json url,state
```

PR aberta encontrada → o `git push` acima já a atualizou; não rode `gh pr create` — vá direto para
a consulta de status, abaixo. PR `CLOSED` sem merge → relate e pare: reabrir ou abandonar é decisão
do João. Nenhuma PR encontrada → crie:

```bash
gh pr create --base main --head <branch> --title "<tipo>(<NN>): <resumo>" --body "…"
```

O corpo da PR termina na linha
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Depois de aberta, repita — sem dormir: esta ferramenta bloqueia `sleep` em primeiro plano, e
repetir a consulta **é** a espera —

```bash
gh pr view <n> --json state,mergeable,mergeStateStatus
```

até `mergeStateStatus` sair `CLEAN`. `UNKNOWN` é o GitHub ainda calculando: consulte de novo.
`DIRTY` é achado a investigar, nunca a forçar. `BLOCKED` ou `UNSTABLE` → reporte também
`gh pr checks <n>`.

O merge é decisão do João. "Descartar" só com confirmação explícita dele — e mesmo essa saída
implica `lane.sh fechar --force`, que é comando do terminal dele, não desta sessão.

Reporte o link do PR e que, depois do merge, o próximo passo é `/finalizar-bloco <NN>` numa sessão
nova, aberta no main tree — **pare aqui**; o Passo 8 não continua nesta mesma sessão.

## Passo 8 — Pós-PR

Só no modo pós-PR, no main tree, com o merge-base já confirmado pelo Passo 2:

```bash
git merge --ff-only origin/main
bash .claude/scripts/lane.sh fechar <NN>
git worktree list
git branch --list <branch>
```

Os dois últimos comandos confirmam que a lane saiu dos dois — nem árvore, nem branch. Nada é
escrito nem commitado nesta sessão: os registros de fechamento já viajaram no commit do Passo 6, e
foi o PR que os trouxe para a `main`. Reporte o resultado. Com o bloco em `blocked` aguardando
aceitação, diga também que a lane fechou mas o bloco não: falta a prova externa, e a saída é a do
modo Aceitação (Passo 2).

O espelho corporativo (`scripts/espelhar-corporativo.sh`) fica fora: é release, não bloco.
