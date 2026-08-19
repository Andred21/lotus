import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton } from '@shared/ui'
import type { UserData } from '@shared/types/generated'

/**
 * Ações por linha da tabela de usuários staff. Gêmeo do `RedatorRowActions`, com
 * UMA diferença: as duas ações são guardadas pela MESMA permissão,
 * `identity.access.manage`. Não é descuido — é a spec D7: essa permissão é
 * SEGREGADA (só superadmin), e dar ao restore um guard mais frouxo deixaria
 * alguém devolver um staff que nunca teria podido arquivar.
 */
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
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  onView: (u: UserData) => void
  onArchive: (u: UserData) => void
  onRestore: (u: UserData) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canManage = can('identity.access.manage')

  if (archived) {
    return canManage ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(user)}
      />
    ) : null
  }

  return (
    <div className="flex justify-end gap-1">
      {canManage && (
        <AppButton
          icon="pi pi-inbox"
          text
          rounded
          aria-label={t('archive.archiveAction')}
          disabled={busy}
          onClick={() => onArchive(user)}
        />
      )}
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.view')}
        onClick={() => onView(user)}
      />
    </div>
  )
}
