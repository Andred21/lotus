import { useEntityForm, useMutationErrors } from '@shared/hooks'
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

export function useBudgetForm(budget: BudgetData | null, mode: BudgetDialogMode, onDone: () => void) {
  const { form, set, readOnly } = useEntityForm<BudgetFormFields>(budget, mode, EMPTY, toFields)
  const create = budgetsApi.useCreate()
  const update = budgetsApi.useUpdate()

  function submit() {
    if (mode === 'create') {
      create.mutate(
        { client_id: form.client_id, payment_terms: form.payment_terms },
        { onSuccess: onDone },
      )
      return
    }
    // Em edit o backend só aceita payment_terms; client_id vai junto porque o DTO
    // o exige na validação, mas o controller o ignora (é imutável por construção).
    update.mutate(
      { id: budget!.id!, payload: { client_id: form.client_id, payment_terms: form.payment_terms } },
      { onSuccess: onDone },
    )
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return { form, set, readOnly, submit, pending: create.isPending || update.isPending, fieldErrors, generalError }
}
