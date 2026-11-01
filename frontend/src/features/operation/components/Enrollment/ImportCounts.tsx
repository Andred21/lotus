import { useTranslation } from 'react-i18next'
import type { ImportRowStatus } from '@shared/types/generated'
import { AppTag } from '@shared/ui'
import { STATUS_TONE } from '../../hooks/useImportStudentsFlow'

// Ordem da D7; o tom de cada situação vem do `STATUS_TONE`.
const ORDER: ImportRowStatus[] = ['new', 'registered', 'moves', 'already_enrolled', 'error']

/** Contagens por situação, no topo da triagem. Situação sem linha não aparece. */
export function ImportCounts({ counts }: { counts: Record<ImportRowStatus, number> }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ORDER.filter((status) => counts[status] > 0).map((status) => (
        <AppTag
          key={status}
          severity={STATUS_TONE[status]}
          value={t(`operation.enrollment.import.counts.${status}`, { count: counts[status] })}
        />
      ))}
    </div>
  )
}
