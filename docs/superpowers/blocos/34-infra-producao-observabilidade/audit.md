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
| RSS do agente | **112.8 MiB** após 12.6 min — portão D14 (~100 MB na spec): **excedido, aceito pelo João** (abaixo) |
| desmonte | instância `terminated`; grupos de `lab` apagados |

**Portão D14 da RSS.** Quatro amostras, de 9.4 a 12.6 min: 114.0, 112.7, 112.8 e 112.8 MiB; pico
(`VmHWM`) 113.8 MiB. O `smaps_rollup` divide a RSS em 28.8 MiB de heap (`Private_Dirty`) e
84.0 MiB de páginas limpas do binário de 180.5 MiB (`Private_Clean`), que o kernel descarta sob
pressão e relê do disco; swap do agente 0. 112.8 MiB são ≈ 118 MB: excede o portão nas duas
unidades. O portão disparou e o bloco parou.
O João decidiu aceitar e seguir. A leitura que embasou a opção recomendada pelo controlador: o
custo fixo de RAM é o heap, e o recuo do host (`systemctl disable --now`) fica no runbook. O
critério da spec "RSS dentro do portão" cede à decisão do João.

## Task 10 — gate da Fase A

Em 2026-10-05, no HEAD `a6e7b43a`.

| Verificação | Resultado |
|---|---|
| `pnpm lint` · `pnpm test` · `pnpm build` | verdes; Test Files 164 passed (164), Tests 1078 passed (1078) |
| `php artisan test` (contêiner da lane) | 5 skipped, 1233 passed (9361 assertions) — linha de base da Task 5 + 4 |
| `pint --test` nos dois arquivos PHP | `PASS` |
| `bash -n` nos quatro scripts | sem saída |
| arquivos da branch desde `77196049` | só os do plano |
| higiene (conta, instância, e-mail) | limpo |

O filtro da higiene isenta também `noreply@anthropic.com`, o trailer de commit dos modelos do plano
(`plano.md`), que não é e-mail de cliente, conta ou pessoa.

Sondas da lição 19, vistas reprovar e restauradas por `cmp`: Task 2 (3), Task 3 (3), Task 4 (4),
Task 5 (2), Task 7 (1).

Os itens 1 e 2 da `## Verificação externa` estão provados nas seções das Tasks 1 e 6. Os itens 3 a
7 só existem depois do merge e do espelho (Fase B).

## Revisão final — correções

Em 2026-10-05. I1 (decisão do João): a imagem de produção liga `zend.exception_ignore_args`, para o
stack trace não gravar o valor dos argumentos. O programa lança uma exceção
dentro de `f("12.345.678-9")` (valor sintético) e imprime o `ini_get` e o `getTraceAsString()`.

Sem o ini:

```
0
#0 Command line code(1): f('12.345.678-9')
#1 {main}
```

Com `docker/php/excecoes.ini` montado em `conf.d/zz-excecoes.ini`:

```
1
#0 Command line code(1): f()
#1 {main}
```

A prova roda na base `php:8.3-fpm-alpine` do estágio `app`, pelo digest, com o ini montado. O build
da imagem inteira não rodou. A catraca `imagem-excecoes.test.ts` amarra o COPY no `Dockerfile.prod`.

## Aceitação — Fase B (spec §5, passos 4 a 9)

Na lane de aceitação `docs/34-infra-producao-observabilidade`, aberta em 2026-10-05.

**Espelho.** `scripts/espelhar-corporativo.sh --simular`: CI de `c5a04213` verde, 1402 arquivos na
árvore filtrada. Publicado pela sessão, com autorização do João: `Gatika-CL/lotus`
`cbb96740..994cf802` (fonte `c5a04213`). CI corporativo do `994cf802`: os sete jobs verdes, `image`
inclusive. Entre os dois espelhos, em `deploy/bin` só entrou `sondar-saude.sh`.

