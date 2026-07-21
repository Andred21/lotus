import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { TurmaConfigCard } from './TurmaConfigCard'

export function TurmaCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { quoteId } = useParams<{ quoteId: string }>()
  const quote = Number(quoteId)

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        onClick={() => navigate('/operacion')}
      >
        <i className="pi pi-arrow-left" aria-hidden="true" />
        {t('operation.detail.back')}
      </button>
      <h2 className="text-2xl font-semibold">{t('operation.create.title')}</h2>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700">
        <TurmaConfigCard
          mode="create"
          quoteId={quote}
          onSaved={(id) => navigate(`/operacion/turmas/${id}`)}
          onCancel={() => navigate('/operacion')}
        />
      </div>
    </div>
  )
}
