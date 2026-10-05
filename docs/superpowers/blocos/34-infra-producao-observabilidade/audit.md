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
