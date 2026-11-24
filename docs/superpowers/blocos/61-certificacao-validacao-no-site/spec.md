# Bloco 61 — `certificacao-validacao-no-site` — design

> Data: 2026-11-23 · Lane: `feat/61-certificacao-validacao-no-site` · Packet: [`context.md`](./context.md)
> Ficha: `docs/superpowers/backlog.md` §61 (pedido da Lotus de 2026-11-21, D-70, P-89).

## 1. Intenção

A Lotus quer que a validação de certificado saia do app (`app.lotusotec.cl/validar/<uuid>`) e
passe a viver no site institucional (`lotusotec.cl`). Quem recebe um certificado — empresa
contratante, fiscalização — confere pelo QR ou digitando o código, e baixa o PDF quando ele não
está revogado. O certificado tem peso legal: a conferência tem de ser confiável, e a abertura pública não
pode vazar dado pessoal nem deixar percorrer a base.

O trabalho se divide em três entregas, em sequência. **Este bloco é só a primeira.**

| # | Entrega | Onde | Quando |
|---|---|---|---|
| 1 | **API pública** — consulta por código + RUT, PDF público, limitadores, CORS do site | Lotus, **este bloco (61)** | agora |
| 2 | **Página de validação** em `lotusotec.cl/validar/<uuid>` e com formulário de código + RUT | `Andred21/lotus-site`, bloco próprio pelo harness de lá | depois do 61 em produção |
| 3 | **Virada** — `CERTIFICATE_VALIDATION_URL` para o site, `301` do QR antigo, saída da `ValidationPage`, P-89 | Lotus, ficha nova (63) | depois da página no ar |

A sequência é imposta pelos fatos: a página do site só funciona contra a API nova em produção, e o
`301` não pode mesclar antes da página existir. Num `tls.conf` divergente do host, a checagem de
alinhamento trava o botão de deploy (`deploy/aws/README.md:762`).

## 2. Decisões do João (2026-11-22)

1. **Código digitado sozinho não devolve nada.** A consulta exige **código + RUT do aluno**. Os dois
   batendo, ela devolve o resultado completo e libera o PDF. O código é sequencial
   (`LOT-{ano}-{seq}`, `CertificateNumberService.php:9-31`), e a consulta só por código permitiria
   percorrer todos os certificados.
2. **Pelo QR (`uuid`) segue como hoje**, sem RUT: quem tem o QR tem o papel. Ganha o PDF.
3. **O QR antigo recebe `301`** de `app.lotusotec.cl/validar/<uuid>` para
   `https://lotusotec.cl/validar/<uuid>`, e a `ValidationPage` do app sai. O `301` vive no
   `prod.conf` e no `tls.conf`, versionado e testável. Isso é da entrega 3, não deste bloco.
4. **A página do site usa o mesmo caminho `/validar/<uuid>`.** Assim a virada do QR novo é só a troca
   do env `CERTIFICATE_VALIDATION_URL`: o caminho `/validar/` já é fixo em
   `CertificateValidationUrl::para()`.
5. **Segurança é requisito, não acabamento:** rate limit, nada de SQL injection, nada de vazamento
   de dado (§5).
6. **Ordem em três entregas** (§1, opção A).

Decisões de 2026-11-23, sobre as perguntas da leitura independente da spec:

7. **Varredura com RUT fixo também é ameaça.** O limitador por código sai, e entram dois limitadores
   de falha: por IP e por RUT (§5.3).
8. **Ninguém tranca o código de outra pessoa.** Não há bloqueio por código: o pior caso é travar a
   consulta do próprio RUT por uma hora, e o QR continua funcionando.
9. **Certificado vencido baixa o PDF.** É registro histórico verdadeiro, e o PDF traz a validade.
   Só o revogado é recusado.
10. **Acerto da consulta e download não geram registro.** A rota é anônima, sem ator, e os 429 já
    viram `EventoDeSeguranca`.

## 3. Objetivos, não-objetivos, anti-objetivos

**Objetivos (61):**
- `POST /api/publico/certificados/consulta` — código + RUT, resposta uniforme.
- `GET /api/publico/certificados/{uuid}/pdf` — PDF público, recusado para revogado.
- Limitadores próprios por IP, e de falha por IP e por RUT na consulta (§5.3).
- CORS para a origem `https://lotusotec.cl` **só** nas rotas públicas, sem credenciais.
- Contrato da API escrito para o bloco do site (§7).

**Não-objetivos (61):** página no site; troca do `CERTIFICATE_VALIDATION_URL`; `301`; remoção da
`ValidationPage`; atualização da P-89; D-70 (o canal de contato é do site, e aceitar é decisão da
Lotus); lote, ZIP e planilha (bloco 62); leitor de QR por câmera.

