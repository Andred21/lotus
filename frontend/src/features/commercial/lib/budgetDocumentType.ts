import type { BudgetDocumentType } from '@shared/types/generated'
import type { AppTagProps } from '@shared/ui'

/** A ordem dos cartões do diálogo de upload (bloco 43): o ciclo do orçamento —
 * a orden de compra chega, a factura sai e o comprobante fecha. */
export const BUDGET_DOCUMENT_TYPES: readonly BudgetDocumentType[] = ['purchase_order', 'invoice', 'receipt']

type DocumentTag = Pick<AppTagProps, 'severity' | 'tone'> & { labelKey: string }

/** Três hues distintos, todos medidos em AA no `AppTag`; o rótulo é texto e a
 * cor só reforça. */
const TAG: Record<BudgetDocumentType, Pick<AppTagProps, 'severity' | 'tone'>> = {
  purchase_order: { severity: 'info' },
  invoice: { tone: 'accent' },
  receipt: { severity: 'success' },
}

/** A tag do tipo na lista de documentos. Tipo fora do enum (dado antigo ou de
 * outro fluxo) devolve `null`, e quem renderiza cai na tag neutra com o valor
 * cru — a lista nunca quebra por causa do rótulo. */
export function budgetDocumentTag(type: string): DocumentTag | null {
  if (!BUDGET_DOCUMENT_TYPES.includes(type as BudgetDocumentType)) return null
  return { ...TAG[type as BudgetDocumentType], labelKey: `budget.documentType.${type}` }
}
