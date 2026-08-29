import { useTranslation } from 'react-i18next'
import { AppDataTable, AppColumn, AppTag, AppButton, AppEmptyState, IdentityCell, stickyActionsColumn, identifierClass } from '@shared/ui'
import { useTableFilter } from '@shared/hooks'
import type { EmissionPanelEnrollmentData, EnrollmentApprovalStatus } from '@shared/types/generated'
import { rowCertKind } from '../../lib/certStatus'
import type { EmissionCounts } from '../../hooks/useEmissionPanelState'
import { emissionWidths } from './emissionColumns'

type Props = {
  enrollments: EmissionPanelEnrollmentData[]
  /** Vem derivado de `useEmissionPanelState` — o rodapé não recalcula
   * `total`/`aprobados` a partir de `enrollments`. */
  counts: EmissionCounts
  loading: boolean
  /** `emission_blocked !== null` da turma selecionada — desabilita `Emitir`
   * mesmo em linha `sin_emitir` (a porta que falta é da turma, não do aluno). */
  blocked: boolean
  onEmit: (enrollment: EmissionPanelEnrollmentData) => void
  onView: (enrollment: EmissionPanelEnrollmentData) => void
}

const STATUS_SEVERITY: Record<EnrollmentApprovalStatus, 'success' | 'danger' | 'warning'> = {
  aprobado: 'success',
  reprobado: 'danger',
  pendiente: 'warning',
}

/** Molde `EnrollmentTable`: `AppDataTable` sem toolbar própria (a seleção de
 * turma e as ações de lote vivem em `EmissionPanel`, que é quem monta o card). */
export function EmissionStudentsTable({ enrollments, counts, loading, blocked, onEmit, onView }: Props) {
  const { t } = useTranslation()
  const largura = emissionWidths()
  const table = useTableFilter(enrollments)

  return (
    <AppDataTable
      /* O DTO desta tabela não tem `id`: a chave é `enrollment_id`. Com o
       * default do wrapper, cada linha resolvia a chave para `undefined` e o
       * React acusava no console (f3 UI-06, run de 2026-08-28). */
      dataKey="enrollment_id"
      value={table.rows}
      loading={loading}
      first={table.first}
      onPage={table.onPage}
      footerCount={t('certificate.studentsCount', { total: counts.total, approved: counts.aprobados })}
      emptyMessage={<AppEmptyState icon="pi pi-users" title={t('certificate.emptyStudents')} />}
    >
      <AppColumn
        header={t('certificate.colName')}
        field="student_name"
        body={(e: EmissionPanelEnrollmentData) => (
          <IdentityCell
            title={e.student_name}
            description={<span className={identifierClass}>{e.student_rut}</span>}
            image={e.student_photo_url}
          />
        )}
        style={largura.name}
      />
      <AppColumn
        header={t('certificate.colFinalGrade')}
        body={(e: EmissionPanelEnrollmentData) => e.nota_final ?? '—'}
        style={largura.finalGrade}
      />
      <AppColumn
        header={t('certificate.colAttendance')}
        body={(e: EmissionPanelEnrollmentData) => e.attendance_pct ?? '—'}
        style={largura.attendance}
      />
      <AppColumn
        header={t('certificate.colAcadStatus')}
        body={(e: EmissionPanelEnrollmentData) => (
          <AppTag value={t(`certificate.${e.approval_status}`)} severity={STATUS_SEVERITY[e.approval_status]} />
        )}
        style={largura.acadStatus}
      />
      <AppColumn
        header={t('certificate.colCertificate')}
        body={(e: EmissionPanelEnrollmentData) => {
          const kind = rowCertKind(e)
          if (kind === 'emitido') return `✓ ${e.certificate?.codigo}`
          return t(kind === 'sin_emitir' ? 'certificate.sinEmitir' : 'certificate.noCorresponde')
        }}
        style={largura.certificate}
      />
      <AppColumn
        body={(e: EmissionPanelEnrollmentData) => {
          const kind = rowCertKind(e)
          if (kind === 'emitido') {
            return <AppButton label={t('certificate.view')} text onClick={() => onView(e)} />
          }
          if (kind === 'sin_emitir') {
            return <AppButton label={t('certificate.emit')} text disabled={blocked} onClick={() => onEmit(e)} />
          }
          return null
        }}
        style={stickyActionsColumn('8rem')}
      />
    </AppDataTable>
  )
}
