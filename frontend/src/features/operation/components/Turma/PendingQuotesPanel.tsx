import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppButton } from '@shared/ui'
import type { PendingQuoteData } from '@shared/types/generated'

export function PendingQuotesPanel({ items }: { items: PendingQuoteData[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (items.length === 0) return null

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30">
      <header className="flex items-center gap-2 p-4">
        <h3 className="font-medium text-sky-800 dark:text-sky-200">{t('operation.pending.title')}</h3>
        <span className="rounded-full bg-sky-600 px-2 text-sm text-white">{items.length}</span>
      </header>
      <ul className="divide-y divide-sky-100 dark:divide-sky-900">
        {items.map((q) => (
          <li key={q.quote_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm">
              <i className="pi pi-file mr-2 text-sky-600" aria-hidden="true" />
              <strong>{q.client_name}</strong> · {q.course_name} ·{' '}
              <span className="text-slate-500">{t('operation.pending.students', { count: q.student_count })}</span>
            </span>
            <AppButton
              variant="brandIcon"
              label={t('operation.pending.configure')}
              icon="pi pi-cog"
              onClick={() => navigate(`/operacion/turmas/nueva/${q.quote_id}`)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
