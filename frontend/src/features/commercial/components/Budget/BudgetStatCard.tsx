import { AppCard, StatValue } from '@shared/ui'
import type { AppCardTone } from '@shared/ui'
import { formatUf } from '@shared/lib'

/** O número É o sinal: o `AppCard variant="stat"` já tinge texto, fundo e borda
 * pelo `tone`, então aqui não há cor nenhuma — só composição. */
export function BudgetStatCard({ label, value, tone }: { label: string; value?: string; tone?: AppCardTone }) {
  return (
    <AppCard variant="stat" tone={tone}>
      <p><StatValue size="card">{formatUf(value ?? '0')} UF</StatValue></p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-color-secondary)' }}>{label}</p>
    </AppCard>
  )
}
