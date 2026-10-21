import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { ArchiveRowActions } from '@shared/ui'
import type { RowAction } from '@shared/ui'
import { dangerText } from '@shared/styles/tokens'
import type { CourseData } from '@shared/types/generated'
import { useCertificatePreviewOpener } from '../../hooks/useCertificatePreviewOpener'

/** Adaptador de curso para o `ArchiveRowActions` de `shared/ui`: traduz entidade
 * em permissões e cliques. A marcação e o `busy` vivem no componente
 * compartilhado desde o Q-3 do review de 2026-08-19. */
export function CourseRowActions({
  course,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
  collapsed,
}: {
  course: CourseData
  archived: boolean
  busy: boolean
  onView: (c: CourseData) => void
  onArchive: (c: CourseData) => void
  onRestore: (c: CourseData) => void
  collapsed: boolean
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const preview = useCertificatePreviewOpener()

  // A amostra é do curso ativo (a linha arquivada só restaura) e segue o gate
  // do PDF emitido. Esconder o botão é conveniência: a API é quem autoriza.
  const leading: RowAction[] = can('certification.certificate.view')
    ? [{
        label: t('course.certificatePreview'),
        icon: 'pi pi-file-pdf',
        onClick: () => preview.open(course.id!),
        disabled: preview.pending,
      }]
    : []

  return (
    <div className="flex flex-col items-end gap-1">
      <ArchiveRowActions
        archived={archived}
        busy={busy}
        canRestore={can('catalog.course.restore')}
        canArchive={can('catalog.course.delete')}
        onRestore={() => onRestore(course)}
        onArchive={() => onArchive(course)}
        onView={() => onView(course)}
        collapsed={collapsed}
        leading={leading}
      />
      {/* Um aviso só, na forma do `StudentCertificateCell`: popup bloqueado tem
          texto próprio, o resto é a mensagem do erro. */}
      {(preview.popupBlocked || preview.message) && (
        <span className="text-xs" style={{ color: dangerText }}>
          {preview.popupBlocked ? t('certificate.popupBlocked') : preview.message}
        </span>
      )}
    </div>
  )
}
