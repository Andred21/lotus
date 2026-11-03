# 54 — Revisão

## Em aberto

## Rodada 1 — `60e42f49..68ae1d3a` — 2026-11-03 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5) · Lente 2: sonnet

Bloco classificado como alto risco (toca `frontend/src/shared/types/generated.ts` e o payload de
visibilidade RBAC do Dashboard). A lente Codex do Passo 4 não rodou: `codex-companion task --fresh`
devolveu `"The 'gpt-5.5' model is not supported when using Codex with a ChatGPT account."`. A rodada
seguiu só com o `revisor-bloco`.

O revisor rodou no container os filtros `Dashboard|DomainDependency|ListQueryBudget|TurmaStatusParity`
(95 testes, 599 asserções), o vitest de `app/pages/Dashboard`, `shared/lib/turmaRequirement` e
`shared/ui/AppDataTable` (108 testes em 14 arquivos), `eslint` e `tsc -b` sem saída, e `pint --test`
nos arquivos do Dashboard. O md5 do `generated.ts` bate com o `typescript-transformer-manifest.json`.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | `AgendaClassifier::bucketOf()` lê o relógio por turma (`FusoDoNegocio::hoje()` e `DashboardWindows::turmaHorizon()`, que lê de novo), embora o docblock diga "Classificador puro"; no redator, `resumo()` e `agenda()` classificam em chamadas separadas. Se o processamento cruzar a meia-noite do fuso do negócio, turmas da mesma chamada, ou KPI e agenda do mesmo payload, usam "hoje" diferentes. | PLAUSIBLE | `backend/app/Domains/Dashboard/Services/AgendaClassifier.php:19`, `:29`; `backend/app/Domains/Dashboard/Services/DashboardWindows.php:23`; `backend/app/Domains/Dashboard/Services/RedatorScopeQuery.php:186-188` | observação — não bloqueia; o defeito depende de a requisição cruzar a meia-noite |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 0 confirmados, 1 plausível, 0 refutados

Já registrados nos `rulings.md`, não contados como achado: o KPI "Clases en curso" somar três baldes
(decisão D1/D4 da spec), o enum `AgendaBucket` gerado sem consumidor, e os minors triados pelo
revisor da branch (`folha()` copiado, índice fixo de célula no teste, `DataSql::literal` repetido).
