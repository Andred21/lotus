# Prova da catraca — bloco 36 (DoD 1 e 2)

Data: 2026-10-04. HEAD: `f43f04f9`.

## 1. Suíte verde

```bash
bash .claude/tests/run-all.sh | tail -1
```

```
OK: 17 arquivo(s) de teste, nenhuma falha
```

## 2. Vermelho sem a linha do `conferir`, e verde de volta

A cópia de segurança do `finalizar-bloco.md` foi para o scratchpad da sessão (sem `git stash`).

```bash
cp .claude/commands/finalizar-bloco.md <scratchpad>/finalizar-bloco.md.bak
grep -c 'aceitacao.sh conferir' .claude/commands/finalizar-bloco.md
sed -i '/aceitacao.sh conferir/d' .claude/commands/finalizar-bloco.md
bash .claude/tests/run-all.sh | awk -v a=commands. '<placar do plano>'
cp <scratchpad>/finalizar-bloco.md.bak .claude/commands/finalizar-bloco.md
git diff --exit-code .claude/commands/finalizar-bloco.md && echo restaurado
bash .claude/tests/run-all.sh | tail -1
```

Saída real:

```
2
  FALHA o .claude/ real passa na catraca dos commands
          esperado: []
          obtido:   [finalizar-bloco: sem o trecho bash .claude/scripts/aceitacao.sh conferir]
commands.tests.sh: ok=21 falha=1
FALHOU: 1 asercao(oes)
restaurado
OK: 17 arquivo(s) de teste, nenhuma falha
```

O `grep -c` deu `2` (a linha do Passo 3 e a do bloco de código do 6a). Sem elas a catraca
reprova o command com a mensagem `sem o trecho`; restaurado o arquivo, o `git diff` sai limpo e a
suíte volta a `OK`.
