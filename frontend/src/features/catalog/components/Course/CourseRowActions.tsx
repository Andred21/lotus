import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

/**
 * Ações por linha da tabela de cursos. Gêmeo do `ClientRowActions`, e extraído
 * pela mesma razão: a célula ramifica por modo e a régua de 150 linhas de
 * `features/<x>/components/` vale sem exceção.
 *
 * Esconder o botão é conveniência de interface — a autorização real é da API
 * (ADR-07).
 */
export function CourseRowActions({
  course,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
}: {
  course: CourseData
  archived: boolean
  /** Mutation em voo: sem isto o clique duplo dispara dois POSTs (Q-2). */
  busy: boolean
  onView: (c: CourseData) => void
  onArchive: (c: CourseData) => void
  onRestore: (c: CourseData) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()

  if (archived) {
    return can('catalog.course.restore') ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(course)}
      />
    ) : null
  }

  return (
    <div className="flex justify-end gap-1">
      {can('catalog.course.delete') && (
        <AppButton
          icon="pi pi-inbox"
          text
          rounded
          aria-label={t('archive.archiveAction')}
          disabled={busy}
          onClick={() => onArchive(course)}
        />
      )}
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.view')}
        onClick={() => onView(course)}
      />
    </div>
  )
}
