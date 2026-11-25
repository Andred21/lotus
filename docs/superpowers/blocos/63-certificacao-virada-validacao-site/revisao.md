# 63 — Revisão

## Em aberto

- Q-1 — Menor — João decidiu em 2026-11-25 corrigir antes do fechamento; correção aprovada, falta aplicar e rodar a rodada 2. (O contrato não tem aresta `ready_for_closure → reviewing`: reabertura pelo mesmo caminho dos blocos 60–62.)

## Rodada 1 — `dc0f9496..5c23b815` — 2026-11-25 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4) · Lente 2: sonnet

Bloco classificado como **alto risco** (QR do certificado, documento com peso legal; nginx de
produção/TLS). A lente Codex somente-leitura não rodou: `codex-companion task --fresh` devolveu
`The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.` e o retry com
`--model gpt-5.4` falhou igual. A rodada seguiu com a lente 1 única.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | Dois comentários ainda descrevem, no presente, a validação pública no app e o degrau `page` do `CertificateFolio`, que este bloco removeu ("um degrau abaixo", "página pública de peso legal") | CONFIRMED | `frontend/src/features/certification/components/Emission/IssuedDialog.tsx:75-76`, `frontend/src/shared/ui/CertificateFolio/CertificateFolio.test.tsx:30-32` | registrado; não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

Medições da lente 1, além da leitura do diff:

- `docker/nginx/prod.conf` num `nginx:alpine`: `nginx -t` ok; `/validar/<uuid>?utm=x`, `/validar` e
  `/validar/` dão 301 para `https://lotusotec.cl/...` com path e query preservados; `/validarx`,
  `/validacion` e `/` dão 200; `/api/publico/certificados/x` chega ao fastcgi; `//validar/x` dá 301
  com host fixo (sem open redirect).
- `deploy/nginx/tls.conf` (443) em nginx real com certificado autoassinado: `HTTP/2 301` com
  `location` correto e HSTS herdado do server; no 80, `/validar/abc` faz o salto previsto na spec
  §5.2. Fecha a lacuna que os rulings deixavam ("443 não rodou").
- `vitest` em `tests/nginx-conf`, `tests/env-prod-example`, `tests/repo-docs-refs`, `src/shared/ui`
  e `src/shared/config/locales`: 57 arquivos, 463 testes verdes.
- Sem órfão de `ValidationPage`, `useValidationPage`, `usePublicCertificate`,
  `validationVerdictClass`, `StatusHeading`, `NotFoundCard` ou `certificate.validation`.

Observação fora do escopo do diff (não é achado): em dev/teste, `CertificateValidationUrl::base()`
cai no `FRONTEND_URL` com a chave vazia
(`backend/app/Domains/Certification/Services/CertificateValidationUrl.php:16-17`,
`backend/.env.example:53-55`), então o QR de um PDF gerado em dev aponta para
`http://localhost:5173/validar/<uuid>`, rota que o SPA não tem mais e que o Vite não redireciona.
Produção não é afetada e a spec fixou "backend não muda".

Os Menores já estacionados nos rulings (`~` sensível a maiúsculas, `providers.test.tsx:65-66`,
`index.css:87`, linha longa do `PRODUCT.md`, M-5 do `Location` na aceitação) não foram repetidos.
