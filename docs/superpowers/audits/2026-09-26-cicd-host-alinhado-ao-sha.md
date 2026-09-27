# Audit — `cicd-host-alinhado-ao-sha` (item 31) — 2026-09-26

> Evidência das DoD da spec
> [`2026-09-26-cicd-host-alinhado-ao-sha-design.md`](../specs/archive/2026-09-26-cicd-host-alinhado-ao-sha-design.md).
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

## Task 8 — verde ao vivo (DoD 5 e 6)

**Reinstalação (o João, pela §7).** Árvore: o worktree, com `deploy/bin`, compose, overlay e
`tls.conf` iguais a `origin/main` (`fe6077df4249c0b1ec0f392732e6e16faa6962e2`). Foram reinstalados os
três `deploy/bin/*.sh` (`scp` para `/tmp`, `sudo mv` para `/opt/lotus/bin/`, `chmod +x` feito com
`sudo sh -c`: o glob expandido pelo `ubuntu` não enxerga `/opt/lotus/bin`). Só o `deploy.sh` mudou de
conteúdo; `backup-db.sh` e `verificar-backup.sh` voltaram com o mesmo hash. Dono dos três no host:
`ubuntu:ubuntu`, modo `755`.

**Conferência pré-botão.** Leitura do host (heredoc `LEITURA`, lido pelo João em 19:07Z) contra
`git archive origin/main` como alvo e como `main`:

| Caminho no host | sha256 (12 primeiros) |
|---|---|
| `docker-compose.prod.yml` | `734d2892b423` |
| `docker-compose.prod-tls.yml` | `f3b1d0b86e70` |
| `nginx/tls.conf` | `4e9a76e87d84` |
| `bin/backup-db.sh` | `4d28a5273788` |
| `bin/deploy.sh` | `84b2e1cbe6ad` (era `72fb8b358b52`) |
| `bin/verificar-backup.sh` | `f5f6a2a6ca3e` |

Chaves no `.env`: 40. Saída do script: `host alinhado ao SHA alvo`, `saida=0`.

**Botão.** O João apertou com `3abd81364ac6946d9bfea38725a9f53f578c5068` e `PROMOVER`:
[run 36265032582](https://github.com/Gatika-CL/lotus/actions/runs/36265032582),
2026-09-26T19:08:58Z, conclusão `success`; todos os passos `success`, inclusive
`O host esta alinhado ao SHA alvo` e `deploy.sh no host, por SSM`. No log:

```
host alinhado ao SHA alvo
==> DEPLOY OK: 3abd81364ac6946d9bfea38725a9f53f578c5068
estado final: Success
```

**Host depois** (lido pelo João):

```
{"ts":"2026-09-26T19:09:37Z","evento":"inicio","sha":"3abd81364ac6946d9bfea38725a9f53f578c5068","sha_anterior":"df30a6bdfbbf26f3b9fa9397eaeb9ff6071eb523","migrations":[],"schema_a_frente":[],"dump":null,"ator":"github:36265032582:Andred21"}
{"ts":"2026-09-26T19:10:09Z","evento":"fim","sha":"3abd81364ac6946d9bfea38725a9f53f578c5068","resultado":"ok","etapa":"ok"}
```

- `CURRENT_SHA`: `3abd81364ac6946d9bfea38725a9f53f578c5068`.
- `grep -c LOTUS_RELEASE_OWNER /opt/lotus/bin/deploy.sh`: `0`.
- `curl http://18.230.53.197/up`: `200` (lido pela sessão).

**P-86, ramo (b).** A linha `inicio` traz `"migrations":[]` e `"dump":null`, como a previsão da Task 6.
A P-86 fica aberta com nota datada: o release `3abd8136…` não tinha migration nova; o dump segue sem
deploy real.

## Revisão final da execução (antes do review formal)

Revisão da branch inteira (`e5ac01a9..88faa23d`) no modelo mais capaz: nenhum Critical; código
fecha em falha, nenhum valor do `.env` sai do host, `inputs.sha` não chega a shell sem validação,
sem escape. Um Important, corrigido em `f9715829`: o §7 do runbook mandava conferir os scripts
contra `origin/main` (o pessoal), mas o botão lê a `main` do corporativo — agora
`git diff --quiet upstream/main -- deploy/bin`.

Aceitos pelo João em 2026-09-26, sem mexer no código provado ao vivo (todos falham fechado), para o
review formal triar:

- m1: glob sem match em `deploy/bin/*.sh` da `main` vira `bin/*.sh sem referencia`.
- m2: listagem inexistente é reportada como marcador ausente.
- m3: `bin/` vazio no host não é sinalizado à parte (sai `bin/<x>.sh ausente` por script).
- a leitura que termina em `Failed` não mostra o stderr do host (`deploy.yml`, gate da leitura).
- `.env` ausente no host dá `Success` na leitura e ~40 `chave faltando:`, em vez de `.env ausente`.
- `--timeout-seconds 60` é prazo de entrega do SSM, não de execução (o orçamento de 90 s limita).
- o teste de razão de orçamento em `workflow-deploy.test.ts` não soma `ORCAMENTO_LEITURA`.
- valor multilinha entre aspas no `.env` poderia emitir um nome espúrio (nunca o valor).