**Anti-objetivos** — falha mesmo que funcione:
- uma resposta, código HTTP ou mensagem que diga se um código existe sem o RUT certo;
- RUT em resposta JSON, em log da aplicação ou em query string;
- a origem do site receber `Access-Control-Allow-Credentials` ou CORS sobre rota autenticada;
- PDF de certificado revogado saindo pela rota pública;
- qualquer mudança no comportamento da rota pública atual por `uuid` que quebre a `ValidationPage`
  ainda no ar.

## 4. Como funciona hoje

- `GET /api/publico/certificados/{uuid}` é anônima, com `throttle:public-certificate`
  (30/min/IP, `RateLimits.php:38,75-76`), em `Certification/routes.php:11-12`.
  - `PublicCertificateController` faz `Certificate::firstWhere('uuid', …)` e devolve
    `PublicCertificateData`, sem RUT nem ids (`PublicCertificateTest.php:146`).
  - Revogado devolve 200 com estado; inexistente, 404.
- O PDF só existe autenticado: `GET certificates/{certificate}/pdf`, com `throttle:certificate-pdf`.
  É renderizado no Gotenberg a cada pedido e servido `inline` (`CertificateController.php:80-86`).
  O PDF **mostra o RUT do aluno e o do cliente** (`certificate.blade.php:313-331`).
- O snapshot congelado na emissão guarda o RUT impresso (`Snapshot/SnapshotPartyData`).
- `config/cors.php` cobre `api/*` com origens de `FRONTEND_URL` e `supports_credentials = true`.
  - Em dev o SPA (`:5173`) chama a API (`:8080`) cross-origin, com credenciais
    (`axios.ts:26-27`).
  - Em produção é mesma origem (`prod.conf`).
- `lotusotec.cl` e `app.lotusotec.cl` são o **mesmo site** para `SameSite`. Um fetch com
  credenciais vindo do site levaria o cookie de sessão de um admin logado. Por isso o recorte do
  CORS é requisito de segurança, não detalhe.
- O IP do limitador é confiável porque o nginx é a borda e zera `X-Forwarded-*` (`prod.conf:36-40`).

## 5. Design

### 5.1 Consulta por código + RUT

`POST /api/publico/certificados/consulta`, anônima, corpo JSON `{ "codigo": "...", "rut": "..." }`.
É POST para o RUT não cair em log de acesso do nginx, CloudWatch, histórico nem `Referer`.

- **Validação de formato antes do banco** (FormRequest):
  - `codigo` no formato `LOT-AAAA-N`, sem diferenciar caixa, normalizado para maiúsculas;
  - `rut` com o dígito verificador, aceitando com ou sem pontos e hífen, `k`/`K`, e
    comprimento máximo curto.
  - Formato inválido devolve 422 RFC 7807 pelo handler global. O 422 só fala de formato e não
    consulta o banco, então não vira oráculo.
- **Busca:** `Certificate` por `codigo` (índice unique), só via Eloquent com binding. **O RUT nunca
  vai para SQL.** A comparação é em PHP, entre o RUT normalizado do pedido e o do snapshot
  (`aluno.rut`), normalizado igual (só dígitos e `K`).
- **Resposta uniforme:** código inexistente, RUT que não bate e snapshot sem RUT devolvem o
  **mesmo 404 RFC 7807**, com o mesmo `title`/`detail` localizado. Nenhum campo, header ou status
  distingue os casos.
- **Sucesso:** 200 com o mesmo payload de `GET /{uuid}` (o `PublicCertificateData`) **mais o
  `uuid`**, para o site baixar o PDF. O RUT não é ecoado.
- **Revogado:** 200 com o estado revogado, como no `GET /{uuid}`. A consulta informa, e o PDF é que
  recusa.
- **Aluno sem RUT no snapshot:** a consulta por código nunca encontra (404 uniforme), e só o QR
  funciona. Decisão minha: aceitar código sem segundo dado reabriria a enumeração.

### 5.2 PDF público

`GET /api/publico/certificados/{uuid}/pdf`, anônima.

- `{uuid}` com constraint de formato na rota. Isso vale também para o `GET /{uuid}` existente, para
  que `consulta` nunca case como `uuid`.
- Inexistente → 404 RFC 7807. **Revogado → 410 RFC 7807**, sem PDF. **Vencido baixa** (decisão 9).
  Snapshot não apresentável segue a falha atual de `assertPresentable`.
- Renderização: o mesmo serviço do PDF autenticado (`CertificatePdfService`), sem caminho
  paralelo. O QR impresso continua saindo de `CertificateValidationUrl`.
- Headers: `Content-Type: application/pdf`,
  `Content-Disposition: attachment; filename="certificado-<codigo>.pdf"`, `Cache-Control: no-store`
  e `X-Robots-Tag: noindex`.

### 5.3 Limitadores

Todos em `RateLimits.php`, a única casa da política. Excedido → 429 RFC 7807.

