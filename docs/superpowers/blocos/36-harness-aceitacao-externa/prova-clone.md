# Prova em clone descartável — bloco 36 (DoD 3)

Data: 2026-10-04. Ponta do 36 provada: `df228dce` — o segundo pai do merge
`6272945b prova: ponta do 36 na main do clone`, conferido com `git rev-parse --short 6272945b^2`
no bare do clone.

O João rodou o preparo, as sessões e o merge simulado em `$S=/tmp/lotus-prova-36.hDg2vZ`. O
`origin` do clone era o bare `$S/origin.git`: nenhum push saiu da máquina. A sessão da lane 36
leu a evidência e os transcripts e gravou este registro.

## 1. Comandos

Preparo (Step 1), no terminal do João:

```bash
S=$(mktemp -d /tmp/lotus-prova-36.XXXXXX)
git clone -q /home/jvbat/projetos/lotus "$S/lotus"
git init -q --bare "$S/origin.git"
cd "$S/lotus"
git rev-parse --short origin/chore/36-harness-aceitacao-externa
git merge -q --no-ff origin/chore/36-harness-aceitacao-externa -m "prova: ponta do 36 na main do clone"
cat >> docs/superpowers/backlog.md <<'EOF'
<ficha 99 `demo-aceitacao`, DoD: `grep -c 'prova da aceitacao externa' docs/demo-aceitacao.md` sai `1`>
EOF
git add docs/superpowers/backlog.md
git commit -qm "prova: ficha 99 no clone"
git remote set-url origin "$S/origin.git"
git push -q origin main
git fetch -q --prune origin
git config --get core.hooksPath || echo 'sem hooksPath'
LANE_PNPM=true bash .claude/scripts/lane.sh abrir 99 chore demo-aceitacao
```

Bloco 99 semeado em `ready_for_closure` (Step 2), na lane 99 do clone:

```bash
cd "$S/lotus-99-demo-aceitacao"
P=docs/superpowers/blocos/99-demo-aceitacao
printf 'prova da aceitacao externa\n' > docs/demo-aceitacao.md
cat > "$P/spec.md" <<'EOF'
# Bloco 99 — `demo-aceitacao` (spec)

Só no clone descartável da prova do item 36.

## Verificação externa

1. A produção responde no `/up`.
   - prova: `producao GET /up -> 200`
2. O João confere que a produção abre no navegador.
   - prova: nenhuma
EOF
printf '# Bloco 99 — plano\n\n...\n' > "$P/plano.md"
printf '# Bloco 99 — revisão\n\n## Em aberto\n\nNenhum achado.\n' > "$P/revisao.md"
sed -i -E <workflow_state ready_for_closure, active_* preenchidos, efeito_externo sim> "$P/estado.md"
bash .claude/scripts/aceitacao.sh gerar 99
git add docs/demo-aceitacao.md "$P/spec.md" "$P/plano.md" "$P/revisao.md" "$P/estado.md" "$P/aceitacao.md"
git commit -qm "prova: bloco 99 semeado em ready_for_closure"
```

Sessões: `/finalizar-bloco 99` na lane 99 (Step 3), merge simulado (Step 4, abaixo),
`/finalizar-bloco 99` no main tree do clone para o Pós-PR (Step 5) e `/finalizar-bloco 99` de
novo, em sessão nova, para a aceitação (Step 6).

Merge simulado (Step 4), no main tree do clone:

```bash
cd "$S/lotus"
git fetch -q origin
git merge -q --no-ff origin/chore/99-demo-aceitacao -m "prova: merge simulado da 99"
git push -q origin main
```

## 2. Evidência

Grafo do bare (`git -C "$S/origin.git" log --all --graph --oneline`, recortado):

```
* 29c8dc83 chore(close): item 99 aceito
* c42c3c42 chore(99): abre a lane de aceitação
*   b1db33d8 prova: merge simulado da 99
|\
| * bf8fae64 chore(close): item 99 aguarda aceitação
| * 16aed7ad prova: bloco 99 semeado em ready_for_closure
| * d3c69c1e chore(99): abre a lane demo-aceitacao
|/
* 93aa7061 prova: ficha 99 no clone
*   6272945b prova: ponta do 36 na main do clone
|\
| * df228dce docs(36): Passo 5 do finalizar-bloco ressalva a lane de aceitação
```

Refs do bare: `main b1db33d8`, `chore/99-demo-aceitacao bf8fae64`,
`docs/99-demo-aceitacao 29c8dc83`.

O `estado.md` do bloco 99, commit a commit:

