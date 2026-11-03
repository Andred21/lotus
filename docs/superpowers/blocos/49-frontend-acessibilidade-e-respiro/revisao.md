# 49 — Revisão

## Em aberto

## Rodada 1 — `1575d694..9262448a` — 2026-11-02 · Lente 1: opus · Lente 2: sonnet

Bloco classificado como baixo risco (frontend visual/a11y, sem schema, `generated.ts`, auth ou
RBAC; executor claude): lente Codex não despachada. A lente 1 rodou `pnpm lint` (limpo) e
`pnpm vitest run` nos 16 arquivos de teste do bloco (392 verdes).

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | Docblock do paginador cita `primereact/paginator/paginator.cjs.js:789-795` como local das chamadas `api.ariaLabel(...)`; elas estão em `:764` (`nextPageLabel`), `:828`/`:847` (`pageLabel`) e `:904` (`prevPageLabel`). `:789-795` é o `getPTOptions` com `context: { active }`, prova do argumento dois parágrafos abaixo. Premissa do comentário vale; só a citação está trocada. | CONFIRMED | `frontend/src/shared/ui/AppDataTable/AppDataTable.tsx:171-172` | registrado; Menor, não bloqueia |

Observação da lente 1, sem achado: o campo `hue` de `SEVERIDADES_CLARAS`
(`frontend/scripts/generate-brand-theme.mjs:426,433,440,447`) não tem leitor — veio da interface
pedida no plano e mantém a régua de `tone-ink.test.ts` independente do gerador.

Padrão reincidente: nenhum.

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados
