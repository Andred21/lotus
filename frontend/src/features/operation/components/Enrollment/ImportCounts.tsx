import { useTranslation } from 'react-i18next'
import type { ImportRowStatus } from '@shared/types/generated'
import { AppTag } from '@shared/ui'

type Severity = 'success' | 'warning' | 'danger' | 'secondary'

// Ordem e tom da D7: nuevos (sucesso), ya registrados (neutro), cambian de
// empresa (aviso), ya matriculados (neutro), con error (perigo).
const TONES: [ImportRowStatus, Severity][] = [
  ['new', 'success'],
  ['registered', 'secondary'],
  ['moves', 'warning'],
  ['already_enrolled', 'secondary'],
  ['error', 'danger'],
]

/** Contagens por situação, no topo da triagem. Situação sem linha não aparece. */
export function ImportCounts({ counts }: { counts: Record<ImportRowStatus, number> }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TONES.filter(([status]) => counts[status] > 0).map(([status, severity]) => (
        <AppTag
          key={status}
          severity={severity}
          value={t(`operation.enrollment.import.counts.${status}`, { count: counts[status] })}
        />
      ))}
    </div>
  )
}
