import { useTranslation } from 'react-i18next'
import { ModulePage, ModuleTabs, ModuleTab, AppButton } from '@shared/ui'
import { useCoursesPage } from '../hooks/useCoursesPage'
import { CoursesTable } from './Course/CoursesTable'
import { CourseDialog } from './Course/CourseDialog'

export function CatalogPage() {
  const { t } = useTranslation()
  const page = useCoursesPage()

  return (
    <ModulePage
      title={t('course.module')}
      description={t('course.moduleDescription')}
      actions={<AppButton variant="brandIcon" label={t('course.new')} icon="pi pi-plus" onClick={page.openCreate} />}
    >
      <ModuleTabs>
        <ModuleTab header={t('course.tabCourses')}>
          <CoursesTable courses={page.items} loading={page.loading} onView={page.openView} />
        </ModuleTab>
      </ModuleTabs>

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
