import { usePermissions } from '@shared/hooks'
import { ArchiveRowActions } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

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
}: {
  course: CourseData
  archived: boolean
  busy: boolean
  onView: (c: CourseData) => void
  onArchive: (c: CourseData) => void
  onRestore: (c: CourseData) => void
}) {
  const { can } = usePermissions()

  return (
    <ArchiveRowActions
      archived={archived}
      busy={busy}
      canRestore={can('catalog.course.restore')}
      canArchive={can('catalog.course.delete')}
      onRestore={() => onRestore(course)}
      onArchive={() => onArchive(course)}
      onView={() => onView(course)}
    />
  )
}