**Passo 4 — reinstalação pelo §7.** Árvore igual ao `upstream/main` em `deploy/bin`, `user-data.sh` e
composes. O `scp` e o `mv` do `sondar-saude.sh` foram do João (o auto mode recusa escrita remota).
Leitura da sessão, `sha256sum` no host igual ao da árvore nos cinco scripts; sonda
`373f65ee…62dd`.

**Passo 5 — botão.** Run `37384019414` em `Gatika-CL/lotus`, SHA `994cf802…`, disparado pela sessão:
`success`, com "O host esta alinhado ao SHA alvo" verde. `releases.jsonl`:
`{"ts":"2026-10-05T22:42:20Z","evento":"fim","sha":"994cf802…","resultado":"ok"}`.
`GET https://app.lotusotec.cl/up` → 200. `app`, `scheduler`, `nginx` e `clamav` em `:994cf802…`.

**Antes do reparo** (lido em 2026-10-05, depois do deploy):

| Leitura | Valor |
|---|---|
| Docker `ActiveEnterTimestamp` | `Sat 2026-09-19 19:59:55 UTC` |
| `lotus-app-1` | `2026-10-05T22:42:12.629903601Z` |
| `lotus-nginx-1` | `2026-10-05T22:42:12.833533542Z` |
| `lotus-scheduler-1` | `2026-10-05T22:42:13.349421627Z` |
| `lotus-clamav-1` | `2026-10-05T22:41:57.838446402Z` |
| `lotus-mysql-1` | `2026-10-04T20:44:24.353804659Z` |
| `lotus-gotenberg-1` | `2026-09-25T02:42:22.573683441Z` |
| agente, timer | `inactive`, `inactive` |
| `user-data.sh` | sha256 `b86fd5d6…93eb`, igual ao `upstream/main`, `AMBIENTE=prod` |

**Passo 6 — reparo pelo `user-data.sh` (§14.2).** O `scp` e o `sudo bash` foram do João: sha256 no
host `b86fd5d6…93eb`, `rc=0`, `/tmp/user-data.sh` removido. O log mostra a primeira instalação em
prod: `dpkg -i` do agente `1.300073.2b1889-1`, `fetch-config` com as duas fases de validação, e
`enable --now lotus-sonda.timer`. Leitura da sessão às 22:48 UTC:

| Leitura | Valor |
|---|---|
| Docker `ActiveEnterTimestamp` | `Sat 2026-09-19 19:59:55 UTC`, **igual** |
| `StartedAt` dos seis contêineres | **iguais** aos de antes, um a um |
| agente, timer | `active`, `active`; agente desde `22:45:39 UTC` |
| `AccessDenied` no log do agente | 0 |
| `/var/log/lotus/sonda.log` | `{"ts":"2026-10-05T22:48:00Z","up":1,"http":200,"cert_dias":82}` |
| `/lotus/prod/containers` | 6 streams, um por contêiner (`<instancia>__var_lib_docker_containers_…-json.log`) |
| `/lotus/prod/sonda` | as linhas de 22:46, 22:47 e 22:48, iguais às do arquivo |
| `Lotus/Host`, `Ambiente=prod` | `disk_used_percent` (`fstype=ext4`, `path=/`), `mem_used_percent`, `swap_used_percent` |
| `Lotus/Sonda` | `Up`, `CertDias`, `Http5xx` |

**Passo 7 — alarmes (§14.3).** Assinatura do `lotus-alertas` lida pela sessão: um `email`,
confirmado (ARN, sem `PendingConfirmation`). `AWS_PROFILE=lotus deploy/aws/criar-observabilidade.sh
alarmes` rodado pelo João às 23:00 UTC, readback colado, igual à tabela §4.4 da spec:

