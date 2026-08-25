# Como o código entra em produção

Três repositórios de destino, um caminho só para cada um. Nada aqui é
preferência de estilo: `Gatika-CL` está no plano free do GitHub, e **branch
protection em repositório privado exige plano pago** (403 no
`PUT /branches/main/protection`, medido em 2026-08-25). Sem régua no servidor,
a régua mora em dois lugares: nesta máquina e no artefato.

## Instalação obrigatória, uma vez por clone

```bash
git config core.hooksPath .githooks
```

Vale para todas as worktrees do clone — a configuração fica no `.git/config`
comum. Sem isso o `pre-push` não roda e você fica sem a camada 1.

## O caminho

```
worktree local  ──push──▶  branch em Andred21/lotus  ──PR──▶  main
                                                                │
                                          espelho filtrado ─────┤
                                                                ▼
                                                       Gatika-CL/lotus
```

**1. Trabalho e branch.** Push de branch é livre; o CI roda os cinco gates no
`pull_request`.

**2. Entrada em `main` (Andred21).** Só por Pull Request mesclado.
O `pre-push` recusa `git push origin main`. Não é bloqueio decorativo: o job
`procedencia` do CI confere no servidor se o commit tem PR mesclado associado
e, se não tiver, **o `image` não roda** — commit que entrou por fora não vira
artefato publicável.

```bash
git push origin HEAD:refs/heads/$(git branch --show-current)
gh pr create --fill
gh pr merge --merge     # roda no servidor, depois dos gates
```

**3. Espelho para `Gatika-CL`.** Nunca com `git push` na mão:

```bash
scripts/espelhar-corporativo.sh --simular   # mostra a árvore que iria
scripts/espelhar-corporativo.sh             # publica
```

O script lê `origin/main`, remove tudo que está em `.espelho-exclusoes`
(`.claude/`, `.agents/`, `docs/` internos, este arquivo) e publica **um commit
por release**, com o trailer `Source-Commit: <sha>` apontando de volta. O
corporativo recebe o que constrói, testa e roda o app — não o andaime de
desenvolvimento.

## A saída de emergência

```bash
LOTUS_FORCA_MAIN=1 git push ...
```

Existe de propósito: hook sem saída vira hook desinstalado no primeiro aperto.
Só que o `procedencia` continua vermelho no servidor e o `image` continua sem
rodar — furar a camada 1 não fura a camada 2.

## O que isto NÃO resolve

- `git push --no-verify` desliga o hook. Contra distração, funciona; contra
  decisão, não.
- Quem clona e não roda o `git config` acima fica sem a camada 1.
- Force-push em `main` não é impedido, só **detectado**: o `procedencia`
  reprova quando o payload traz `forced: true`, e fica datado no histórico de
  runs.

Nada disso é substituto de branch protection. Quando houver orçamento para
GitHub Team, o Step 6 do plano
`docs/superpowers/plans/2026-08-24-cicd-ci-governanca-e-artefato.md` entra
como está e passa a ser a camada 0 — a única que impede de verdade.
