import { useTranslation } from 'react-i18next'
import { AppButton } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import { useStudentsPage } from '../../hooks/useStudentsPage'
import { StudentsTable } from './StudentsTable'
import { StudentDialog } from './StudentDialog'

/**
 * A aba de alunos, dona do próprio dado — mesma razão da `RedatoresTab`: com o
 * hook no corpo da `PeoplePage`, abrir a tela buscava esta lista com a aba
 * fechada (D-04). Sem deep link: só a aba de redatores tem um.
 */
export function StudentsTab() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const students = useStudentsPage()

  return (
    <>
      <StudentsTable
        table={students.table}
        onView={students.openView}
        actions={
          can('identity.user.create')
            ? <AppButton variant="primary" label={t('student.new')} icon="pi pi-user-plus" onClick={students.openCreate} />
            : undefined
        }
      />

      {students.dialog && (
        <StudentDialog
          visible
          mode={students.dialog.mode}
          student={students.dialog.entity}
          onHide={students.close}
          onEdit={can('identity.user.update') ? students.startEdit : undefined}
        />
      )}
    </>
  )
}