| Alarme | Métrica | Estatística, período | Limiar | M de N | Falta de dado | Ações ALARM/OK |
|---|---|---|---|---|---|---|
| `lotus-prod-up` | `Lotus/Sonda` `Up` | `Minimum`, 60 | `< 1` | 3 de 5 | `breaching` | 1/1 |
| `lotus-prod-5xx` | `Lotus/Sonda` `Http5xx` | `Sum`, 300 | `≥ 5` | 1 de 1 | `notBreaching` | 1/1 |
| `lotus-prod-disco` | `Lotus/Host` `disk_used_percent` (`Ambiente=prod`, `fstype=ext4`, `path=/`) | `Maximum`, 300 | `> 80` | 2 de 2 | `ignore` | 1/1 |
| `lotus-prod-certificado` | `Lotus/Sonda` `CertDias` | `Minimum`, 300 | `< 21` | 1 de 1 | `ignore` | 1/1 |

Os quatro nasceram em `INSUFFICIENT_DATA` (23:00:16 a 23:00:18 UTC), com as ações ligadas.

Leitura da sessão, primeira transição de cada um:

| Alarme | `OK` em (UTC) | Motivo |
|---|---|---|
| `lotus-prod-5xx` | 23:00:44 | `[0.0 (22:55)]` não ≥ 5 |
| `lotus-prod-certificado` | 23:00:56 | `[82.0 (22:55)]` não < 21 |
| `lotus-prod-up` | 23:01:27 | 5 de 5 em `1.0` (22:56 a 23:00) |
| `lotus-prod-disco` | 23:01:48 | `[69.64 (22:56), 69.64 (22:51)]` não > 80 |

Às 23:11:21 UTC, 11 min depois da criação, os quatro seguem em `OK`. O histórico de `StateUpdate`
desde 22:59 UTC tem só as quatro transições `INSUFFICIENT_DATA` → `OK` acima, sem oscilação. Os
passos 4 a 7 estão concluídos; os passos 8 (janela de sondas, §14.4) e 9 (custo) seguem pendentes.

**Passo 8 — janela de sondas (§14.4).** Início em 2026-10-05 23:41:02 UTC (20:41 em Santiago, fora
do horário comercial). Escritas no host do João; leitura dos alarmes da sessão.

*Sonda A, `/up` e 5xx.* `docker stop` do `app` às 23:41:02 UTC.

| Alarme | `ALARM` em (UTC) | Motivo |
|---|---|---|
| `lotus-prod-5xx` | 23:43:44 | `[5.0 (23:38)]` ≥ 5 |
| `lotus-prod-up` | 23:45:27 | 3 de 5 em `0.0` (23:42, 23:43, 23:44) |

E-mails de `ALARM` dos dois: recebidos pelo João (capturas coladas na sessão), às 23:43:44 e às
23:45:27 UTC, com as ações `OK` e `ALARM` em `lotus-alertas`. `docker start` do `app` às
00:05:14 UTC (lido no `journalctl` do `sudo`, `pts/0`, o mesmo terminal do `stop`). O app ficou
parado por 24 min, não pelos ~6 do runbook: a espera passou do aviso de `ALARM`. A sonda voltou a
`{"up":1,"http":200}` às 00:06:00 UTC, e o `GET /up` respondeu 200.

| Alarme | `OK` em (UTC) | Motivo |
|---|---|---|
| `lotus-prod-up` | 00:09:27 | 3 de 5 em `1.0` (00:06, 00:07, 00:08) |
| `lotus-prod-5xx` | 00:10:44 | `[3.0 (00:05)]` não ≥ 5 |

`Http5xx` por período de 5 min (soma): 0 até 23:35, 14 · 21 · 22 · 21 · 22 de 23:40 a 00:00, 3 em
00:05, 0 em 00:10. E-mail de `OK` do `lotus-prod-up` (00:09:27) recebido pelo João, captura colada.
E-mail de `OK` do `lotus-prod-5xx` (00:10:44, `ALARM -> OK`) recebido pelo João, captura colada.
A sonda A fecha com os quatro e-mails: `ALARM` e `OK` de cada um dos dois alarmes.

