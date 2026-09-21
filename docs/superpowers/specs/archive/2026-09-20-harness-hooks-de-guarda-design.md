# Design — harness de hooks de guarda

- **Work item:** `harness-hooks-de-guarda` (item 28 do backlog, P1, frente Harness)
- **Lane:** `lane-a` · árvore `../lotus-harness` · branch `chore/harness-hooks-de-guarda`
- **Base:** `origin/main@618f390a`
- **Data:** 2026-09-20
- **Fonte:** harness PowerShell de `Ela-Decora/ElaDecora-Brain` (repositório privado), lido em
  2026-09-20 — `hooks/*.ps1` (1061 linhas) e `tests/*.ps1` (746 linhas).

## 1. Objetivo

Portar para bash cinco hooks de guarda do Claude Code, adaptados ao Lotus, mais a suíte que os
prova. O harness fonte é PowerShell/Windows e o Lotus é WSL/bash: nenhum arquivo é aproveitado,
só as decisões.

O que os hooks compram:

- escrita em `main` deixa de depender de disciplina do agente e passa a ser negada pela máquina;
- escrita cruzada entre árvores de trabalho deixa de ser possível por descuido;
- segredo de servidor deixa de conseguir entrar no repositório por `Edit`/`Write`;
- o início de sessão passa a ler o estado real do disco em vez de confiar em um `state.md` que
  pode estar vencido;
- encerrar sessão com código modificado passa a exigir evidência de verificação.

**A entrega inclui a suíte.** Hook sem teste é prosa com `exit 0`.

## 2. Fora de escopo

Ficam de fora, por decisão registrada na ficha do item 28:

- `lane.ps1` (gerência de lanes por script);
- `lint-diferencial`;
- `aceitacao.ps1`;
- `estado.md` por bloco.

Não se cria nenhum arquivo fora de `.claude/`. Nenhum hook escreve no repositório.

## 3. Arquitetura

### 3.1 Layout

```
.claude/settings.json                      novo, versionado — contém só os hooks
.claude/hooks/
  guard-main.sh          PreToolUse  Edit|Write|NotebookEdit
  guard-secrets.sh       PreToolUse  Edit|Write
  guard-main-shell.sh    PreToolUse  Bash
  session-start.sh       SessionStart  startup|resume|clear|compact|fork
  stop-verify.sh         Stop
  lib/comum.sh                  stdin, raiz git, emissão de JSON
  lib/classificar-comando.py    o classificador de comando de shell
  lib/ler-estado.py             frontmatter do state.md
.claude/tests/
  _assert.sh
  run-all.sh
  classificar-comando.tests.sh
  guard-main.tests.sh
  guard-main-shell.tests.sh
  guard-secrets.tests.sh
  session-start.tests.sh
  stop-verify.tests.sh
```

`.claude/settings.json` não existe hoje no repositório — o que existe é
`.claude/settings.local.json`, ignorado em `.gitignore:28`. O arquivo novo carrega **somente** o
bloco `hooks`; permissões e MCP continuam no local, não versionado.

### 3.2 Contrato comum

Todo hook obedece ao mesmo contrato, que é o do original menos o preâmbulo de codificação (o
original abre o stdin como UTF-8 explícito porque o console do Windows decodifica em CP850 e
corrompe caminho com acento; bash lê bytes, então o problema não existe aqui):

- lê o payload JSON do stdin;
- **`exit 0` sempre.** Nunca `exit 2` — `exit 2` mata a sessão em vez de negar a ferramenta;
- decisão vai no stdout como JSON;
- erro de infraestrutura falha **aberta**: sai 0, mudo, e a ferramenta segue.

Sem `set -e`. O corpo vive em uma função chamada com `|| true`, e o arquivo termina em `exit 0`
incondicional — é o equivalente bash do `try { } catch { exit 0 }` do original.

Formato da resposta, por evento:

| evento | forma |
|---|---|
| `PreToolUse` | `hookSpecificOutput.permissionDecision = "deny"` + `permissionDecisionReason` |
| `Stop` | `decision` e `reason` na **raiz** do JSON |
| `SessionStart` | texto puro no stdout |

