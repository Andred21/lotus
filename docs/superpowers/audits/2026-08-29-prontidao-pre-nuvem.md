# Evidências — Prontidão pré-nuvem

> Bloco `prontidao-pre-nuvem` · item 20 · lane-b · 2026-08-29 (execução concluída em 2026-08-31)
> Cada seção prova um item do DoD da spec §7. Logs completos das quatro execuções do script ficaram
> no scratchpad da sessão; aqui entra o trecho decisivo de cada um.

## DoD 1 — CI legível: `audit-dev` decide e segura a imagem

| Passo | Run | Resultado |
|---|---|---|
| workflow mudado, lockfile ainda com 7 advisories (**sonda**) | [33267477063](https://github.com/Andred21/lotus/actions/runs/33267477063) | run `failure`, `audit-dev` **failure**, os outros quatro `success` |
| lockfile subido (`brace-expansion`, `minimatch`, `nanoid`, `postcss`) | [33267941728](https://github.com/Andred21/lotus/actions/runs/33267941728) | run `success`, cinco jobs `success` |
| merge em `main` — `push` | [33338885845](https://github.com/Andred21/lotus/actions/runs/33338885845) | sete jobs `success`; `image` com `needs` incluindo `audit-dev` no `ci.yml` de `308edc5020db4d7a47c54d495e61541842f4dd31` |

A sonda é a ordem das tasks (workflow antes do bump), não um commit sintético: o vermelho do
primeiro run é o mesmo vermelho que o `continue-on-error` escondia — agora ele reprova.
`pnpm audit` local depois do bump: `No known vulnerabilities found`; `pnpm install --frozen-lockfile`
passa com o lockfile novo; `package.json` sem diff.

Leitura do `needs` no SHA do merge:

```
$ git show origin/main:.github/workflows/ci.yml | grep -n "needs:"
338:    needs: [backend, frontend, types-drift, audit-prod, audit-dev, procedencia]
```

## DoD 2 — espelho

**Divergência registrada em relação ao plano:** a fonte do espelho é `a304f317d645c52fcec090d6e8eba666bb6bd8b5`,
não o merge da PR 1 (`308edc50…`). Entre a Task 5 e a Task 7 a `main` recebeu os PRs #87 (item 18,
lane-c) e #88 (item 7, lane-a). O script espelha a `main` verde corrente por desenho, e
`308edc50…` é ancestral de `a304f317…` (`git merge-base --is-ancestor`, medido) — o trabalho da
PR 1 está inteiro dentro do espelho. São treze PRs publicados, não os onze do título do plano.

- `origin/main@a304f317d645c52fcec090d6e8eba666bb6bd8b5` → `upstream/main@d0d8db5015296953819d9025d285e9b691487a99`,
  trailer `Source-Commit: a304f317d645c52fcec090d6e8eba666bb6bd8b5`.
- Árvore filtrada (`--simular`): `f2894fe52251b90a17ac0c0567f8e061bd26b496` ·
  `git rev-parse upstream/main^{tree}` = `f2894fe52251b90a17ac0c0567f8e061bd26b496` ✔
- Arquivos: 1298 no espelho, 1577 na origem; raiz sem `.claude/`, `.agents/`, `.githooks/`,
  `docs/`, `CONTRIBUINDO.md`, `CLAUDE.md`. `scripts/provar-release.sh` e
  `frontend/tests/provar-release.test.ts` presentes; `scripts/espelhar-corporativo.sh` e
  `frontend/tests/repo-docs-refs.test.ts` ausentes (ambos na exclusão).
- CI corporativo: [33447147016](https://github.com/Gatika-CL/lotus/actions/runs/33447147016) —
  sete jobs `success`; `procedencia` `success` com
  `release de espelho. Fonte: Andred21/lotus@a304f317d645c52fcec090d6e8eba666bb6bd8b5 (identical em relacao a main de Andred21/lotus).`;
  `image` `success`.

## DoD 3 — release provado

Três execuções de `scripts/provar-release.sh`, todas `exit 0`, todas com
`docker compose -p lotus-release ps` vazio depois:

| Par | SHA | `app` digest | `web` digest | `/up` |
|---|---|---|---|---|
| pessoal (público; valida o script antes de qualquer credencial) | `37e0e2d42d88a6e6775d6ef9b3afa17e991dd539` | `sha256:7b575a6e3adc0543e10efe3e20a536088841aed5c47e95e62d00dfc947a04d5b` | `sha256:801d43fa19340226f38347b42f153d30d3ea44dbcf08adad955408a56c7528ce` | 200 |
| corporativo, par pré-existente (2026-08-25; nunca puxado até hoje) | `3d158773e92ee7cd25abe0b03c8464f05d629eb9` | `sha256:5f7cacc027a84c8eba313bb5998b7614c253104bd92671a6bc78dea48a0d9170` | `sha256:f6123b5230fda3deb6d04d2e60da6b07800d850ff5531493b640452ef96b1f83` | 200 |
| corporativo, espelho novo | `d0d8db5015296953819d9025d285e9b691487a99` | `sha256:98b469d47f9c9f5498728193693d979bddb87c787be4cb48b6b2160c3c13798a` | `sha256:666b5a3e6fd60a08aebb673dc158b0bcac86f42bfdca08771bc481fa24cd71e8` | 200 |

Credencial: PAT clássico `read:packages`, criado pelo João em 2026-08-31, no credential store do
Docker desta máquina (`credsStore: desktop.exe`). Antes dele, `docker manifest inspect` dos dois
pacotes corporativos respondia `denied` — medido nesta sessão, imediatamente antes do login.
Sequência executada em cada linha: `manifest inspect` (os dois) → `compose pull` → `run app php
artisan migrate --force` → `up -d --no-build --pull never` → `nginx` `healthy` dentro do limite de
150 s → `GET http://127.0.0.1:8081/up` → ID da imagem do container = ID puxado → `down -v`.

**Quarta execução, com o script corrigido pelo review (2026-08-31).** Q-3 e Q-4 do review
mexeram no caminho de verificação — os `RepoDigests` passaram a ser resolvidos **antes** do
veredito, e a conferência "ID em execução = ID puxado" passou a cobrir `nginx` além de `app` —,
então as três execuções acima provaram um script que já não é o do repositório. Re-execução contra
o SHA do espelho com o script de `4cea61f5`: `exit 0`, `/up` 200, `docker compose -p lotus-release
ps -a` com **0** containers depois, e os **mesmos dois digests** da terceira linha
(`sha256:98b469d4…` / `sha256:666b5a3e…`) — a correção mudou como se verifica, não o que roda.
A stack de dev desta árvore foi parada antes e devolvida a `running` (sete serviços) depois.

**Manejo de portas.** Esta árvore é a de offset +1: a stack de dev dela publica exatamente
`8081` (nginx), `9002`/`9003` (MinIO) e `8026` (Mailpit) — as três portas da sonda. Cada execução
do script foi precedida de `docker compose stop` nesta árvore (não `down`: preserva containers e
volumes) e seguida de `docker compose start`, com os oito serviços conferidos `running` depois.

## DoD 4 — catracas

`pnpm lint`, `pnpm test` (122 arquivos, 686 testes, inclui `compose-prod`, `repo-docs-refs` e o
novo `provar-release`) e `pnpm build` verdes de `frontend/`, medidos em `2d17b63e` antes do merge;
`pnpm install --frozen-lockfile` passa. O job `frontend` repete os três em todo run — verde no
`33338885845` (`main`) e no `33447147016` (corporativo).

## DoD 5 — docs

`CONTRIBUINDO.md` com "Como ler o CI" e "Provar um release"; `.githooks/pre-push` diz cinco gates;
`P-62` emendada em 2026-08-29 (pessoal público, decisão adiada; required checks passam a cinco);
`pendencias/README.md` com o gatilho novo. `state.md`, `backlog.md` e `progress.md` fecham na PR 2.

## O que NÃO foi provado

- Nada de AWS: MySQL, MinIO e Mailpit são os substitutos de dev do overlay.
- A régua de `main` segue compensada (`P-62`); o pessoal segue público.
- O item 12 continua sem host; o que ele herda daqui é a sequência executada e versionada.
