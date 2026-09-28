import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTableFilter } from '@shared/hooks'
import type { ArchiveMode } from '@shared/hooks'
import { AppColumn, IdentityCell, AppTag, AppEmptyState, ArchiveSwitch, SearchableTableFrame, useToast, archivedColumns, stickyActionsColumn, useCollapsibleActionsColumn, identifierClass, reducedFloorTablePt, Timestamp } from '@shared/ui'
import type { RedatorData } from '@shared/types/generated'
import { idoneidade, IDONEIDADE_SEVERITY, type ArchivableRow } from '@shared/lib'
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
  // Em 390x844 os três ícones deixavam só a inicial do nome à vista (UI-01 de
  // Pessoas): abaixo de `sm` a linha colapsa num menu e a coluna encolhe junto.
  const colunaDeAcoes = useCollapsibleActionsColumn(archived ? '10rem' : '12rem')

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
      // UI-03 de `2026-09-04-lotus-ui-review-personas.md`: o piso default
      // rolava em 1024x768 e a coluna presa cobria "Último acceso".
      pt={reducedFloorTablePt}
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
        body={(r: RedatorData) => <span className={`${identifierClass} text-sm`}>{r.rut}</span>}
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
        body={(r: RedatorData) => (r.last_login ? <Timestamp value={new Date(r.last_login)} /> : '—')}
        style={largura.lastLogin}
      />
      {archived && archivedColumns(t)}
      <AppColumn
        body={(r: RedatorRow) => (
          <RedatorRowActions
            redator={r}
            archived={archived}
            busy={busy}
            onView={onView}
            onArchive={onArchive}
            onRestore={onRestore}
            collapsed={colunaDeAcoes.collapsed}
            // Reenviar convite é ação de acesso, e acesso arquivado não existe:
            // o `User` do redator desce com a cascata, então a ação só vale na
            // lista ativa — e é lá que `leading` entra.
            leading={[
              {
                label: t('redator.resendInvitation'),
                icon: 'pi pi-envelope',
                tooltip: true,
                disabled: invitation.isPending,
                onClick: () => reenviar(r.id!),
              },
            ]}
          />
        )}
        style={stickyActionsColumn(colunaDeAcoes.width)}
      />
    </SearchableTableFrame>
  )
}
