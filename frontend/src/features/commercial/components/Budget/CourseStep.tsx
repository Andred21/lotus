import { useTranslation } from 'react-i18next'
import { AppInputText, AppRadioButton, FormSection } from '@shared/ui'
import type { CourseData } from '@shared/types/generated'

/** Passo 1 do wizard: escolher o curso. A busca é do passo, não do form — por
 * isso o termo vem por prop do hook, e não do `useQuoteForm`. */
export function CourseStep({
  list, search, onSearch, selectedId, onSelect,
}: {
  list: CourseData[]
  search: string
  onSearch: (value: string) => void
  selectedId: number
  onSelect: (id: number) => void
}) {
  const { t } = useTranslation()

  return (
    <section className="space-y-3">
      <FormSection title={t('quote.stepCourse')} />
      <AppInputText
        leftIcon="pi pi-search"
        placeholder={t('quote.courseSearchPlaceholder')}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {list.map((c) => (
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
    </section>
  )
}
