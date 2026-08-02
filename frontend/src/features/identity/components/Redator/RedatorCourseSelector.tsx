import { useTranslation } from 'react-i18next'
import { AppErrorState, AppSkeleton } from '@shared/ui'
import { coursesApi } from '@shared/api/coursesApi'
import { useEnabledFirstCourses } from '../../hooks/useEnabledFirstCourses'
import { CourseCard } from './CourseCard'

/**
 * Seleção de cursos do redator, com os cinco estados que a spec D11 do bloco de
 * cards exigiu manter distinguíveis: carregando, erro com "Reintentar", vazio de
 * verdade, leitura sem cursos, e seleção.
 *
 * Eram cinco ramos de ternário aninhado dentro do `return` do RedatorDialog;
 * aqui são guardas sequenciais. `?? []` continua proibido: fazia falha de GET
 * se disfarçar de "sem cursos habilitados".
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
  const courses = coursesApi.useList()

  const allCourses = courses.data ?? []
  const enabledCourses = allCourses.filter((c) => courseIds.includes(c.id as number))
  const orderedCourses = useEnabledFirstCourses(allCourses, courseIds, orderKey)

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
        detail={courses.error?.detail ?? t('common.loadErrorHint')}
        retryLabel={t('common.retry')}
        onRetry={() => {
          void courses.refetch()
        }}
      />
    )
  }

  if (allCourses.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
        {t('course.empty')}
      </p>
    )
  }

  if (readOnly) {
    if (enabledCourses.length === 0) {
      return (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('redator.noCourses')}
        </p>
      )
    }
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {enabledCourses.map((c) => (
          <CourseCard key={c.id} course={c} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {orderedCourses.map((c) => (
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
