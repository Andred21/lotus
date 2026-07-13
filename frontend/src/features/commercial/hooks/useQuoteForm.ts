import { useState } from 'react'
import { useEntityForm, useMutationErrors } from '@shared/hooks'
import type { QuoteData } from '@shared/types/generated'
import { useCreateQuote, useUpdateQuote, type QuotePayload } from '../api/useQuotes'
import { formatUf, parseUfInput } from '../lib/uf'

/** Campos que o wizard edita. `value_uf` fica STRING o caminho todo: converter
 * para Number reintroduziria o float que o decimal do backend existe para evitar. */
export type QuoteFormFields = Pick<
  QuoteData,
  'id' | 'course_id' | 'student_count' | 'value_uf' | 'purchase_order' | 'planned_start_date' | 'planned_end_date'
>

const EMPTY: QuoteFormFields = {
  id: undefined,
  course_id: 0,
  student_count: 1,
  value_uf: '',
  purchase_order: null,
  planned_start_date: null,
  planned_end_date: null,
}

const toFields = (q: QuoteFormFields): QuoteFormFields =>
  structuredClone({
    id: q.id,
    course_id: q.course_id,
    student_count: q.student_count,
    // Pré-preenche no MESMO formato que a lista mostra (vírgula, es-CL) — o
    // valor cru do backend ("450.5000") ao lado da linha da lista mostrando
    // "450,5" induzia o usuário a "corrigir" para vírgula e gravar 10x o
    // valor. `parseUfInput` no submit devolve o ponto antes de enviar.
    value_uf: formatUf(q.value_uf),
    purchase_order: q.purchase_order,
    planned_start_date: q.planned_start_date,
    planned_end_date: q.planned_end_date,
  })

export function useQuoteForm(budgetId: number, quote: QuoteData | null, onDone: () => void) {
  const mode = quote ? 'edit' : 'create'
  const { form, set, didReset } = useEntityForm<QuoteFormFields>(quote, mode, EMPTY, toFields)
  const create = useCreateQuote()
  const update = useUpdateQuote()

  // Editar já tem curso escolhido: abre direto no passo 2 (dá para voltar e trocar).
  const [step, setStep] = useState<1 | 2>(quote ? 2 : 1)
  if (didReset) setStep(quote ? 2 : 1)

  const payload = (): QuotePayload => ({
    course_id: form.course_id,
    student_count: form.student_count,
    // Canoniza para ponto no envio: form.value_uf pode chegar aqui ainda no
    // formato de pré-preenchimento (vírgula) se o usuário não tocou no campo.
    value_uf: parseUfInput(form.value_uf),
    // QuoteData tipa esses três como `string | null | undefined` (DTO opcional);
    // QuotePayload não aceita `undefined`. EMPTY/toFields já normalizam para
    // null, `?? null` só fecha o tipo para o TS.
    purchase_order: form.purchase_order ?? null,
    planned_start_date: form.planned_start_date ?? null,
    planned_end_date: form.planned_end_date ?? null,
  })

  function submit() {
    if (quote) {
      update.mutate({ quoteId: quote.id!, payload: payload() }, { onSuccess: onDone })
      return
    }
    create.mutate({ budgetId, payload: payload() }, { onSuccess: onDone })
  }

  const { fieldErrors, generalError } = useMutationErrors([create.error, update.error])

  return {
    form,
    set,
    step,
    next: () => setStep(2),
    back: () => setStep(1),
    canAdvance: form.course_id > 0,
    submit,
    pending: create.isPending || update.isPending,
    fieldErrors,
    generalError,
  }
}
