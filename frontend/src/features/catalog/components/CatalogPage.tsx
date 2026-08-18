import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, AppButton, AppCard, ConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { CourseData } from '@shared/types/generated'
import { useCoursesPage } from '../hooks/useCoursesPage'
import { useCoursesArchived } from '../hooks/useCoursesArchived'
import { CoursesTable } from './Course/CoursesTable'
import { CourseDialog } from './Course/CourseDialog'

export function CatalogPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const page = useCoursesPage()
  const archivedPage = useCoursesArchived()
  const [toArchive, setToArchive] = useState<CourseData | null>(null)
  const archived = archivedPage.mode === 'archived'

  return (
    <ModulePage title={t('module.cursos.title')} description={t('module.cursos.description')}>
      <AppCard>
        <CoursesTable
          courses={archived ? archivedPage.items : page.items}
          loading={archived ? archivedPage.loading : page.loading}
          error={archived ? archivedPage.error : page.error}
          onRetry={archived ? archivedPage.refetch : page.refetch}
          mode={archivedPage.mode}
          onModeChange={archivedPage.setMode}
          onArchive={setToArchive}
          onRestore={(c) => c.id != null && archivedPage.restore(c.id)}
          busy={archivedPage.restoring || archivedPage.archiving}
          onView={page.openView}
          actions={
            can('catalog.course.create')
              ? <AppButton variant="brandIcon" label={t('course.new')} icon="pi pi-plus" onClick={page.openCreate} />
              : undefined
          }
        />
      </AppCard>

      {/* Restaurar NÃO pede confirmação: não é destrutivo (spec D9). */}
      {toArchive && (
        <ConfirmDialog
          visible
          title={t('archive.confirmArchiveTitle')}
          message={t('archive.confirmArchiveBody')}
          confirmLabel={t('archive.archiveAction')}
          severity="danger"
          pending={archivedPage.archiving}
          onConfirm={() =>
            toArchive.id != null &&
            archivedPage.archive(toArchive.id, { onSuccess: () => setToArchive(null) })
          }
          onCancel={() => setToArchive(null)}
        />
      )}

      {page.dialog && (
        <CourseDialog
          visible
          mode={page.dialog.mode}
          course={page.dialog.entity}
          onHide={page.close}
          onEdit={page.startEdit}
        />
      )}
    </ModulePage>
  )
}
