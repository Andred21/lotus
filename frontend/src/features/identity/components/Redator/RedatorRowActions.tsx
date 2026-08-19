import { usePermissions } from '@shared/hooks'
import { ArchiveRowActions } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'

/** Adaptador de redator para o `ArchiveRowActions` de `shared/ui` (Q-3 do review
 * de 2026-08-19). O 422 do gate de turma em andamento (spec D3) continua vindo do
 * servidor e aparecendo no toast: `identity.user.delete` não é a mesma pergunta. */
export function RedatorRowActions({
  redator,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
}: {
  redator: RedatorData
  archived: boolean
  busy: boolean
  onView: (r: RedatorData) => void
  onArchive: (r: RedatorData) => void
  onRestore: (r: RedatorData) => void
}) {
  const { can } = usePermissions()

  return (
    <ArchiveRowActions
      archived={archived}
      busy={busy}
      canRestore={can('identity.user.restore')}
      canArchive={can('identity.user.delete')}
      onRestore={() => onRestore(redator)}
      onArchive={() => onArchive(redator)}
      onView={() => onView(redator)}
    />
  )
}