Toda emissão de JSON passa por `jq -n --arg`, nunca por `echo` com aspas montadas à mão: os
motivos citam caminhos, e um deles é `INSTRUÇÕES-DO-PROJETO.md`.

### 3.3 A raiz: duas perguntas diferentes

Há dois usos de "raiz do projeto", e confundi-los é o bug do original que mais importa não
repetir:

1. **Onde está o script do hook?** Vem de `${CLAUDE_PROJECT_DIR}` no `settings.json` — é a única
   expansão que o Claude Code oferece na string do comando. Se o caminho não existir, o comando
   falha e o hook falha aberto. Aceitável.
2. **A que árvore o alvo pertence?** Vem **sempre** de `git rev-parse --show-toplevel` executado
   no `cwd` do payload, **nunca** de `CLAUDE_PROJECT_DIR`. No Lotus isso pesa mais que no
   original: as árvores de trabalho são diretórios **irmãos** (`../lotus-infra`, `../fix-frontend`,
   `../lotus-preview`, `../lotus-harness`), não subpastas, então a variável aponta para fora da
   árvore da sessão, e não para uma pasta acima dela.

A política é decidida pela pergunta 2. Sem exceção.

### 3.4 Consequência de versionar os hooks

`.claude/hooks/` só existe nas árvores cuja branch contém este bloco. `../fix-frontend`, aberta de
`9c038cca`, não terá os hooks até rebasear. Lá o comando do hook falha, o hook falha aberto e não
há guarda. Isso é consequência declarada, não defeito: a alternativa seria instalar fora do
controle de versão, e aí o guarda não é revisável.

## 4. `guard-main.sh` — PreToolUse `Edit|Write|NotebookEdit`

Nega em duas regras, nesta ordem.

**Regra 1 — escrita cruzada entre árvores.** A raiz git do **alvo** difere da raiz git da
**sessão** → nega, seja qual for a branch das duas. Nenhum prefixo isenta. Só se aplica quando a
raiz da sessão veio do git; se não veio, o hook falha aberto.

**Regra 2 — a branch da árvore do alvo é `main`.** Aí a allowlist decide. A branch consultada é a
da árvore que **contém o alvo**, não a da sessão. Como o alvo em geral ainda não existe (é o caso
do `Write`), sobe pelos diretórios ancestrais até achar um que exista e pergunta a branch ali.

Liberado na `main`, por prefixo de caminho relativo à raiz:

```
docs/
.claude/
.agents/
```

e por nome exato na raiz:

```
CLAUDE.md
INSTRUÇÕES-DO-PROJETO.md
CONTRIBUINDO.md
AGENTS.md
README.md
```

Os cinco nomes foram medidos com `git ls-files` em 2026-09-20; a ficha do item 28 listava só os
três primeiros.

A lista de prefixos **proibidos** do original (`.worktrees/`, `.claude/worktrees/`)
**não é portada**: nenhuma árvore de trabalho do Lotus mora dentro do repositório, e a Regra 1 já
cobre o caso.

## 5. `guard-main-shell.sh` — PreToolUse `Bash`

### 5.1 A casca

Lê `.tool_input.command`. Resolve a raiz pelo `cwd` do payload. Sem raiz ou sem branch →
`exit 0` mudo. Branch diferente de `main` → `exit 0` mudo. Só então chama o classificador.

Duas políticas opostas, de propósito:

- **falha aberta por infraestrutura** — não deu para saber se é a `main`, então não há o que
  guardar;
- **falha fechada por classificação** — o comando existe e não deu para entendê-lo, que é
  exatamente a hipótese que a allowlist trata.

### 5.2 O classificador

`lib/classificar-comando.py` recebe a linha em `argv[1]` e o caminho da raiz em `LOTUS_RAIZ`. Não
toca git nem stdin — por isso pode ser testado sozinho, sem fixture. Contrato:

| saída | significado |
|---|---|
| `exit 0`, stdout vazio | liberado |
| `exit 0`, motivo no stdout | negado, com esse motivo |
| qualquer `exit` diferente de 0 | negado, com motivo genérico (falha fechada) |

O original resolvia isso pelo AST do PowerShell
(`[System.Management.Automation.Language.Parser]::ParseInput` + `FindAll` recursivo). Bash não tem
equivalente. O substituto é `shlex` com `punctuation_chars=True`, e o que o AST dava de graça —
descer em substituição de comando — passa a ser escrito à mão.

```
1. shlex(cmd, posix=False, punctuation_chars=True) + desaspar() por token
   ValueError (aspas abertas) -> nega: "nao pode ser analisado sintaticamente"
2. $(...) e `...`  -> extrai por balanceamento e classifica RECURSIVO
   <(...)          -> nega (substituicao de processo vira caminho de arquivo magico)
3. redirecionamento > >> &>  -> nega
   excecoes: 2>/dev/null e 2>&1, que nao escrevem em arquivo
4. quebra em comandos simples por ALLOWLIST de separadores:
   |  ||  &&  ;  ;;  &  |&  ;&  ;;&  e nova linha
   token feito so de pontuacao de shell fora dessa lista -> nega
5. por comando simples:
   prefixo VAR=valor        -> nega
   nome nao literal ($x, *) -> nega
   despacha por familia
```

`posix=False` é deliberado, e não um detalhe de implementação. Com `posix=True` o `shlex`
resolve as aspas antes de o classificador ver o token, e `git push "--forc"e` chegaria já como
`--force` — o classificador comparia a string expandida sem saber que o agente a escondeu. Mantendo
`posix=False`, o token chega cru; `desaspar()` remove as aspas onde a comparação precisa, e aspas ou
barra invertida **em posição de flag** negam por ambiguidade (o escape C1 da revisão de branch).

O passo 5, primeiro item, é o `GIT_EXTERNAL_DIFF=... git diff` do original entrando por outra
porta: atribuição de variável na frente do comando muda o que o comando faz sem mudar o nome dele.

Negar `$(...)` inteiro seria mais simples e mais seguro, e foi descartado: mataria
`git log -1 $(git rev-parse HEAD)`, que é leitura legítima e frequente.

### 5.3 Famílias

**Leitura pura — liberado:** `ls cat head tail grep rg find wc sort uniq cut tr diff jq stat file
realpath basename dirname pwd echo printf date tree`.

**Negado nessa mesma família:** `sed -i` (escreve; `sed -n` passa), `tee`, `xargs`, `env`, `awk`,
`perl`, `python3 -c`, `node -e`, `ruby -e`, `find -exec`, `find -delete`. Os interpretadores invocados diretamente — `bash`, `sh`,
`python3`, `node`, `npx` — ficam fora sob qualquer forma, com ou sem argumento: são as portas de
execução arbitrária, e é a mesma régua que tirou `npx`/`bunx` da lista do original.

**`git`** — subcomandos liberados: `status log diff show rev-parse merge-base cat-file ls-files
blame shortlog describe branch worktree remote tag add commit merge fetch pull push`.
Negado:

- flag global `-c` e `--config-env` — injetam configuração, e `core.pager` executa shell. A
  comparação é **sensível a caixa**: `-C` (trocar diretório) passa, `-c` nega;
- `-C`, `--git-dir` e `--work-tree` (nas duas formas, `-C X` e `--git-dir=X`) **apontando para fora
  de `LOTUS_RAIZ`**, combinados com qualquer subcomando que não seja de leitura. `git -C
  ../lotus-infra log` é a leitura que a allowlist queria autorizar; `git -C ../lotus-infra commit`
  é escrita na árvore de outra lane, que a Regra 1 do `guard-main` promete impedir por qualquer
  caminho. Sem `LOTUS_RAIZ` no ambiente, a regra falha **fechada** — não dá para provar que o
  destino é interno;
- `--exec-path`;
- `-o` e `--output` em **qualquer** subcomando;
- `branch` com `-d -D -m -M -c -C -f --delete --move --copy --force`;
- `tag` com `-d --delete -f --force`;
- `push` com `-f --force* -d --delete --mirror --prune`, e refspec começando em `:` ou `+`;
- `worktree remove|move|prune|lock|unlock|repair`, e `--force` no `add`;
- `remote add|remove|rm|set-url|rename|set-head|prune`;
- `pull` e `fetch` com destino em forma de URL.

