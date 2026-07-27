import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { AppCard, DetailHeader } from '@shared/ui'
import { TurmaConfigCard } from './TurmaConfigCard'

export function TurmaCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { quoteId } = useParams<{ quoteId: string }>()
  const quote = Number(quoteId)

  return (
    <div>
      <DetailHeader
        back={{ label: t('operation.detail.back'), onClick: () => navigate('/operacion') }}
        title={t('operation.create.title')}
      />
      <AppCard>
        <TurmaConfigCard
          mode="create"
          quoteId={quote}
          onSaved={(id) => navigate(`/operacion/turmas/${id}`)}
          onCancel={() => navigate('/operacion')}
        />
      </AppCard>
    </div>
  )
}
