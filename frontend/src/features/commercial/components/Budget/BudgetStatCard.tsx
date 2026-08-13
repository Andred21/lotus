import { AppCard } from '@shared/ui'
import type { AppCardTone } from '@shared/ui'
import { formatUf } from '../../lib/uf'

/** O número É o sinal: o `AppCard variant="stat"` já tinge texto, fundo e borda
 * pelo `tone`, então aqui não há cor nenhuma — só composição. */
export function BudgetStatCard({ label, value, tone }: { label: string; value?: string; tone?: AppCardTone }) {
  return (
    <AppCard variant="stat" tone={tone}>
      <p className="text-2xl font-semibold">{formatUf(value ?? '0')} UF</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{label}</p>
    </AppCard>
  )
}