**`docker`** — liberado `compose up`, `compose ps`, `compose logs`, `compose config`,
`compose version`, e `compose exec` **somente** na forma
`docker compose exec -T app php artisan test [flags de test]`. Negado: `exec` com `sh -c` ou
`bash -c` (execução arbitrária com outro nome); `compose down` com `-v`/`--volumes` (apaga o volume
do banco de desenvolvimento); `docker run` (monta volume arbitrário); `php artisan migrate`,
`db:seed`, `typescript:transform` — todos escrevem. Em `artisan test`, negado `--coverage-html` e
`--log-junit`, que escrevem arquivo.

**`pnpm`** — liberado `test`, `build`, `lint`. Negado `dev`, `add`, `remove`, `install`; a cauda
depois de `--`, que é repassada ao script (`pnpm lint -- --fix` reescreve `src/`); e
`-C`, `--dir`, `--filter`, `-w`, `--workspace-root`, que trocam qual `package.json` é lido.

**`gh`** — liberado `pr view|list|diff|checks`, `run view|list`, `repo view`, e `api` em GET.
Negado `api` com `--method`, `-X`, `-f` ou `--field`; `pr create`; `pr merge`.

**Poppler** — `pdfinfo` liberado. `pdftoppm` liberado **só com destino fora do repositório**; o
`CLAUDE.md` já manda gerar em `/tmp`, e destino dentro do repositório é escrita de arquivo com
outro nome. É para isso que `LOTUS_RAIZ` é passado ao classificador.

**`./vendor/bin/pint`** fica fora: reformata, logo escreve.

### 5.4 A saída

O motivo da recusa aponta as duas saídas: rodar o comando no próprio terminal, ou acrescentar a
entrada à lista e commitar. A segunda funciona porque `.claude/` é gravável na `main` pelo
`guard-main` — o escape hatch existe, e é auditável por commit.

### 5.5 Tensão conhecida

O modo automático do Claude Code instrui a editar arquivo por Bash (`sed`, heredoc, `python3`).
Na `main`, o `guard-main-shell` nega essa forma, enquanto a mesma edição por `Edit`/`Write`
continua liberada pelo `guard-main` quando o caminho está na allowlist. Isso é a intenção do
guarda, não um conflito a resolver: a escrita na `main` fica por uma porta só, a que sabe checar
o caminho.

## 6. `guard-secrets.sh` — PreToolUse `Edit|Write`

Duas peneiras: nome e conteúdo.

### 6.1 Nome

Basename casa `^\.env($|\..+)` **e não termina em `.example`** → nega.

O original abre exceção nominal para exatamente `.env.example`. No Lotus isso quebraria: medido em
2026-09-20, `git ls-files` devolve `.env.example`, `backend/.env.example`,
`backend/.env.production.example`, `frontend/.env.example` e `docker/probe.env`. A regra nominal
negaria três dos quatro `.example`. `docker/probe.env` não casa o padrão — termina em `.env`, não
começa — e isso está correto: é fixture versionada, e a peneira de conteúdo continua sobre ela.

### 6.2 Conteúdo

Inspeciona `tool_input.content` concatenado com `tool_input.new_string`. Só formas
inconfundíveis:

```
APP_KEY\s*=\s*base64:[A-Za-z0-9+/]{43}=
AKIA[0-9A-Z]{16}
(AWS|MINIO|S3)[A-Z_]*(SECRET|PASSWORD)[A-Z_]*\s*[:=]\s*["']?[A-Za-z0-9/+=]{24,}
gh[pousr]_[A-Za-z0-9]{36}
```

Nenhuma regra genérica de `PASSWORD=`, por medição: o `docker-compose.yml` versionado tem
`MYSQL_ROOT_PASSWORD: secret` e `MINIO_ROOT_PASSWORD: lotus-secret`. Qualquer regra genérica
negaria editar o compose, que é trabalho normal. `lotus-secret` tem hífen e 12 caracteres, logo
não casa a terceira regra.

