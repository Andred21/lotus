import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { budgetsApi } from '@shared/api/budgetsApi'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedBudgetData, BudgetData } from '@shared/types/generated'

/** Gêmeo do `useClientsArchived`, e pela mesma razão de fronteira: é este arquivo
 * que mantém `budgetsApi` fora de `CommercialPage` (lint `no-restricted-syntax`).
 *
 * NÃO existe `archive` aqui. Arquivar orçamento continua sendo ação da tela de
 * detalhe (`useBudgetDetail.askDeleteBudget`), que já mostra o ConfirmDialog e já
 * invalida `budgetsApi.keys.all` — a mesma chave que a lista de arquivados usa.
 * Duplicar o arquivar na tabela seria um segundo caminho para a mesma mutação.
 *
 * O TOAST mora aqui, nos dois sentidos: sem o `onError` um 403 de quem não tem
 * `commercial.budget.restore` não muda nada na tela (Q-2 do review de 2026-08-18). */
export function useBudgetsArchived() {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<BudgetData, ArchivedBudgetData>(budgetsApi, (row) => row.budget)

  return {
    ...page,
    restore: (id: number) =>
      page.restore(id, {
        onSuccess: () => toast.success(t('archive.restoredToast')),
        onError: (problem) => {
          const message = problemMessage(problem)
          if (message) toast.error(message)
        },
      }),
  }
}
