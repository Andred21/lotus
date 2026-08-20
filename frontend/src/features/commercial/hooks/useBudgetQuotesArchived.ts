import { useArchivedPage } from '@shared/hooks'
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

/** Não há `archive` aqui: arquivar cotação continua sendo o `onRemove` do
 * `QuotesList`, que já passa pelo ConfirmDialog do `useBudgetDetail`. O par de
 * toasts do restore vive em `useArchivedPage` (Q-3 do review de 2026-08-19), e
 * cobre tanto o 403 de quem não tem `commercial.quote.restore` quanto o 422 do
 * gate de orçamento arquivado. */
export function useBudgetQuotesArchived(budgetId: number) {
  return useArchivedPage<QuoteData, ArchivedQuoteData>(
    recursoDeCotacoes(budgetId),
    (row) => row.quote,
  )
}
