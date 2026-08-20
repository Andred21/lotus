import { usePermissions } from '@shared/hooks'
import { ArchiveRowActions } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'

/** Adaptador de turma para o `ArchiveRowActions` de `shared/ui` (Q-3 do review de
 * 2026-08-19). O 422 da RN-15 (turma concluída) e o do gate de redator arquivado
 * continuam vindo do servidor e aparecendo no toast: `operation.turma.delete` não
 * é a mesma pergunta. */
export function TurmaRowActions({
  turma,
  archived,
  busy,
  onView,
  onArchive,
  onRestore,
}: {
  turma: TurmaData
  archived: boolean
  busy: boolean
  onView: (t: TurmaData) => void
  onArchive: (t: TurmaData) => void
  onRestore: (t: TurmaData) => void
}) {
  const { can } = usePermissions()

  return (
    <ArchiveRowActions
      archived={archived}
      busy={busy}
      canRestore={can('operation.turma.restore')}
      canArchive={can('operation.turma.delete')}
      onRestore={() => onRestore(turma)}
      onArchive={() => onArchive(turma)}
      onView={() => onView(turma)}
    />
  )
}
