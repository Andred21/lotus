import { usePermissions } from '@shared/hooks'
import { ArchiveRowActions } from '@shared/ui'
import type { UserData } from '@shared/types/generated'

/** Adaptador de usuário staff para o `ArchiveRowActions` de `shared/ui`, com UMA
 * diferença que só ele tem: as duas ações são guardadas pela MESMA permissão,
 * `identity.access.manage`. Não é descuido — é a spec D7: essa permissão é
 * SEGREGADA (só superadmin), e dar ao restore um guard mais frouxo deixaria
 * alguém devolver um staff que nunca teria podido arquivar. */
export function UserRowActions({
  user,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
}: {
  user: UserData
  archived: boolean
  busy: boolean
  onView: (u: UserData) => void
  onArchive: (u: UserData) => void
  onRestore: (u: UserData) => void
}) {
  const { can } = usePermissions()
  const canManage = can('identity.access.manage')

  return (
    <ArchiveRowActions
      archived={archived}
      busy={busy}
      canRestore={canManage}
      canArchive={canManage}
      onRestore={() => onRestore(user)}
      onArchive={() => onArchive(user)}
      onView={() => onView(user)}
    />
  )
}
