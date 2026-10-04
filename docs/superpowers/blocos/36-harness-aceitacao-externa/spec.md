# Bloco 36 — `harness-aceitacao-externa` (spec)

**Data:** 2026-10-04 · **Ficha:** `backlog.md` item 36 · **Spec compartilhada:**
[`specs/2026-09-26-harness-paridade-eladecora-design.md`](../../specs/2026-09-26-harness-paridade-eladecora-design.md)
§6 · **Referência:** `Ela-Decora/ElaDecora-Brain@3b7cc1bf`, `.claude/scripts/aceitacao.ps1`

O ponto de partida é a §6 da spec compartilhada, lida com as emendas E8, E9 e E10 da
[spec do bloco 35](../35-harness-commands-de-bloco/spec.md). A E8 fechou a `main` a todo commit que
não chegue por PR, e com isso o modo aceitação da §6 — que commitava `closed` na `main` — ficou sem
caminho. A §6 desenha só o script; este arquivo registra as emendas aprovadas pelo João no
planejamento (2026-10-03 e 04) e o desenho inteiro do bloco.

## Emendas

### E1 — o modo aceitação abre uma lane curta

A §6 manda o modo aceitação rodar `conferir` na `main` e commitar ali o `closed` ou a tentativa. Com a
E8, o main tree não publica commit. Decisão do João (2026-10-03): o modo aceitação abre uma **lane
de aceitação** pelo verbo novo `lane.sh aceitar <NN>`, que reabre o bloco em `ready_for_closure`
numa worktree própria. Dali o `/finalizar-bloco` corre como no modo normal, e o commit de
fechamento chega à `main` por PR (§2.3 e §2.4).

### E2 — a saída do `blocked` aguardando aceitação deixa de ser exceção

A E9 do 35 fez esse `blocked` sair direto a `closed`, numa PR de docs escrita pelo João, e a
invariante 10 ganhou a exceção correspondente. Com a E1, a saída volta à regra geral do `blocked`:
o `aceitar` devolve o bloco ao `resume_state` (`ready_for_closure`), e o 6a do `/finalizar-bloco`
confere de novo e grava `closed` ou `blocked`. As duas exceções saem do `state.md`, do `CLAUDE.md`
§3 e do `AGENTS.md`, e o item "Saída, até o item 36" da E9 caduca.

### E3 — duas regras da §6 caducam

- **"PENDENTE com PR aberto → lane em `ready_for_closure`".** A E8 pôs o commit de fechamento antes
  do PR, e a E9 já leva o `sim` sem prova a `blocked` antes do push.
- **"PENDENTE → commita a tentativa e para", no modo aceitação.** Cada tentativa viraria PR, merge e
  pós-PR, e a segunda reusaria o nome de branch da primeira — o `gh pr view <branch>` do
  `/finalizar-bloco` acharia a PR já mesclada. Na lane de aceitação, PENDENTE não publica nada
  (§2.4). A tentativa feita antes do merge, na lane do bloco, continua registrada: o
  `aceitacao.md` entra no commit do caminho E9 (§2.2).

### E4 — o alias `producao`

O ponto aberto da §9 ("32: a URL do alias `producao`") fecha em `https://app.lotusotec.cl`, a
produção que o bloco 32 provou de fora (`estado.md` dele: `/up` 200 com HSTS em 2026-09-28).

### E5 — o 36 sai da `main`, sem empilhar

