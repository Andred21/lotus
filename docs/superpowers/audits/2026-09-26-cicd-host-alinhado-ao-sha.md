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

## Task 7 — vermelho ao vivo (DoD 4)

O João apertou o botão com `3abd81364ac6946d9bfea38725a9f53f578c5068` e `PROMOVER`, sem reinstalar
nada antes: [run 36264643022](https://github.com/Gatika-CL/lotus/actions/runs/36264643022),
2026-09-26T19:02:19Z, conclusão `failure`.

| Passo | Conclusão |
|---|---|
| Formato do SHA e confirmacao | success |
| O SHA esta na main deste repositorio | success |
| O CI daquele SHA terminou verde | success |
| O trio existe no GHCR | success |
| configure-aws-credentials | success |
| Quem eu sou na AWS | success |
| Checkout do SHA alvo | success |
| Checkout da main | success |
| O host esta alinhado ao SHA alvo | **failure** |
| deploy.sh no host, por SSM | **skipped** |

Linhas de divergência no log (`--log-failed`), sem nenhuma chave nem valor do `.env`:

```
bin/deploy.sh diferente
erro: o host diverge do que o SHA alvo pressupoe. Instale pelo runbook (deploy/aws/README.md, secao 7) e promova de novo.
```

A leitura do host terminou em `Success` (o gate da leitura passou). A única divergência é a mesma
do ensaio da Task 4.

Linha de base do host, lida pelo João com `-i ~/.ssh/lotus-prod.pem` (o auto mode barra o SSH da
sessão), antes e depois do run — idênticas:

| | Antes | Depois |
|---|---|---|
| `wc -l releases.jsonl` | 14 | 14 |
| última linha | `{"ts":"2026-09-26T08:48:12Z","evento":"fim","sha":"df30a6bd…","resultado":"ok","etapa":"ok"}` | idem |
| `CURRENT_SHA` | `df30a6bdfbbf26f3b9fa9397eaeb9ff6071eb523` | idem |

O botão recusou sem tocar o host: nenhuma linha nova no ledger, o release no ar é o mesmo.
