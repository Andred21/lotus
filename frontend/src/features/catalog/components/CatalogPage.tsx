import { useTranslation } from 'react-i18next'
import { ModulePage, AppButton, AppCard } from '@shared/ui'
import { useCoursesPage } from '../hooks/useCoursesPage'
import { CoursesTable } from './Course/CoursesTable'
import { CourseDialog } from './Course/CourseDialog'

export function CatalogPage() {
  const { t } = useTranslation()
  const page = useCoursesPage()

  return (
    <ModulePage title={t('module.cursos.title')} description={t('module.cursos.description')}>
      <AppCard>
        <CoursesTable
          courses={page.items}
          loading={page.loading}
          onView={page.openView}
          actions={<AppButton variant="brandIcon" label={t('course.new')} icon="pi pi-plus" onClick={page.openCreate} />}
        />
      </AppCard>

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
