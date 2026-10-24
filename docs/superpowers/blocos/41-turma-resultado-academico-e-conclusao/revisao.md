# 41 — Revisão

## Em aberto

## Rodada 2 — `dfa34847..29ed378e` — 2026-10-24 · Lente 1: opus · Lente 2: sonnet

A lente Codex não rodou de novo. A tentativa desta rodada caiu no mesmo `model_not_found` do
`gpt-5.5` da rodada 1, e o João informou que o Codex está sem cota. A rodada ficou só com o
`revisor-bloco`.

O **Q-1 da rodada 1 foi corrigido em `29ed378e`.** A lente 1 conferiu a correção contra:

- a rota, `EnrollmentController.php:38`, que exige `record_result`;
- a action, `RecordEnrollmentResultAction.php:43`, que exige `manage` na turma concluída;
- o seeder, `RolePermissionSeeder.php:76-82`, que dá ao redator só `record_result`.

A tela agora oferece exatamente o que a API aceita, e os testes cobrem admin e redator nos dois
estados da turma.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-3 | Menor | Turma concluída com todas as matrículas com certificado vigente: o admin tem as duas permissões, então `mostraAcoes` é `true` e a coluna de ações de 9rem é montada. Toda linha sai sem ação, porque `RowActions` devolve `null` com a lista vazia. A faixa fica vazia em todas as linhas e tira largura de nota e presença. O comentário das linhas 110-112 promete o contrário. A lógica vem da rodada 1, e o `29ed378e` reescreveu essa condição e esse comentário. | CONFIRMED | `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx:53,110-118`; `frontend/src/features/operation/components/Enrollment/EnrollmentRowActions.tsx:35,38`; `frontend/src/shared/ui/RowActions/RowActions.tsx:94` | registrado; não bloqueia. Correção sugerida: na turma concluída, `mostraAcoes` exige também `enrollments.some((e) => !e.result_locked)`, com um caso de teste para o admin com todas as matrículas travadas. Corrigir ou não fica a critério do João. |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 0 plausíveis, 0 refutados

Verificação da lente 1: `vitest run src/features/operation` passou com 22 arquivos e 129 testes, e
`pnpm lint` saiu limpo. O backend não mudou desde a rodada 1. Antes desta rodada, o gate completo do
frontend no `29ed378e` passou: build ok, lint ok, 177 arquivos e 1228 testes.

## Rodada 1 — `dfa34847..d170d0a2` — 2026-10-24 · Lente 1: opus · Lente 2: sonnet

Bloco classificado como alto risco (`generated.ts`, vigência de certificado, resultado acadêmico).
A lente Codex somente-leitura foi tentada e não rodou: a conta ChatGPT do Codex recusou `gpt-5.5`
(default do `~/.codex/config.toml`) e `gpt-5.4` com `model_not_found`. A rodada ficou só com o
`revisor-bloco`.

| # | Severidade | Achado | Veredito | Evidência | Situação |
|---|---|---|---|---|---|
| Q-1 | Menor | Na turma em andamento, o redator vê "Remover" (a API devolve 403) e não vê "Registrar resultado", embora tenha `record_result` e o backend aceite o lançamento dele. Pré-existente na `main@dfa34847`, mas o bloco reescreveu as linhas e criou `canRemove` sem ler permissão. | CONFIRMED | `frontend/src/features/operation/components/Enrollment/EnrollmentTable.tsx:50,114-115`; `backend/app/Domains/Operation/Http/Controllers/EnrollmentController.php:34,38`; `backend/database/seeders/RolePermissionSeeder.php:76-82` | registrado; não bloqueia. O critério 5 da spec (redator lança com a turma em andamento) é de backend e está provado em PHPUnit; a lacuna é só da tela. Correção ou ficha a decidir pelo João. |
| Q-2 | Menor | `RemoveEnrollmentDialog` recebe o setter cru `setPending` do pai em vez de um `onClose`. | PLAUSIBLE | `frontend/src/features/operation/components/Enrollment/RemoveEnrollmentDialog.tsx:8,29,33`; `.claude/prompts/gabarito-lotus.md:87` | observação. O gabarito cita só `setForm` via helper solto; o achado depende de leitura ampliada. Sem bug funcional. |

Placar: Crítico: 0 confirmados, 0 plausíveis, 0 refutados · Importante: 0 confirmados, 0
plausíveis, 0 refutados · Menor: 1 confirmado, 1 plausível, 0 refutados

Observações da lente 1 que não viraram achado:

- `OperationMetricsQuery::pendencias()` sinaliza "turma sem redator", mas não "presencial sem
  local": a turma nessa situação sai de "aguardando conclusão" sem pendência visível no dashboard.
  É o mesmo problema estacionado do `CompliancePanel` (`rulings.md`); vale cobrir os dois no mesmo
  registro.
- `blank()` do domínio remove `\t`/`\n`, e o `trim()` do MySQL/sqlite remove só espaço: um
  `local_aplicacao` só com quebra de linha divergiria entre `whereDisplayStatus` e
  `HabilitacaoStatus`. O `TrimStrings`/`ConvertEmptyStringsToNull` cobre a escrita nova; risco
  prático quase nulo.

Verificação da lente 1: `pnpm lint` limpo; `php artisan test --filter='EnrollmentResult|ConcludeTurma|TurmaHabilitacao|TurmaStatusParity|ApprovalRule|ListQueryBudget|DomainDependency'`
com 85 testes e 340 asserções passando.
