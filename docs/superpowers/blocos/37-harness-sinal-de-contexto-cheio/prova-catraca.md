# Prova de catraca do `sinal-contexto.sh` (DoD 1)

Data: 2026-10-04. `HEAD` medido: `1f0fbb193cfa64cd29551d4d9d806a403b9af29c`.

## Vermelho e verde das Tasks 1 e 2

Task 1 (hook e testes). Vermelho, antes do hook:

```text
sinal-contexto.tests.sh: ok=20 falha=46
FALHOU: 46 asercao(oes)
```

Verde, depois do hook:

```text
sinal-contexto.tests.sh: ok=38 falha=0
OK: 18 arquivo(s) de teste, nenhuma falha
```

Task 2 (ligação no `settings.json`). Vermelho, antes da ligação:

```text
sinal-contexto.tests.sh: ok=38 falha=2
FALHOU: 2 asercao(oes)
```

Verde, depois da ligação:

```text
sinal-contexto.tests.sh: ok=40 falha=0
OK: 18 arquivo(s) de teste, nenhuma falha
```

## Suíte fresca

```bash
bash .claude/tests/run-all.sh | tail -1
```

```text
OK: 18 arquivo(s) de teste, nenhuma falha
```

Placar do arquivo na mesma rodada:

```text
sinal-contexto.tests.sh: ok=40 falha=0
```

## Bancada de mutantes

O script da bancada é o do Step 1 da Task 3 do plano, gravado fora do repositório. Cada mutante
copia o `.claude` para um diretório descartável, troca um trecho literal e roda só o
`sinal-contexto.tests.sh`; a árvore da lane nunca é escrita.

```bash
python3 <scratchpad>/mutantes.py <raiz da lane> <scratchpad>
git status --short
```

Saída (cada mutante reprovou ao menos uma asserção; `git status --short` saiu vazio):

```text
evento: falhas: 1 | evento fora de PostToolUse e UserPromptSubmit nao avisa
agent_id: falhas: 2 | payload com agent_id (dentro de subagente) nao avisa; dentro de subagente
nao cria marca
sidechain: falhas: 1 | entrada de sidechain nao mede o fio principal
soma-zero: falhas: 1 | a sintetica nao rearma: a marca continua
compact: falhas: 2 | medicao anterior ao compact_boundary nao conta; a medicao depois do
compact_boundary conta
sem-medicao: falhas: 1 | falta de medicao nao rearma: a marca continua
marca-existe: falhas: 2 | a marca cala o aviso ate o fim da travessia; entrada sintetica de soma
zero nao e medicao
rearme: falhas: 2 | abaixo do limiar apaga a marca e rearma; a travessia seguinte avisa de novo
marca-por-sessao: falhas: 12 | o aviso cria a marca da sessao; acima avisa no UserPromptSubmit,
com o evento do payload; outra sessao acima avisa: a marca e por sessao; preparo da sintetica:
acima avisa e cria a marca; a sintetica nao rearma: a marca continua; preparo da cauda: acima
avisa e cria a marca; falta de medicao nao rearma: a marca continua; LOTUS_CONTEXTO_LIMIAR troca
o limiar; session_id com barra ainda avisa; a marca troca o que nao e nome por _ e fica no
TMPDIR; campo nulo ou que nao e numero conta 0, e message estranha nao derruba; transcript_path
com espaco e lido
env-limiar: falhas: 1 | LOTUS_CONTEXTO_LIMIAR troca o limiar
limiar-zero: falhas: 1 | limiar zero cai no padrao de 150 mil
sem-tmp: falhas: 1 | sem onde gravar a marca, cala em vez de avisar a cada ferramenta
sanitiza: falhas: 2 | session_id com barra ainda avisa; a marca troca o que nao e nome por _ e
fica no TMPDIR
numbers: falhas: 1 | campo nulo ou que nao e numero conta 0, e message estranha nao derruba
message-objeto: falhas: 1 | campo nulo ou que nao e numero conta 0, e message estranha nao derruba
fromjson: falhas: 1 | linha pela metade no fim e ignorada; vale a ultima entrada valida
um-campo: falhas: 18 | acima avisa no PostToolUse, com o evento do payload; o aviso traz a soma
dos tres campos e o limiar; o aviso diz o que pedir ao Joao; o aviso cria a marca da sessao;
acima avisa no UserPromptSubmit, com o evento do payload; a travessia seguinte avisa de novo;
outra sessao acima avisa: a marca e por sessao; linha pela metade no fim e ignorada; vale a
ultima entrada valida; preparo da sintetica: acima avisa e cria a marca; a sintetica nao rearma:
a marca continua; preparo da cauda: acima avisa e cria a marca; falta de medicao nao rearma: a
marca continua; LOTUS_CONTEXTO_LIMIAR troca o limiar; a medicao depois do compact_boundary conta;
session_id com barra ainda avisa; a marca troca o que nao e nome por _ e fica no TMPDIR; campo
nulo ou que nao e numero conta 0, e message estranha nao derruba; transcript_path com espaco e
lido
cauda: falhas: 1 | a leitura e so da cauda: a entrada alem de 200 linhas nao conta
evento-fixo: falhas: 1 | acima avisa no UserPromptSubmit, com o evento do payload
sem-systemMessage: falhas: 6 | systemMessage leva ao Joao o mesmo texto do additionalContext; a
travessia seguinte avisa de novo; linha pela metade no fim e ignorada; vale a ultima entrada
valida; LOTUS_CONTEXTO_LIMIAR troca o limiar; a medicao depois do compact_boundary conta; campo
nulo ou que nao e numero conta 0, e message estranha nao derruba
sem-PostToolUse: falhas: 1 | settings.json liga o sinal-contexto.sh em PostToolUse, uma vez e sem
filtro de ferramenta
sem-UserPromptSubmit: falhas: 1 | settings.json liga o sinal-contexto.sh em UserPromptSubmit, uma
vez e sem filtro de ferramenta
mutantes sem teste que reprove: 0 de 22
```

