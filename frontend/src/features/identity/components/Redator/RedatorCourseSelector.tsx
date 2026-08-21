import { useTranslation } from 'react-i18next'
import { AppErrorState, AppSkeleton, InlineLoadState } from '@shared/ui'
import { loadMessage } from '@shared/lib'
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

  // A falha SUBSTITUI a seção só quando não há catálogo em cache. Com cache em
  // mão, um refetch falho mantém `data` populado enquanto `status` vira `error`:
  // gatear por `isError` cru apagava uma lista utilizável e a seleção já feita
  // (rule `frontend-fsliced.md`, precedente `CourseStep.tsx:46`).
  if (courses.failedWithoutData) {
    return (
      <AppErrorState
        title={t('common.loadError')}
        detail={loadMessage(courses, t)}
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

  // Declarado uma vez: os dois ramos finais o imprimem, e a lista é a MESMA nos
  // dois — cobrir só um deixaria metade do defeito de pé.
  const aviso = (
    <InlineLoadState
      error={courses.isError ? loadMessage(courses, t) : null}
      retryLabel={t('common.retry')}
      onRetry={courses.refetch}
    />
  )

  if (readOnly) {
    if (courses.enabledCourses.length === 0) {
      return (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('redator.noCourses')}
        </p>
      )
    }
    return (
      <div className="space-y-2">
        {aviso}
        <div className="grid gap-2 sm:grid-cols-2">
          {courses.enabledCourses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {aviso}
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
    </div>
  )
}
