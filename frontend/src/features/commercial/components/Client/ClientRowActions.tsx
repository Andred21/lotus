import { usePermissions } from '@shared/hooks'
import { ArchiveRowActions } from '@shared/ui'
import type { ClientData } from '@shared/types/generated'

/** Adaptador de cliente para o `ArchiveRowActions` de `shared/ui` (Q-3 do review
 * de 2026-08-19). */
export function ClientRowActions({
  client,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
  collapsed,
}: {
  client: ClientData
  archived: boolean
  busy: boolean
  onView: (c: ClientData) => void
  onArchive: (c: ClientData) => void
  onRestore: (c: ClientData) => void
  collapsed?: boolean
}) {
  const { can } = usePermissions()

  return (
    <ArchiveRowActions
      archived={archived}
      busy={busy}
      canRestore={can('commercial.client.restore')}
      canArchive={can('commercial.client.delete')}
      onRestore={() => onRestore(client)}
      onArchive={() => onArchive(client)}
      onView={() => onView(client)}
      collapsed={collapsed}
    />
  )
}
