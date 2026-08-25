import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import { AppColumn, IdentityCell, AppTag, AppButton, AppEmptyState, ArchiveSwitch, SearchableTableFrame, useToast, archivedColumns, stickyActionsColumn } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade, IDONEIDADE_SEVERITY, formatDateTime, type ArchivableRow } from '@shared/lib'
import { useRedatorInvitation } from '../../hooks/useRedatorInvitation'
import { RedatorRowActions } from './RedatorRowActions'
import { redatorWidths } from './redatorColumns'

/** A mesma tabela serve as duas fontes. O par de campos do rastreio vive em
 * `ArchivableRow` — estava declarado à mão em 8 arquivos (D-53). */
export type RedatorRow = ArchivableRow<RedatorData>

export function RedatoresTable({
  redatores, loading, onView, actions, error, onRetry,
  mode, onModeChange, onArchive, onRestore, busy,
}: {
  redatores: RedatorRow[]
  loading: boolean
  onView: (r: RedatorData) => void
  mode: ArchiveMode
  onModeChange: (mode: ArchiveMode) => void
  onArchive: (r: RedatorData) => void
  onRestore: (r: RedatorData) => void
  /** Arquivar/restaurar em voo — trava os botões da linha (Q-2). */
  busy: boolean
  actions?: ReactNode
  error?: { detail?: string | null } | null
  /** Repassa o refetch da página: é a promise que mantém o Reintentar do
   * AppErrorState em `loading` (Q-14). Tipar `() => void` aqui compilaria e
   * faria a camada do meio mentir sobre o contrato. */
  onRetry?: () => void | Promise<unknown>
}) {
  const { t } = useTranslation()
  const archived = mode === 'archived'
  const largura = redatorWidths(archived)
  const table = useTableFilter(redatores, (r) => [r.name, r.rut])
  const toast = useToast()
  const invitation = useRedatorInvitation()

  // O convite é o ÚNICO caminho de credencial: quem foi cadastrado antes deste
  // bloco nasceu com senha aleatória que ninguém recebeu.
  const reenviar = (id: number) =>
    invitation.mutate(id, {
      onSuccess: () => toast.success(t('redator.invitationSent')),
      onError: () => toast.error(t('redator.invitationFailed')),
    })

  return (
    <SearchableTableFrame
      table={table}
      searchPlaceholder={t('redator.searchPlaceholder')}
      emptyState={
        <AppEmptyState
          icon={archived ? 'pi pi-inbox' : 'pi pi-users'}
          title={archived ? t('archive.empty') : t('redator.empty')}
          description={archived ? t('archive.emptyHint') : t('redator.emptyHint')}
          action={archived ? undefined : actions}
        />
      }
      footerCount={t('redator.count', { count: table.rows.length })}
      actions={archived ? undefined : actions}
      viewSwitch={<ArchiveSwitch value={mode} onChange={onModeChange} />}
      loading={loading}
      error={error}
      onRetry={onRetry}
    >
      <AppColumn
        field="name"
        header={t('redator.name')}
        sortable
        body={(r: RedatorData) => (
          <IdentityCell title={r.name} description={r.email} image={r.photo_url} />
        )}
        style={largura.name}
      />
      <AppColumn
        header={t('common.rut')}
        body={(r: RedatorData) => <span className="font-mono text-sm">{r.rut}</span>}
        style={largura.rut}
      />
      <AppColumn
        header={t('redator.enabledCourses')}
        body={(r: RedatorData) => <span className="font-semibold">{r.course_ids.length}</span>}
        style={largura.courses}
      />
      <AppColumn
        header={t('redator.suitability')}
        body={(r: RedatorData) => {
          const k = idoneidade(r)
          return <AppTag value={t(`suitability.${k}`)} severity={IDONEIDADE_SEVERITY[k]} />
        }}
        style={largura.suitability}
      />
      <AppColumn
        field="last_login"
        header={t('common.lastLogin')}
        sortable
        body={(r: RedatorData) => (r.last_login ? formatDateTime(new Date(r.last_login)) : '—')}
        style={largura.lastLogin}
      />
      {archived && archivedColumns(t)}
      <AppColumn
        body={(r: RedatorRow) => (
          <div className="flex justify-end">
            {/* Reenviar convite é ação de acesso, e acesso arquivado não existe:
              * o `User` do redator desce com a cascata, então o botão só aparece
              * na lista ativa. */}
            {!archived && (
              <AppButton
                icon="pi pi-envelope"
                text
                rounded
                aria-label={t('redator.resendInvitation')}
                tooltip={t('redator.resendInvitation')}
                disabled={invitation.isPending}
                onClick={() => reenviar(r.id!)}
              />
            )}
            <RedatorRowActions
              redator={r}
              archived={archived}
              busy={busy}
              onView={onView}
              onArchive={onArchive}
              onRestore={onRestore}
            />
          </div>
        )}
        style={stickyActionsColumn(archived ? '10rem' : '12rem')}
      />
    </SearchableTableFrame>
  )
}
