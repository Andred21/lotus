# Audit — `infra-producao-observabilidade` (item 34)

Leituras da execução, na ordem do plano. Regras (spec §5): sem número de conta (`<conta>`), sem
InstanceId (`<instancia>`), sem IP de cliente, sem endereço de e-mail, sem valor do `.env`. Leitura
que o auto mode barrou, o João rodou e colou — e a seção diz isso.

## Task 1 — leituras do host de produção (spec §5, passo 1)

Lidas em 2026-10-05 01:43 UTC, pela sessão, com `~/.ssh/lotus-prod.pem`. A host key do servidor
estava no `known_hosts` só sob o EIP, não sob o nome; as leituras usaram `-o HostKeyAlias=<EIP>`,
que confere a mesma chave ed25519 já confiada, sem gravar entrada nova.

| Leitura | Valor |
|---|---|
| `df -h /` | 19G total, 13G usado, **68%** — portão D14 (≥ 75%): passou |
| `findmnt -no FSTYPE /` | **`FSTYPE: ext4`** — vai ao `DISCO` da Task 4 |
| `free -m` | Mem 1835 MiB, 1461 usados; Swap 2047 MiB, 631 usados |
| `docker system df` | imagens 6.929GB (2.55GB recuperável); volumes 393.7MB |
| Docker | `active`, `ActiveEnterTimestamp=Sat 2026-09-19 19:59:55 UTC` |
| agente | `inactive` — ainda não existe |
| `curl https://app.lotusotec.cl/up`, do host | `200 <EIP> 0.058600` → **`HAIRPIN: ok`** |
| certificado servido, do host | `notAfter=Dec 27 00:27:08 2026 GMT` |

Linhas cruas do `json-file` do nginx, filtradas por `GET /up `. O IP da linha do hairpin foi
trocado por `203.0.113.10`; nada mais mudou.

```text
NGINX_200    {"log":"127.0.0.1 - - [05/Oct/2026:01:43:14 +0000] \"GET /up HTTP/1.1\" 200 1832 \"-\" \"Wget\" \"-\"\n","stream":"stdout","time":"2026-10-05T01:43:14.276825915Z"}
NGINX_H2_200 {"log":"203.0.113.10 - - [05/Oct/2026:01:43:27 +0000] \"GET /up HTTP/2.0\" 200 1825 \"-\" \"curl/8.5.0\" \"-\"\n","stream":"stdout","time":"2026-10-05T01:43:27.945738889Z"}
```

## Task 6 — recursos base e lab (spec §5, passos 2 e 3)

Em 2026-10-05 (UTC). Escrita do João; leitura da sessão (`AWS_PROFILE=lotus`), com conta e instância
mascaradas.

**`base prod` e `base lab`** (rodados pelo João, saídas coladas): `rc` 0 nos dois.

| Leitura | Valor |
|---|---|
| inline `lotus-observabilidade` | `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogStreams` em `log-group:/lotus/*` e `…:log-stream:*`; `cloudwatch:PutMetricData` com `cloudwatch:namespace = Lotus/Host` |
| retenção | `/lotus/prod/containers` 30 · `/lotus/prod/sonda` 30 · `/lotus/lab/containers` 1 · `/lotus/lab/sonda` 1 |
| filtros em `prod` | `Up` e `CertDias` sem default; `Http5xx` com default 0 |
| `test-metric-filter` | Up 1/1/0 · CertDias 1/1/0 · 5xx: **regex**, 1/1/0/0 |
| filtros em `lab` | nenhum |

**Lab** (`t4g.small`, Ubuntu 24.04 arm64, `lotus-ec2`, `lotus-web`, IMDSv2 hop 2, `AMBIENTE=lab`):

| Prova | Resultado |
|---|---|
| cloud-init | `status: done` |
| agente, timer, Docker | `active` ×3; `AccessDenied` no log do agente: 0 |
| `ConditionPathExists` | `ConditionResult=no` sem a sonda; `yes` depois do `scp` |
| métricas `Ambiente=lab` | `disk_used_percent` (`Ambiente`, `fstype=ext4`, `path=/`), `mem_used_percent`, `swap_used_percent` |
| `publish_multi_logs` | 2 streams em `/lotus/lab/containers` |
| `from_beginning` default | `PRIMEIRA-LINHA-lab-a` e `PRIMEIRA-LINHA-lab-b` no grupo |
| sonda | `{"ts":"2026-10-05T02:15:00Z","up":1,"http":200,"cert_dias":82}` em `/lotus/lab/sonda` |
| reexecução do user-data | `rc=0`; `ActiveEnterTimestamp` do Docker e do agente e `StartedAt` dos contêineres iguais; 0 `dpkg -i`, 0 `fetch-config`, 0 `Unpacking` |
| RSS do agente | **112.8 MiB** após 12.6 min — portão D14 (~100 MiB): **excedido, aceito pelo João** (abaixo) |
| desmonte | instância `terminated`; grupos de `lab` apagados |

**Portão D14 da RSS.** Quatro amostras, de 9.4 a 12.6 min: 114.0, 112.7, 112.8 e 112.8 MiB; pico
(`VmHWM`) 113.8 MiB. O `smaps_rollup` divide a RSS em 28.8 MiB de heap (`Private_Dirty`) e
84.0 MiB de páginas limpas do binário de 180.5 MiB (`Private_Clean`), que o kernel descarta sob
pressão e relê do disco; swap do agente 0. O portão disparou e o bloco parou. O João decidiu
aceitar e seguir: o custo fixo de RAM é o heap, e o recuo do host (`systemctl disable --now`) fica
no runbook. O critério da spec "RSS dentro do portão" cede a essa decisão.
