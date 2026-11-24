# 61 — Revisão

## Em aberto

Decisão do João (2026-11-24, após a rodada 1): corrigir os dois Menores antes do fechamento e rodar a rodada 2.

- Q-1 — Menor — correção aprovada, por aplicar: `Retry-After` em `cors.publico.exposed_headers`; §7 da spec com os dois 429, o 404 do PDF e o QR como saída; risco registrado no `aceitacao.md`.
- Q-2 — Menor — correção aprovada, por aplicar: validar o RUT do snapshot (válido e número não zerado) antes do `hash_equals`.

## Rodada 1 — `481ae702..b4ad3624` — 2026-11-24 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4) · Lente 2: sonnet

Classificação: alto risco (documento legal em rota anônima, CORS público, `generated.ts`).

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | Contrato do §7 incompleto para o site: `cors.publico.exposed_headers` não expõe `Retry-After`; §7 diz só "429 limite" (não separa 429 por IP de 60 s do 429 por RUT de até 3600 s, não lista o 404 do PDF de uuid inexistente, não aponta o QR como saída no bloqueio por RUT); `aceitacao.md` não registra o risco que o último item do `rulings.md` pede | CONFIRMED | `backend/config/cors.php:52`, `spec.md:223-226`, `rulings.md:13,17` | registrado, não corrigido — Menor não bloqueia |
| Q-2 | Menor | RUT do snapshot não é validado antes do `hash_equals`: snapshot `"0"`, `"0-"` ou `"00-0"` dá `canonical() === "0"` e casa com o pedido `0-0` (que é `isValid()`). Nenhum caminho grava esse valor hoje: endurecimento, não falha explorável | CONFIRMED | `backend/app/Domains/Certification/Services/PublicCertificateAccess.php:66-69`, `backend/app/Shared/Support/Rut.php:19-26,43-46` | registrado, não corrigido — Menor não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 2 confirmados, 0 plausíveis, 0 refutados

Lente Codex: `codex-companion task --fresh` falhou com `The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.`; o retry com `--model gpt-5.4` falhou igual. Rodada de alto risco com lente 1 única.

Minors do `rulings.md` conferidos pela lente 1 sem virar achado: CORS real testado só no GET (preflight do POST coberto, mesmo middleware); `docs/estrutura-monolito.md` sem `HandleCors` (lacuna anterior ao bloco); duplicação do `firstWhere('uuid')` no `show` (anti-meta da spec protege o `GET /{uuid}`); checagem e `hit` não atômicos e ausência de `Vary: Origin` (impacto desprezível: 10/min por IP, `Cache-Control: no-cache, private`, sem cache compartilhado). Recorte de testes rodado pela lente 1: `--filter='PublicCertificate|PublicCors|RateLimitTest|AuthenticatedRouteMiddlewareTest|RutTest'`, 76 testes, 416 assertions, verde.