| Limiter | Rota | Chave | Proposta |
|---|---|---|---|
| `public-certificate-lookup` | `POST consulta` | IP | 10/min |
| falhas por IP | `POST consulta` | IP | 20 falhas/hora |
| falhas por RUT | `POST consulta` | HMAC-SHA256 do RUT normalizado com o `APP_KEY` | 10 falhas/hora |
| `public-certificate-pdf` | `GET {uuid}/pdf` | IP | 10/min |
| `public-certificate` (existente) | `GET {uuid}` | IP | 30/min, inalterado |

- Os dois limitadores de falha contam **só as falhas** (o 404 uniforme da consulta). Ao estourar,
  recusam com 429 **antes** de consultar o banco, inclusive para o par certo. Assim o 429 nunca
  distingue acerto de erro.
- **Falhas por IP** barram força bruta do RUT contra um código conhecido: 20 por hora por IP, num
  espaço de milhões de RUTs válidos.
- **Falhas por RUT** barram a varredura dos códigos sequenciais com um RUT fixo (decisão 7),
  qualquer que seja o número de IPs.
  - A chave é o HMAC, e o RUT em claro nunca vai para a tabela `cache` nem para log.
  - O RUT de formato inválido não chega aqui, porque o 422 vem antes.
- **Não há bloqueio por código** (decisão 8). Quem erra não tranca o certificado de ninguém. O pior
  caso é travar a consulta do próprio RUT por uma hora, e o QR segue valendo.
- A chave do limitador de RUT é a string normalizada, exista ou não um certificado com ela, então o
  429 não revela existência.
- Um acerto não zera os contadores. É decisão minha, pela simplicidade.

### 5.4 CORS

- A origem do site (env novo, ex. `CORS_PUBLIC_ORIGINS=https://lotusotec.cl`, lista exata, sem
  curinga) recebe CORS **somente** em `api/publico/*`.
  - Métodos `GET, POST, OPTIONS`; header `Content-Type`; **sem** `Access-Control-Allow-Credentials`.
  - Expõe `Content-Disposition` para o download por fetch.
- A política atual (`FRONTEND_URL`, com credenciais, sobre `api/*` autenticada) não muda para o
  app. A origem do site **nunca** recebe `Access-Control-Allow-Origin` fora de `api/publico/*`.
- O `config/cors.php` padrão tem uma política só. O mecanismo para as duas é do executor, desde que
  os testes de §6 provem os quatro casos.
- A consulta `POST` vinda do site funciona sem cookie e sem token CSRF: o site não é domínio
  stateful do Sanctum. O teste prova isso.

### 5.5 Higiene de dado

- Nenhum log da aplicação grava o RUT nem o corpo da consulta.
- Exceção de validação não ecoa o valor recebido.
- As duas rotas novas entram em `AuthenticatedRouteMiddlewareTest::ANONIMAS`, e os limiters novos
  no `RateLimitTest`.
- `PublicCertificateData` ganha o `uuid`, ou nasce um DTO de resposta da consulta (decisão do
  executor). O `generated.ts` é regenerado (ADR-04).
- Mensagens de erro públicas localizadas nos três locales, como a recusa atual (`:223` do teste).
- O acerto da consulta e o download público **não geram registro** de auditoria nem
  `EventoDeSeguranca` (decisão 10). Os 429 continuam virando `EventoDeSeguranca`, como hoje.
- A ordem na consulta é formato (422), limitadores de falha (429), busca, comparação do RUT e só
  então montagem do payload. Assim um snapshot não apresentável só falha para quem já provou o
  par, e o 500 não revela que o código existe.

## 6. Critério de aceite (provado por teste)

1. A consulta com código e RUT certos devolve 200 com o payload público e o `uuid`, sem RUT. O
   RUT é aceito em qualquer formatação (com e sem pontos e hífen, `k` minúsculo).
2. Código inexistente, RUT errado e aluno sem RUT devolvem respostas **idênticas** (status, corpo,
   headers relevantes).
3. Formato inválido devolve 422 sem tocar o banco. Payloads de SQL injection em `codigo` e `rut`
   devolvem 422 ou 404 e nunca 500. A busca é por binding (teste do query log).
4. O PDF público de certificado válido ou vencido devolve `application/pdf`, `attachment`,
   `no-store`, `noindex`. Revogado → 410, inexistente → 404.
5. Cada limiter novo é visto recusar com 429:
   - 11ª consulta/min do mesmo IP;
   - 21ª falha/hora do mesmo IP, mesmo com o par certo nesse pedido;
   - 11ª falha/hora do mesmo RUT, vinda de IPs diferentes e de códigos inexistentes;
   - 11º PDF/min do mesmo IP.
   - O `cache` não guarda o RUT em claro.
   - Falhas de um RUT não travam a consulta de outro RUT ao mesmo código.
