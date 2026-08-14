import { useTranslation } from 'react-i18next'
import { AppErrorState, AppInputText, AppRadioButton, AppSkeleton, FormSection } from '@shared/ui'
import type { useQuoteCourseSearch } from '../../hooks/useQuoteCourseSearch'

/**
 * Passo 1 do wizard: escolher o curso, com os cinco estados que o BD-6 exige
 * distinguíveis — carregando, falha com Reintentar, catálogo vazio de verdade,
 * termo sem resultado e lista. Eram um só caminho, e um GET falho caía no
 * quarto sem dizer nada.
 *
 * A busca só aparece quando há catálogo: filtrar lista que não veio é controle
 * morto. Todo ramo mantém o `FormSection`, para o passo nunca ficar sem título.
 */
export function CourseStep({
  courses, selectedId, onSelect,
}: {
  /** O hook inteiro, e não `list`/`search` soltos: o termo digitado mora no
   * estado dele e o wizard o monta uma vez só — trazer o hook para cá o
   * reiniciaria a cada ida e volta entre os passos. */
  courses: ReturnType<typeof useQuoteCourseSearch>
  selectedId: number
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()

  if (courses.isLoading) {
    return (
      <section className="space-y-3" aria-busy="true">
        <FormSection title={t('quote.stepCourse')} />
        <AppSkeleton height="2.5rem" />
        <AppSkeleton height="2.5rem" />
      </section>
    )
  }

  if (courses.isError) {
    return (
      <section className="space-y-3">
        <FormSection title={t('quote.stepCourse')} />
        <AppErrorState
          title={t('common.loadError')}
          detail={courses.errorDetail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={courses.refetch}
        />
      </section>
    )
  }

  if (courses.isEmpty) {
    return (
      <section className="space-y-3">
        <FormSection title={t('quote.stepCourse')} />
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>{t('course.empty')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <FormSection title={t('quote.stepCourse')} />
      <AppInputText
        leftIcon="pi pi-search"
        placeholder={t('quote.courseSearchPlaceholder')}
        value={courses.search}
        onChange={(e) => courses.setSearch(e.target.value)}
      />
      {courses.noResults ? (
        <p className="text-sm" style={{ color: 'var(--text-color-secondary)' }}>
          {t('common.noResults', { term: courses.search.trim() })}
        </p>
      ) : (
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {courses.list.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 rounded p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <AppRadioButton
                name="quote-course"
                checked={selectedId === c.id}
                onChange={() => onSelect(c.id as number)}
              />
              <span className="text-sm">
                {c.name}
                <span className="ml-2 text-slate-500">{c.workload_hours}h</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  )
}
