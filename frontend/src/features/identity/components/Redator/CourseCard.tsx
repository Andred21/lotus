import { useTranslation } from 'react-i18next'
import { AppSelectableCard } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

/**
 * Card do curso visto pelo lado do redator.
 *
 * A carga horária exibida é `workload_hours` — a **contratada**, que é o número
 * com valor comercial e que vai ao certificado (spec D6). O curso também tem
 * `modules_total_hours` (soma dos módulos), e as duas divergem de propósito: o
 * aviso de divergência é do formulário de módulos, onde dá para agir sobre ele.
 *
 * `modules` é opcional no tipo gerado; nas listagens o backend sempre preenche.
 */
export function CourseCard({
  course, selected, onToggle,
}: {
  course: CourseData
  selected?: boolean
  onToggle?: () => void
}) {
  const { t } = useTranslation()
  const moduleCount = course.modules?.length ?? 0

  return (
    <AppSelectableCard selected={selected} onToggle={onToggle}>
      <div className="min-w-0">
        <p className="truncate font-medium">{course.name}</p>
        <p className="truncate text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('course.workloadShort', { hours: course.workload_hours })}
          {' · '}
          {t('courseModule.countShort', { count: moduleCount })}
        </p>
      </div>
    </AppSelectableCard>
  )
}
