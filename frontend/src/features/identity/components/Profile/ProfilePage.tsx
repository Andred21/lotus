import { useTranslation } from 'react-i18next'
import { AppDetailSkeleton, AppErrorState, InlineLoadState, ModulePage } from '@shared/ui'
import { useProfilePage } from '../../hooks/useProfilePage'
import { ProfileIdentityCard } from './ProfileIdentityCard'
import { ProfilePersonalSection } from './ProfilePersonalSection'
import { ProfileSecuritySection } from './ProfileSecuritySection'
import { ProfileDocumentsSection } from './ProfileDocumentsSection'
import { ProfileSummaryCard } from './ProfileSummaryCard'

/**
 * Mi perfil. Duas colunas com corte por MUTABILIDADE (spec D1): à esquerda o
 * que o usuário não controla (identidade, papel, resumo), à direita exatamente
 * o que é self-service. A regra do bloco é a regra visível do layout.
 *
 * O que ramifica a tela é o DADO que falta, não o `status` da query:
 * `failedWithoutData` é o único que troca o conteúdo pelo erro; falha COM
 * perfil em cache vira aviso ao lado e preserva o que o usuário digitou.
 */
export function ProfilePage() {
  const { t } = useTranslation()
  const { data: profile, isLoading, loadError, errorDetail, failedWithoutData, refetch } =
    useProfilePage()

  if (isLoading) return <AppDetailSkeleton />

  if (failedWithoutData || !profile) {
    return (
      <ModulePage title={t('userMenu.profile')} description={t('profile.subtitle')}>
        <AppErrorState
          title={t('profile.loadError')}
          detail={errorDetail ?? t('common.loadErrorHint')}
          retryLabel={t('common.retry')}
          onRetry={refetch}
        />
      </ModulePage>
    )
  }

  return (
    <ModulePage title={t('userMenu.profile')} description={t('profile.subtitle')}>
      <InlineLoadState
        error={loadError ? (errorDetail ?? t('common.loadErrorHint')) : null}
        retryLabel={t('common.retry')}
        onRetry={refetch}
      />

      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <ProfileIdentityCard profile={profile} />
          {profile.redator && <ProfileSummaryCard redator={profile.redator} />}
        </div>
        <div className="flex flex-col gap-4">
          <ProfilePersonalSection profile={profile} />
          <ProfileSecuritySection email={profile.email} />
          {profile.redator && <ProfileDocumentsSection documentos={profile.redator.documentos} />}
        </div>
      </div>
    </ModulePage>
  )
}
