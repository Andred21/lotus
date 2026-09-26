# Audit — `cicd-host-alinhado-ao-sha` (item 31) — 2026-09-26

> Evidência das DoD da spec
> [`2026-09-26-cicd-host-alinhado-ao-sha-design.md`](../specs/2026-09-26-cicd-host-alinhado-ao-sha-design.md).
> Do `.env` só se registra contagem de chaves, nunca nome nem valor.

## Task 4 — ensaio só de leitura

Leitura do host com o heredoc `LEITURA` extraído do `deploy.yml` da branch (`a0446818` em diante),
por `ssh … 'sudo sh -s'`, em 2026-09-26T18:28Z. **Quem rodou foi o João**: o auto mode barrou o `ssh`
de leitura da sessão (`[Production Reads]`), e a chave padrão do `~/.ssh` não entra no host
(`Permission denied (publickey)`) — o João rodou com a chave dele. A saída foi gravada no scratchpad
da sessão, que só a comparou.

| Caminho no host | sha256 (12 primeiros) |
|---|---|
| `docker-compose.prod.yml` | `734d2892b423` |
| `docker-compose.prod-tls.yml` | `f3b1d0b86e70` |
| `nginx/tls.conf` | `4e9a76e87d84` |
| `bin/backup-db.sh` | `4d28a5273788` |
| `bin/deploy.sh` | `72fb8b358b52` |
| `bin/verificar-backup.sh` | `f5f6a2a6ca3e` |

Chaves no `.env`: 40 (o molde de `origin/main` tem 40).

| Referência | Saída do script | Linhas |
|---|---|---|
| `origin/main` (`e5ac01a9`) | 0 | `host alinhado ao SHA alvo` |
| branch (`08497064`) | 1 | `bin/deploy.sh diferente` |

A previsão do plano se confirmou sem linha a mais: o host está alinhado à `main` de onde o João
reinstalou no fechamento do item 12, e a única divergência contra a branch é o `deploy.sh` da Task 1
(dono literal). É o vermelho que a Task 7 tem de ver ao vivo, e o único arquivo que a Task 8 reinstala.

## Task 6 — integração

- Suíte do frontend na branch: 887/887, `pnpm lint` 0, `pnpm build` 0.
- PR [#112](https://github.com/Andred21/lotus/pull/112): `backend`, `frontend`, `types-drift`,
  `audit-prod` e `audit-dev` verdes. Merge `fe6077df` na `main` do pessoal em 2026-09-26T18:35:53Z.
- Espelho (rodado pelo João): commit sintético `3abd81364ac6946d9bfea38725a9f53f578c5068` em
  `Gatika-CL/lotus`, com `Source-Commit: fe6077df4249c0b1ec0f392732e6e16faa6962e2`. Na árvore
  espelhada estão `.github/scripts/conferir-alinhamento.sh`, `.github/workflows/deploy.yml`,
  `deploy/bin/deploy.sh` (com `DONO=gatika-cl`) e `frontend/tests/conferir-alinhamento.test.ts`;
  `docs/README.md` e `frontend/tests/repo-docs-refs.test.ts` ficaram fora (404 na API de conteúdo).
- CI corporativo: [run 36263374915](https://github.com/Gatika-CL/lotus/actions/runs/36263374915),
  `success`, os sete jobs verdes (`backend`, `frontend`, `types-drift`, `audit-prod`, `audit-dev`,
  `procedencia`, `image`). O job `image` publicou `ghcr.io/gatika-cl/lotus-app`, `lotus-web` e
  `lotus-clamav` com a tag `3abd8136…`.
- Previsão da P-86: nenhuma migration nova desde `f79bf993`
  (`git diff --name-only --diff-filter=A f79bf993 origin/main -- backend/database/migrations/` vazio).
  A promoção da Task 8 não faz dump; ramo (b), nota datada.
