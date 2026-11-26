import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppButton, PageHeader } from '@shared/ui'

/** Rota desconhecida, dentro do layout (só chega aqui quem tem sessão). */
export function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader title={t('errors.notFoundTitle')} description={t('errors.notFoundBody')} />
      <AppButton label={t('errors.backHome')} icon="arrowLeft" outlined onClick={() => navigate('/')} />
    </>
  )
}
