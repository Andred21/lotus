import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppCard, DetailHeader } from '@shared/ui'
import { useBackNavigation } from '@shared/hooks'
import { TurmaConfigCard } from './TurmaConfigCard'

export function TurmaCreatePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { state } = useLocation()
  const goBack = useBackNavigation('/operacion')
  const { quoteId } = useParams<{ quoteId: string }>()
  const quote = Number(quoteId)

  return (
    <div>
      <DetailHeader
        back={{ label: t('operation.detail.back'), onClick: goBack }}
        title={t('operation.create.title')}
      />
      <AppCard>
        <TurmaConfigCard
          mode="create"
          quoteId={quote}
          onSaved={(id) => {
            // O aviso de "sair" não dispara aqui: `useTurmaConfigForm` libera a
            // guarda (`allowNavigation()`) imediatamente antes de chamar este
            // `onSaved`. O Volver e o Cancelar, esses sim, passam por ela.
            // `replace`: a entrada do formulário de criação sai do histórico —
            // voltar do detalhe não reabre um formulário de algo já criado. O
            // `state` segue junto, para o detalhe voltar à lista de origem.
            navigate(`/operacion/turmas/${id}`, { replace: true, state })
          }}
          onCancel={goBack}
        />
      </AppCard>
    </div>
  )
}
