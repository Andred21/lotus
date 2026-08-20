import { useArchivedPage } from '@shared/hooks'
import { budgetsApi } from '@shared/api/budgetsApi'
import type { ArchivedBudgetData, BudgetData } from '@shared/types/generated'

/** Gêmeo do `useClientsArchived`, e pela mesma razão de fronteira: é este arquivo
 * que mantém `budgetsApi` fora de `CommercialPage` (lint `no-restricted-syntax`).
 *
 * SEM `useArchiveAction`. Arquivar orçamento continua sendo ação da tela de
 * detalhe (`useBudgetDetail.askDeleteBudget`), que já mostra o ConfirmDialog e já
 * invalida `budgetsApi.keys.all` — a mesma chave que a lista de arquivados usa.
 * Duplicar o arquivar na tabela seria um segundo caminho para a mesma mutação. */
export function useBudgetsArchived() {
  return useArchivedPage<BudgetData, ArchivedBudgetData>(budgetsApi, (row) => row.budget)
}
