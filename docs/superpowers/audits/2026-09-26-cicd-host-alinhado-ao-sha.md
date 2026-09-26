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
