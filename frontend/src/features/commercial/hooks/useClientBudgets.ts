import { useState } from 'react'
import { useLoadState } from '@shared/hooks'
import { budgetsApi } from '@shared/api/budgetsApi'
import { currentCalendarPeriod, isWithinPeriod, type ListSource, type Period } from '@shared/lib'
import type { BudgetData, QuoteStatus } from '@shared/types/generated'
import { newestFirst } from '../lib/budgetOrder'

export type ClientPeriodKey = 'all' | 'week' | 'month' | 'year' | 'custom'

/** O período que cada preset recorta; `all` não recorta (`null`). */
function presetPeriod(preset: ClientPeriodKey, custom: Period): Period | null {
  if (preset === 'all') return null
  if (preset === 'custom') return custom

  return currentCalendarPeriod(preset, new Date())
}

/**
 * Orçamentos de UM cliente, para o diálogo dele: busca por código, estado e
 * período, tudo no navegador. Lê `budgetsApi.useList()` — a mesma query e o
 * mesmo cache da aba Presupuestos —, então abrir o diálogo não faz requisição
 * nova e criar/arquivar orçamento já o atualiza.
 *
 * O período (`created_at`) compara o dia LOCAL (`isWithinPeriod`). `period` é o
 * que o `PeriodFilter` exibe: nos presets de calendário é o próprio recorte, em
 * `custom` é o que o usuário escolheu.
 */
export function useClientBudgets(clientId: number | null) {
  const state = useLoadState(budgetsApi.useList())
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<QuoteStatus | null>(null)
  const [preset, setPresetState] = useState<ClientPeriodKey>('all')
  const [custom, setCustom] = useState<Period>(() => currentCalendarPeriod('month', new Date()))

  const period = presetPeriod(preset, custom)
  const term = search.trim().toLowerCase()

  // A API não ordena: mais novo primeiro, como a aba Presupuestos (`BudgetsTable`).
  const rows = newestFirst(state.data).filter(
    (b) =>
      clientId !== null &&
      b.client_id === clientId &&
      (status === null || b.status === status) &&
      (term === '' || (b.code ?? '').toLowerCase().includes(term)) &&
      (period === null || (b.created_at !== undefined && isWithinPeriod(b.created_at, period))),
  )

  const load: ListSource<BudgetData> = {
    items: state.data,
    loading: state.isLoading,
    error: state.loadError,
    refetch: state.refetch,
  }

  return {
    rows,
    load,
    search,
    setSearch,
    status,
    setStatus,
    preset,
    // Ao abrir as datas, partem do recorte que já estava valendo.
    setPreset: (next: ClientPeriodKey) => {
      if (next === 'custom' && period) setCustom(period)
      setPresetState(next)
    },
    period: period ?? custom,
    setPeriod: setCustom,
    clear: () => {
      setSearch('')
      setStatus(null)
      setPresetState('all')
    },
  }
}