6. CORS:
   - preflight e resposta de `api/publico/*` vindos de `https://lotusotec.cl` têm o
     `Allow-Origin` exato e não têm `Allow-Credentials`;
   - a mesma origem numa rota autenticada não recebe `Allow-Origin`;
   - a origem do app mantém o comportamento atual;
   - uma origem desconhecida não recebe nada.
7. `GET /api/publico/certificados/{uuid}` e a `ValidationPage` seguem iguais: a suíte atual verde.
8. Nenhum RUT aparece no log durante os testes da consulta.

## 7. Contrato para o bloco do site (entrega 2)

O bloco do `lotus-site` lê esta seção.

- `GET https://app.lotusotec.cl/api/publico/certificados/{uuid}` → 200 `PublicCertificateData`.
  Inexistente → 404.
- `POST https://app.lotusotec.cl/api/publico/certificados/consulta`, `Content-Type:
  application/json`, `{codigo, rut}` → 200 com o payload e o `uuid`. Qualquer falha → 404 RFC 7807
  uniforme; 422 formato; 429 limite.
- `GET https://app.lotusotec.cl/api/publico/certificados/{uuid}/pdf` → PDF (`attachment`).
  Revogado → 410; 429 limite.
- O site vai precisar:
  - de rota `/validar/<uuid>` servida pelo CloudFront sem fallback genérico (ADR-SITE-004);
  - de `connect-src` incluindo `https://app.lotusotec.cl` nos dois lugares da CSP;
  - de um link para `/#Contacto` (D-70, sujeito ao aceite da Lotus).
  - Tudo isso é do bloco de lá.

## 8. Restrições

- Leis do §5 do `CLAUDE.md`: DDD-lite sem Repository, RFC 7807 pelo handler global (nunca
  `abort(422)`), tipos gerados, Sanctum intacto para o app.
- Certificado tem peso legal: nenhuma mudança no conteúdo nem no QR do PDF neste bloco.
- ~10 usuários internos: nada de fila, cache de PDF ou WAF. Os limitadores são a contenção.

## 9. Abordagens consideradas

- **Consulta pelo código (decidido: código + RUT).** A, só código, dá o resultado completo e é
  enumerável. C, só código, dá resultado mascarado, com o PDF só pelo QR. B, código + RUT, não é
  percorrível, e quem confere tem o RUT. Escolhida B.
- **QR antigo (decidido: `301` + saída da `ValidationPage`).** A alternativa era manter duas telas
  de validação, que divergiriam com o tempo.
- **Ordem (decidido: três entregas).** Um bloco só no Lotus esperando o site não funciona, porque a
  página precisa da API em produção para ser testada.
- **Consulta em `GET` com query string:** descartada, porque o RUT cairia em log de acesso.
- **CORS ampliando `FRONTEND_URL`:** descartada. Herdaria as credenciais sobre a API autenticada, e
  o site é same-site com o app.

## 10. Deixado ao executor

Ficam com o executor:

- o mecanismo das duas políticas de CORS;
- o nome exato dos limiters e das classes;
- como o 410 entra no handler: um caso novo no `TipoDeRecusa` ou `HttpException`;
- onde a contagem de falhas é registrada.

A normalização de RUT usa o `App\Shared\Support\Rut`, que já existe. O bloco 60, mesclado na
`main` em 2026-11-23, confirmou o formato gravado `12.345.678-5`. Ele não mexeu em `Certification`,
rotas, CORS, nginx nem no template do PDF. A máscara de RUT dele (`frontend/src/shared/lib/rut.ts`,
`RutInput`) é do app, não do site.

## 11. Depois deste bloco

- **Bloco no `lotus-site`:** a página, pelo harness de lá, com o §7 como contrato.
- **Ficha 63 (virada):** `CERTIFICATE_VALIDATION_URL=https://lotusotec.cl`; `301` de `/validar/*` em
  `prod.conf` e `tls.conf` (com o `scp` do `tls.conf` para o host); remoção da `ValidationPage` e
  da rota do SPA; P-89 com o endereço novo; D-70 se a Lotus aceitar. A ficha entra no backlog pelo
  fechamento do 61.

## Verificação externa

1. Definir `CORS_PUBLIC_ORIGINS=https://lotusotec.cl` no `.env` de produção em `/opt/lotus`,
   **antes** do deploy. A chave entra no `deploy/aws/env.prod.example`, e a checagem de alinhamento
   (`.github/scripts/conferir-alinhamento.sh`) recusa o deploy de um SHA cujo molde traz chave
   ausente no host. O código antigo ignora a chave, então defini-la antes não muda nada no ar.
   - prova: nenhuma
2. Deploy da API do bloco em produção (merge na `main`, espelho para o corporativo, botão de deploy).
   - prova: `producao GET /api/publico/certificados/consulta -> 405`
