# 48 — Revisão

## Em aberto

- **Q-1** · Importante · `CONFIRMED` — `operation.turma.manage_concluded_docs` fora de
  `PermissionCatalog::SEGREGATED`. Falta: aprovação do João para corrigir (ou adiar, virando ficha
  proposta).

## Rodada 1 — `1575d694..14772007` — 2026-11-02 · Lente 1: opus (codex indisponível — `model_not_found` para `gpt-5.5`) · Lente 2: sonnet

Bloco de alto risco: certificados, migration de permissão e RBAC. A lente Codex do Passo 4 foi
tentada pelo `codex-companion` (`task --fresh`), porque o MCP do Codex está ausente. Ela falhou com
`The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account.` É a mesma falha das
rodadas 1 e 2 do bloco 47, que já tinham mostrado que o `gpt-5.4` também falha. Não houve nova
tentativa, e a rodada saiu só com a lente 1.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Importante | A permissão nova `operation.turma.manage_concluded_docs` se descreve como "(só superadmin)" mas não entrou em `PermissionCatalog::SEGREGATED`. A única barreira é a exclusão da lista do admin no `RolePermissionSeeder`. Como `assertAssignable` e `RoleData` (`Rule::notIn(SEGREGATED)`) só barram o que está em `SEGREGATED`, a permissão pode ir para uma role customizada. Essa role daria a quem não é superadmin o poder de subir e remover documento de turma concluída, contra a D8, que manda seguir "o mesmo molde de `commercial.quote.approve`". Nenhum teste fixa a segregação. Molde do teste: `CertificateSettingsTest::test_permissao_e_so_do_superadmin`. | CONFIRMED | `backend/app/Domains/Identity/Support/PermissionCatalog.php:16-21`, `:83`, `:116`; `backend/app/Domains/Identity/Data/RoleData.php:44`; `backend/database/seeders/RolePermissionSeeder.php:60` | aguarda aprovação do João |
| Q-2 | Menor | O docblock do `CertificateVigenciaResolver` ainda se diz fonte única: ":11 num lugar só" e ":22 Mudar `vigentes()` muda todos de uma vez". Mas `vigentes()` só delega a `EmissionStateResolver::whereVigente()`, que é quem `scopeEmitidos()` e a `CertificationMetricsQuery` também chamam. O texto em :24-26 já nomeia o dono certo, o que deixa o cabeçalho contraditório, contra o anti-objetivo da spec §3. | CONFIRMED | `backend/app/Domains/Certification/Services/CertificateVigenciaResolver.php:11`, `:22`, `:24-26`, `:89-95` | registrado; não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 1 confirmado, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

Padrão reincidente: nenhum. A permissão exclusiva anterior, `certification.settings.manage`, entrou
em `SEGREGATED` com teste, então esta é a primeira falha desse tipo.
