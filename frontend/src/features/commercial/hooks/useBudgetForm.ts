import { useCrudForm } from '@shared/hooks'
import type { BudgetData } from '@shared/types/generated'
import type { DialogMode } from '@shared/lib'
import { budgetsApi } from '@shared/api/budgetsApi'

export type BudgetDialogMode = DialogMode

/** Só os campos que o formulário edita. Totais, status, código e cotações são
 * derivados do servidor e nunca voltam no payload. */
export type BudgetFormFields = Pick<BudgetData, 'id' | 'client_id' | 'payment_terms'>

const EMPTY: BudgetFormFields = { id: undefined, client_id: 0, payment_terms: null }

const toFields = (b: BudgetFormFields): BudgetFormFields =>
  structuredClone({ id: b.id, client_id: b.client_id, payment_terms: b.payment_terms })

export function useBudgetForm(
  budget: BudgetData | null,
  mode: BudgetDialogMode,
  onDone: () => void,
  onCreated?: (created: BudgetData) => void,
) {
  // O orçamento nasce vazio (só cliente e forma de pagamento): cotação e
  // documento são POSTs sob /budgets/{id}, então precisam do id que só existe
  // depois deste create. Por isso `onCreated` entrega o orçamento a quem abriu
  // o dialog — quem leva o usuário à página de detalhe, onde o cadastro de
  // fato continua. `afterCreate` do `useCrudForm` é sempre esperado antes do
  // `onDone`, então esta migração inverte a ordem: hoje `onDone()` e depois
  // `onCreated()`, passa a ser `onCreated()` e depois `onDone()` (spec D15).
  const crud = useCrudForm<BudgetFormFields, BudgetData>(budgetsApi, {
    entity: budget,
    mode,
    empty: EMPTY,
    toFields,
    // Em edit o backend só aceita payment_terms; client_id vai junto porque o
    // DTO o exige na validação, e o controller o ignora (imutável por construção).
    toPayload: (f) => ({ client_id: f.client_id, payment_terms: f.payment_terms }),
    mapped: ['client_id', 'payment_terms'],
    summaryOnly: [],
    onDone,
    afterCreate: onCreated,
  })

  return crud
}
