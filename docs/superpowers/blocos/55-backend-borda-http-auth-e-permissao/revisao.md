# 55 — Revisão

## Em aberto

## Rodada 1 — `bade28c3..803c666e` — 2026-11-03 · Lente 1: opus · Lente 2: sonnet

Bloco de alto risco (auth/Sanctum + RBAC). A lente Codex somente-leitura do Passo 4 não rodou:
o `codex-companion` recusou `gpt-5.5`, `gpt-5.4` e `gpt-5.3-codex-spark` com `model_not_found`
("not supported when using Codex with a ChatGPT account"). A rodada ficou só com o opus.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | A catraca de `{user}` só troca `{user}` na URI; numa rota futura com outro parâmetro (`turmas/{turma}/users/{user}`), o 404 do binding do pai faz o `assertNotFound` passar sem o escopo staff. Latente: hoje toda rota com `{user}` tem só esse parâmetro. | CONFIRMED | `backend/tests/Feature/Identity/StaffUserBindingTest.php:31`, `:70` | registrado; não bloqueia |
| Q-2 | Menor | `test_permissao_vem_so_do_controller` lê `$route->middleware()` cru; grupo nomeado com `permission:` ou segundo alias do `PermissionMiddleware` escaparia. Autorização segue aplicada; impacto só na convenção D1 (fonte única). | CONFIRMED | `backend/tests/Feature/Shared/PermissionRouteMiddlewareTest.php:149-152` | registrado; não bloqueia |
| Q-3 | Menor | Catracas novas (`PermissionRouteMiddlewareTest::SEM_PERMISSAO`, `PermissionCatalogOrphanTest`, `StaffUserBindingTest`) e o molde `User::resolveRouteBinding`/`staff()` não entraram na rule nem nos pares nominais da lição 19. | CONFIRMED | `.claude/rules/backend-ddd.md:49`, `:153` · `docs/README.md:127` | registrado; não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 3 confirmados, 0 plausíveis, 0 refutados

Observação da lente 1, fora do placar: a troca 422→404 de `PUT api/users/{user}` e
`POST api/users/{user}/photo` (ruling 3) está fora da letra do D7a, que admite o 403→404 como
"única" mudança. A sessão de execução já a registrou como decisão; a aceitação precisa do ok
explícito do João sobre ela.
