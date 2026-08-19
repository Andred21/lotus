import { useTranslation } from 'react-i18next'
import { usePermissions } from '@shared/hooks'
import { AppButton } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'

/**
 * Ações por linha da tabela de turmas. Molde do `ClientRowActions`.
 *
 * Em `archived` o olho SAI: `GET /api/turmas/{turma}` usa o binding padrão e não
 * enxerga soft-deletada — o botão levaria a uma tela de 404.
 *
 * Esconder o botão é conveniência de interface — a autorização real é da API
 * (ADR-07). O 422 da RN-15 (turma concluída) continua vindo do servidor e
 * aparecendo no toast: `operation.turma.delete` não é a mesma pergunta.
 */
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
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  onView: (t: TurmaData) => void
  onArchive: (t: TurmaData) => void
  onRestore: (t: TurmaData) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()

  if (archived) {
    return can('operation.turma.restore') ? (
      <AppButton
        label={t('archive.restoreAction')}
        icon="pi pi-undo"
        text
        size="small"
        disabled={busy}
        onClick={() => onRestore(turma)}
      />
    ) : null
  }

  return (
    <div className="flex justify-end gap-1">
      {can('operation.turma.delete') && (
        <AppButton
          icon="pi pi-inbox"
          text
          rounded
          aria-label={t('archive.archiveAction')}
          disabled={busy}
          onClick={() => onArchive(turma)}
        />
      )}
      <AppButton
        icon="pi pi-eye"
        text
        rounded
        aria-label={t('common.view')}
        onClick={() => onView(turma)}
      />
    </div>
  )
}