| Commit | `workflow_state` | `next_action` | Outros campos |
|---|---|---|---|
| `d3c69c1e` | `planning` | `continue_active_planning` | `branch: chore/99-demo-aceitacao` |
| `16aed7ad` | `ready_for_closure` | `close_active_work_item` | `efeito_externo: sim` |
| `bf8fae64` | `blocked` | `"resolve_blocker aguardando aceitação: itens 2"` | `resume_state: ready_for_closure`, `blocker: "aguardando aceitação depois do merge: itens 2 da ## Verificação externa"` |
| `c42c3c42` | `ready_for_closure` | `close_active_work_item aceitacao externa` | `branch: docs/99-demo-aceitacao`, `lane_base: b1db33d8`, nota `Reaberto em 2026-10-04 pelo lane.sh aceitar` |
| `29c8dc83` | `closed` | `none` | `commit: c42c3c42` |

O `aceitacao.md`, nas linhas da tabela:

```
16aed7ad  | 1 | A produção responde no `/up`. | `producao GET /up -> 200` |  |  |
          | 2 | O João confere que a produção abre no navegador. | manual |  |  |
bf8fae64  | 1 | ... | `200`, esperado `200`: OK | 2026-10-04 |
          | 2 | ... | manual |  |  |
29c8dc83  | 2 | ... | manual | producao abriu no navegador | 2026-10-04 |
```

`backlog.md`: o `bf8fae64` põe `| **99** \`demo-aceitacao\` | 2 | 2026-10-04 |` em
`## Aguardando aceitação` e deixa a ficha; o `29c8dc83` tira as duas. `historico/progress.md`: o
`bf8fae64` cria a linha do 99 como `Mesclado, aguardando aceitação`; o `29c8dc83` a reescreve como
`Entregue`, com `Aceito em 2026-10-04`, sem linha nova.

Transcripts das sessões do clone (`grep -rhoE … ~/.claude/projects/-tmp-lotus-prova-36-*`),
só as linhas de saída de script — as demais ocorrências são o texto do próprio command:

```
      6 MEDIDO 1: GET https://app.lotusotec.cl/up -> 200, esperado 200: OK
      4 ACEITACAO PENDENTE: 1 de 2 item(ns): 2
      2 ACEITACAO OK: 2 item(ns)
      2 LANE ABERTA: docs/99-demo-aceitacao em /tmp/lotus-prova-36.hDg2vZ/lotus-99-demo-aceitacao
      2 LANE FECHADA: chore/99-demo-aceitacao, arvore /tmp/lotus-prova-36.hDg2vZ/lotus-99-demo-aceitacao removida
```

Repositório real, depois da prova:

```bash
git branch -a --list '*99*'           # vazio
git ls-remote --heads origin '*99*'   # vazio
```

## 3. O que divergiu do esperado

- **Step 6 em duas sessões, com o `aceitacao.md` malformado no meio.** A sessão do main tree
  rodou o `aceitar`, entrou na lane pelo `EnterWorktree` e parou no 6a com
  `ACEITACAO PENDENTE: 1 de 2 item(ns): 2`. O João tentou preencher o item 2 à mão. A edição
  prefixou cada linha do arquivo com a linha do item 2 e colou as linhas umas nas outras. Ele
  então abriu um `/finalizar-bloco 99` novo, já na lane de aceitação. Essa sessão reconheceu o
  modo Normal da lane de aceitação e parou no 6a **antes** do `conferir`. Mostrou o arquivo
  quebrado e perguntou se `producao abriu no navegador` era a palavra do João. Com a
  confirmação, ela fez o `git restore`, preencheu só a linha 2, e o `conferir` deu
  `ACEITACAO OK: 2 item(ns)`. O command pede o `conferir` "nesta mesma sessão"; a sessão nova
  retomou pelo `estado.md` sem perder nada. Se o `conferir` tivesse rodado sobre o arquivo
  quebrado, o `ler_tabela` do `aceitacao.py` recusaria a linha `| 2 |` com mais de cinco
  colunas como `PORTAO RECUSOU`, sem escrever. Isso foi lido no código, não rodado.
- **`gh` sem GitHub**, no Step 3 e no Step 6. O push foi para o bare e o `gh pr create` falhou
  com `none of the git remotes configured for this repository point to a known GitHub host`. É
  o esperado.
- **Rotação do `historico/progress.md`** no `bf8fae64`: com a linha nova do 99, a mais antiga
  (2026-09-20, Infra) desceu para o `progress-archive.md`. É comportamento do `/finalizar-bloco`
  que já existia antes do 36, não divergência.
- A lane de aceitação `docs/99-demo-aceitacao` ficou sem merge e sem Pós-PR. O roteiro da prova
  termina no Passo 7 do fechamento aceito, e o clone foi descartado.
