import type { BudgetDocumentType } from '@shared/types/generated'
import type { AppTagProps } from '@shared/ui'

type DocumentTag = Pick<AppTagProps, 'severity' | 'tone'> & { labelKey: string }

/** Três hues distintos, todos medidos em AA no `AppTag`; o rótulo é texto e a
 * cor só reforça. É um `Record` do enum: caso novo sem cartão não compila, e a
 * ordem das chaves é a ordem dos cartões do diálogo de upload — o ciclo do
 * orçamento: a orden de compra chega, a factura sai e o comprobante fecha. */
const TAG: Record<BudgetDocumentType, Pick<AppTagProps, 'severity' | 'tone'>> = {
  purchase_order: { severity: 'info' },
  invoice: { tone: 'accent' },
  receipt: { severity: 'success' },
}

/** A ordem dos cartões do diálogo de upload (bloco 43), derivada do `TAG`. */
export const BUDGET_DOCUMENT_TYPES = Object.keys(TAG) as readonly BudgetDocumentType[]

/** A tag do tipo na lista de documentos. Tipo fora do enum (dado antigo ou de
 * outro fluxo) devolve `null`, e quem renderiza cai na tag neutra com o valor
 * cru — a lista nunca quebra por causa do rótulo. */
export function budgetDocumentTag(type: string): DocumentTag | null {
  if (!BUDGET_DOCUMENT_TYPES.includes(type as BudgetDocumentType)) return null
  return { ...TAG[type as BudgetDocumentType], labelKey: `budget.documentType.${type}` }
}
