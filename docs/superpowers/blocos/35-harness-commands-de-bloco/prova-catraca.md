# Prova da catraca — bloco 35: verde, vermelho nos dois sentidos, verde de novo

Task 11 do plano do bloco 35. Prova rodada contra o `.claude/` real desta worktree (sem clone),
com cada sentido — quebra, rodada vermelha, restauro, rodada verde — num único comando.

- **Data:** 2026-09-28T07:32:24-03:00
- **HEAD:** f9b7c55b

## 1. Verde, no `.claude/` real

```bash
bash .claude/tests/run-all.sh | tail -1
```

```
OK: 15 arquivo(s) de teste, nenhuma falha
```

## 2. Vermelho ao apagar `Skill(superpowers:brainstorming)` de `planejar-bloco.md`, e verde de volta

```bash
bak=$(mktemp "${TMPDIR:-/tmp}/lotus-prova-35.XXXXXX")
cp .claude/commands/planejar-bloco.md "$bak"
sed -i '/Skill(superpowers:brainstorming)/d' .claude/commands/planejar-bloco.md
bash .claude/tests/run-all.sh | grep -E 'FALHA|sem Skill|^FALHOU|^OK'
cp "$bak" .claude/commands/planejar-bloco.md && rm "$bak"
git diff --exit-code .claude/commands/planejar-bloco.md && bash .claude/tests/run-all.sh | tail -1
```

```
  FALHA /tmp/lotus-hooks-teste.GWhuWl/ruim.sh saiu com codigo 3 (contrato exige 0)
  FALHA o .claude/ real passa na catraca dos commands
          obtido:   [planejar-bloco: sem Skill(superpowers:brainstorming)]
FALHOU: 1 asercao(oes)
OK: 15 arquivo(s) de teste, nenhuma falha
```

A linha `FALHA .../ruim.sh saiu com codigo 3` é o probe esperado de um teste de contrato de hook
sem relação com este (fixture que verifica a detecção de saída não-zero) — não é uma falha contada;
quem decide é a linha `FALHOU`/`OK`. `git diff --exit-code` não imprimiu nada (diff vazio) e o
`&&` seguinte só rodou porque o exit foi 0 — é o "depois do restauro, diff vazio e `OK: …`" do
Expected.

## 3. Vermelho ao apagar `^model:` de `executar-bloco.md`, e verde de volta

```bash
bak=$(mktemp "${TMPDIR:-/tmp}/lotus-prova-35.XXXXXX")
cp .claude/commands/executar-bloco.md "$bak"
sed -i '/^model:/d' .claude/commands/executar-bloco.md
bash .claude/tests/run-all.sh | grep -E 'FALHA|model \[\]|^FALHOU|^OK'
cp "$bak" .claude/commands/executar-bloco.md && rm "$bak"
git diff --exit-code .claude/commands/executar-bloco.md && bash .claude/tests/run-all.sh | tail -1
```

```
  FALHA /tmp/lotus-hooks-teste.TtNPtf/ruim.sh saiu com codigo 3 (contrato exige 0)
  FALHA o .claude/ real passa na catraca dos commands
          obtido:   [executar-bloco: model [], esperado sonnet]
FALHOU: 1 asercao(oes)
OK: 15 arquivo(s) de teste, nenhuma falha
```

Mesmo probe de hook não relacionado na primeira linha; mesma leitura: a contagem é a linha
`FALHOU`/`OK`. Diff vazio de novo (`git diff --exit-code` sem saída) antes do `OK` final.

## Veredito

Os dois sentidos da catraca provados no `.claude/` real, sem `git stash`: falta o literal
`Skill(superpowers:brainstorming)` pega (Step 2), falta o `model:` pega (Step 3), e as duas vezes
o arquivo tocado volta a diff vazio com a suíte inteira verde. `git status --short` limpo depois
das duas rodadas — nenhum dos dois arquivos ficou modificado.
