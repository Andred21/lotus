import { useTranslation } from 'react-i18next'
import { AppErrorState, AppSkeleton } from '@shared/ui'
import { useRedatorCourses } from '../../hooks/useRedatorCourses'
import { CourseCard } from './CourseCard'

/**
 * Seleção de cursos do redator, com os cinco estados que a spec D11 do bloco de
 * cards exigiu manter distinguíveis: carregando, erro com "Reintentar", vazio de
 * verdade, leitura sem cursos, e seleção.
 *
 * Eram cinco ramos de ternário aninhado dentro do `return` do RedatorDialog;
 * aqui são guardas sequenciais. Query e derivação vivem no `useRedatorCourses`.
 */
export function RedatorCourseSelector({
  courseIds,
  readOnly,
  onToggle,
  orderKey,
}: {
  courseIds: number[]
  readOnly: boolean
  onToggle: (id: number) => void
  /** Congela a ordem na abertura do diálogo (`<id>:<mode>`). */
  orderKey: string
}) {
  const { t } = useTranslation()
  const courses = useRedatorCourses(courseIds, orderKey)

  if (courses.isLoading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
        <AppSkeleton height="3.5rem" />
        <AppSkeleton height="3.5rem" />
      </div>
    )
  }

  if (courses.isError) {
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={courses.errorDetail ?? t(courses.errorHint)}
        retryLabel={t('common.retry')}
        onRetry={courses.refetch}
      />
    )
  }

  if (courses.isEmpty) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('course.empty')}
      </p>
    )
  }

  if (readOnly) {
    if (courses.enabledCourses.length === 0) {
      return (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('redator.noCourses')}
        </p>
      )
    }
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {courses.enabledCourses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {courses.orderedCourses.map((c) => (
        <CourseCard
          key={c.id}
          course={c}
          selected={courseIds.includes(c.id as number)}
          onToggle={() => onToggle(c.id as number)}
        />
      ))}
    </div>
  )
}
