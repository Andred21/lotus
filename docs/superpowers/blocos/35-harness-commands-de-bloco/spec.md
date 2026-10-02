# Bloco 35 — `harness-commands-de-bloco` (spec)

**Data:** 2026-09-27 · **Ficha:** `backlog.md` item 35 · **Spec compartilhada:**
[`specs/2026-09-26-harness-paridade-eladecora-design.md`](../../specs/2026-09-26-harness-paridade-eladecora-design.md)
· **Referência:** `Ela-Decora/ElaDecora-Brain@5eb74c0`

O design deste bloco é a **§5 da spec compartilhada, inteira**, sob as decisões D1–D8 da §2 dela.
Este arquivo não a repete: registra as emendas aprovadas pelo João no planejamento de 2026-09-27 e a
seção de verificação externa que o `/finalizar-bloco` lê.

## Emendas à spec compartilhada

### E1 — a transição da §7 caducou

A §7 supunha as três branches empilhadas em `../lotus-harness`, com o `estado.md` do 35 semeado à
mão porque o `lane.sh abrir` exige a `main`. O 30 mesclou antes de o 35 começar (a `main` em
`42a50a4d` já tem o `lane.sh`, o `state.md` contrato e o `session-start` novo). Por isso:

- o 35 foi aberto pelo **`lane.sh abrir 35 chore harness-commands-de-bloco`** a partir da `main`, em
  `../lotus-35-harness-commands-de-bloco`, offset +3, `lane_base: 42a50a4d`;
- o 36 também sai da `main`, pelo `lane.sh abrir`, depois do merge do 35 — sem empilhar;
- a "ponte manual" vale só para **planejar e executar o 35**: os commands antigos rodam lendo o
  `estado.md` do bloco onde dizem `state.md` (`state.md`, seção Transição).

### E2 — os pontos abertos da §9 para o 35, fechados por evidência

- **`EnterWorktree(path)` aceita a árvore irmã** `../lotus-<NN>-<slug>` quando a sessão parte do
  main tree: provado nesta sessão, entrando em `../lotus-35-harness-commands-de-bloco`. Da árvore de
  outro repositório (o cwd no clone do plugin) a ferramenta recusa; o Passo 6 do `/planejar-bloco`
  roda no main tree, onde o caminho é válido.
- **A classificação *spike/bounded/architectural* existe na versão do plugin.** O
  `claude-plugins-official` fixa o `obra/superpowers@5bf4e78` (v6.4.1), cujo `brainstorming` anuncia
  a classificação. O clone manual em `~/.claude/plugins/superpowers` é a v6.1.1 e não tem a
  classificação — mais um motivo da D7.

### E3 — os artefatos do 35 moram na pasta do bloco

`spec.md` (este arquivo) e `plano.md` em `blocos/35-harness-commands-de-bloco/`, como a §3.1 manda
para bloco novo. A spec compartilhada continua em `specs/`, porque serve ao 36 também.

### E4 — o DoD do §5.8 é provado em duas metades

A §5.8 pede os quatro commands **vistos rodar de ponta a ponta num bloco real pequeno**, com a Skill
tool de fato invocada em cada passo que a cita. Antes do merge, os commands novos só existem na
branch do 35 — e uma sessão aberta **dentro da lane** carrega o `.claude/commands/` da lane, mas o
`/planejar-bloco` exige o main tree na `main`. Decisão do João (2026-09-27):

1. **O 35 é executado pelo `/executar-bloco` antigo**, porque o novo é o produto do bloco.
2. **A última task do plano é a prova em clone descartável**, no scratchpad: a ponta do 35 mesclada
   na `main` do clone, uma ficha fictícia pequena no `backlog.md` do clone, e uma sessão **aberta
   pelo João no clone** percorrendo o `/planejar-bloco` e o `/executar-bloco` novos. A saída —
   comandos, `estado.md` a cada transição e as invocações de `Skill` — fica registrada em
   `blocos/35-harness-commands-de-bloco/prova-clone.md`. O repositório real fica intocado.
3. **O `/revisar-bloco 35` e o `/finalizar-bloco 35` novos rodam de verdade no próprio 35**, numa
   sessão aberta na lane, e o `/finalizar-bloco` abre o PR real do bloco. O fechamento pós-PR roda
   no main tree, depois do merge, com os commands já na `main`.

### E5 — referências vivas além da §5.7

Mudam junto, porque o 35 é o gatilho delas:

- `CLAUDE.md` §3: some a nota "Transição até o item 35 mesclar";
- `CLAUDE.md` §4: a tabela de entradas perde `/revisar-sprint` e `/fechar-sprint` e ganha
  `/revisar-bloco` e `/finalizar-bloco` (já previsto na §5.7);
- `state.md`: some a seção `## Transição`;
- `pendencias/README.md`: "Revisada a cada `/fechar-sprint`" passa a dizer `/finalizar-bloco`.

As menções históricas ao `/fechar-sprint` e ao `/revisar-sprint` (pendências abertas e encerradas,
lições do `docs/README.md`, `adrs.md`, `historico/`, `audits/`, specs e planos arquivados) ficam: são
registro do que aconteceu, não instrução.

### E6 — os symlinks do home são recomendação, não aceite

A remoção dos symlinks de `~/.claude/skills` que apontam para o clone manual v6.1.1 fica com o João,
como a §5.7 diz, e **não entra no DoD**. Os commands invocam `Skill(superpowers:<skill>)` pelo nome
qualificado, que resolve pelo plugin mesmo com o clone convivendo; a catraca cobra o nome
qualificado.

### E7 — `/planejar-bloco` e `/executar-bloco` são reescritos no lugar

