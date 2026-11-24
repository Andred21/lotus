---
schema_version: 1
packet_id: lotus-61-certificacao-validacao-no-site-20261122
block_id: 61-certificacao-validacao-no-site
status: partial
generated_at: 2026-11-22T15:49:26-03:00
base_ref: main
base_commit: 7982828e2978f8abc891a3732e4f23065f45f07b
state_path: null
state_blob_sha: null
progress_path: docs/superpowers/historico/progress.md
progress_blob_sha: 6da26e078a9eb01af7e812fe033d143063c608ca
plan_path: null
plan_blob_sha: null
spec_path: null
spec_blob_sha: null
word_budget: 1200
---

# Context Packet — 61 `certificacao-validacao-no-site`

> Snapshot derivado. A hierarquia das fontes canônicas e as regras de staleness continuam valendo.
> Gerado pela rota **Codex indisponível**: três agentes `contexto-leitor` somente-leitura (backend
> e infra do Lotus, repo `lotus-site`, docs e fontes externas), fundidos aqui.

## Scope

**Goal:** a validação pública de certificado sai do app (`/validar/<uuid>`, `ValidationPage`) e
vai para uma página do site da Lotus. Ela é acessada pelo QR ou pelo `codigo` digitado e tem
download do PDF válido. A lane do Lotus leva o endpoint, o CORS e o QR; o `lotus-site` leva a
página, numa PR própria. Nenhum QR já emitido pode quebrar.

**Non-goals:** implementar a página dentro deste repo; leitor de QR por câmera no site (a
Permissions-Policy do site bloqueia câmera); lote/ZIP/planilha (bloco 62); reescrever PDFs já
distribuídos.

## Source registry

| Key | Provider | Source | Modified | Status | Used for |
|---|---|---|---|---|---|
| FICHA | repo | `docs/superpowers/backlog.md:363-399` (ficha 61), `:403-420` (62), `:460,470-473` (D-70) | main@7982828e | ok | escopo, DoD, perguntas abertas |
| CODE | repo | `backend/app/Domains/Certification/**`, `backend/app/Shared/RateLimiting/RateLimits.php`, `backend/config/{cors,sanctum,app}.php`, `docker/nginx/prod.conf`, `deploy/aws/**` | main@7982828e | ok | contrato atual da API, QR, CORS, borda |
| PEND | repo | `docs/superpowers/pendencias/abertas.md:652-668` (P-89) | main@7982828e | ok | gatilho da P-89 |
| ADR | repo | `docs/adrs.md` ADR-03, ADR-06 (:44-50), ADR-12 (:126-150), ADR-14, ADR-23 | main@7982828e | ok | restrições de stack |
| SITE | GitHub | `Andred21/lotus-site@149d0ec6` (main, 2026-10-24): `src/app/App.tsx`, `src/content/site.ts`, `infra/lotus-site.yaml`, `scripts/infra/lib/cabecalhos.mjs`, `.github/workflows/ci.yml`, `e2e/smoke/9-404.spec.ts` | 2026-10-24 | ok | roteamento, CSP, deploy, contato |
| DRIVE | Google Drive | `Viagem Chile/Projetos/Lotus.cl/V2` | — | unavailable | tool presente, chamada falhou: `MCP server "claude.ai Google Drive" needs to be connected in claude.ai (run /mcp to connect it)` |
| NOTION | Notion | `collection://e64b7d57-d000-4433-b652-a410e75193cc` | — | unavailable | reconexão recusada: "connected to MCP server 'claude.ai Notion' again with its existing sign-in and was refused. The user needs to sign in." |

## Key facts

1. **A API pública de hoje** é `GET /api/publico/certificados/{uuid}`, anônima, com
   `throttle:public-certificate` = 30/min por `$request->ip()` (`routes.php:11-12`,
   `RateLimits.php:38,75-76`).
   - Expõe `codigo`, `status`, `valido_ate`, `revoked_at`, `aluno.name`, `curso{name,workload_hours}`, `turma.end_date`, `cliente.name`, `redator.name` e `display_status`.
   - Não expõe RUT nem ids (`PublicCertificateData.php`, `PublicCertificateTest.php:146`).
   - Revogado responde 200 com status; inexistente, 404.
   - O DTO é `#[TypeScript]`. `[CODE]`
2. **O PDF hoje só existe autenticado.** É `GET certificates/{certificate}/pdf`, com
   `throttle:certificate-pdf` = 30/min por usuário, renderizado no Gotenberg a cada pedido e
   servido `inline` (`routes.php:20-24`, `CertificateController.php:80-86`).
   - Uma rota anônima nova entra em `AuthenticatedRouteMiddlewareTest::ANONIMAS` e no `RateLimitTest`.
   - O IP por chave é confiável só porque o nginx é a borda e zera `X-Forwarded-*` (`prod.conf:36-40`). `[CODE]`
3. **O QR é regerado a cada render.** A base vem do env `CERTIFICATE_VALIDATION_URL`, que em
   produção é obrigatório e `https://`, mais o caminho fixo `/validar/{uuid}`
   (`CertificateValidationUrl.php:24-41`, `CertificatePdfService.php:50-56`). Nada fica congelado
   no banco nem no snapshot.
   - Trocar a base reaponta o QR de todo PDF baixado depois, inclusive de certificado antigo.
   - O PDF já distribuído carrega `https://app.lotusotec.cl/validar/<uuid>` para sempre (`deploy/aws/env.prod.example:85-95`). `[CODE]`
