import type { BudgetDocumentType } from '@shared/types/generated'
import type { AppTagProps } from '@shared/ui'

type DocumentTag = Pick<AppTagProps, 'severity' | 'tone'> & { icon: string; labelKey: string }

/** Três hues distintos, todos medidos em AA no `AppTag`; o rótulo é texto, e a
 * cor e o ícone só reforçam. É um `Record` do enum: caso novo sem slot não
 * compila, e a ordem das chaves é a ordem dos slots do cartão de documentos —
 * o ciclo do orçamento: a orden de compra chega, a factura sai e o comprobante
 * fecha. */
const TAG: Record<BudgetDocumentType, Pick<AppTagProps, 'severity' | 'tone'> & { icon: string }> = {
  purchase_order: { severity: 'info', icon: 'pi pi-shopping-cart' },
  invoice: { tone: 'accent', icon: 'pi pi-receipt' },
  receipt: { severity: 'success', icon: 'pi pi-money-bill' },
}

/** Os tipos de documento do orçamento, na ordem dos slots do cartão (bloco 47),
 * derivada do `TAG`. */
export const BUDGET_DOCUMENT_TYPES = Object.keys(TAG) as readonly BudgetDocumentType[]

/** A tag do tipo: título do slot e marca na lista dos demais. Tipo fora do enum
 * (dado antigo ou de outro fluxo) devolve `null`, e quem renderiza cai na tag
 * neutra com o valor cru — a lista nunca quebra por causa do rótulo. */
export function budgetDocumentTag(type: string): DocumentTag | null {
  if (!BUDGET_DOCUMENT_TYPES.includes(type as BudgetDocumentType)) return null
  return { ...TAG[type as BudgetDocumentType], labelKey: `budget.documentType.${type}` }
}
