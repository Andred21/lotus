import type { QuoteData } from '@shared/types/generated'

export type TurmaTag = 'pending' | 'em_andamento' | 'concluida'

/** Tag da turma na cotação (spec D7). Só a cotação aprovada tem turma a
 * acompanhar: aprovada sem turma ainda é `pending` (a configurar); com turma, o
 * status dela. `turma_status` chega `undefined` ou `null` conforme o gerador —
 * os dois contam como "sem turma". Chave i18n: `quote.turmaTag.<valor>`. */
export function turmaTag(quote: QuoteData): TurmaTag | null {
  if (quote.status !== 'approved') return null

  return quote.turma_status ?? 'pending'
}

/** Neutra para a turma por configurar; as demais alinham ao `operation.status`. */
export function turmaTagSeverity(tag: TurmaTag): 'secondary' | 'info' | 'success' {
  if (tag === 'concluida') return 'success'
  if (tag === 'em_andamento') return 'info'
  return 'secondary'
}
