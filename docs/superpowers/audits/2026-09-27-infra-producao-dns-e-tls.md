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
