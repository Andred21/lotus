import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModulePage, AppButton, AppCard, ArchiveConfirmDialog } from '@shared/ui'
import { usePermissions } from '@shared/hooks'
import type { CourseData } from '@shared/types/generated'
import { archivableSource } from '@shared/lib'
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
  // A fonte da tela é uma escolha só, não quatro (D-52): `items`, `loading`,
  // `error` e `refetch` vinham de quatro ternários independentes sobre a MESMA
  // condição, dentro das props.
  const fonte = archivableSource(page, archivedPage)

  return (
    <ModulePage title={t('module.cursos.title')} description={t('module.cursos.description')}>
      <AppCard>
        <CoursesTable
          courses={fonte.items}
          loading={fonte.loading}
          error={fonte.error}
          onRetry={fonte.refetch}
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

      {/* Restaurar NÃO pede confirmação: não é destrutivo (molde D9). */}
      <ArchiveConfirmDialog
        target={toArchive}
        pending={archivedPage.archiving}
        onArchive={archivedPage.archive}
        onCancel={() => setToArchive(null)}
      />

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
