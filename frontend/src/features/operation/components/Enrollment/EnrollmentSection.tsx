import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton, AppCardToolbar, ArchiveSwitch, FormErrorBanner } from '@shared/ui'
import type { TurmaData } from '@shared/types/generated'
import { useEnrollmentSection } from '../../hooks/useEnrollmentSection'
import { useEnrollmentsArchived } from '../../hooks/useEnrollmentsArchived'
import { registroAcademicoBloqueado } from '../../lib/turmaStatus'
import { ArchivedEnrollmentsList } from './ArchivedEnrollmentsList'
import { EnrollmentTable } from './EnrollmentTable'
import { EnrollStudentForm } from './EnrollStudentForm'
import { ImportDialog } from './ImportDialog'

export function EnrollmentSection({ turma }: { turma: TurmaData }) {
  const { t } = useTranslation()
  const s = useEnrollmentSection(turma)
  const arquivadas = useEnrollmentsArchived(turma.id!)
  const emArquivados = arquivadas.mode === 'archived'
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  // RN-15: `EnrollStudentAction` e `ImportStudentsAction` recusam a escrita com
  // 422 numa turma concluída — os dois botões somem em vez de abrirem diálogo
  // para uma gravação que a API sempre nega.
  const bloqueado = registroAcademicoBloqueado(turma)

  return (
    <>
      <AppCardToolbar
        // Grupo de botões à ESQUERDA, sem busca — é o que o protótipo mostra na
        // aba Alumnos (packet, "Aba sem busca").
        start={
          s.loadError || emArquivados || bloqueado ? undefined : (
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
        end={<ArchiveSwitch value={arquivadas.mode} onChange={arquivadas.setMode} />}
      />

      {/* O `s.error` é do REMOVER, que só existe na visão ativa. Sem a guarda o
        * banner de uma remoção que falhou sobrevive à troca de visão e fica
        * pendurado sobre a lista de arquivadas, e o único jeito de limpá-lo
        * (`s.resetRemove`) mora no diálogo do `EnrollmentTable`, que ali nem
        * está montado. */}
      {!emArquivados && (
        <div className="mx-4 empty:m-0">
          <FormErrorBanner message={s.error} />
        </div>
      )}

      {emArquivados ? (
        <ArchivedEnrollmentsList
          enrollments={arquivadas.items}
          loading={arquivadas.loading}
          error={arquivadas.error}
          onRetry={arquivadas.refetch}
          onRestore={arquivadas.restore}
          restoring={arquivadas.restoring}
        />
      ) : (
        <EnrollmentTable
          turmaId={turma.id!}
          /* A tabela recebe `turmaId`, não a turma — o bloqueio viaja como
             booleano explícito para ela não precisar derivar o que não tem. */
          registroBloqueado={bloqueado}
          enrollments={s.enrollments}
          loading={s.loading}
          onRemove={s.remove}
          removing={s.removing}
          removeError={s.error}
          onResetRemove={s.resetRemove}
          error={s.loadError}
          onRetry={s.reload}
        />
      )}

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