A senha do RDS não tem forma distinguível. Ela é coberta pela peneira de **nome**, porque só vive
em `backend/.env.production`. Isso fica dito em vez de virar um regex que não funciona.

As marcas de Supabase do original (`sb_secret_`, `SERVICE_ROLE_KEY`, JWT com
`"role":"service_role"`) não são portadas: não há Supabase nem JWT no Lotus, onde a autenticação é
cookie de sessão Sanctum.

### 6.3 Isenções de conteúdo

- alvo **fora** da raiz do repositório — o guarda existe para manter segredo fora do repositório,
  não para bloquear rascunho no scratchpad;
- alvo sob `.claude/hooks/` — código-fonte do próprio guarda, que cita as marcas legitimamente;
- alvo sob `.claude/tests/` — acréscimo em relação ao original, e necessário: os testes carregam
  as marcas como carga, e sem a isenção o guarda impede escrever a suíte que o prova.

Nome liberado não é conteúdo liberado: o `.env.example` passa pela primeira peneira e continua
sendo inspecionado pela segunda.

## 7. `session-start.sh` — SessionStart

Não é porte. O original depende do `lane.ps1`, que está fora de escopo. A fonte aqui é o disco.

```
git worktree list --porcelain          -> todas as arvores e suas branches
por arvore: docs/superpowers/state.md  -> bloco lanes:, via lib/ler-estado.py (PyYAML 6.0.1)
```

Imprime uma linha por lane — `workflow_state`, item ativo, branch, árvore, `next_action` — com `*`
na lane desta sessão, e a linha de git corrente (branch, HEAD curto, arquivos modificados). Mantém
as duas frases do original que evitam falso alarme: HEAD à frente do campo `commit` é normal,
porque o estado só é reescrito em fronteira durável; e divergência entre estado, plano, spec e git
bloqueia a sessão.

Três alarmes:

1. **Estado vencido** — o que o `state.md` da `main` diz sobre a lane `X` diverge do que o
   `state.md` da árvore de `X` diz sobre si mesma. Foi o que aconteceu no planejamento deste
   bloco: a `main` dizia `lane-c: idle` e a `../fix-frontend` dizia `executing`, item 16 fatia 3.
   Custou duas paradas e quase uma promoção na lane errada.
2. **Fechamento interrompido** — lane em `ready_for_closure` sem árvore no disco. Porte direto; o
   motivo do original vale igual aqui.
3. **Árvore órfã** — árvore no disco cuja branch nenhuma lane reclama.

Texto puro, `exit 0`. `SessionStart` nunca bloqueia.

## 8. `stop-verify.sh` — Stop

Formato `decision`/`reason` na **raiz** do JSON.

Dois anti-laços, com papéis distintos:

- `stop_hook_active` do payload corta o laço imediato — o campo vem `true` quando o Claude Code já
  está continuando por causa de um bloqueio anterior deste mesmo hook;
- arquivo-marca em `${TMPDIR:-/tmp}/lotus-stopverify-<session_id>-<HEAD curto>` cumpre o "este
  aviso não repete para o mesmo commit" que o próprio texto promete ao leitor.

O filtro de caminho é do git:
`git -C "$raiz" status --porcelain -- backend frontend .claude`. Nunca um regex sobre a saída: o
formato porcelain põe o caminho **antigo** primeiro numa renomeação (`R  a.ts -> src/b.ts`) e
envolve em aspas duplas qualquer caminho com espaço.

Cobra só o que foi tocado:

| tocou | exige |
|---|---|
| `backend/` | `docker compose exec -T app php artisan test` e `cd backend && ./vendor/bin/pint <arquivos>` |
| `frontend/` | `pnpm build`, `pnpm test`, `pnpm lint` |
| `.claude/` | `bash .claude/tests/run-all.sh` |

Pedir `pnpm build` quando só o backend mudou treina o leitor a ignorar o aviso.

O texto abre com a Iron Law do original — nenhuma alegação de conclusão sem evidência fresca de
verificação — e diz que o hook lê a árvore inteira e não sabe quais arquivos são da sessão.

## 9. Suíte

Decisão: runner bash próprio, repositório git descartável por caso. Sem dependência externa.

`_assert.sh` oferece `assert_igual`, `assert_contem` e `assert_nao_contem`. A contenção é
**literal e sem caixa**, não padrão de glob: o original apanhou disso, porque `-like` tratava a
crase como caractere de escape e nenhum trecho com crase casava — e motivo de recusa cita código
em markdown o tempo todo. O contador de falhas é variável global, o que funciona porque
`run-all.sh` faz `source` de cada arquivo em vez de rodar em subshell.

`criar_repo()` monta o descartável: `mktemp -d`, `git init -q -b main`, `user.name` e `user.email`
**locais**, um commit vazio, as pastas do caso. Cada caso registra o descartável com
`registrar_descarte`, e `run-all.sh` arma `trap limpar_descartes EXIT` — a limpeza vale também para
`Ctrl-C` no meio da suíte, não só para o caminho feliz. Nada toca o repositório
real — em particular, nada de `git stash`: a pilha tem stashes alheios, e provar catraca com
stash já custou caro neste projeto.

Acionar um hook é `printf '%s' "$payload" | bash .claude/hooks/X.sh`, com o `cwd` do payload
apontando para o descartável; a saída é lida com `jq -r`.

Sete arquivos: `classificar-comando.tests.sh` (unitário puro, sem git), um por hook, e
`_assert.tests.sh`, que prova as próprias asserções — sem ele, uma `assert_contem` quebrada deixaria
a suíte inteira verde por vacuidade.

Regras que a suíte obedece:

- cada hook é provado **nos dois sentidos** — negando e liberando. Teste que só prova negação é
  cobertura fantasma: nunca teria falhado contra um hook que nega tudo (lição 10 de
  `docs/README.md`);
- o classificador prova os pares quase-idênticos: `git -C` passa e `git -c` nega; `pnpm lint`
  passa e `pnpm lint -- --fix` nega; `sed -n` passa e `sed -i` nega; `2>/dev/null` passa e
  `> arquivo` nega;
- **toda** asserção confere `exit 0` do hook. `exit 2` mataria a sessão em vez de negar a
  ferramenta;
- `run-all.sh` imprime o veredito na última linha e sai 1 se houve qualquer falha.

## 10. Definition of Done

1. `bash .claude/tests/run-all.sh` verde, com a saída colada na sessão.
2. Os cinco hooks provados nos dois sentidos pela suíte.
3. Prova no repositório real, na `main`: `Write` em `backend/` negado e em `docs/` liberado;
   `Bash` com `pnpm lint -- --fix` negado e `pnpm lint` liberado.
4. `.claude/settings.json` versionado, com os cinco hooks registrados nos matchers corretos.

**Limite honesto do item 4:** `settings.json` é lido na abertura da sessão. O disparo dos hooks
**não se prova dentro da sessão que os escreve**. Fica como verificação do João numa sessão nova,
declarada como tal, e não como caixa que o agente marca sozinho.

## 11. Limites conhecidos

- Os guardas só existem nas árvores cuja branch contém este bloco (§3.4).
- O classificador é uma allowlist: comando legítimo fora da lista é negado na `main`, e a correção
  é acrescentar a entrada e commitar.
- `pdftoppm` com destino em variável não literal é negado, porque o classificador não resolve
  variável.
- Nenhum hook cobre ferramentas de MCP nem nada fora dos matchers declarados no §3.1. Escrita por
  servidor MCP não passa pelo `guard-main` nem pelo `guard-secrets`.

  **Emenda de 2026-09-20 (fechamento do bloco):** a frase acima descrevia o buraco como se ele fosse
  fechado por construção. Não é. Verificado contra o binário instalado do Claude Code: o matcher de
  `PreToolUse` **aceita `mcp__.*`**, então o bypass é fechável — falta um guarda que saiba ler o
  `tool_input` de cada servidor, que é outro bloco. O limite real é "os hooks deste bloco não cobrem
  MCP", não "hooks não cobrem MCP".