## Re-rodada após a revisão final

Data: 2026-10-04. Medido sobre o `HEAD` `9729f16e` mais as três correções desta onda, antes do
commit que as grava (o SHA do commit está no log da branch, `fix(37): ...`).

O que mudou:

- **I1.** O teste ganhou `unset LOTUS_CONTEXTO_LIMIAR` logo depois da trava de avulso. A sessão do
  DoD 2 abre com `LOTUS_CONTEXTO_LIMIAR=20000 claude` e o Bash dela herda a variável; sem o
  `unset`, seis asserções falhavam. Os casos do item 13 passam a variável por comando.
- **M1.** Os casos `abc` e `0` do item 13 mediam 25000, abaixo do padrão, e por isso "cai no
  padrão" e "fica mudo" davam a mesma saída. Agora medem 160000 e exigem o aviso com
  `acima de 150 mil`.
- **M2.** O comentário do hook atribuía o atraso de uma chamada à gravação assíncrona do
  transcript; passou a dar a causa da spec: a resposta e o resultado da ferramenta só entram no
  prompt da chamada seguinte.

Placar da suíte, `bash .claude/tests/run-all.sh`:

```
LOTUS_CONTEXTO_LIMIAR=20000, antes do unset:  FALHOU: 6 asercao(oes)
LOTUS_CONTEXTO_LIMIAR=20000, depois:          OK: 18 arquivo(s) de teste, nenhuma falha
sem a variável:                               OK: 18 arquivo(s) de teste, nenhuma falha
```

Mutante extra do M1: na cópia do hook, a linha do limiar vira
`[[ -z $limiar ]] && limiar=$LIMIAR_PADRAO; [[ $limiar =~ ^[1-9][0-9]*$ ]] || return 0`, de modo
que valor inválido silencia o hook. Antes da correção do teste, o `sinal-contexto.tests.sh` contra
essa cópia deu `falhas: 0` (mutante vivo). Depois:

```
  FALHA limiar que nao e numero cai no padrao de 150 mil
  FALHA limiar zero cai no padrao de 150 mil
falhas: 2
```

Bancada de mutantes da Task 3, mesmo script, contra a árvore corrigida (nenhum trecho deixou de
casar com o comentário novo):

```
mutantes sem teste que reprove: 0 de 22
```
