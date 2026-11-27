import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppButton, PageHeader } from '@shared/ui'

/** Módulo sem permissão. Sem "Reintentar": repetir devolve a mesma recusa. */
export function ForbiddenPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader title={t('errors.forbiddenTitle')} description={t('errors.forbiddenBody')} />
      <AppButton label={t('errors.backHome')} icon="arrowLeft" outlined onClick={() => navigate('/')} />
    </>
  )
}
