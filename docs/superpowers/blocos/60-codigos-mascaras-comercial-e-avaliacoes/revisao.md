# 60 — Revisão

## Em aberto

## Rodada 1 — `7982828e..b74258de` — 2026-11-23 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4) · Lente 2: sonnet

Classificação: **alto risco** — 4 migrations (backfill de `courses.code`, conversão de `PRUEBAS` em
`EVALUACION_ALUNO`, permissão RBAC nova, telefones para E.164), `generated.ts` regenerado, DTOs em
`Data/`.

A lente Codex do Passo 4 não rodou. O `codex-companion task --fresh` falhou com `The 'gpt-5.5' model
is not supported when using Codex with a ChatGPT account.`, e a nova tentativa com `--model gpt-5.4`
falhou do mesmo jeito. Por isso a rodada teve só a lente 1 do `revisor-bloco`.

O `revisor-bloco` rodou na lane:
- backend `php artisan test`: 1970 passaram, 7 foram pulados;
- frontend `pnpm test`: 2105 passaram;
- `pnpm lint` e `tsc -b`: limpos.

Ele conferiu as leis 1, 2, 3, 4 e 6, os anti-objetivos da spec e a paridade de habilitação, sem
achado nesses pontos.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | O backfill de `courses.code` usa `->whereNull('code')->orderBy('id')->each(...)`, e o `each()` pagina por offset (`chunk(1000)`). Cada lote atualizado sai do filtro, então da página 2 em diante o backfill pula cursos ainda nulos. Só se manifesta com mais de 1000 cursos. É o mesmo defeito que `6213dae2` corrigiu na 000002 trocando por `lazyById`. | CONFIRMED | `backend/database/migrations/2026_11_22_000001_add_code_and_sence_code_to_courses.php:28-30`; `vendor/.../Concerns/BuildsQueries.php:113-122` | registrado, não bloqueia. O catálogo de hoje fica bem abaixo de 1000 cursos, e o item 2 da `aceitacao.md` ("cursos sem `code` = 0") é o que prova o resultado em produção |
| Q-2 | Menor | `ClientDialog` monta `ClientBudgetsSection` sem `can('commercial.budget.view')`, e o `BudgetController@index` exige essa permissão. Um papel com `client.view` e sem `budget.view` vê um erro de carga. | PLAUSIBLE | `frontend/src/features/commercial/components/Client/ClientDialog.tsx:94-96`; `frontend/src/features/commercial/hooks/useClientBudgets.ts:29`; `backend/app/Domains/Commercial/Http/Controllers/BudgetController.php:26`; `backend/database/seeders/RolePermissionSeeder.php:52-61` | observação. Nenhum papel semeado tem essa combinação (o admin tem as duas permissões e o redator nenhuma do comercial); o caso só aparece com papel customizado |
| Q-3 | Menor | O docblock do `HabilitacaoStatus` ainda diz que a turma concluída "sempre tem os três documentos". Agora são 4 tipos, e só 2 (`bloqueantes()`) são exigidos para concluir. | CONFIRMED | `backend/app/Domains/Operation/Services/HabilitacaoStatus.php:15-16`; `backend/app/Domains/Operation/Enums/TurmaDocumentType.php:13-15,46-48` | registrado, não bloqueia. Só o comentário está errado; o comportamento não muda |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis,
0 refutados · Menor: 2 confirmados, 1 plausível, 0 refutados

Nenhum padrão reincidente: o defeito de paginação por offset do Q-1 não aparece em revisões de
blocos anteriores. Nenhuma divergência de documentação, nenhuma ficha proposta.