*Sonda B, disco.* `fallocate` de `/var/tmp/lotus-sonda-disco` às 00:11:32 UTC; `df -h /` em 83%
(19G, 16G usados, 3.3G livres; o `df` arredonda para cima o alvo de 82%).

| Alarme | `ALARM` em (UTC) | Motivo |
|---|---|---|
| `lotus-prod-disco` | 00:17:48 | 2 de 2: `[82.00 (00:12), 82.00 (00:07)]` > 80 |

`fallocate` de 2429166059 bytes (00:11:32 UTC) e `rm -f` às 00:19:26 UTC, lidos no `journalctl` do
`sudo`; o arquivo não existe mais, e o `df -h /` voltou a 70% (13G usados, 5.6G livres). Disco a
82% por 7 min 54 s.
E-mail de `ALARM` do `lotus-prod-disco` (00:17:48, `OK -> ALARM`, dimensões `path=/`,
`Ambiente=prod`, `fstype=ext4`) recebido pelo João, captura colada.

| Alarme | `OK` em (UTC) | Motivo |
|---|---|---|
| `lotus-prod-disco` | 00:24:48 | 1 de 2: `[69.65 (00:19)]` não > 80 |

*Sonda C, certificado.* Certificado de teste de 1 dia (`CN=sonda-certificado`, EC P-256) gerado no
host às 00:25:09 UTC, e uma rodada da sonda com `LOTUS_SONDA_CERT_ARQUIVO` apontando para ele:
`{"ts":"2026-10-06T00:25:10Z","up":1,"http":200,"cert_dias":0}`. Chave e certificado de teste
apagados em seguida; o certificado servido não mudou.
E-mail de `OK` do `lotus-prod-disco` (00:24:48, `ALARM -> OK`, `[69.65 (00:19)]`) recebido pelo
João, captura colada. A sonda B fecha com os dois e-mails, `ALARM` e `OK`.

| Alarme | `ALARM` em (UTC) | Motivo |
|---|---|---|
| `lotus-prod-certificado` | 00:26:56 | `[0.0 (00:21)]` < 21 |

E-mail de `ALARM` do `lotus-prod-certificado` (00:26:56, `OK -> ALARM`) recebido pelo João, captura
colada.

| Alarme | `OK` em (UTC) | Motivo |
|---|---|---|
| `lotus-prod-certificado` | 00:31:56 | `[81.0 (00:26)]` não < 21 (o dia virou à meia-noite UTC: 82 passou a 81) |

*Histórico da janela* (`describe-alarm-history`, `StateUpdate` desde 23:41 UTC): oito transições,
`ALARM` e `OK` de cada alarme, nenhuma outra.

| UTC | Alarme | Transição |
|---|---|---|
| 23:43:44 | `lotus-prod-5xx` | `OK` → `ALARM` |
| 23:45:27 | `lotus-prod-up` | `OK` → `ALARM` |
| 00:09:27 | `lotus-prod-up` | `ALARM` → `OK` |
| 00:10:44 | `lotus-prod-5xx` | `ALARM` → `OK` |
| 00:17:48 | `lotus-prod-disco` | `OK` → `ALARM` |
| 00:24:48 | `lotus-prod-disco` | `ALARM` → `OK` |
| 00:26:56 | `lotus-prod-certificado` | `OK` → `ALARM` |
| 00:31:56 | `lotus-prod-certificado` | `ALARM` → `OK` |

Fim da janela às 00:32 UTC: os quatro em `OK`, com as ações ligadas.

E-mail de `OK` do `lotus-prod-certificado` (00:31:56, `ALARM -> OK`, `[81.0 (00:26)]`) recebido pelo
João, captura colada. A janela fecha com os oito e-mails: `ALARM` e `OK` de cada um dos quatro
alarmes. O passo 8 está concluído; o passo 9 (custo) segue pendente.
