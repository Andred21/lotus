---
description: Gate de fechamento de sprint — testes, higiene, arquivamento e índice
argument-hint: [nome da sprint, ex. "Sprint 2 · Comercial"]
allowed-tools: Bash(git status:*), Bash(git log:*)
---

## Estado atual

- Working tree: !`git status --short`
- Últimos commits: !`git log --oneline -5`

Índice do projeto:

@docs/superpowers/progress.md

## Gate de fechamento — $ARGUMENTS

Execute o checklist. Reporte cada item como ✅/❌ e **PARE no primeiro ❌ que exija decisão minha.**

1. **Testes:** `docker compose exec -T app php artisan test` (suíte completa, sqlite `:memory:`).
2. **Front:** de `frontend/` → `pnpm lint` e `pnpm build`.
3. **Pint:** `./vendor/bin/pint <arquivos da sprint>` — NUNCA sem argumento.
4. **Tipos:** se algum DTO mudou → `php artisan typescript:transform`; confirme `generated.ts`
   commitado e nunca editado à mão.
5. **Código morto:** `.gitkeep` órfãos, imports não usados, placeholders criados pela sprint.
6. **Leis:** nenhuma lei do CLAUDE.md §5 contrariada sem registro no ledger.
7. **Arquivamento:** mova plano+spec da sprint para `plans/archive/` e `specs/archive/`.
8. **Índice:** atualize `docs/superpowers/progress.md` — status → `Entregue`, caminhos → `archive/`,
   e escreva o **desfecho em 1 linha**, priorizando decisões que evitam retrabalho futuro
   (ex.: "wizard usa useState — não promover a Zustand").

Ao final: resumo do que foi fechado + o que ficou aberto.