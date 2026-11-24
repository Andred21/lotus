# 61 — Revisão

## Em aberto

## Rodada 2 — `481ae702..b9bc4925` — 2026-11-24 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5) · Lente 2: sonnet

Classificação: alto risco. Rodada aberta depois das correções aprovadas da rodada 1 (decisão do João, 2026-11-24): Q-2 em `7b0c52f8`, Q-1 em `b9bc4925`. A lente 1 confirmou as duas correções de código fechadas, sem regressão, e revisou o bloco inteiro de novo contra o gabarito sem achado novo de código.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | A correção aprovada do Q-1 da rodada 1 dizia "risco registrado no `aceitacao.md`"; o risco da decisão 8 (bloqueio por RUT alheio por até 1 h, saída pelo QR) não entrou no `aceitacao.md`, só no §7 da spec | CONFIRMED | `aceitacao.md:10-13`, `revisao.md` (Em aberto da rodada 1), `rulings.md:17`, `spec.md:234-235` | registrado, não corrigido — Menor não bloqueia. O `aceitacao.md` é regerado inteiro pelo `aceitacao.py` a partir da spec e só leva ação com prova; o risco ficou no §7, que é o contrato que o bloco do site lê, e o dano que o `rulings.md:17` queria evitar (a página do 429 sem o QR) está coberto lá |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

Lente Codex: `codex-companion task --fresh` falhou de novo com `The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.`; sem retry com `gpt-5.4`, que já falhou igual na rodada 1. Recorte de testes rodado pela lente 1 no HEAD `b9bc4925`: `--filter='PublicCertificate|PublicCors|RateLimitTest|AuthenticatedRouteMiddlewareTest|RutTest|ListQueryBudget'`, 108 testes, 615 assertions, verde.

## Rodada 1 — `481ae702..b4ad3624` — 2026-11-24 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4) · Lente 2: sonnet

Classificação: alto risco (documento legal em rota anônima, CORS público, `generated.ts`).

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | Contrato do §7 incompleto para o site: `cors.publico.exposed_headers` não expõe `Retry-After`; §7 diz só "429 limite" (não separa 429 por IP de 60 s do 429 por RUT de até 3600 s, não lista o 404 do PDF de uuid inexistente, não aponta o QR como saída no bloqueio por RUT); `aceitacao.md` não registra o risco que o último item do `rulings.md` pede | CONFIRMED | `backend/config/cors.php:52`, `spec.md:223-226`, `rulings.md:13,17` | registrado, não corrigido — Menor não bloqueia |
| Q-2 | Menor | RUT do snapshot não é validado antes do `hash_equals`: snapshot `"0"`, `"0-"` ou `"00-0"` dá `canonical() === "0"` e casa com o pedido `0-0` (que é `isValid()`). Nenhum caminho grava esse valor hoje: endurecimento, não falha explorável | CONFIRMED | `backend/app/Domains/Certification/Services/PublicCertificateAccess.php:66-69`, `backend/app/Shared/Support/Rut.php:19-26,43-46` | registrado, não corrigido — Menor não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 2 confirmados, 0 plausíveis, 0 refutados

Lente Codex: `codex-companion task --fresh` falhou com `The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.`; o retry com `--model gpt-5.4` falhou igual. Rodada de alto risco com lente 1 única.

Minors do `rulings.md` conferidos pela lente 1 sem virar achado: CORS real testado só no GET (preflight do POST coberto, mesmo middleware); `docs/estrutura-monolito.md` sem `HandleCors` (lacuna anterior ao bloco); duplicação do `firstWhere('uuid')` no `show` (anti-meta da spec protege o `GET /{uuid}`); checagem e `hit` não atômicos e ausência de `Vary: Origin` (impacto desprezível: 10/min por IP, `Cache-Control: no-cache, private`, sem cache compartilhado). Recorte de testes rodado pela lente 1: `--filter='PublicCertificate|PublicCors|RateLimitTest|AuthenticatedRouteMiddlewareTest|RutTest'`, 76 testes, 416 assertions, verde.
