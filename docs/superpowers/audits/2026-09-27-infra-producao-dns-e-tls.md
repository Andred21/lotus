# Audit — `infra-producao-dns-e-tls` (item 32) — 2026-09-27

> Evidência das DoD da spec
> [`2026-09-27-infra-producao-dns-e-tls-design.md`](../specs/archive/2026-09-27-infra-producao-dns-e-tls-design.md).
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
- Conferência e D-52 fechada no `lotus-site` pela PR #23 (merge `ec1b4172`, 2026-09-28T02:03:40Z):
  `docs/infra/conferencia-zona-2026-09-28.md` e a D-52 em `## Fechados` do backlog de lá. O patch
  saiu desta sessão e o João aplicou e commitou: o hook do harness barra a escrita desta lane na
  árvore `lotus-site-dns`.

## Task 10 — reinstalação, certificado e promoção

- SG `lotus-web` (sa-east-1): `80 80 0.0.0.0/0`, `443 443 0.0.0.0/0`, `22 22 <o /32 do João>`.
  `app.lotusotec.cl` A `['18.230.53.197']`.
- §7 rodado pelo João de `/home/jvbat/projetos/lotus` avançado até `42a50a4d`, com `arvore-igual`
  contra `upstream/main`. Hashes no host iguais aos da árvore: `085e9ecb1bcb tls.conf`,
  `4d28a5273788 backup-db.sh`, `84b2e1cbe6ad deploy.sh`, `ef5cddb672df recarregar-nginx.sh`,
  `f5f6a2a6ca3e verificar-backup.sh`.
- `stop nginx` às 2026-09-28T01:23:22Z. Certbot 2.9.0, `certonly --standalone`, conta ACME em
  `contacto@lotusotec.cl`. `certbot certificates`: `app.lotusotec.cl`, chave ECDSA, validade
  2026-12-27 00:27:08+00:00. A primeira tentativa não chegou a rodar: o marcador do e-mail foi colado
  literal e o shell leu o `<` como redirecionamento.