A ficha diz "branch empilhada na ponta do 35". A E1 do 35 já previa o contrário, e o 35 mesclou
(PR #123): a lane foi aberta pelo `lane.sh abrir 36 chore harness-aceitacao-externa` sobre
`20aa04ef`, offset +2.

### E6 — a rede de segurança do `nao` com os caminhos deste repositório

A §6 manda o `/finalizar-bloco` parar e perguntar quando `efeito_externo: nao` convive com um diff
que toca `infra/`, `.github/workflows/`, `docker-compose.prod*` ou `scripts/espelhar*`. Não existe
`infra/` neste repositório — a infraestrutura de produção do Lotus mora aqui em `deploy/` e
`docker/Dockerfile.prod`, e `scripts/` guarda o espelho e o `provar-release.sh`. A lista vale:
`deploy/`, `docker/Dockerfile.prod`, `docker-compose.prod*`, `.github/workflows/` e `scripts/`.

### E7 — o curl sem globbing

Achado da revisão final (2026-10-04): o curl expande `[]` e `{}` do caminho. Com `/{up}` ele pede
`/up` e a prova gravaria OK sobre um caminho que não é o escrito; `?filter[status]=x` dá
`bad range` e mede `000`. A chamada ganha o `-g`, logo depois do `-q`, e a URL segue literal. A
gramática do caminho não é restringida: `[]{}` passam a ser caracteres comuns.

## 1. Script e formato

### 1.1 `.claude/scripts/aceitacao.sh <gerar|conferir> <NN>`

Bash fino, no molde do `lane.sh`: a leitura e a escrita do markdown moram em
`.claude/scripts/lib/aceitacao.py` (como as fichas moram em `lib/backlog.py`), e o shell cuida de
argumento, raiz da árvore e chamada HTTP.

- Roda na raiz da árvore atual. A pasta do bloco é a única `docs/superpowers/blocos/<NN>-*/` com
  `estado.md`; nenhuma, ou mais de uma → recusa.
- A spec lida é a do `active_spec` do `estado.md`, e não um `spec.md` presumido: bloco legado tem a
  spec em `specs/`. `active_spec` vazio ou apontando para arquivo que não existe → recusa.
- Exige `efeito_externo: sim` no `estado.md`. `nao` ou `null` → recusa.
- O alvo é `<pasta>/aceitacao.md`.
- Recusa sai como `PORTAO RECUSOU: <motivo>` no stderr, com **exit 2**, antes de escrever qualquer
  coisa. O exit 1 fica reservado ao veredito PENDENTE.
- `gerar` imprime `ACEITACAO GERADA: <caminho> (<n> item(ns))` e sai 0. `conferir` imprime uma
  linha por prova automática medida e, **na última linha**, `ACEITACAO OK: <n> item(ns)` (exit 0)
  ou `ACEITACAO PENDENTE: <k> de <n> item(ns): <números>` (exit 1). A contagem fica no veredito
  para que "nenhum item medido" e "todos verdes" nunca imprimam a mesma frase.

### 1.2 Leitura da seção `## Verificação externa`

Porta das defesas do `aceitacao.ps1`, com as diferenças do Lotus marcadas:

- O título casa com e sem acento (`Verificação`, `Verificacao`). A seção termina no próximo título
  de nível 1 ou 2. Seção ausente → recusa: seção ausente não é o mesmo que seção que declara não
  haver nada.
- Cerca de código (```` ``` ```` ou `~~~`) é ignorada por inteiro, dentro e fora da seção — uma
  spec pode documentar o formato com exemplo em cerca. Cerca aberta e nunca fechada → recusa.
- Item é a linha `<n>. <texto>` **na coluna 0**; o número é a posição na lista, nunca o dígito
  escrito. *Lotus:* o texto do item inclui as linhas recuadas seguintes, até a linha `- prova:`, a
  linha em branco ou o próximo item. As specs daqui quebram linha em 100 colunas, e ler só a
  primeira faria a identidade do item ignorar metade do texto.
- Cada item tem **exatamente uma** linha recuada `- prova: <valor>`; as crases em volta do valor
  saem. *Lotus:* item sem ela, ou com duas → recusa. O ElaDecora trata a ausência como manual; aqui
  o Passo 7 do `/planejar-bloco` já exige `prova: nenhuma` explícito.
- `prova: nenhuma` → item **manual**. Qualquer outro valor é prova **automática** e tem de casar o
  formato do §1.4, com alias conhecido — senão recusa, **já no `gerar`**. *Lotus:* o ElaDecora só
  valida no `conferir`; aqui o erro aparece no planejamento, e não no fechamento.
- Zero itens → recusa, nos dois verbos. Com `efeito_externo: sim`, seção sem item é spec
  incoerente com o estado, e um `ACEITACAO OK: 0` passaria calado.

### 1.3 `aceitacao.md`

```markdown
# Bloco <NN> — aceitação externa

<parágrafo gerado: de onde a tabela vem, o que é pendente, o que o João escreve, o `\|`>

| # | Item | Prova | Resultado | Data |
|---|---|---|---|---|
| 1 | <texto do item> | `producao GET /up -> 200` | `200`, esperado `200`: OK | 2026-10-04 |
| 2 | <texto do item> | manual | <o que o João escreveu> | 2026-10-05 |
```

- **A identidade do item é o texto normalizado (espaço colapsado) mais a prova.** Um resultado
  gravado só é reaproveitado quando os dois batem com a spec atual; senão o item volta a pendente,
  e o script avisa o descarte numa linha. *Lotus:* o ElaDecora compara só o texto — trocar uma prova
  automática por `nenhuma`, mantendo o texto, deixaria a última medição valer como palavra do João.
- `gerar` é idempotente: cria a tabela ou a completa, preservando todo resultado cuja identidade
  bate.
- `|` dentro de célula sai escrito `\|`. Linha da tabela que não dá cinco colunas (um `|` cru
  digitado à mão) → recusa, nomeando a linha: o script não adivinha de que célula o pipe veio.
- **Pendente:** item manual com `Resultado` vazio, ou com `Data` que não é data de calendário
  válida em `AAAA-MM-DD` (*Lotus:* o ElaDecora só mede presença); item automático cuja última
  medição não deu OK. O texto do resultado manual nunca é julgado.

### 1.4 Prova automática

- Formato `<alias> <GET|HEAD> <caminho> -> <código>`: alias em `[a-z][a-z0-9-]*`, caminho
  `/\S*` — **começa em `/`** — e código de três dígitos. O que não casa é recusado, e **nunca** é
  executado como shell.
- A âncora em `/` é conferida de novo imediatamente antes da chamada: sem ela, `@evil.example/x`
  concatenado à URL do alias vira userinfo e troca o host.
- O `conferir` mede **toda** prova automática a cada rodada e sobrescreve `Resultado` e `Data`
  (hoje): medição de ontem não prova o estado de hoje. Item manual nunca é tocado.
- A chamada é `curl -q -g -sS -o /dev/null -w '%{http_code}' --max-time 30 --proto '=http,https'`,
  com `-I` no `HEAD`, sem `-L`, **sem cabeçalho e sem credencial**. O `-q` vem primeiro para o
  `~/.curlrc` não entrar; o `-g` desliga o globbing do curl (E7). Falha de rede mede `000`, que é
  FALHOU. `ACEITACAO_CURL` troca o binário — a suíte injeta um stub, como faz com o `LANE_DOCKER`
  do `lane.sh`.

### 1.5 `.claude/aceitacao-aliases.conf`

Versionado e sem segredo. Uma linha `<alias> <URL-base>` por alias; `#` comenta.

```
producao https://app.lotusotec.cl
local    http://localhost:{LOTUS_DEV_HTTP_PORT}
```

- `{LOTUS_DEV_HTTP_PORT}` é o único marcador aceito. O valor vem do `.env` da raiz da árvore
  atual, lido como o `offset_da_arvore` do `lane.sh` o lê (só dígitos), e vale `8080` sem `.env`
  ou sem a chave. Nada é avaliado como shell.
- Depois da troca, a URL tem de casar `^https?://[A-Za-z0-9.-]+(:[0-9]+)?$` — sem userinfo, sem
  caminho, sem barra final. URL fora disso, alias repetido, ou alias desconhecido numa prova →
  recusa.
- `ACEITACAO_ALIASES` aponta outro arquivo (a suíte).

## 2. Ciclo do bloco com efeito externo

### 2.1 `/planejar-bloco`

- **Passo 3:** a frase sobre a tabela `## Aguardando aceitação` passa ao presente.
- **Passo 7:** sai a frase "até o item 36 mesclar não há `aceitacao.sh`"; a prova declarada passa
  a ser validada pelo `gerar` do Passo 9.
- **Passo 9:** com `efeito_externo: sim`, depois de gravar o `estado.md` e antes do commit, roda
  `bash .claude/scripts/aceitacao.sh gerar <NN>`. Recusa → corrigir a spec antes de seguir. O
  `aceitacao.md` entra no commit do plano, e `active_acceptance` vale
  `docs/superpowers/blocos/<NN>-<slug>/aceitacao.md`. Com `nao`, `active_acceptance: null`.

### 2.2 `/finalizar-bloco` na lane do bloco (6a)

Com `efeito_externo: nao`, o 6a passa pela rede de segurança da E6: o comando

```bash
git diff --name-only $(git merge-base origin/main HEAD)..HEAD \
  | grep -E '^(deploy/|docker/Dockerfile\.prod|docker-compose\.prod|\.github/workflows/|scripts/)'
```

listando qualquer caminho → para e pergunta ao João se o `nao` está certo. Mudar o campo é decisão
dele; com a resposta, o 6a segue pelo valor que ficar gravado.

Com `efeito_externo: sim`, o 6a roda `bash .claude/scripts/aceitacao.sh conferir <NN>`. O portão é
o script, não a prosa — a lição que fez o ElaDecora escrever o dele: portão escrito em prosa o
agente executa de cabeça e pula. Recusa → para: a spec está incompleta. Nos dois vereditos, o
`aceitacao.md` entra no commit do 6f, e o 6e preenche `active_acceptance` quando ele vier `null`
(bloco planejado antes do 36).

- **OK:** fechamento normal.
- **PENDENTE:** o caminho da E9, com três mudanças. O `blocker` e o `next_action` nomeiam os itens
  do veredito. A linha do `historico/progress.md` nomeia também os `D-*` que a verificação do Passo
  3 deu como pagos — é dela que a lane de aceitação os tira (§2.4). E o 6d deixa de ser pulado: a
  ficha e os `D-*` ficam, a linha da ficha sai da tabela de `# Ordem de execução` (quando tem uma) e
  entra uma linha em `## Aguardando aceitação` (§2.5).

O Passo 3 não muda para a lane do bloco: a prova end-to-end do critério de aceite continua
obrigatória. O `conferir` prova o efeito externo, não o código.

### 2.3 `lane.sh aceitar <NN> [--modelo <alias>]`

Verbo novo, no molde do `abrir` e com o contrato dele: recusa como `PORTAO RECUSOU`, exit 1, antes
de criar qualquer coisa; `LANE PELA METADE` quando falha no meio.

Portão, nesta ordem:

1. main tree, na `main`;
2. a pasta única `docs/superpowers/blocos/<NN>-*/` do main tree tem `estado.md` com
   `workflow_state: blocked`, `resume_state: ready_for_closure` e `blocker` começando por
   `aguardando aceitação`;
3. nenhuma lane viva com o número e nenhuma branch `sem-arvore` com ele;
4. menos de três lanes vivas — a lane de aceitação conta no teto;
5. **sem portão de dependência.** O código do bloco já está na `main`, e a lane só toca a pasta
   dele, o `backlog.md` e o `historico/`. Exigir a dependência travaria a aceitação enquanto
   qualquer bloco que depende deste estivesse vivo;
6. a branch é `docs/<pasta>`, ou `chore/<pasta>` quando o `branch` gravado no `estado.md` já é
   `docs/<pasta>` — nome igual faria o `gh pr view <branch>` achar a PR antiga, já mesclada. Branch
   ou caminho `../lotus-<pasta>` já existentes → recusa;
7. offset livre de 1 a 3.

Depois do portão: `git worktree add -b <branch> ../lotus-<pasta> main` e o `.env` da raiz com o
offset. **Sem `pnpm install` e sem copiar `backend/.env` e `frontend/.env`**: a lane não sobe stack
nem toca código. No `estado.md`, reescreve:

```yaml
workflow_state: ready_for_closure      # o resume_state
next_owner: claude
next_action: close_active_work_item aceitacao externa
resume_state: null
blocker: null
branch: <branch nova>
worktree: ../lotus-<pasta>
offset: <offset>
lane_base: <SHA curto da main>
commit: <SHA curto da main>
updated_at: <date -Iseconds>
updated_by: <id -un>@<hostname -s> / <modelo>
```

Os demais campos ficam. O corpo ganha uma linha: reaberto em `<data>` pelo `lane.sh aceitar`, na
branch nova, e qual era a branch do bloco. Commit `chore(<NN>): abre a lane de aceitação`. Sai com
`LANE ABERTA: <branch> em <árvore>`, a linha que o `/finalizar-bloco` lê para o `EnterWorktree`.

`branch`, `worktree`, `offset` e `lane_base` são do `lane.sh`, e é ele quem os reescreve: o
`SessionStart` confere o `branch` do `estado.md` contra o do git, e a lane de aceitação precisa
nascer coerente.

### 2.4 `/finalizar-bloco`: modo aceitação e lane de aceitação

- **Passo 2, modo Aceitação** — main tree, `NN` sem lane nem `sem-arvore`, `estado.md` na `main` em
  `blocked` aguardando aceitação: roda `bash .claude/scripts/lane.sh aceitar <NN> --modelo <alias>`,
  faz `EnterWorktree` no caminho do `LANE ABERTA` e segue no **modo Normal**, na mesma sessão. O
  texto de hoje — a PR de docs do João — sai.
- **A assinatura da lane de aceitação** é `next_action: close_active_work_item aceitacao externa`,
  que só o `aceitar` escreve. No modo Normal, ela troca:
  - **Passo 3:** a verificação é o `conferir` do 6a. Nada mais do Passo 3 se aplica: o diff contra
    a `origin/main` é só a pasta do bloco.
  - **6a, OK:** 6b como sempre; 6c atualiza a linha do bloco no `historico/progress.md` — ou no
    `progress-archive.md`, se ela já desceu —, sem linha nova; 6d remove a ficha, os `D-*` que
    aquela linha nomeia como pagos (E10, §2.2) e a linha de `## Aguardando aceitação`; 6e grava
    `closed`; 6f commita, com o `aceitacao.md`, sob o assunto `chore(close): item <NN> aceito`.
    Passo 7 e pós-PR como sempre.
  - **6a, PENDENTE:** para **antes** de commitar e mostra os itens pendentes. O João escolhe:
    preencher `Resultado` e `Data` dos manuais no `aceitacao.md` da lane — ele mesmo, ou ditando à
    sessão: o resultado é a palavra dele — e rodar o `conferir` de novo, na mesma sessão; ou
    descartar. Para descartar, a sessão restaura o `aceitacao.md`
    (`git restore`), e o João roda no terminal dele, no main tree,
    `bash .claude/scripts/lane.sh fechar <NN> --force` — o commit do `aceitar` não está na `main`,
    então o `fechar` sem `--force` recusa. Nada é publicado, e o bloco segue em `blocked` na
    `main`.
- **Passo 8:** com o bloco em `blocked`, a saída indicada passa a ser o `/finalizar-bloco <NN>` no
  main tree.

### 2.5 `backlog.md` — `## Aguardando aceitação`

Subseção no fim de `# Ordem de execução`, antes do `---` que abre `# Fila priorizada`, com um
parágrafo curto (quem escreve a linha, quem a remove) e a tabela:

```markdown
| Bloco | Itens pendentes | Desde |
|---|---|---|
| **<NN>** `<slug>` | <números da Verificação externa> | <AAAA-MM-DD> |
```

A linha entra no 6d da lane do bloco (§2.2) e sai no 6d da lane de aceitação (§2.4). As duas
escritas tocam só a linha do próprio bloco, que é a regra da invariante 10. O Passo 3 do
`/planejar-bloco` já para diante de ficha listada ali.

### 2.6 Portões mecânicos a mais

- **`lane.sh abrir` recusa pasta de bloco que já tem `estado.md`.** Hoje só a prosa do
  `/planejar-bloco` (E9 do 35) impede o `abrir` de sobrescrever o estado de um bloco que já passou
  por lane. Com o estado em `blocked` aguardando aceitação, a recusa aponta o `/finalizar-bloco <NN>`.
- **`classificar-comando.py`** libera na `main` a forma `lane.sh aceitar <NN> [--modelo <alias>]`,
  com a régua de argumento do `abrir`. O `aceitacao.sh` não entra na allowlist: ele roda na lane.
- **`commands.tests.sh`** cobra `aceitacao.sh conferir`, `lane.sh aceitar` e o `grep` da rede de
  segurança (§2.2) no `finalizar-bloco.md`, e `aceitacao.sh gerar` no `planejar-bloco.md`.

### 2.7 Contrato e docs

- **`docs/superpowers/state.md`:**
  - `## Lane`: o main tree abre lane também pelo `aceitar`;
  - "Entrar e sair de `blocked`": sem a exceção (E2). Na aceitação externa, quem confirma o
    `blocker` resolvido é o `conferir` do 6a, já na lane reaberta;
  - campo `active_acceptance`: quem o preenche (§2.1 e §2.2);
  - invariante 1: o `aceitar` conta no teto e não passa pelo portão de dependência;
  - invariante 10: sem a exceção da PR de docs, e com a linha de `## Aguardando aceitação`;
  - invariante 11: o registro é o `aceitacao.md`, com `ACEITACAO OK` no commit que grava `closed`;
    blocos fechados antes do 36 têm a prova em prosa no corpo do `estado.md`.
- **`CLAUDE.md` §3 e `AGENTS.md`:** "a PR de docs que traz a prova" vira a lane de aceitação.
- **`docs/estrutura-monolito.md`, seção HARNESS:** `aceitacao.sh`, `lib/aceitacao.py`,
  `aceitacao-aliases.conf`, o verbo `aceitar`, a quinta forma da allowlist e a contagem de arquivos
  de teste.
- Nenhum campo novo no `estado.md`: o `schema_version` fica `3`.

## 3. Testes

Em `.claude/tests/`, somados pelo `run-all.sh`, cada arquivo com a trava de não rodar avulso que o
`avulso.tests.sh` cobra. **Sem rede externa.**

- **`aceitacao.tests.sh`** — repositório descartável com `estado.md` e spec de fixture;
  `python3 -m http.server` em `127.0.0.1`, numa porta livre, para as provas de verdade;
  `ACEITACAO_ALIASES` com um alias de teste; `ACEITACAO_CURL` com stub quando o que se mede é o
  argumento.
  - Leitura: seção ausente; título com e sem acento; cerca ignorada (item de exemplo em cerca não
    vira item); cerca não fechada; numeração por posição; texto com linha de continuação; item sem
    `- prova:` e com duas; `nenhuma` é manual; zero itens; `efeito_externo` `nao` e `null`;
    `active_spec` ausente.
  - Prova: malformada; alias desconhecido; caminho sem `/` (`@evil.example/x`); `$(touch <arquivo>)`
    recusado sem o arquivo nascer.
  - Tabela: `gerar` idempotente; manual preservado; texto mudado e prova mudada descartam o
    resultado, com aviso; `|` cru recusado; `\|` lido e escrito.
  - `conferir`: GET e HEAD OK contra o `http.server`; 404 é FALHOU; porta fechada mede `000`;
    manual vazio, com data inválida (`ontem`, `2026-02-30`) e com data válida; automática remedida
    a cada rodada, sobrescrevendo o que foi escrito nela; última linha e exit code de cada veredito;
    recusa com exit 2.
  - Curl e aliases, pelo stub: sem `-H` e sem `-u`; `-q` primeiro; sem `-L`; `-I` só no `HEAD`; URL
    montada; `local` lendo `LOTUS_DEV_HTTP_PORT` do `.env` e caindo em `8080`; URL de alias com
    userinfo ou com caminho recusada.
- **`lane-aceitar.tests.sh`**, no molde dos `lane-*.tests.sh`: recusa fora do main tree, fora da
  `main`, com estado que não é o de aguardando aceitação, com lane viva do número, com
  `sem-arvore` e no teto; abre com `docs/` e com `chore/` (bloco cuja branch era `docs/`); campos
  reescritos e os demais intactos; commit feito; `.env` com o offset; `LANE_PNPM` nunca chamado;
  lane viva que depende do bloco não bloqueia.
- **Casos novos** em `lane-abrir.tests.sh` (recusa pasta com `estado.md`),
  `classificar-comando.tests.sh` (as formas de `aceitar` que passam e as que não passam) e
  `commands.tests.sh` (as quatro linhas do §2.6).

## 4. Definition of Done

1. `bash .claude/tests/run-all.sh` verde.
2. A catraca do `commands.tests.sh` reprova quando a linha `aceitacao.sh conferir` some do
   `finalizar-bloco.md` — provado com cópia no scratchpad, sem `git stash`.
3. **Prova em clone descartável**, no molde da E4 do 35, no scratchpad:
   - a ponta do 36 mesclada na `main` do clone, e o `origin` do clone repontado para um
     repositório bare do próprio scratchpad, sem `core.hooksPath`. No 35 o `origin` do clone era o
     repositório real, e o push teria criado nele a branch da prova;
   - uma ficha 99 com o bloco semeado em `ready_for_closure` (`spec.md`, `plano.md`, `revisao.md`
     sem achado em aberto, `efeito_externo: sim`) e dois itens de verificação externa:
     `producao GET /up -> 200` (leitura real de produção, sem credencial) e um manual;
   - numa sessão aberta pelo João no clone:
     1. `/finalizar-bloco 99` na lane: PENDENTE (manual vazio), `blocked`, push no bare; o
        `gh pr create` falha por não haver GitHub, e isso é esperado;
     2. merge simulado no bare;
     3. `/finalizar-bloco 99` no main tree do clone: pós-PR, `lane.sh fechar`;
     4. `/finalizar-bloco 99` de novo: modo aceitação, `lane.sh aceitar`, `conferir` PENDENTE, o
        João escreve resultado e data do manual, `conferir` OK, commit de `closed`;
   - registro em `docs/superpowers/blocos/36-harness-aceitacao-externa/prova-clone.md`: comandos,
     `estado.md` a cada transição, `aceitacao.md` antes e depois e os vereditos. No fim, nenhuma
     branch `*99*` no repositório real nem no remoto (`git branch -a`, `git ls-remote`).

## 5. Fora de escopo

- Publicar a tentativa PENDENTE feita na lane de aceitação (E3).
- Busca de PR que resista a nome de branch reusado em geral; só a regra `docs/`/`chore/` do §2.3.
- Catraca de `active_acceptance` no `SessionStart`.
- `lane.sh abrir` e `lane.sh conferir` ignorando a lane de aceitação. Enquanto ela vive, o `abrir`
  de um bloco que depende do bloco aceito recusa, e o `conferir` pode acusar conflito com o plano
  antigo dela. A lane é curta; a saída é esperar.
- Prova além de `GET`/`HEAD` por código: sem corpo, sem cabeçalho, sem autenticação, sem shell.
- Alias com chave, como os do Supabase no ElaDecora.
- Levar a prova em prosa de blocos já fechados (o 32) para um `aceitacao.md`.
- Espelho corporativo e release.

## 6. Aviso à lane 33

A spec do bloco 33 (`infra-producao-email-ses`, `efeito_externo: sim`) não tem
`## Verificação externa`. Com o 36 na `main`, o `conferir` do 6a dela recusa até a seção existir. A
lane é de outra sessão, e este bloco não a toca; o aviso vai ao João no fechamento do 36.

## Verificação externa

Nenhuma. Este bloco é interno ao repositório: scripts, conf, commands, docs e testes. O `GET /up`
da prova em clone é leitura de produção, não efeito. `efeito_externo: nao`.
