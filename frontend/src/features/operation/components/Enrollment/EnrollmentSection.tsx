import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppCardToolbar, FormErrorBanner } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { useEnrollmentSection } from '../../hooks/useEnrollmentSection'
import { EnrollmentTable } from './EnrollmentTable'
import { EnrollStudentForm } from './EnrollStudentForm'
import { ImportDialog } from './ImportDialog'

export function EnrollmentSection({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useEnrollmentSection(turma)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  return (
    <>
      <AppCardToolbar
        // Grupo de botões à ESQUERDA, sem busca — é o que o protótipo mostra na
        // aba Alumnos (packet, "Aba sem busca").
        start={
          s.loadError ? undefined : (
            <>
              <AppButton
                variant="brandIcon"
                label={t('operation.enrollment.importSheet')}
                icon="pi pi-upload"
                onClick={() => setImportOpen(true)}
              />
              <AppButton
                label={t('operation.enrollment.addStudent')}
                icon="pi pi-user-plus"
                outlined
                onClick={() => setAddOpen(true)}
              />
            </>
          )
        }
      />

      <div className="mx-4 empty:m-0">
        <FormErrorBanner message={s.error} />
      </div>

      <EnrollmentTable
        enrollments={s.enrollments}
        loading={s.loading}
        onRemove={s.remove}
        removing={s.removing}
        removeError={s.error}
        onResetRemove={s.resetRemove}
        error={s.loadError}
        onRetry={s.reload}
      />

      <EnrollStudentForm
        turmaId={turma.id!}
        turmaClientName={turma.client_name ?? null}
        visible={addOpen}
        onHide={() => setAddOpen(false)}
      />
      <ImportDialog turmaId={turma.id!} visible={importOpen} onHide={() => setImportOpen(false)} />
    </>
  )
}