- Botão 1, [run 36365979779](https://github.com/Gatika-CL/lotus/actions/runs/36365979779):
  `host alinhado ao SHA alvo` (01:26:54Z), `DEPLOY OK: a8ba3361…` (01:27:47Z). **Janela de queda:
  01:23:22Z a 01:27:47Z, 4 min 25 s.** O `.env` não tinha sido editado: os cookies saíam sem `secure`
  e sem `domain`.
- `.env` editado pelo João (seis chaves do §11.3, por script `sed`, com backup). Conferência do João no host: `grep -c` = `6`. Backup apagado: `ls -la /opt/lotus/ | grep -c env.antes-item32` = `0`.
- Botão 2, [run 36366375279](https://github.com/Gatika-CL/lotus/actions/runs/36366375279):
  `Failed`, `erro: /up respondeu 502` (01:34:00Z). O `.env` novo fez o compose recriar `app`,
  `scheduler` e `mysql`; o nginx seguiu `Running` e já `healthy`, então o laço de saúde do `deploy.sh`
  passou na hora e o `curl /up` bateu antes do php-fpm novo escutar. Sem queda de fora; o
  `CURRENT_SHA` seguiu X, gravado pelo botão 1. Corrida latente do `deploy.sh` em todo deploy que só
  recria o `app` — proposta de pendência no fechamento.
- Botão 3, [run 36366650213](https://github.com/Gatika-CL/lotus/actions/runs/36366650213):
  `host alinhado ao SHA alvo` (01:37:17Z), `DEPLOY OK: a8ba3361…` (01:37:45Z), `estado final:
  Success`.
- De fora, depois do botão 3: `https://…/up` 200; `/` 200 e `/api/nada` 404, os dois com
  `strict-transport-security: max-age=31536000`; `http://…/x` 301 para `https://app.lotusotec.cl/x`,
  sem HSTS; `http://…/up` 200 (isenção da sonda). Certificado servido: `CN = app.lotusotec.cl`,
  emissor `Let's Encrypt` `YE2`, `notAfter=Dec 27 00:27:08 2026 GMT`. `GET /sanctum/csrf-cookie`:
  `XSRF-TOKEN` e `lotus-session` com `domain=app.lotusotec.cl; secure`, a sessão também `httponly`.

Desvio do plano (registrado no review, Q-4): o §11 não rodou na ordem do runbook. O botão 1 promoveu
com o `.env` ainda na fase sem DNS, e só depois vieram os seis campos: o 11.4 rodou antes do 11.3. De
01:27:47Z (botão 1) até a recriação do `app` pelo botão 2 (~01:34Z), a produção serviu HTTPS com HSTS
e com os cookies sem `Secure` e sem `Domain`. O estado
final é o do runbook e está provado acima; a ordem 11.3 antes do 11.4, a que o runbook manda, não foi
exercida junta.

## Task 11 — renovação

- `certbot reconfigure --cert-name app.lotusotec.cl --webroot -w /opt/lotus/certbot`:
  `Successfully updated configuration.` O `grep` da config de renovação: `authenticator = webroot` e
  `webroot_path = /opt/lotus/certbot,`.
- Hook por symlink em `/etc/letsencrypt/renewal-hooks/deploy/recarregar-nginx.sh`, executado pelo
  João às 2026-09-28T01:42:02Z: `syntax is ok`, `test is successful`, `signal process started`,
  `rc=0`. Sonda de fora, um `curl` por segundo em `https://app.lotusotec.cl/up`: 180 de 180 `200`
  entre 01:41:41Z e 01:45:06Z; 18 de 18 `200` na janela de 10 s antes e depois do reload.
- `certbot renew --dry-run`: `Congratulations, all simulated renewals succeeded:` —
  `/etc/letsencrypt/live/app.lotusotec.cl/fullchain.pem (success)`.
- `systemctl is-active certbot.timer`: `active`.

## Task 12 — provas

De fora, em 2026-09-27T22:43:27-03:00:

| Pedido | Resultado |
|---|---|
| `http://app.lotusotec.cl/inicio` | `HTTP/1.1 301`, `Location: https://app.lotusotec.cl/inicio` |
| `http://app.lotusotec.cl/up` | 200 |
| `https://…/up` | 200, `strict-transport-security: max-age=31536000` |
| `https://…/` | 200, idem |
| `https://…/assets/index-zQmZSrwq.js` | 200, idem |
| `https://…/api/courses/archived` com `Accept: application/json` | 401, idem |
| `https://…/api/courses/archived` sem `Accept` | 500, idem |

Desvio do plano: sem `Accept: application/json`, a rota autenticada devolve 500, não 401 — o
middleware de autenticação tenta redirecionar para a rota `login`, que não existe. É anterior ao
item 32 e alheio a ele (o front sempre manda o `Accept`); o 500 também sai com HSTS, o que prova o
`always` de novo. Proposta de pendência no fechamento.

- Certificado servido: `issuer=C = US, O = Let's Encrypt, CN = YE2`, `subject=CN = app.lotusotec.cl`,
  `DNS:app.lotusotec.cl`, `notBefore=Sep 28 00:27:09 2026 GMT`, `notAfter=Dec 27 00:27:08 2026 GMT`.
- `GET /sanctum/csrf-cookie`, sem os valores:
  `XSRF-TOKEN=…; expires=…; Max-Age=7200; path=/; domain=app.lotusotec.cl; secure; samesite=lax` e
  `lotus-session=…; expires=…; Max-Age=7200; path=/; domain=app.lotusotec.cl; secure; httponly; samesite=lax`.
- Login real do João com o admin, tela autenticada recarregada: ok, 2026-09-27T22:45-03:00.
- QR (D4, DoD 7): **não provado de ponta a ponta.** A produção não tem turma elegível e o histórico
  de certificados está vazio; o João decidiu não criar a cadeia de teste em produção. Provado no
  lugar:
  - Leitura sem escrita no contêiner `app` de produção, feita no review (Q-1): `php artisan tinker
    --execute` com `app(CertificateValidationUrl::class)->base()` devolveu `https://app.lotusotec.cl`
    (2026-09-28T02:27:14Z); no mesmo contêiner, `app()->environment()` = `production` e
    `app()->configurationIsCached()` verdadeiro (02:27:57Z). É o ramo de produção, que recusa chave
    sem `https://`, lendo a config que o entrypoint cacheou — não o `.env` do host.
  - O `CertificatePdfService` monta o QR com `CertificateValidationUrl::para()`, e
    `CertificatePdfTest::test_qr_aponta_para_a_chave_de_validacao_quando_preenchida` prova que o QR do
    PDF carrega `<base>/validar/<uuid>`.
  - `/api/publico/certificados/00000000-0000-4000-8000-000000000000` 404 RFC 7807 (`type`
    `…/errors/not-found`).

  O `https://…/validar/00000000-0000-4000-8000-000000000000` 200 só prova que a SPA é servida em
  https: o `location /` faz `try_files $uri $uri/ /index.html`, e qualquer caminho responde 200. A
  decodificação do QR de um PDF de produção fica para o primeiro certificado real: **P-89**.
