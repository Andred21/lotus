import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppAvatar, AppTag, AppButton } from '@shared/ui'
import type { EnrollmentData } from '@shared/types/generated'
import { enrollmentStatusLabelKey, enrollmentStatusSeverity } from '../../lib/enrollmentStatus'

type Props = {
  enrollments: EnrollmentData[]
  onRemove: (enrollmentId: number) => void
  removing: boolean
}

// Sem coluna CLIENTE: EnrollmentData não expõe cliente (a turma tem um único
// cliente, já mostrado no cabeçalho da página) — desvio consciente da spec
// (§3), não uma lacuna.
export function EnrollmentTable({ enrollments, onRemove, removing }: Props) {
  const { t } = useTranslation()

  if (enrollments.length === 0) {
    return <p className="p-4 text-sm text-slate-500">{t('operation.enrollment.empty')}</p>
  }

  return (
    <AppDataTable value={enrollments}>
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
            outlined
            severity="danger"
            disabled={removing}
            aria-label={t('operation.enrollment.remove')}
            onClick={() => {
              if (e.id == null) return
              if (window.confirm(t('operation.enrollment.removeConfirm', { name: e.name }))) {
                onRemove(e.id)
              }
            }}
          />
        )}
        style={{ width: '4rem' }}
      />
    </AppDataTable>
  )
}
