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
spec do bloco 35 — em especial a E8, que reescreve o Passo 6 e a invariante 10 para este command —
e a aceitação externa da spec do bloco 36 (§2.2 a §2.5).

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

Este command tem cinco modos. O primeiro que casar vence — não escolha por conveniência, escolha
pela assinatura em disco:

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

  **Lane de aceitação.** É a lane que o modo Aceitação abre pelo `lane.sh aceitar`. A assinatura
  dela é `next_action: close_active_work_item aceitacao externa`, texto que só o `aceitar`
  escreve. Ela corre no modo Normal, com as diferenças marcadas no Passo 3 e nos itens a a f do
  Passo 6.

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
  mesclado na `main` — está em `blocked` aguardando aceitação: `resume_state: ready_for_closure` e
  `blocker` começando por `aguardando aceitação`, o que o 6a gravou. O main tree não publica
  commit (E8), então a prova se confere numa **lane de aceitação**, aberta a partir da `main`
  atual:

  ```bash
  git fetch origin
  git merge --ff-only origin/main
  bash .claude/scripts/lane.sh aceitar <NN> --modelo <alias do modelo da sessão>
  ```

  O `merge --ff-only` falhando, ou `PORTAO RECUSOU` → pare e relate. Deu certo:
  `EnterWorktree(path: "<caminho absoluto impresso pelo LANE ABERTA>")` e siga **nesta mesma
  sessão** pelo modo **Normal**, relendo a branch atual e o `estado.md` da lane — o `aceitar` o
  deixou em `ready_for_closure`, com a assinatura da lane de aceitação.

- **Nada casa.** Relate `workflow_state`, `next_owner` e `next_action` do `estado.md` que deu para
  ler, e pare.

**Normal segue para o Passo 3 — ou, com `closed` e algo por publicar, para o Passo 7. Pós-PR, com o merge-base já confirmado, pula direto para o
Passo 8. Conserto termina aqui mesmo; Aceitação segue no modo Normal, dentro da lane que abriu.**

## Passo 3 — Verificação com evidência fresca

Só no modo normal. **Na lane de aceitação, nada deste passo se aplica:** o diff dela contra a
`origin/main` é só a pasta do bloco, e a verificação é o `aceitacao.sh conferir` do 6a. Siga para
o Passo 4.

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

Depois do merge — ou mesmo sem novidade nenhuma — refaça o Passo 3 inteiro contra o HEAD novo
(na lane de aceitação, nada: a verificação é o `conferir` do 6a). Vermelho aqui para o command:
a lane estava verde contra uma `origin/main` que já ficou velha.

## Passo 6 — Registros de fechamento na lane

**Nenhum commit na `main`** (E8) — tudo neste passo entra **num commit só**, aqui na lane, e é
esse commit que o Passo 7 empurra. É ele quem carrega os registros até o PR.

**a. Portão de efeito externo.** Leia `efeito_externo` no `estado.md`.
- Ausente ou `null` → pare. `null` nunca vale `nao`: é a semente do `lane.sh abrir`, e um campo
  assim parado ali diz que o `/planejar-bloco` não gravou a decisão.
- `nao` → a rede de segurança: liste o que o bloco mudou no caminho da produção.

  ```bash
  git diff --name-only $(git merge-base origin/main HEAD)..HEAD \
    | grep -E '^(deploy/|docker/Dockerfile\.prod|docker-compose\.prod|\.github/workflows/|scripts/)'
  ```

  Saiu qualquer caminho → pare e pergunte ao João se o `nao` está certo. Mudar o campo é decisão
  dele; com a resposta, refaça este item pelo valor que ficar gravado. Nada listado → siga para o
  item b.
- `sim` → o portão é o script, não esta prosa — portão em prosa o agente executa de cabeça e pula:

  ```bash
  bash .claude/scripts/aceitacao.sh conferir <NN>
  ```

  O veredito é a última linha, e o código de saída o confirma.
  - `PORTAO RECUSOU` (exit 2) → pare: a spec ou o `aceitacao.md` estão incompletos, e o motivo diz
    o quê. Bloco planejado antes do item 36 pode não ter item numerado na `## Verificação
    externa`; completar a seção é decisão do João.
  - `ACEITACAO OK: <n> item(ns)` (exit 0) → siga para o item b: o fechamento é o normal.
  - `ACEITACAO PENDENTE: <k> de <n> item(ns): <números>` (exit 1), **na lane do bloco** → o
    fechamento segue em **aguardando aceitação**, com as diferenças marcadas nos itens c a f. Os
    `<números>` são os itens pendentes.
  - `ACEITACAO PENDENTE`, **na lane de aceitação** → pare **antes** de commitar e mostre os itens
    pendentes. O João escolhe:
    - preencher `Resultado` e `Data` (`AAAA-MM-DD`) dos itens manuais no `aceitacao.md` desta
      lane — ele mesmo, ou ditando a esta sessão: o resultado é a palavra dele, nunca uma
      conclusão sua — e rodar o `conferir` de novo, nesta mesma sessão;
    - ou descartar: aqui, `git restore docs/superpowers/blocos/<NN>-<slug>/aceitacao.md`; no
      terminal dele, no main tree, `bash .claude/scripts/lane.sh fechar <NN> --force` — o commit
      do `aceitar` não está na `main`, e o `fechar` sem `--force` recusa. Nada é publicado, e o
      bloco segue em `blocked` na `main`.

  Com OK, e com PENDENTE na lane do bloco, o `aceitacao.md` entra no commit do item f.

