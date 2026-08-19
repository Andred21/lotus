import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton, AppCard, ConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { RedatorData } from '@shared/types/generated'
import { useRedatoresPage } from '../hooks/useRedatoresPage'
import { useRedatoresArchived } from '../hooks/useRedatoresArchived'
import { useStudentsPage } from '../hooks/useStudentsPage'
import { RedatoresTable } from './Redator/RedatoresTable'
import { RedatorDialog } from './Redator/RedatorDialog'
import { StudentsTable } from './Student/StudentsTable'
import { StudentDialog } from './Student/StudentDialog'

export function PeoplePage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const page = useRedatoresPage()
  const students = useStudentsPage()
  const redatoresArchived = useRedatoresArchived()
  const [toArchive, setToArchive] = useState<RedatorData | null>(null)
  const archived = redatoresArchived.mode === 'archived'

  const [params, setParams] = useSearchParams()
  const deepLinkId = params.get('redator')
  const [consumed, setConsumed] = useState<string | null>(null)

  // Abrir o diálogo é mudança de estado: vai no corpo do render (o padrão da
  // casa), nunca num useEffect — `react-hooks/set-state-in-effect` proíbe.
  if (deepLinkId !== null && deepLinkId !== consumed) {
    setConsumed(deepLinkId)
    const id = Number(deepLinkId)
    if (Number.isInteger(id) && id > 0) page.openViewById(id)
  }

  // Limpar a URL é efeito colateral de navegação, não setState: aqui o effect é
  // o lugar certo. `replace` para o botão Voltar não reabrir o diálogo.
  useEffect(() => {
    if (deepLinkId === null) return
    const next = new URLSearchParams(params)
    next.delete('redator')
    setParams(next, { replace: true })
  }, [deepLinkId, params, setParams])

  return (
    <ModulePage title={t('module.personas.title')} description={t('module.personas.description')}>
      <AppCard>
        <ModuleTabs>
          <ModuleTab header={t('redator.tabRedatores')}>
            <RedatoresTable
              redatores={archived ? redatoresArchived.items : page.items}
              loading={archived ? redatoresArchived.loading : page.loading}
              error={archived ? redatoresArchived.error : page.error}
              onRetry={archived ? redatoresArchived.refetch : page.refetch}
              mode={redatoresArchived.mode}
              onModeChange={redatoresArchived.setMode}
              onArchive={setToArchive}
              onRestore={(r) => r.id != null && redatoresArchived.restore(r.id)}
              busy={redatoresArchived.restoring || redatoresArchived.archiving}
              onView={page.openView}
              actions={
                can('identity.user.create')
                  ? <AppButton variant="brandIcon" label={t('redator.new')} icon="pi pi-user-plus" onClick={page.openCreate} />
                  : undefined
              }
            />
          </ModuleTab>

          <ModuleTab header={t('redator.tabStudents')}>
            <StudentsTable
              students={students.items}
              loading={students.loading}
              error={students.error}
              onRetry={students.refetch}
              onView={students.openView}
              actions={
                can('identity.user.create')
                  ? <AppButton variant="brandIcon" label={t('student.new')} icon="pi pi-user-plus" onClick={students.openCreate} />
                  : undefined
              }
            />
          </ModuleTab>
        </ModuleTabs>
      </AppCard>

      {/* Em `view` sem entidade (deep link enquanto o GET não voltou, ou id
          inexistente) não há o que mostrar: um diálogo de campos vazios é pior
          que nenhum. `create` não tem entidade por definição. */}
      {page.dialog && (page.dialog.mode === 'create' || page.dialog.entity) && (
        <RedatorDialog
          visible
          mode={page.dialog.mode}
          redator={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}

      {students.dialog && (
        <StudentDialog
          visible
          mode={students.dialog.mode}
          student={students.dialog.entity}
          onHide={students.close}
          onEdit={can('identity.user.update') ? students.startEdit : undefined}
        />
      )}

      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      {toArchive && (
        <ConfirmDialog
          visible
          title={t('archive.confirmArchiveTitle')}
          message={t('archive.confirmArchiveBody')}
          confirmLabel={t('archive.archiveAction')}
          severity="danger"
          pending={redatoresArchived.archiving}
          onConfirm={() =>
            toArchive.id != null &&
            redatoresArchived.archive(toArchive.id, { onSuccess: () => setToArchive(null) })
          }
          onCancel={() => setToArchive(null)}
        />
      )}
    </ModulePage>
  )
}
