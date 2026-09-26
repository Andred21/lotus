# Harness — paridade com o ElaDecora-Brain (design)

**Data:** 2026-09-26 · **Autor do pedido:** João Victor · **Consumidores:** itens 30, 31 e 32 do
`backlog.md` · **Referência:** `Ela-Decora/ElaDecora-Brain@5eb74c0` (`.claude/commands/`,
`.claude/scripts/`, `.claude/prompts/`, `.claude/tests/`, `docs/state.md`)

> Spec compartilhada. Cada `/planejar-bloco 30|31|32` refina **a sua parte** e escreve o próprio
> plano; nenhum dos três reabre as decisões da §2 sem o João.

## 1. Objetivo

Deixar os commands e o estado do harness do Lotus iguais aos do ElaDecora-Brain no **desenho**,
reescritos para bash, WSL, Docker Compose e Linux, com cada etapa do ciclo invocando a skill do
superpowers por `Skill()` explícito — `brainstorming`, `writing-plans`,
`dispatching-parallel-agents`, `subagent-driven-development`/`executing-plans`,
`test-driven-development`, `requesting-code-review`, `receiving-code-review`,
`verification-before-completion` e `finishing-a-development-branch`.

**Os hooks já estão em paridade.** Os cinco (`session-start`, `guard-main`, `guard-main-shell`,
`guard-secrets`, `stop-verify`) foram portados pelo item 28 (PR #106), com suíte própria. Desde
2026-09-20 o ElaDecora só mudou neles o que é específico do Lovable. Este trabalho toca hooks apenas
onde o estado novo obriga (§4.3).

## 2. Decisões do João (2026-09-26)

| # | Decisão | Alternativa descartada |
|---|---|---|
| D1 | **Estado por bloco**: `docs/superpowers/blocos/<NN>-<slug>/estado.md`; lanes descobertas por `git worktree list`; `state.md` vira contrato | `state.md` central com `lanes:`; híbrido índice + detalhe |
| D2 | **Codex mantido, encaixado** no esqueleto novo: packet no Passo de contexto do `/planejar-bloco`, `executor: codex` no handoff, lente extra no `/revisar-bloco` de alto risco | remover o Codex; manter só o packet |
| D3 | **Um `/revisar-bloco`** de duas lentes, com o gabarito do Lotus na lente 1; `/revisar-sprint` aposentado | coexistir; estender o `/revisar-sprint` |
| D4 | **Aceitação externa incluída**, adaptada (`aceitacao.sh`, provas HTTP declarativas, aliases do Lotus) | só manual; fora |
| D5 | Branch de lane **`<tipo>/<NN>-<slug>`**, com o número do backlog | `feat/B-NNN-slug`; nome livre casado por campo |
| D6 | **Transição por espera**: o harness novo só entra na `main` quando as lanes em voo (b e c) tiverem fechado pelo fluxo antigo. Sem modo duplo | modo duplo temporário; migrar tudo no merge |
| D7 | **Superpowers pelo plugin oficial** ligado no `.claude/settings.json` do projeto; commands chamam `superpowers:<skill>` | atualizar o clone manual em `~/.claude/plugins/superpowers` |
| D8 | **Recorte em três blocos sequenciais**: 30 estado → 31 commands → 32 aceitação | um bloco só; commands antes do estado |

Decididas por evidência, sem pergunta:

- **Sem lint diferencial.** O `lint-diferencial.ps1` do ElaDecora existe por dívida de `no-explicit-any`
  herdada do Lovable. O CI do Lotus já exige `pnpm lint` verde absoluto (`.github/workflows/ci.yml`),
  então o finalizar roda `pnpm lint` puro.
- **Worktrees irmãs** (`../lotus-<NN>-<slug>`), não `.worktrees/` dentro do repositório: é a
  convenção atual, os hooks do item 28 já assumem árvores irmãs (`hooks/lib/comum.sh`, `raiz_de`), e
  uma pasta dentro do main tree seria vista pelo compose e pelas ferramentas dele.
- **Sem merge local.** A `main` do Lotus só recebe PR mesclado: o `pre-push` recusa
  `git push origin main` e o job `procedencia` barra a imagem de commit sem PR (`CONTRIBUINDO.md`).
  A opção "merge local" do menu do `finishing-a-development-branch` é declarada indisponível.

## 3. Arquitetura de estado (base dos três blocos)

### 3.1 Layout

```
docs/superpowers/
  state.md                  contrato: estados, campos, invariantes; sem lanes, sem trabalho ativo
  backlog.md                fichas; ganham a linha **Depende:**; só o main tree escreve
  blocos/<NN>-<slug>/
    estado.md               estado da lane (frontmatter YAML)
    spec.md                 ou ponteiro para spec compartilhada
    plano.md
    context.md              quando a ficha diz Contexto: sim
    revisao.md              ## Em aberto no topo; rodadas acumulam abaixo
    rulings.md              decisões tomadas em nome do João durante a execução
    aceitacao.md            quando efeito_externo: sim (item 32)
  historico/progress.md     continua: uma linha por bloco fechado
  historico/state-archive.md  congelado; o registro de bloco novo é a pasta dele
  specs/ plans/ context-packets/   legado; bloco novo escreve na própria pasta
```

### 3.2 Lane

Uma lane é **uma worktree irmã numa branch que casa**
`^(feat|fix|chore|refactor|infra|cicd|docs)/(\d+)-(.+)$`. O grupo 2 é o número da ficha do backlog;
a pasta do bloco é `blocos/<NN>-<slug>/`. Branch fora do padrão não é lane. Nenhuma pasta é varrida
para descobrir lane.

- **O main tree fica sempre na `main`** e nunca é lane: planeja, abre e fecha lane, e escreve o
  backlog. A regra antiga "bloco de backend roda no main tree" cai: a P-03 fechou em 2026-08-25 e o
  offset de `.env` (ADR-13, emenda de 2026-08-24) isola o stack de cada árvore.
- **Teto de três lanes.** Offset de porta: main tree +0; lanes +1, +2, +3, reservados pelo
  `lane.sh abrir`. A tabela do `.env.example` ganha a linha +3
  (8083 / 3310 / 8028 / 9006 / 9007 / 5176).

### 3.3 Campos do `estado.md`

Os do contrato do ElaDecora — `schema_version` (3), `id`, `slug`, `workflow_state`, `next_owner`,
`next_action`, `resume_state`, `active_spec`, `active_plan`, `active_review`, `active_acceptance`,
`context_packet`, `efeito_externo`, `branch`, `worktree`, `lane_base`, `commit`, `blocker`,
`updated_at`, `updated_by` — sem os campos mortos do schema 1 dele, com duas mudanças:

- `port` vira **`offset`** (o inteiro de 1 a 3), porque o Lotus publica seis portas por árvore;
- acrescenta **`executor`** (`claude|codex`), copiado do `## Handoff de execução` do plano.

`updated_by` sai no formato `joao@<host> / <modelo>` **também quando um script grava** — o
ElaDecora perde o modelo quando o `lane.ps1` escreve (divergência aberta em `B-031/revisao.md:21`
de lá).

### 3.4 Estados e invariantes

Os doze estados do ElaDecora (`idle` … `closed`) e as doze invariantes dele, com estas
adaptações:

- a invariante do backlog escrito só pelo main tree já é regra do Lotus e continua;
- a invariante "estado muda só em fronteira durável" fica mais forte: o estado mora na pasta do
  bloco, e duas lanes não escrevem mais o mesmo arquivo;
- `focused_lane` e o espelho de campos singulares no topo **deixam de existir**, e com eles a
  classe de divergência "estado da `main` × estado da árvore" que o `SessionStart` acusa hoje.

## 4. Item 30 — fundação: estado por bloco e `lane.sh`

### 4.1 `.claude/scripts/lane.sh <verbo>`

Bash. Reusa `.claude/hooks/lib/comum.sh`. O `hooks/lib/ler-estado.py` generaliza para
`ler-frontmatter.py` (mesmo contrato de separador US, 0x1F, pelo mesmo motivo documentado nele),
consumido pelo script e pelos hooks.

- **`descobrir`** — lê `git worktree list --porcelain`. Para cada branch que casa o padrão da §3.2,
  lê o `estado.md` da lane **na árvore dela** e emite uma linha: `id`, `workflow_state`, `branch`,
  `árvore`, `next_action`. Emite também, em linhas marcadas, (a) árvore órfã — detached ou fora do
  padrão, exceto o main tree — e (b) branch de lane **sem worktree**, que é a assinatura de
  fechamento interrompido que o `/finalizar-bloco` usa no modo conserto.
- **`abrir <NN> <tipo> <slug>`** — só no main tree, na `main`. Portão, antes de criar qualquer
  coisa, com saída `PORTAO RECUSOU: <motivo>`:
  1. três lanes vivas;
  2. a linha `**Depende:**` da ficha `<NN>` cruza com o número de uma lane ativa, direta ou
     transitivamente.

  Passando: `git worktree add -b <tipo>/<NN>-<slug> ../lotus-<NN>-<slug> main`; reserva o menor
  offset livre de 1 a 3 (lido do `estado.md` das lanes vivas) e escreve o `.env` da raiz com ele;
  copia `backend/.env` e `frontend/.env` do main tree e **comenta `VITE_API_URL=` quando ela vier
  ativa** (passo 3 da receita do `.env.example`); roda `pnpm install --frozen-lockfile` em
  `frontend/` — o store do pnpm torna isso barato, e um symlink de `node_modules` quebraria no
  primeiro bloco que mudasse o lockfile; semeia `blocos/<NN>-<slug>/estado.md` com
  `workflow_state: planning` e `efeito_externo: null`. **Não sobe o stack**: lane de doc ou de
  harness não precisa dele. A saída imprime `docker compose up -d` como próximo passo.
- **`conferir <NN>`** — cruza as listas `Files:` do `plano.md` desta lane com as dos planos das
  outras lanes ativas. Interseção → sai 1 e nomeia os arquivos.
- **`fechar <NN>`** — no main tree. Recusa árvore suja. Se a lane tem projeto compose com
  contêiner ou volume, `docker compose down -v` **na árvore da lane**: o banco de dev da lane morre
  com ela, de propósito. Depois `git worktree remove` e `git branch -d`. Branch não mesclada é
  recusada; `--force` existe e nenhum command o passa.

### 4.2 `session-start.sh`

Passa a se alimentar de `lane.sh descobrir`. Sai a comparação "`state.md` da `main` × `state.md` da
árvore". Entra a coerência interna do `estado.md` da lane da sessão: `branch` bate com o git;
`next_action` corresponde a `workflow_state`; `active_plan` existe a partir de
`ready_for_execution`; `active_review` existe a partir de `ready_for_closure`; `efeito_externo` não
é `null` a partir de `ready_for_execution`. Fail-open e `exit 0` continuam como estão.

### 4.3 `guard-main-shell.sh`

Libera `bash .claude/scripts/lane.sh <verbo> …` na `main`: abrir e fechar lane é escrita legítima do
main tree. A liberação é por forma exata, com o mesmo cuidado de separadores de shell do item 28.

### 4.4 Docs

`state.md` reescrito como contrato; `CLAUDE.md` §3 ("primeiro a saída do `SessionStart`, depois o
`estado.md` da lane e os ponteiros dele"); `.env.example` com a linha +3.

### 4.5 Testes e DoD

`lane-abrir`, `lane-descobrir`, `lane-conferir`, `lane-fechar` e `session-start` em
`.claude/tests/`, em repositório descartável (`criar_repo` do `_assert.sh`). `docker compose` e
`pnpm` entram por injeção de comando; a suíte não sobe docker nem baixa pacote.

**DoD:** `run-all.sh` verde; o portão recusa a quarta lane e a dependência transitiva; `abrir` e
`fechar` **vistos rodar de verdade** uma vez, com uma lane real subindo o stack no offset reservado
e sumindo sem deixar contêiner, volume, worktree ou branch.

## 5. Item 31 — commands de bloco

### 5.1 Papéis como agentes

A ferramenta `Agent` aceita `model` por chamada, mas **não aceita esforço**: esforço só vem do
frontmatter de um agente em `.claude/agents/`. A tabela do `executar-bloco.md` do ElaDecora declara
esforço que nada aplica. Aqui cada papel é um agente com `model` (alias) e `effort` no frontmatter,
despachado por `subagent_type`:

| Agente | Papel | model | effort |
|---|---|---|---|
| `implementador-mecanico` | task com código pronto no plano, 1–2 arquivos | sonnet | medium |
| `implementador-integracao` | task multi-arquivo ou com decisão de padrão | sonnet | high |
| `revisor-task` | revisão de task na SDD | sonnet | high |
| `re-revisor` | re-revisão escopada de rodada de correção | sonnet | medium |
| `corretor-tardio` | implementador nas rodadas de correção 4–5 | sonnet | max |
| `revisor-branch` | revisão final da branch na SDD | opus | high |
| `revisor-bloco` | lente 1 do `/revisar-bloco` | opus | high |
| `verificador-achado` | lente 2, um por achado | sonnet | medium |
| `contexto-leitor` | levantamento de contexto somente-leitura | sonnet | medium |

A tabela vive **uma vez**, em `.claude/papeis.md`, e os commands a citam. Alias sempre, nunca ID.
**`--max` tem uma definição só:** sobe `sonnet` para `opus` em todo despacho do command, por
parâmetro `model` do `Agent`. O esforço da sessão é o do frontmatter do command e não muda.

### 5.2 Forma comum dos quatro commands

Frontmatter com `description`, `argument-hint`, `disable-model-invocation: true`, `model` e
`effort`. Corpo abre com o preâmbulo "Regra de invocação de skill" do ElaDecora (toda skill é
invocada pela ferramenta `Skill` e confirmada antes do passo seguinte; "eu já conheço a skill" é o
sinal do erro, não uma dispensa). Passo 1 de todos: `Skill(caveman, "ultra")`.

### 5.3 `/planejar-bloco [NN | texto livre] [--max]` — opus/high

1. Caveman.
2. Exige main tree na `main`; dentro de lane, para e diz qual.
3. Resolve a ficha. Ficha em `## Aguardando aceitação` → para: o próximo é `/finalizar-bloco`.
   Texto livre → **propõe** a ficha; ela só é gravada com o sim do João (promover é dele). Sem
   argumento → lista e pergunta.
4. `Contexto: sim` → Codex com `lotus-context-packet` (read-only), packet salvo em
   `blocos/<NN>-<slug>/context.md`. Codex indisponível →
   `Skill(superpowers:dispatching-parallel-agents)`, um `contexto-leitor` por domínio independente,
   mesmo contrato de packet. Agente que escreve nunca roda em paralelo com agente que escreve.
5. `Skill(superpowers:brainstorming)`, informando que a spec vai para `blocos/<NN>-<slug>/spec.md`.
   *spike* → encerra sem lane. *bounded* → segue curto, **mas produz spec e plano**. Classificação
   ≠ *spike* → executa o Passo 6 antes de a skill gravar a spec.
6. `lane.sh abrir` e entrada na worktree com a ferramenta nativa; volta ao Passo 5.
7. Spec com a seção **`## Verificação externa`, sempre** — lista numerada com prova por item, ou
   uma linha declarando que não há nenhuma.
8. `Skill(superpowers:writing-plans)`, plano em `blocos/<NN>-<slug>/plano.md`, com
   `## Grupos paralelos` (validado mecanicamente: `Files:` disjuntos e sem aresta
   Consumes/Produces em cada par) e `## Handoff de execução` (`executor`, modelo, esforço e, para
   `codex`, `paths_autorizados`). Depois `lane.sh conferir`.
9. `estado.md` a `ready_for_execution`, com `efeito_externo` e `executor`, **no commit do plano**.
10. Para. Nunca implementa.

### 5.4 `/executar-bloco [NN] [--simples] [--max]` — sonnet/medium

1. Caveman.
2. Valida o `estado.md` da lane (a lane é a branch atual): `blocked` para e relata; estado
   `ready_for_execution` ou `executing`; `active_plan` existe; `branch` bate.
3. `executor: codex` → rota `lotus-execute-block` de hoje: valida markers, revisa o diff real contra
   o plano, roda a verificação, commita por task nos paths exatos; diff fora de `paths_autorizados`
   → `blocked`. `executor: claude` → escolhe e declara, com as duas contagens:
   `Skill(superpowers:executing-plans)` com `--simples` ou plano de até 3 tasks e até 2 arquivos;
   `Skill(superpowers:subagent-driven-development)` no resto.
4. `estado.md` a `executing`.
5. A skill conduz. O prompt de todo implementador manda invocar
   `Skill(superpowers:test-driven-development)`. Pipeline de profundidade 1 entre tasks do mesmo
   grupo paralelo, com o revisor numa worktree destacada `../lotus-rev-<sha>`; `node_modules` por
   symlink, removido com `rm` do link antes de `git worktree remove`. Correção é sequencial.
6. "Rulings I made" da SDD → `rulings.md` (ou a linha "Nenhuma decisão foi tomada em nome do
   João.").
7. **Não** segue o ponteiro da SDD para `finishing-a-development-branch`: `estado.md` a
   `ready_for_review` e para.

### 5.5 `/revisar-bloco [NN]` — opus/high

1. Caveman.
2. Valida: `ready_for_review` ou `reviewing`; `blocked` para; o ID vem da branch, argumento
   divergente para.
3. Diff (`log --oneline`, `diff --stat`, `diff -U10` de `merge-base origin/main..HEAD`) num arquivo
   em `$TMPDIR`. Nunca colado no contexto do controlador, nunca gravado em `docs/`.
4. **Lente 1:** `Skill(superpowers:requesting-code-review)`, agente `revisor-bloco` com o caminho do
   diff e `.claude/prompts/gabarito-lotus.md` — o `/revisar-sprint` destilado: leis do §5, lições
   de `docs/README.md`, ADRs, a rule da camada tocada, órfãos, júnior × sênior, falsos positivos do
   projeto, formato Q-N, no máximo dez achados. **Alto risco** (lei do §5, dinheiro, certificado ou
   documento legal, `executor: codex`) → lente Codex read-only em paralelo; achados fundidos, e o
   que só o Codex viu passa pela lente 2 como qualquer outro.
5. **Lente 2:** `Skill(superpowers:dispatching-parallel-agents)`, **um `verificador-achado` por
   achado**, com `.claude/prompts/verificador-achado.md` portado. Não recebe o raciocínio da lente
   1 nem os outros achados. Vereditos `CONFIRMED`, `PLAUSIBLE`, `REFUTED`; sem `arquivo:linha`
   verificável o veredito é `REFUTED`.
6. `Skill(superpowers:receiving-code-review)` sobre os `CONFIRMED`. Crítico ou Importante espera a
   aprovação do João antes da correção (regra do Lotus que continua).
7. `revisao.md`: `## Em aberto` única e no topo, reescrita por rodada; rodadas novas entram acima
   das antigas e nenhuma é editada; cada rodada registra o intervalo por SHA e o modelo de cada
   lente. `REFUTED` antigos ficam — são a medida de que a lente 2 trabalha.
8. Sem Crítico/Importante em aberto → `ready_for_closure`. Com → `reviewing`, `next_action` nomeando
   o que falta.

### 5.6 `/finalizar-bloco [NN]` — sonnet/high

Modos, decididos no Passo 2: **normal** (lane viva, `ready_for_closure`, HEAD não ancestral de
`origin/main`); **pós-PR** (mesma assinatura, HEAD já ancestral de `origin/main` depois de
`git fetch` — vence o normal); **conserto** (na `main`, branch da lane sem worktree, estado
`ready_for_closure` → reanexa a worktree e refaz a verificação); **aceitação** (item 32).

1. Caveman.
2. Descobre o modo.
3. `Skill(superpowers:verification-before-completion)`, evidência fresca **no stack da lane**:
   `docker compose exec -T app php artisan test`; `pnpm lint`, `pnpm test`, `pnpm build`;
   `./vendor/bin/pint <arquivos do bloco>`; `typescript:transform` seguido de
   `git diff --exit-code` no `generated.ts`; `bash .claude/tests/run-all.sh` quando o bloco tocou
   `.claude/`; e a **prova end-to-end do critério de aceite contra a API real**, item 0 do antigo
   `/fechar-sprint`, que não se pula (com as notas de `Origin` e `Accept` do curl).
4. Portão: `## Em aberto` do `revisao.md` vazia.
5. `git fetch origin` e `git merge origin/main` na lane, e a verificação do Passo 3 de novo. Merge,
   não rebase: `revisao.md` e `rulings.md` citam SHA. Sem rede → para.
6. `Skill(superpowers:finishing-a-development-branch)`: o menu é apresentado como a skill escreve,
   com o merge local declarado indisponível (§2). Caminho: push da branch, `gh pr create`,
   `gh pr view --json mergeable,mergeStateStatus` até `clean`.
7. PR aberto → `ready_for_closure`, `next_action` com o link, e para. PR mesclado (pós-PR) → no main
   tree, `git merge --ff-only origin/main`; remove a ficha do `backlog.md`; linha no
   `historico/progress.md`; pendências (gatilho vencido, ficha que fechou ou nasceu — o checklist 7
   do antigo `/fechar-sprint`); `estado.md` a `closed`; `lane.sh fechar`.

O espelho corporativo (`scripts/espelhar-corporativo.sh`) fica fora: é release, não bloco.

### 5.7 O que muda em volta

- **Aposentadas:** as skills `revisar-sprint` (vira `gabarito-lotus.md`) e `fechar-sprint` (vira os
  Passos 3 e 7 do `/finalizar-bloco`).
- **Só ganham `model` e `effort`** (a parte A da antiga ficha de política de modelo): `/revisar-frontend`,
  `/revisar-ui`, as skills `auditar-docs` e `lotus-ui-review`, o agente `auditor-docs`.
- **`.agents/skills/`** (Codex): `lotus-context-packet` e `lotus-execute-block` passam a apontar
  para `blocos/<NN>-<slug>/`.
- **`.claude/settings.json`:** `enabledPlugins: {"superpowers@claude-plugins-official": true}`. A
  remoção dos symlinks de `~/.claude/skills` que apontam para o clone manual (v6.1.1, de
  2026-07-02) é ação do João no home dele; sem ela convivem duas cópias.
- **`CLAUDE.md` §4:** a tabela de entradas lista os quatro commands e o ciclo canônico diz qual
  command invoca qual skill.
- **`docs/estrutura-monolito.md`:** passa a descrever `.claude/` — commands, agents, hooks,
  scripts, prompts, tests, `settings.json` — e a régua da allowlist do `guard-main-shell`. É o
  gatilho de fechamento da **P-84**, que este item hospeda.

### 5.8 Catraca e DoD

`.claude/tests/commands.tests.sh` reprova quando: um command perde `model` (alias válido),
`effort` ou `disable-model-invocation: true`; um command perde o caveman ou **qualquer uma das linhas
`Skill(superpowers:…)` esperadas dele** (tabela no próprio teste); um agente de papel perde `model`
ou `effort`; `papeis.md` e `.claude/agents/` divergem em qualquer sentido; aparece ID fixo
(`claude-…`) em command, skill ou agente; o plugin some do `settings.json`.

**DoD:** `run-all.sh` verde e vermelho quando se apaga um `Skill(superpowers:brainstorming)` ou um
`model:` (provado nos dois sentidos); os quatro commands **vistos rodar** de ponta a ponta num bloco
real pequeno, com a Skill tool de fato invocada em cada passo que a cita.

## 6. Item 32 — aceitação externa

`.claude/scripts/aceitacao.sh <gerar|conferir> <NN>`:

- **`gerar`** lê `## Verificação externa` da spec e cria ou completa `aceitacao.md`
  (`# | Item | Prova | Resultado | Data`). Idempotente; nunca sobrescreve resultado escrito à mão.
- **`conferir`** roda as provas `automatica`, grava a saída na linha, e imprime o veredito na
  última linha: `ACEITACAO OK: <n> item(ns)` ou `ACEITACAO PENDENTE: <itens>`. Item `manual` sai de
  pendente só com **Resultado e Data (`AAAA-MM-DD`)**. Item cujo texto mudou na spec volta a
  pendente.
- **Prova declarativa**, `<alias> <GET|HEAD> <caminho> -> <código>`. O que não casa é recusado e
  nunca executado como shell. O `curl` sai **sem credencial**.
- **Aliases** em `.claude/aceitacao-aliases.conf`, versionado e sem segredo: `producao` (URL
  definida no planejamento do 32, a partir do que os itens 10 e 12 provisionaram) e `local`
  (`http://localhost:<8080 + offset>`). O `/up` do Laravel (`bootstrap/app.php`) é a prova barata.

No `/finalizar-bloco`: `efeito_externo` ausente ou `null` para o command — `null` nunca vale
`nao`. Rede de segurança: `nao` com o diff tocando `infra/`, `.github/workflows/`,
`docker-compose.prod*` ou `scripts/espelhar*` → para e pergunta. `PENDENTE` com PR aberto → lane em
`ready_for_closure`, `next_action` nomeando o PR **e** os itens. PR mesclado com `PENDENTE` → ficha
em `## Aguardando aceitação` do backlog, `estado.md` a `blocked` com
`resume_state: ready_for_closure`, lane fechada. **Modo aceitação:** na `main`, bloco em `blocked`,
roda só `conferir`; `OK` → `closed`; `PENDENTE` → commita a tentativa e para.

Casa com a prática vigente de produção — leitura remota o agente faz, escrita remota o João faz —,
então todo item que exige escrita em prod é `manual`, e o João anota resultado e data.

**Testes:** `aceitacao.tests.sh` contra `python3 -m http.server` local, sem rede externa.
**DoD:** suíte verde; um bloco com item `automatica` e um `manual` percorre `PENDENTE` → `OK` de
verdade.

## 7. Transição e integração

- Os três blocos são planejados e executados pelo **fluxo antigo**, que é o que está na `main`
  enquanto eles não mesclarem.
- Branches empilhadas numa lane só: 31 sai da ponta do 30, 32 da ponta do 31. As PRs mesclam em
  ordem, **só quando as lanes em voo tiverem fechado** (D6). Em 2026-09-26 a lane-b (item 12) já
  mesclou a PR #108; a lane-c (item 16) segue.
- O fechamento do 30 é o momento em que o `state.md` deixa de guardar lanes. Se houver lane antiga
  viva nesse momento, o merge espera.

## 8. Fora de escopo

- `lint-diferencial` (§2).
- `sincronizar-lovable` e `lovable.ps1`: específicos do ElaDecora.
- Troca de modelo em tempo de execução e `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` (anula o frontmatter
  de todo subagente, o oposto do §5.1).
- O sinal de contexto cheio aos 150k: item 33, esperando decisão.
- Espelho corporativo e release.

## 9. Pontos abertos para cada planejamento

- **30:** a forma exata da liberação de `lane.sh` no `guard-main-shell` (onde ela mora no
  `classificar-comando.py`); se `ler-frontmatter.py` substitui `ler-estado.py` ou convive até o 31.
- **31:** confirmar que a ferramenta nativa de entrar em worktree aceita caminho de árvore irmã
  (`../lotus-<NN>-<slug>`); se não, o Passo 6 opera por caminho explícito, como o ElaDecora faz na
  sessão nascida dentro da worktree. Confirmar a classificação *spike/bounded/architectural* na
  versão do plugin instalada.
- **32:** a URL do alias `producao`.
