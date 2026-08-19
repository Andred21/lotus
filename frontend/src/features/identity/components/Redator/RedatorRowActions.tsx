import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'

/**
 * Ações por linha da tabela de redatores. Molde exato do `ClientRowActions`:
 * extraído da tabela porque a célula ramifica por modo, e a régua de 150 linhas
 * de `features/<x>/components/` vale sem exceção.
 *
 * Em `archived` o olho SAI: `GET /api/redatores/{redator}` usa o binding padrão e
 * não enxerga soft-deletado — o botão levaria a um diálogo vazio.
 *
 * Esconder o botão é conveniência de interface — a autorização real é da API
 * (ADR-07).
 */
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
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  onView: (r: RedatorData) => void
  onArchive: (r: RedatorData) => void
  onRestore: (r: RedatorData) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()

  if (archived) {
    return can('identity.user.restore') ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(redator)}
      />
    ) : null
  }

  return (
    <div className="flex justify-end gap-1">
      {can('identity.user.delete') && (
        <AppButton
          icon="pi pi-inbox"
          text
          rounded
          aria-label={t('archive.archiveAction')}
          disabled={busy}
          onClick={() => onArchive(redator)}
        />
      )}
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.view')}
        onClick={() => onView(redator)}
      />
    </div>
  )
}