Os dois arquivos em `.claude/commands/` mantêm o nome e trocam o conteúdo pelo desenho da §5.3 e da
§5.4. A rota do Codex de hoje (packet no planejar, `executor: codex` no executar) sobrevive encaixada,
como a D2 manda. `/revisar-bloco` e `/finalizar-bloco` nascem.

### E8 — os registros de fechamento andam na branch da lane

A §5.6 (Passo 7) e a invariante 10 mandam o main tree tirar a ficha do `backlog.md`, escrever a
linha do `progress.md` e gravar `closed` **depois** do merge. O main tree não publica esses commits:
o `pre-push` recusa `git push origin main` e a `main` só recebe PR mesclado (`CONTRIBUINDO.md`). Tudo
que entrou no backlog até hoje veio pela branch de alguma lane (o `7b14e817` veio pela do 30), o 30
gravou `closed` na própria branch antes do merge, e a ficha 30 segue no backlog porque o passo
"o main tree remove depois do merge" não tem por onde chegar à `main`. Decisão do João
(2026-09-27):

- **Modo normal do `/finalizar-bloco`:** no último commit da lane, antes do push, entram as
  pendências (o checklist 7 do antigo `/fechar-sprint`), a linha do `historico/progress.md`, a
  remoção **da própria ficha** do `backlog.md` e o `estado.md` em `closed` (`next_owner: joao`,
  `next_action: none`). O PR carrega os registros.
- **PR que volta com correção:** o commit que corrige reescreve o `estado.md` para o estado onde o
  trabalho recomeça (`executing` ou `reviewing`), porque `closed` deixou de ser verdade.
- **Modo pós-PR:** no main tree, `git merge --ff-only origin/main` e `lane.sh fechar <NN>`. Nada
  mais é escrito.
- **Modo conserto:** a linha `sem-arvore` do `descobrir` é o `fechar` que morreu entre o
  `git worktree remove` e o `git branch -d`. Branch já mesclada → o command pede ao João o
  `git branch -d <branch>` no terminal dele, porque a allowlist da `main` nega `git branch -d`
  (medido em 2026-09-27). Branch não mesclada → para e relata. Nunca `-D`.
- **Invariante 10 reescrita:** o `backlog.md` entra na `main` só por PR. Ficha nova vem numa PR
  de docs; a lane remove só a própria ficha, no commit de fechamento. O main tree lê o backlog
  para abrir lane, e não publica commit.
- **`/planejar-bloco` com texto livre** propõe a ficha e para. O João a publica por PR de docs,
  e o command volta com o `NN`.

A §5.3 (Passo 3) e a §5.6 (Passos 2 e 7) valem lidas com esta emenda.

### E9 — `efeito_externo: sim` com prova só depois do merge espera em `blocked`

Achado Q-1 da revisão (rodada 1). Com a E8, o `closed` entra antes do PR, e a invariante 11 exige
a prova antes do `closed`. Quando a prova só existe depois do merge (deploy, configuração em
produção, aprovação de terceiro — o caso da lane 33), nada andava: sem prova, sem `closed`; sem
`closed`, sem PR; sem PR, sem merge; sem merge, sem prova. Decisão do João (2026-10-01), no formato
que a §6 da spec compartilhada já desenhava para o item 36:

- **6a do `/finalizar-bloco`:** `sim` sem prova escrita não para. O commit de fechamento grava
  `blocked`, com `resume_state: ready_for_closure` e um `blocker` que começa por
  `aguardando aceitação` e lista os itens pendentes da `## Verificação externa`. A ficha fica no
  `backlog.md`, e a linha do `historico/progress.md` registra que o bloco mesclou sem a prova.
  Push e PR seguem como no modo normal.
- **Retomada e pós-PR** aceitam esse `blocked` onde aceitavam o `closed`. A lane fecha, e o bloco
  não.
- **Saída, até o item 36:** uma PR de docs do João grava a prova no corpo do `estado.md`, leva o
  `estado.md` de `blocked` a `closed`, remove a ficha e atualiza a linha do `progress.md`.
- **`/planejar-bloco`** para diante de ficha cujo `estado.md` já existe na `main`, porque o
  `lane.sh abrir` não recusa pasta de bloco existente e sobrescreveria o estado.
- **Contrato** (achado Q-6, rodada 2): o `state.md` registra as duas exceções — a saída desse
  `blocked` vai direto a `closed`, e não ao `resume_state`; e a invariante 10 aceita a remoção da
  ficha na PR de docs que traz a prova. O `CLAUDE.md` §3 e o `AGENTS.md` repetem isso.

### E10 — a lane tira do backlog os débitos `D-*` que o bloco pagou

Achado Q-9 da revisão (rodada 3). A E8 deixou a lane remover só a própria ficha, mas o `backlog.md`
diz que o débito `D-*` sai do registro canônico no fechamento do bloco que o paga, e a tabela
"Fichas que saíram desta fila" é o rastro disso. O item 23, que paga a `D-65`, fecharia com ela
listada como viva. Decisão do João (2026-10-02), mantendo a prática de até aqui:

- **6d do `/finalizar-bloco`:** além da própria ficha, a lane remove cada `D-*` que a ficha
  (`Paga a …`) ou o plano declaram pagar e que a verificação do Passo 3 deu como paga, e acrescenta
  a linha dela na tabela de saídas. Débito declarado e não pago fica, e o relato diz isso. Em
  aguardando aceitação (E9), tudo isso vai para a PR que grava o `closed`.
- **Invariante 10**, `CLAUDE.md` §3 e `AGENTS.md` dizem o mesmo; as duas frases do `backlog.md`
  que citavam o `/fechar-sprint` passam a citar o `/finalizar-bloco`.

## Verificação externa

Nenhuma. Este bloco é inteiramente interno ao repositório: commands, agentes, prompts,
`settings.json`, docs e testes. `efeito_externo: nao`.
