# 50 — Revisão

## Em aberto

## Rodada 1 — `60e42f49..891af05f` — 2026-11-03 · Lente 1: opus (codex indisponível — model_not_found gpt-5.5/gpt-5.4) · Lente 2: sonnet

Bloco classificado **alto risco** (`generated.ts`, RBAC da edição da aprovada, ordem de lock). A lente
Codex somente-leitura falhou duas vezes no `codex-companion`: `The 'gpt-5.5' model is not supported
when using Codex with a ChatGPT account.` e o mesmo para `--model gpt-5.4`. Rodada segue só com a
lente opus, como nas rodadas dos blocos 47 e 48.

Lente 1 conferiu sem achado: leis §5, ordem de lock D4 (sem ciclo), corridas recusar × criar turma,
recusar × restaurar turma, aprovar × arquivar orçamento, editar curso × restaurar turma; eager loading
de `quotes.turma`/`turma`; docblocks D9. Testes do bloco: backend 60 passed (`--filter` nos testes do
bloco + DomainDependency + ParentLockOnChildWrite), frontend 72 passed (`components/Budget`, `turmaTag`).

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | `RestoreQuoteAction` decide o no-op (`trashed()`) na instância do binding, antes de `Budget::lockRow`, e chama `restore()` nela sem re-ler a linha travada; na corrida com `RestoreBudgetAction` (cascata) grava audit `restored` fantasma. Docblock do `RestoreBudgetAction` não descreve essa ordem. Fere D3 ("decide sobre a linha travada"). Estado final válido; só a trilha de auditoria; inalcançável pela tela | CONFIRMED | `backend/app/Domains/Commercial/Actions/RestoreQuoteAction.php:63`, `:69`, `:77`; `RestoreBudgetAction.php:12-21`, `:35` | registrado, não bloqueia |
| Q-2 | Menor | `budget.approved_cannot_delete` e `quote.approved_cannot_delete` mandam "recuse antes", mas recusar aprovada com turma viva agora dá 422 `turma_exists_cannot_reject`; nenhuma mensagem aponta o caminho real (arquivar a turma) | CONFIRMED | `backend/lang/pt_BR/commercial.php:12`, `:19` (e es_CL, en); `backend/app/Domains/Commercial/Actions/DeleteQuoteAction.php:11-12`; `QuoteLifecycle.php:62-66`, `:75-78` | registrado, não bloqueia |
| Q-3 | Menor | Catraca do eixo cotação × orçamento em lista fixa de 3 arquivos, sem descobrir o universo de chamadores; `QuoteLifecycle` declara "exige transação aberta" e nada verifica. Chamador novo fora de transação perde o lock em silêncio (sqlite segue verde) | CONFIRMED | `backend/tests/Feature/Comercial/BudgetQuoteLockTest.php:147-151`, `:154-164`; `backend/app/Domains/Commercial/Services/QuoteLifecycle.php:27` | registrado, não bloqueia |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0 plausíveis, 0 refutados · Menor: 3 confirmados, 0 plausíveis, 0 refutados
