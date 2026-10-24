# 41 — Revisão

## Em aberto

- **Q-1** (Menor, rodada 1) — correção aprovada pelo João em 2026-10-24, por aplicar: na turma em
  andamento a linha oferece "Registrar resultado" a quem tem `operation.enrollment.record_result` e
  "Remover" só a quem tem `operation.enrollment.manage`. Fecha na rodada 2.

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
