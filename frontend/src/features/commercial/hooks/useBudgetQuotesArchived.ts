import { useTranslation } from 'react-i18next'
import { useArchivedPage } from '@shared/hooks'
import { useToast } from '@shared/ui'
import { problemMessage } from '@shared/api/problemMessage'
import type { ArchivedQuoteData, QuoteData } from '@shared/types/generated'
import { useQuotesArchived, useRestoreQuote } from '../api/useQuotes'

/**
 * `useArchivedPage` exige `ArchivableResource<TArchived>` — contrato ESTRUTURAL
 * (`useArchivedList(enabled)` + `useRestore()`), não a fábrica `createCrudResource`
 * (spec D12). Cotação não tem fábrica: o recurso é montado aqui, com o id do pai
 * fechado no closure. O `mutate(id)` do contrato continua bastando.
 *
 * As duas propriedades são FUNÇÕES NOMEADAS começando em `use`, e isso não é
 * estilo: o `react-hooks/rules-of-hooks` decide pelo nome do que está sendo
 * definido. Seta anônima numa propriedade não é reconhecida como hook e o lint
 * reprova a chamada de `useQuery` lá dentro.
 */
function recursoDeCotacoes(budgetId: number) {
  return {
    useArchivedList: function useArchivedList(enabled: boolean) {
      return useQuotesArchived(budgetId, enabled)
    },
    useRestore: function useRestore() {
      return useRestoreQuote(budgetId)
    },
  }
}

/** Molde: `useClientsArchived`. O toast mora aqui nos dois sentidos — sem o
 * `onError` um 403 de quem não tem `commercial.quote.restore` não muda nada na
 * tela (Q-2 do review de 2026-08-18).
 *
 * Não há `archive` aqui: arquivar cotação continua sendo o `onRemove` do
 * `QuotesList`, que já passa pelo ConfirmDialog do `useBudgetDetail`. */
export function useBudgetQuotesArchived(budgetId: number) {
  const { t } = useTranslation()
  const toast = useToast()
  const page = useArchivedPage<QuoteData, ArchivedQuoteData>(
    recursoDeCotacoes(budgetId),
    (row) => row.quote,
  )

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
