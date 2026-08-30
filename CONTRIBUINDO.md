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

**1. Trabalho e branch.** Push de branch é livre e **não dispara CI**; abrir a PR
roda os cinco gates (`backend`, `frontend`, `types-drift`, `audit-prod`,
`audit-dev`), e **todos decidem** — ver "Como ler o CI", abaixo.

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

O `procedencia` do lado corporativo **confere esse trailer** contra a origem: o
SHA precisa estar no histórico de `main` em `Andred21/lotus`, senão o commit
não passa por espelho. Quem responde qual é a origem é a variável de
repositório `ESPELHO_FONTE`, configurada só em `Gatika-CL/lotus`:

```bash
gh variable set ESPELHO_FONTE -R Gatika-CL/lotus -b Andred21/lotus
```

Sem ela o caminho de espelho não abre e nenhuma imagem é publicada — é por isso
que ela não existe em `Andred21/lotus`: lá o único caminho continua sendo PR
mesclado.

Duas coisas o script garante antes de deixar qualquer coisa atravessar. A lista
de exclusões que ele aplica sai do **commit espelhado**, não do disco desta
árvore — é a mesma cópia que o `procedencia` lê no destino, e dois leitores em
versões diferentes é exatamente como o espelho vazaria sem ninguém perceber. E
ele **recusa commit que não passou no CI**: espelhar é promover, e o
`procedencia` do destino confere procedência, não qualidade — sozinho, deixaria
um commit vermelho parado em `origin/main` virar imagem publicada.

## A saída de emergência

```bash
LOTUS_FORCA_MAIN=1 git push ...
LOTUS_ESPELHO_SEM_CI=1 scripts/espelhar-corporativo.sh
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
`docs/superpowers/plans/archive/2026-08-24-cicd-ci-governanca-e-artefato.md` entra
como está e passa a ser a camada 0 — a única que impede de verdade.

## Como ler o CI

Um workflow só, `.github/workflows/ci.yml`, com sete jobs e dois gatilhos —
`pull_request` para `main` e `push` em `main`. Nada mais dispara nada: push de
branch sem PR não roda job nenhum.

| Job | Decide o quê | Roda em |
|---|---|---|
| `backend` | `php artisan test` (sqlite `:memory:`) | PR e push |
| `frontend` | `pnpm install --frozen-lockfile`, `lint`, `test`, `build` | PR e push |
| `types-drift` | `generated.ts` é o que `typescript:transform` produz (lei §5.3) | PR e push |
| `audit-prod` | advisory em dependência de **produção** (`composer audit --no-dev`, `pnpm audit --prod`) | PR e push |
| `audit-dev` | advisory em **qualquer** dependência, inclusive de ferramenta | PR e push |
| `procedencia` | o commit entrou por PR mesclado, ou é espelho com `Source-Commit` conferido | só push |
| `image` | constrói e publica `ghcr.io/<repo>-app:<sha>` e `-web:<sha>` | só push em `main`, atrás dos seis |

**Todo job que roda decide.** Em `pull_request` rodam cinco e qualquer vermelho
reprova o run. Em `push` em `main` entra o sexto, `procedencia`, e o `image` só
roda com os seis verdes — **o par de imagens só existe para SHA que passou em
tudo.**

Cor por cor:

- **verde** — o commit pode entrar em `main` (PR) ou virou par publicado (push).
- **vermelho** — bloqueia o merge e, em `main`, segura a imagem. Não existe
  vermelho "informativo": até 2026-08-29 o `audit-dev` rodava em
  `continue-on-error` e pintava o X em todo run sem decidir nada. Acabou, por
  decisão registrada no comentário do job.
- **`cancelled`** numa PR — você fez push novo na mesma PR e o run antigo foi
  cancelado (`concurrency` com `cancel-in-progress`). Não é falha; olhe o run
  mais novo. Em `push` para `main` nada é cancelado, de propósito: um segundo
  push cancelaria a publicação do primeiro no meio.
- **`skipped`** em `image` ou `procedencia` numa PR — esperado; só existem em
  `push`.

`audit-dev` vermelho é advisory em dependência transitiva, quase sempre de
ferramenta. A saída é o bump no lockfile, nunca desligar o check:

```bash
cd frontend
pnpm audit                                    # quem, por qual caminho, corrigido em qual versão
pnpm update <pacote> [<pacote>...]            # só o lockfile muda; package.json fica intacto
pnpm install --frozen-lockfile && pnpm audit  # exatamente o que o CI roda
```

Se a correção exigir versão fora do range declarado em `package.json`, é
decisão sobre a dependência direta — não se resolve com `pnpm.overrides` por
conta própria (D2 do bloco `prontidao-pre-nuvem`).

## Provar um release

`image` verde diz que o par existe no GHCR. Não diz que ele sobe. A prova é
puxar e executar o par **pela mesma sequência que o servidor fará**
(`login → pull → migrate → up → /up`), e ela está versionada:

```bash
scripts/provar-release.sh <sha-de-40-hex>
```

O dono do registry sai do remote `upstream` (`gatika-cl`, em minúsculas, como
o job `image` escreve); `LOTUS_RELEASE_OWNER=andred21` prova o par pessoal. O
script sobe o projeto Compose `lotus-release` com `docker-compose.prod.yml` +
`docker-compose.prod-probe.yml` (MySQL, MinIO e Mailpit de sonda,
`docker/probe.env`) na porta **8081**, com `--no-build` e `--pull never` —
nenhuma `lotus-*:local` é construída; o que roda é o par pedido, e o script
confere o ID da imagem em execução contra o ID puxado. Termina `0` só com o
`nginx` `healthy` e `GET /up` 200; imprime os dois `RepoDigest`; e derruba
tudo com `down -v` ao sair, com sucesso ou sem.

**Credencial.** O pacote corporativo é privado. Leitura pede PAT **clássico**
com escopo `read:packages` (fine-grained não lê GHCR), de usuário com acesso a
`Gatika-CL/lotus`:

```bash
docker login ghcr.io -u <usuario> --password-stdin   # cole o PAT, Enter, Ctrl-D
docker manifest inspect ghcr.io/gatika-cl/lotus-app:<sha> > /dev/null && echo ok
```

O token vive no credential store do Docker desta máquina e **nunca** num
arquivo do repositório. O servidor terá credencial própria, só de leitura.

**Portas.** A sonda ocupa `8081`, `9002` e `8026` — as do offset +1 do
`.env.example`. A árvore que usa esse offset derruba a stack de dev antes;
colisão faz o Compose falhar alto com `port is already allocated`, e o `trap`
limpa o que chegou a subir.