**b. Pendências.** O item 7 do antigo `fechar-sprint`, verbatim: em
`docs/superpowers/pendencias/`, algum gatilho venceu? Alguma pendência fechou — a ficha sai de
`abertas.md` e vai para `encerradas.md`, e a linha do índice em `README.md` acompanha as duas?
Alguma das encerradas já passou de 1 sprint e sai de vez? Alguma nasceu nesta sprint?

**c. Histórico.** Uma linha nova em `docs/superpowers/historico/progress.md`, no formato das que
já estão lá. No máximo dez entradas recentes: o excesso desce, **verbatim**, para
`progress-archive.md`.
- Aguardando aceitação: a linha diz que o bloco mesclou sem a prova externa, nomeia os itens
  pendentes do `ACEITACAO PENDENTE` e nomeia os `D-*` que a verificação do Passo 3 deu como pagos.
  É dela que a lane de aceitação os tira, porque ela não refaz o Passo 3.
- Lane de aceitação: nenhuma linha nova. Atualize a linha do bloco onde ela estiver — no
  `progress.md` ou, se já desceu, no `progress-archive.md` —, registrando a aceitação e a data.

**d. Backlog.** Remova **só a própria ficha**, que no `backlog.md` ocupa dois lugares:

- a seção `## <NN>. …`, até antes do próximo `---`, `## ` ou `# `. Depois do corte, não podem
  sobrar dois `---` seguidos (só linha em branco entre eles): sobrando, apague um;
- a linha dela na tabela de recomendação de `# Ordem de execução` (`| # | Bloco | Frente | Por
  que aqui |`), quando tiver uma — a linha cujo `Bloco` começa por `**<NN>**`. As outras linhas da
  tabela não mudam de posição nem de número.

Depois, os **débitos `D-*` que o bloco pagou** — os que a própria ficha declara (``Paga a
**`D-NN`**``) ou o plano diz pagar, e que a verificação do Passo 3 deu como pagos. Débito
declarado e não pago fica onde está, e o relato do command diz isso. Para cada pago:

- a ficha `- **D-NN · …**` sai de `# Débitos técnicos`, com os parágrafos indentados dela, até
  antes do próximo `- **D-` ou do próximo título;
- a tabela "Fichas que saíram desta fila" ganha, no fim, a linha
  ``| <AAAA-MM-DD> | `D-NN` | paga — <a prova, em uma linha, com arquivo ou SHA> | item <NN> |``.

A aceitação externa muda este item nos dois fechamentos dela:

- Aguardando aceitação (lane do bloco): a ficha e os `D-*` ficam. Sai só a linha da ficha na
  tabela de recomendação de `# Ordem de execução`, quando tiver uma, e entra no fim da tabela de
  `## Aguardando aceitação` a linha
  ``| **<NN>** `<slug>` | <números do ACEITACAO PENDENTE> | <AAAA-MM-DD de hoje> |``.
- Lane de aceitação: a ficha sai como acima; os `D-*` que saem são os que a linha do bloco no
  histórico (item c) nomeia como pagos, com a prova tirada dela; e a linha do bloco sai da tabela
  de `## Aguardando aceitação`.

Fora isso, nenhuma outra linha do `backlog.md` muda — prosa que cita o número, inclusive (E8,
E10, invariante 10 — a lane escreve a própria remoção; o main tree não publica commit nenhum na
`main`, então a única porta pela qual o `backlog.md` chega lá é esta, dentro do PR).

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

Com `efeito_externo: sim`, grave também
`active_acceptance: docs/superpowers/blocos/<NN>-<slug>/aceitacao.md` quando ele vier `null` —
bloco planejado antes do item 36.

Aguardando aceitação, no lugar do bloco de cima (`docs/superpowers/state.md`, "Entrar e sair de
`blocked`"):

```yaml
workflow_state: blocked
resume_state: ready_for_closure
blocker: "aguardando aceitação depois do merge: itens <números do ACEITACAO PENDENTE> da ## Verificação externa"
next_owner: joao
next_action: "resolve_blocker aguardando aceitação: itens <números>"
commit: <git rev-parse --short HEAD antes deste commit>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <alias do modelo da sessão>
```

O `blocker` começa por `aguardando aceitação`: é por esse começo que o modo Aceitação e o
`lane.sh aceitar` reconhecem o bloco.

**f. Commit.** Tudo que os itens b–e tocaram, junto — e só isso. `git add` nomeia cada caminho;
nunca `-A`, `.` nem diretório, porque o WIP do João é intocável (a mesma disciplina do
`/executar-bloco`):

```bash
git add docs/superpowers/blocos/<NN>-<slug>/estado.md \
        docs/superpowers/backlog.md \
        docs/superpowers/historico/progress.md
# mais, só quando o item tocou: docs/superpowers/blocos/<NN>-<slug>/aceitacao.md (a, com sim),
# docs/superpowers/historico/progress-archive.md (c) e
# docs/superpowers/pendencias/abertas.md, encerradas.md e README.md (b), cada um pelo nome
git diff --cached --name-only    # tem de listar só os caminhos acima
git commit -m "chore(close): item <NN> fecha <slug>

Co-Authored-By: Claude <modelo> <noreply@anthropic.com>"
```

`<modelo>` é o modelo que de fato escreveu o commit (ex.: `Sonnet 5.5`). Aguardando aceitação, o
assunto é `chore(close): item <NN> aguarda aceitação`; na lane de aceitação,
`chore(close): item <NN> aceito`.

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
aceitação, diga também que a lane fechou mas o bloco não: falta a prova externa, e a saída é
`/finalizar-bloco <NN>` no main tree, que cai no modo Aceitação.

O espelho corporativo (`scripts/espelhar-corporativo.sh`) fica fora: é release, não bloco.
