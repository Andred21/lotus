# Audit — `infra-producao-dns-e-tls` (item 32) — 2026-09-27

> Evidência das DoD da spec
> [`2026-09-27-infra-producao-dns-e-tls-design.md`](../specs/2026-09-27-infra-producao-dns-e-tls-design.md).
> Do `.env` de produção só se registra nome de chave, nunca valor. Escritas na AWS e no host são do
> João; a sessão lê e confere.

## Task 3 — HSTS provado localmente

`nginx:alpine` com o `deploy/nginx/tls.conf` de `09a1bd79` como `default.conf`, certificado
autoassinado em `live/app.lotusotec.cl/`, sem `app` escutando, em 2026-09-27T20:57:31-03:00.
`nginx -t`: `test is successful`.

Desvio do plano: o `nginx -t` resolve o nome do `fastcgi_pass` (`host not found in upstream "app"`),
então o contêiner subiu com `--add-host app:127.0.0.1`. Nada escuta na 9000 do contêiner, e o proxy
devolve 502 do mesmo jeito.

| Pedido | Código | `Strict-Transport-Security` |
|---|---|---|
| `https://…/` | 200 | `max-age=31536000` |
| `https://…/assets/nada` | 404 | `max-age=31536000` |
| `https://…/api/nada` | 502 | `max-age=31536000` — prova o `always` |
| `http://…/x` | 301 | ausente |

Sondas da lição 19 (Task 2): sem `always` → catraca reprova; sem a repetição em `/assets/` →
catraca reprova.

## Task 7 — integração

PR #117 (`infra/32-infra-producao-dns-e-tls`) mesclada pelo João em 2026-09-28T00:35:05Z, merge
`42a50a4d2418d89121ca0d693cdf1bcd5cde5c72`; CI da `main` verde nesse SHA. Suíte do repo 298/298,
`pnpm build` e `pnpm lint` verdes antes da PR.

Espelho rodado pelo João (`--simular`, depois de verdade). A `main` do corporativo leva
`Source-Commit: 42a50a4d2418d89121ca0d693cdf1bcd5cde5c72`.

**X = `a8ba3361d842b9ce9cfee57e0e295fa7c4116a5f`** — o SHA que a Task 10 promove pelo botão.

`gh run list -R Gatika-CL/lotus --commit X`: run `CI` `completed / success`, criado em
2026-09-28T00:53:58Z.

## Task 9 — DNS

Stack `lotus-dns` (us-east-1), repo `Andred21/lotus-site`, PR #21 (merge `581f6c16`, mesclada em
2026-09-28T00:52:58Z). Desvio de ordem: o plano previa o merge depois do deploy; a PR entrou antes.
Sem efeito na zona — o CI do site não publica o stack (o job `deploy` só sobe o site, e foi pulado),
e antes do change set o stack seguia com a última alteração em 2026-09-26 e `app` em NXDOMAIN. O
template executado é o da `main` do site, idêntico ao da PR.

- Proteção ligada pelo João. `describe-stacks`: `UPDATE_COMPLETE	True`.
- Drift: `DETECTION_COMPLETE	IN_SYNC` (2026-09-28T01:10:18Z).
- Portão de base, template vivo contra a `main` do site, sem comentários nem linhas vazias: 15 linhas
  `>`, 0 linhas `<` — o parâmetro `IpDaIntranet`, as duas linhas de `Retain` em `Registros` e o
  RecordSet de `app`.
- Change set criado sem executar: `Registros	Modify	False`, linha única.
- Executado pelo João. `wait stack-update-complete`: `UPDATE_COMPLETE`, `LastUpdatedTime`
  2026-09-28T01:11:31Z; proteção segue `True`.
- `pnpm infra:conferir-zona --pos-delegacao`: `rc=0`, "Nenhuma divergência fora das esperadas";
  `app.lotusotec.cl. A 18.230.53.197` nos dois lados, `sim`; os seis do SES e o `_dmarc` `sim`.
- DoH em 2026-09-27T22:15:15-03:00: `dns.google` A `['18.230.53.197']`, AAAA `[]`;
  `cloudflare-dns.com` A `['18.230.53.197']`.