4. **O `codigo` é `LOT-{ano}-{seq}`**, sem zero à esquerda, com a sequência anual começando em
   1000 (`CertificateNumberService.php:9-31`). Tem índice unique (migration
   `2026_08_05_100000_certificates.php:17`). Por ser sequencial, a busca pública por ele permite
   percorrer todos os certificados. `[CODE][FICHA]`
5. **CORS**: `config/cors.php` tem `paths = api/*, sanctum/csrf-cookie, login, logout`,
   `allowed_origins` vindo de `FRONTEND_URL` e `supports_credentials = true`.
   - Pôr a origem do site ali abre a `api/*` autenticada para ela.
   - O recorte precisa ser só para a rota pública, e não há ADR de CORS.
   - `prod.conf` assume que "nenhuma requisição do SPA é cross-origin". `[CODE][ADR]`
6. **O site é uma página única por âncoras, sem router** (ADR-SITE-001).
   - O CloudFront **não tem fallback de SPA, de propósito** (`infra/lotus-site.yaml`, ADR-SITE-004, `e2e/smoke/9-404.spec.ts` exige 404). Hoje `/validar/<uuid>` dá 404 no site.
   - O behavior `/api/*` da distribuição vai para a Lambda de contato.
   - Uma rota de página nova exige mudança de infra (CloudFront Function de rewrite, molde `RedirecionarWww`, ou error response restrito), ADR nova e ajuste do smoke. `[SITE]`
7. **A CSP do site** é `default-src 'none'; connect-src 'self'; img-src 'self'; form-action 'self'`.
   Ela vive em dois lugares: `infra/lotus-site.yaml` (`PoliticaDeCabecalhos`) e
   `scripts/infra/lib/cabecalhos.mjs`, este com teste.
   - O fetch para `https://app.lotusotec.cl` é bloqueado até ampliar o `connect-src`.
   - A origem de produção do site é `https://lotusotec.cl`; `www` responde 301 para o apex.
   - O build não tem env de URL de API.
   - O deploy sai do espelho corporativo `Gatika-CL/lotus-site`. `[SITE]`
8. **D-70 e P-89.**
   - D-70: `/validar` diz "contacta a Lotus" sem canal, e o gatilho é decisão da Lotus. O site tem formulário em `/#Contacto` e `contacto@lotusotec.cl` (`site.ts:73`).
   - P-89: o gatilho é manual e confere `https://app.lotusotec.cl/validar/<uuid>` decodificado de um PDF real. Não há script.
   - O alias de aceitação é só `producao https://app.lotusotec.cl` (`.claude/aceitacao-aliases.conf:7`). Prova contra o site pede alias novo. `[FICHA][PEND][SITE]`

## Resolved decisions and divergences

| Topic | External snapshot | Current decision | Resolution basis |
|---|---|---|---|
| Fonte canônica do pedido de 2026-11-21 | Drive/Notion indisponíveis | Ficha 61 é a única fonte do escopo | FICHA cita o pedido; nenhuma fonte disponível o contradiz |

Nenhuma divergência material entre fontes disponíveis.

## Constraints

- Certificado tem peso legal: nenhum QR emitido pode quebrar (FICHA, ADR-12).
- Toda resposta de erro segue RFC 7807 pelo handler global, sem `abort(422)` (ADR-03).
- Sanctum cookie/CSRF continua restrito ao app. O site consome só rota anônima, sem credencial (ADR-06).
- Rota anônima nova é declarada em `ANONIMAS`; o limiter novo entra no `RateLimitTest` e vive só em `RateLimits.php`.
- Mudar o DTO exige regenerar `generated.ts` (ADR-04).
- O QR só aponta para o site depois que a página estiver no ar em produção (FICHA). As duas PRs são em repos distintos.
- O `lotus-site` tem harness próprio (`docs/superpowers`, ADRs ADR-SITE-*). Rota e CSP pedem ADR lá.

## External acceptance signals

- O QR de um certificado novo abre a página do site com o estado certo, e o `codigo` digitado chega ao mesmo resultado.
- O PDF baixa pelo site e é recusado para revogado.
- O QR antigo (`app.lotusotec.cl/validar/<uuid>`) continua chegando a uma validação.
- O limitador da rota pública foi visto recusar (429).
- A prova final é contra produção, depois do deploy (invariante 11). O alias do site não existe hoje.

## Open questions

- O que a busca por `codigo` expõe, ou se ela pede um segundo dado (enumeração; key fact 4).
- O QR antigo redireciona para o site, ou a `ValidationPage` do app fica no ar (key fact 3)?
- Recorte do CORS: `paths` próprios para `api/publico/*` sem credentials, ou uma config separada (key fact 5).
- A rota da página no site: o caminho, e se é rewrite por CloudFront Function ou outro mecanismo (key fact 6). Isso define a URL base nova do QR.
- O download é feito por link direto para a API (navegação, fora do `connect-src`) ou por fetch (key fact 7).
- A Lotus aceita o canal do site para pagar a D-70?

## Deferred

- Download em lote, planilha e link de descarga (bloco 62, que depende deste).
- Leitor de QR por câmera no site.

## Staleness triggers

- Uma edição em `PublicCertificateData`, `CertificateValidationUrl`, `config/cors.php` ou nas rotas de `Certification` que mude contrato, QR ou CORS.
- Uma mudança no roteamento, na CSP ou no CloudFront do `lotus-site` (`infra/lotus-site.yaml`, `cabecalhos.mjs`).
- Drive ou Notion ficarem disponíveis e trazerem o pedido de 2026-11-21 com escopo diferente da ficha.
- Uma decisão da Lotus sobre a D-70, ou a reabertura de qualquer decisão do brainstorming.
