import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppAvatar, AppTag, AppButton, AppEmptyState, ConfirmDialog } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'
import { enrollmentStatusLabelKey, enrollmentStatusSeverity } from '../../lib/enrollmentStatus'

type Props = {
  enrollments: EnrollmentData[]
  loading: boolean
  onRemove: (enrollmentId: number, options?: { onSuccess?: () => void }) => void
  removing: boolean
  removeError?: string
  onResetRemove: () => void
  error?: { detail?: string | null } | null
  onRetry?: () => void
}

// Sem coluna CLIENTE: EnrollmentData não expõe cliente (a turma tem um único
// cliente, já mostrado no cabeçalho da página) — desvio consciente da spec
// (§3), não uma lacuna.
export function EnrollmentTable({
  enrollments, loading, onRemove, removing, removeError, onResetRemove, error, onRetry,
}: Props) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<EnrollmentData | null>(null)
  const [first, setFirst] = useState(0)

  // Clamp do ESTADO, não só da leitura (mesmo raciocínio do useTableFilter):
  // sem isto, a lista encolher e crescer de novo sem trocar de página reexuma
  // a página obsoleta.
  if (first >= enrollments.length && first !== 0) {
    setFirst(0)
  }

  return (
    <>
      <AppDataTable
        value={enrollments}
        loading={loading}
        error={error}
        onRetry={onRetry}
        first={first >= enrollments.length ? 0 : first}
        onPage={(e) => setFirst(e.first)}
        footerCount={t('operation.enrollment.footerCount', { count: enrollments.length })}
        emptyMessage={
          // Sem ação: matricular é o botão da toolbar, logo acima.
          <AppEmptyState
            icon="pi pi-users"
            title={t('operation.enrollment.empty')}
            description={t('operation.enrollment.emptyHint')}
          />
        }
      >
        <AppColumn
          header={t('operation.enrollment.table.name')}
          body={(e: EnrollmentData) => (
            <div className="flex items-center gap-3">
              <AppAvatar name={e.name} />
              <span className="font-medium">{e.name}</span>
            </div>
          )}
        />
        <AppColumn header={t('operation.enrollment.table.rut')} field="rut" />
        <AppColumn
          header={t('operation.enrollment.table.status')}
          body={(e: EnrollmentData) =>
            e.approval_status ? (
              <AppTag
                value={t(enrollmentStatusLabelKey(e.approval_status))}
                severity={enrollmentStatusSeverity(e.approval_status)}
              />
            ) : null
          }
        />
        <AppColumn
          body={(e: EnrollmentData) => (
            <AppButton
              icon="pi pi-times"
              text
              rounded
              severity="danger"
              disabled={removing}
              aria-label={t('operation.enrollment.remove')}
              onClick={() => setPending(e)}
            />
          )}
          style={{ width: '4rem' }}
        />
      </AppDataTable>

      <ConfirmDialog
        visible={pending !== null}
        title={t('operation.enrollment.removeTitle')}
        message={t('operation.enrollment.removeConfirm', { name: pending?.name ?? '' })}
        confirmLabel={t('operation.enrollment.remove')}
        severity="danger"
        pending={removing}
        error={removeError}
        onConfirm={() => {
          if (pending?.id == null || removing) return
          onRemove(pending.id, { onSuccess: () => setPending(null) })
        }}
        onCancel={() => {
          onResetRemove()
          setPending(null)
        }}
      />
    </>
  )
}
